<?php
declare(strict_types=1);

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/_iyzico.php";
load_env_file(dirname(__DIR__) . DIRECTORY_SEPARATOR . ".env");

// iyzico 3DS callback (POST) -> auth -> redirect to result page

function redirect_to(string $url): void
{
    header("Location: " . $url, true, 302);
    exit;
}

function safe_text($v): string
{
    return trim((string) ($v ?? ""));
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
}

$statusParam = "failed";
$internalPaymentId = 0;

function find_internal_payment_id(PDO $pdo, string $conversationId): int
{
    $cid = trim($conversationId);
    if ($cid === "") return 0;
    $stmt = $pdo->prepare("SELECT id FROM payments WHERE provider = 'iyzico' AND provider_ref = :ref LIMIT 1");
    $stmt->execute(["ref" => $cid]);
    $row = $stmt->fetch();
    return $row ? (int)($row["id"] ?? 0) : 0;
}

function set_internal_payment_status(PDO $pdo, int $paymentId, string $status): void
{
    $paidAt = $status === "paid" ? date("Y-m-d H:i:s") : null;
    $stmt = $pdo->prepare("UPDATE payments SET status = :status, paid_at = :paid_at WHERE id = :id");
    $stmt->execute(["status" => $status, "paid_at" => $paidAt, "id" => $paymentId]);
}

try {
    $internalPaymentId = (int)($_GET["internalPaymentId"] ?? 0);
    if ($internalPaymentId <= 0) {
        $internalPaymentId = (int)($_SESSION["demo_iyzico_payment_id"] ?? 0);
    }

    $paymentId = safe_text($_POST["paymentId"] ?? "");
    $conversationData = safe_text($_POST["conversationData"] ?? "");
    $conversationId = safe_text($_POST["conversationId"] ?? "");

    if ($conversationId === "" && isset($_SESSION["demo_iyzico_conv"])) {
        $conversationId = safe_text($_SESSION["demo_iyzico_conv"]);
    }

    // If we still don't have internal payment id, try to find it via conversationId.
    if ($internalPaymentId <= 0 && $conversationId !== "") {
        try {
            $pdo = db();
            $internalPaymentId = find_internal_payment_id($pdo, $conversationId);
        } catch (Throwable $e) {
            $internalPaymentId = 0;
        }
    }

    if ($paymentId === "" || $conversationData === "") {
        if ($internalPaymentId > 0) {
            try {
                $pdo = db();
                set_internal_payment_status($pdo, $internalPaymentId, "failed");
            } catch (Throwable $e) {
                // ignore
            }
        }
        $url = "../odeme_basarili.html?status=failed";
        if ($internalPaymentId > 0) $url .= "&paymentId=" . rawurlencode((string)$internalPaymentId);
        redirect_to($url);
    }

    $authPayload = [
        "locale" => "tr",
        "conversationId" => $conversationId ?: ("cb_" . date("YmdHis")),
        "paymentId" => $paymentId,
        "conversationData" => $conversationData,
    ];

    $res = iyzico_post_json("/payment/3dsecure/auth", $authPayload);
    $json = is_array($res["json"] ?? null) ? $res["json"] : null;
    $status = is_array($json) ? strtolower((string) ($json["status"] ?? "")) : "";

    if ($res["ok"] && $status === "success") {
        $statusParam = "success";
        if ($internalPaymentId > 0) {
            try {
                $pdo = db();
                set_internal_payment_status($pdo, $internalPaymentId, "paid");
            } catch (Throwable $e) {
                // ignore
            }
        }
    } else {
        $statusParam = "failed";
        if ($internalPaymentId > 0) {
            try {
                $pdo = db();
                set_internal_payment_status($pdo, $internalPaymentId, "failed");
            } catch (Throwable $e) {
                // ignore
            }
        }
    }
} catch (Throwable $e) {
    $statusParam = "failed";
    if ($internalPaymentId > 0) {
        try {
            $pdo = db();
            set_internal_payment_status($pdo, $internalPaymentId, "failed");
        } catch (Throwable $e2) {
            // ignore
        }
    }
}

$url = "../odeme_basarili.html?status=" . rawurlencode($statusParam);
if ($internalPaymentId > 0) $url .= "&paymentId=" . rawurlencode((string)$internalPaymentId);
redirect_to($url);
