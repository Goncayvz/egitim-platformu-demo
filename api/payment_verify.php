<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";
require __DIR__ . "/db.php";

handle_options();
cors_headers();

if (($_SERVER["REQUEST_METHOD"] ?? "") !== "GET") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}
$user = $_SESSION["auth_user"] ?? null;
if (!is_array($user)) {
    json_response(401, ["ok" => false, "message" => "Giriş gerekli."]);
}

$paymentId = (int)($_GET["paymentId"] ?? 0);
if ($paymentId <= 0) {
    json_response(400, ["ok" => false, "message" => "paymentId gerekli."]);
}

$role = (string)($user["role"] ?? "");
$viewerId = (int)($user["id"] ?? 0);

try {
    $pdo = db();
    $stmt = $pdo->prepare("SELECT id, student_id, amount, currency, status, provider, provider_ref, paid_at, created_at FROM payments WHERE id = :id LIMIT 1");
    $stmt->execute(["id" => $paymentId]);
    $p = $stmt->fetch();
    if (!$p) {
        json_response(404, ["ok" => false, "message" => "Ödeme kaydı bulunamadı."]);
    }

    $studentId = (int)($p["student_id"] ?? 0);
    if ($role !== "admin" && $viewerId !== $studentId) {
        json_response(403, ["ok" => false, "message" => "Yetkisiz."]);
    }

    json_response(200, [
        "ok" => true,
        "payment" => [
            "id" => (int)($p["id"] ?? 0),
            "amount" => (float)($p["amount"] ?? 0),
            "currency" => (string)($p["currency"] ?? "TRY"),
            "status" => (string)($p["status"] ?? "pending"),
            "provider" => (string)($p["provider"] ?? ""),
            "providerRef" => (string)($p["provider_ref"] ?? ""),
            "paidAt" => (string)($p["paid_at"] ?? ""),
            "createdAt" => (string)($p["created_at"] ?? ""),
        ],
    ]);
} catch (Throwable $e) {
    json_response(500, ["ok" => false, "message" => "Sunucu hatası: " . $e->getMessage()]);
}
