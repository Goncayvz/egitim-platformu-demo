<?php
declare(strict_types=1);

require_once __DIR__ . "/db.php";
load_env_file(dirname(__DIR__) . DIRECTORY_SEPARATOR . ".env");
require_once __DIR__ . "/_payment_settings.php";

header("Content-Type: application/json; charset=utf-8");

function json_out(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function has_env(string $k): bool
{
    $v = getenv($k);
    return is_string($v) && trim($v) !== "";
}

function append_query(string $url, string $key, string $value): string
{
    $u = trim($url);
    if ($u === "") return $u;
    $join = str_contains($u, "?") ? "&" : "?";
    return $u . $join . rawurlencode($key) . "=" . rawurlencode($value);
}

function require_auth_user(): array
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    $u = $_SESSION["auth_user"] ?? null;
    if (!is_array($u)) {
        json_out(401, ["ok" => false, "code" => "AUTH_REQUIRED", "message" => "Giriş gerekli."]);
    }
    $role = (string)($u["role"] ?? "");
    if ($role !== "student" && $role !== "admin") {
        json_out(403, ["ok" => false, "code" => "FORBIDDEN", "message" => "Yetkisiz."]);
    }
    return $u;
}

function create_payment(PDO $pdo, int $studentId, float $amount, string $currency, string $status, string $provider, string $providerRef = ""): int
{
    $stmt = $pdo->prepare(
        "INSERT INTO payments (student_id, instructor_id, amount, currency, status, provider, provider_ref, paid_at)
         VALUES (:student_id, NULL, :amount, :currency, :status, :provider, :provider_ref, :paid_at)"
    );
    $paidAt = $status === "paid" ? date("Y-m-d H:i:s") : null;
    $stmt->execute([
        "student_id" => $studentId,
        "amount" => number_format($amount, 2, ".", ""),
        "currency" => $currency,
        "status" => $status,
        "provider" => $provider,
        "provider_ref" => $providerRef !== "" ? $providerRef : null,
        "paid_at" => $paidAt,
    ]);
    return (int)$pdo->lastInsertId();
}

function update_payment_status(PDO $pdo, int $paymentId, string $status): void
{
    $paidAt = $status === "paid" ? date("Y-m-d H:i:s") : null;
    $stmt = $pdo->prepare("UPDATE payments SET status = :status, paid_at = :paid_at WHERE id = :id");
    $stmt->execute(["status" => $status, "paid_at" => $paidAt, "id" => $paymentId]);
}

if (($_SERVER["REQUEST_METHOD"] ?? "") !== "POST") {
    json_out(405, ["ok" => false, "code" => "METHOD_NOT_ALLOWED", "message" => "POST gerekli."]);
}

$authUser = require_auth_user();
$studentId = (int)($authUser["id"] ?? 0);

$raw = file_get_contents("php://input");
$data = [];
try {
    $decoded = $raw ? json_decode($raw, true) : null;
    $data = is_array($decoded) ? $decoded : [];
} catch (Throwable $e) {
    $data = [];
}

$envProvider = strtolower(trim((string) (getenv("PAYMENT_PROVIDER") ?: "")));
$fileCfg = read_payment_settings();
$fileProvider = normalize_provider((string) ($fileCfg["provider"] ?? ""));
$provider = $envProvider;
$currency = strtoupper(trim((string) ($data["currency"] ?? "TRY")));
$total = $data["total"] ?? null;

// Local development override (UI can send provider without editing .env)
$remote = (string) ($_SERVER["REMOTE_ADDR"] ?? "");
$isLocal = ($remote === "127.0.0.1" || $remote === "::1");
if ($isLocal) {
    $override = strtolower(trim((string) ($data["provider"] ?? "")));
    if (in_array($override, ["mock", "paytr", "iyzico", "stripe"], true)) {
        $provider = $override;
    }
}

// If env is empty, allow provider from admin-saved file.
if ($provider === "" && $fileProvider !== "") {
    $provider = $fileProvider;
}

