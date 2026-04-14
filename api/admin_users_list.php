<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";
require __DIR__ . "/db.php";

handle_options();
cors_headers();

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

$admin = require_admin_session();

try {
    $pdo = db();
    $stmt = $pdo->query("SELECT id, role, full_name, username, email, phone, is_active, created_at FROM users ORDER BY id DESC LIMIT 500");
    $rows = $stmt->fetchAll();

    $out = array_map(static function (array $u): array {
        return [
            "id" => (int)($u["id"] ?? 0),
            "role" => (string)($u["role"] ?? ""),
            "fullName" => (string)($u["full_name"] ?? ""),
            "username" => (string)($u["username"] ?? ""),
            "email" => (string)($u["email"] ?? ""),
            "phone" => (string)($u["phone"] ?? ""),
            "isActive" => (int)($u["is_active"] ?? 0) === 1,
            "createdAt" => (string)($u["created_at"] ?? ""),
        ];
    }, is_array($rows) ? $rows : []);

    json_response(200, ["ok" => true, "users" => $out]);
} catch (Throwable $e) {
    json_response(500, ["ok" => false, "message" => "Sunucu hatası: " . $e->getMessage()]);
}

