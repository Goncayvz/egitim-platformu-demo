<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";
require __DIR__ . "/db.php";

handle_options();
cors_headers();

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

require_admin_session();

$id = (int)($_GET["id"] ?? 0);
if ($id <= 0) {
    json_response(400, ["ok" => false, "message" => "id gerekli."]);
}

try {
    $pdo = db();
    $stmt = $pdo->prepare("SELECT id, role, full_name, username, email, phone, is_active, created_at FROM users WHERE id = :id LIMIT 1");
    $stmt->execute(["id" => $id]);
    $u = $stmt->fetch();
    if (!$u) {
        json_response(404, ["ok" => false, "message" => "Kullanıcı bulunamadı."]);
    }
    json_response(200, [
        "ok" => true,
        "user" => [
            "id" => (int)($u["id"] ?? 0),
            "role" => (string)($u["role"] ?? ""),
            "fullName" => (string)($u["full_name"] ?? ""),
            "username" => (string)($u["username"] ?? ""),
            "email" => (string)($u["email"] ?? ""),
            "phone" => (string)($u["phone"] ?? ""),
            "isActive" => (int)($u["is_active"] ?? 0) === 1,
            "createdAt" => (string)($u["created_at"] ?? ""),
        ],
    ]);
} catch (Throwable $e) {
    json_response(500, ["ok" => false, "message" => "Sunucu hatası: " . $e->getMessage()]);
}