if ($currency !== "TRY") {
    json_out(400, ["ok" => false, "code" => "BAD_CURRENCY", "message" => "Şu an sadece TRY destekleniyor."]);
}
if (!is_numeric($total) || (float) $total <= 0) {
    json_out(400, ["ok" => false, "code" => "BAD_TOTAL", "message" => "Toplam tutar geçersiz."]);
}

$successUrl = trim((string) ($data["successUrl"] ?? ""));
$failUrl = trim((string) ($data["failUrl"] ?? ""));
$cancelUrl = trim((string) ($data["cancelUrl"] ?? ""));

if ($provider === "") {
    json_out(200, [
        "ok" => false,
        "code" => "NOT_CONFIGURED",
        "message" => "Ödeme sağlayıcısı henüz ayarlanmadı. (PAYMENT_PROVIDER boş)",
        "hint" => "Örnek: PAYMENT_PROVIDER=mock | paytr | iyzico | stripe",
    ]);
}

// Provider key checks (values are not returned; only missing list)
if ($provider === "iyzico") {
    $required = ["IYZICO_API_KEY", "IYZICO_SECRET_KEY", "IYZICO_BASE_URL"];
    $missing = array_values(array_filter($required, fn($k) => !has_env($k)));
    if (count($missing) > 0) {
        json_out(200, [
            "ok" => false,
            "code" => "MISSING_KEYS",
            "message" => "iyzico anahtarları eksik. .env dosyanı kontrol et.",
            "provider" => "iyzico",
            "missingKeys" => $missing,
        ]);
    }
}
if ($provider === "paytr") {
    $required = ["PAYTR_MERCHANT_ID", "PAYTR_MERCHANT_KEY", "PAYTR_MERCHANT_SALT"];
    $missing = array_values(array_filter($required, fn($k) => !has_env($k)));
    if (count($missing) > 0) {
        json_out(200, [
            "ok" => false,
            "code" => "MISSING_KEYS",
            "message" => "PayTR anahtarları eksik. .env dosyanı kontrol et.",
            "provider" => "paytr",
            "missingKeys" => $missing,
        ]);
    }
}
if ($provider === "stripe") {
    $required = ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"];
    $missing = array_values(array_filter($required, fn($k) => !has_env($k)));
    if (count($missing) > 0) {
        json_out(200, [
            "ok" => false,
            "code" => "MISSING_KEYS",
            "message" => "Stripe anahtarları eksik. .env dosyanı kontrol et.",
            "provider" => "stripe",
            "missingKeys" => $missing,
        ]);
    }
}

// Mock provider: local geliştirmede akış testi için.
if ($provider === "mock") {
    $mockStatus = strtolower(trim((string) (getenv("PAYMENT_MOCK_STATUS") ?: "success")));
    if ($isLocal) {
        $overrideMock = strtolower(trim((string) ($data["mockStatus"] ?? "")));
        if (in_array($overrideMock, ["success", "failed", "cancelled"], true)) {
            $mockStatus = $overrideMock;
        }
    }

    $pdo = db();
    $ref = "mock_" . date("YmdHis") . "_" . substr(bin2hex(random_bytes(6)), 0, 10);
    $status = $mockStatus === "success" ? "paid" : "failed";
    $paymentId = create_payment($pdo, $studentId, (float) $total, "TRY", $status, "mock", $ref);

    $redirect = $successUrl ?: "odeme_basarili.html?status=success";
    if ($mockStatus === "failed") $redirect = $failUrl ?: "odeme_basarili.html?status=failed";
    if ($mockStatus === "cancelled") $redirect = $cancelUrl ?: "odeme_basarili.html?status=cancelled";
    $redirect = append_query($redirect, "paymentId", (string) $paymentId);
    json_out(200, [
        "ok" => true,
        "provider" => "mock",
        "paymentId" => $paymentId,
        "redirectUrl" => $redirect,
    ]);
}

  // iyzico API (3DS) scaffold: initialize -> returns threeDSHtmlContent for browser redirect
  if ($provider === "iyzico") {
    require_once __DIR__ . "/_iyzico.php";

    $items = is_array($data["items"] ?? null) ? $data["items"] : [];
    $paymentCard = is_array($data["paymentCard"] ?? null) ? $data["paymentCard"] : [];
    $buyer = is_array($data["buyer"] ?? null) ? $data["buyer"] : [];
    $billing = is_array($data["billingAddress"] ?? null) ? $data["billingAddress"] : [];

    $cardNumber = preg_replace("/\\s+/", "", (string) ($paymentCard["cardNumber"] ?? ""));
    $expireMonth = (string) ($paymentCard["expireMonth"] ?? "");
    $expireYear = (string) ($paymentCard["expireYear"] ?? "");
    $cvc = (string) ($paymentCard["cvc"] ?? "");
    $cardHolder = (string) ($paymentCard["cardHolderName"] ?? "");

    if ($cardNumber === "" || $expireMonth === "" || $expireYear === "" || $cvc === "" || $cardHolder === "") {
        json_out(200, ["ok" => false, "code" => "CARD_REQUIRED", "message" => "Kart bilgileri eksik."]);
    }

    $fullName = trim((string) ($buyer["fullName"] ?? ""));
    $email = trim((string) ($buyer["email"] ?? ""));
    $phone = trim((string) ($buyer["phone"] ?? ""));
    $identityNumber = preg_replace("/\\s+/", "", (string) ($buyer["identityNumber"] ?? ""));
    if ($fullName === "" || $email === "" || $phone === "" || $identityNumber === "") {
        json_out(200, ["ok" => false, "code" => "BUYER_REQUIRED", "message" => "Fatura/alıcı bilgileri eksik."]);
    }

    $addr = trim((string) ($billing["address"] ?? ""));
    $city = trim((string) ($billing["city"] ?? ""));
    $country = trim((string) ($billing["country"] ?? "Turkey"));
    if ($addr === "" || $city === "") {
        json_out(200, ["ok" => false, "code" => "ADDRESS_REQUIRED", "message" => "Adres bilgileri eksik."]);
    }

    // Build basket items in kuruş
    $basketItems = [];
    $sum = 0;
    foreach ($items as $it) {
        if (!is_array($it)) continue;
        $id = (string) ($it["id"] ?? "");
        $name = (string) ($it["title"] ?? "Kurs");
        $qty = (int) ($it["qty"] ?? 1);
        $price = (float) ($it["price"] ?? 0);
        if ($qty < 1) $qty = 1;
        if ($price <= 0) continue;
        $line = $price * $qty;
        $sum += $line;
        $basketItems[] = [
            "id" => $id ?: ("course_" . count($basketItems) + 1),
            "name" => $name ?: "Kurs",
            "category1" => "Eğitim",
            "itemType" => "VIRTUAL",
            "price" => number_format($line, 2, ".", ""),
        ];
    }

    if ($sum <= 0 || count($basketItems) === 0) {
        json_out(200, ["ok" => false, "code" => "EMPTY_BASKET", "message" => "Sepet boş veya fiyat bilgisi yok."]);
    }

    // Basic required fields for iyzico initialize
    $convId = "ord_" . date("YmdHis") . "_" . substr(iyzico_random_key(), 0, 8);
    $cb = trim((string) ($data["callbackUrl"] ?? "")); // optional
    // callbackUrl MUST be reachable by browser after 3DS. For local, this relative path works.
    $callbackUrl = $cb ?: "api/iyzico_3ds_callback.php";

    // Create a pending payment record before initialize so callback can carry our internal paymentId.
    $pdo = db();
    $paymentId = create_payment($pdo, $studentId, (float) $sum, "TRY", "pending", "iyzico", $convId);
    $callbackUrl = append_query($callbackUrl, "internalPaymentId", (string) $paymentId);

    $clientIp = (string) ($_SERVER["REMOTE_ADDR"] ?? "127.0.0.1");

    $initPayload = [
        "locale" => "tr",
        "conversationId" => $convId,
        "price" => number_format($sum, 2, ".", ""),
        "paidPrice" => number_format($sum, 2, ".", ""),
        "currency" => "TRY",
        "installment" => 1,
        "basketId" => $convId,
        "paymentChannel" => "WEB",
        "paymentGroup" => "PRODUCT",
        "callbackUrl" => $callbackUrl,
        "paymentCard" => [
            "cardHolderName" => $cardHolder,
            "cardNumber" => $cardNumber,
            "expireMonth" => $expireMonth,
            "expireYear" => $expireYear,
            "cvc" => $cvc,
            "registerCard" => (($paymentCard["registerCard"] ?? false) ? 1 : 0),
        ],
        "buyer" => [
            "id" => substr(hash("sha256", $email), 0, 12),
            "name" => $fullName,
            "surname" => $fullName,
            "identityNumber" => $identityNumber,
            "email" => $email,
            "gsmNumber" => $phone,
            "registrationDate" => date("Y-m-d H:i:s"),
            "lastLoginDate" => date("Y-m-d H:i:s"),
            "registrationAddress" => $addr,
            "ip" => $clientIp,
            "city" => $city,
            "country" => $country,
            "zipCode" => (string) ($billing["zipCode"] ?? ""),
        ],
        "shippingAddress" => [
            "contactName" => (string) ($billing["contactName"] ?? $fullName),
            "city" => $city,
            "country" => $country,
            "address" => $addr,
            "zipCode" => (string) ($billing["zipCode"] ?? ""),
        ],
        "billingAddress" => [
            "contactName" => (string) ($billing["contactName"] ?? $fullName),
            "city" => $city,
            "country" => $country,
            "address" => $addr,
            "zipCode" => (string) ($billing["zipCode"] ?? ""),
        ],
        "basketItems" => $basketItems,
    ];

    $res = iyzico_post_json("/payment/3dsecure/initialize", $initPayload);
    $json = is_array($res["json"] ?? null) ? $res["json"] : null;
    $status = is_array($json) ? strtolower((string) ($json["status"] ?? "")) : "";

    if (!$res["ok"] || $status !== "success") {
        try {
            update_payment_status($pdo, $paymentId, "failed");
        } catch (Throwable $e) {
            // ignore
        }
        $msg = is_array($json) ? (string) ($json["errorMessage"] ?? "iyzico hatası") : "iyzico API hatası";
        $code = is_array($json) ? (string) ($json["errorCode"] ?? "IYZICO_ERROR") : "IYZICO_ERROR";
        json_out(200, [
            "ok" => false,
            "code" => "IYZICO_INIT_FAILED",
            "message" => $msg,
            "provider" => "iyzico",
            "iyzicoErrorCode" => $code,
        ]);
    }

    $htmlContent = (string) ($json["threeDSHtmlContent"] ?? "");
    if ($htmlContent === "") {
        try {
            update_payment_status($pdo, $paymentId, "failed");
        } catch (Throwable $e) {
            // ignore
        }
        json_out(200, [
            "ok" => false,
            "code" => "NO_3DS_HTML",
            "message" => "iyzico 3DS içeriği dönmedi.",
            "provider" => "iyzico",
        ]);
    }

    // Save minimal state in session for auth step
    if (session_status() !== PHP_SESSION_ACTIVE) {
        @session_start();
    }
    $_SESSION["demo_iyzico_conv"] = $convId;
    $_SESSION["demo_iyzico_basket"] = $convId;
    $_SESSION["demo_iyzico_payment_id"] = $paymentId;

    json_out(200, [
        "ok" => true,
        "provider" => "iyzico",
        "paymentId" => $paymentId,
        "threeDSHtmlContent" => $htmlContent, // base64 from iyzico
    ]);
  }

// TODO: Gerçek sağlayıcı entegrasyonu burada yapılacak:
// - PayTR / iyzico / Stripe Checkout Session oluştur
// - redirectUrl olarak ödeme sayfasını dön
json_out(200, [
    "ok" => false,
    "code" => "NOT_IMPLEMENTED",
    "message" => "Ödeme sağlayıcısı seçildi ama entegrasyon henüz yazılmadı.",
    "provider" => $provider,
]);
