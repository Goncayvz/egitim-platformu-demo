<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";
require __DIR__ . "/db.php";

handle_options();
cors_headers();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

$admin = require_admin_session();
$body = read_json_body();
$id = (int)($body["id"] ?? 0);
if ($id <= 0) {
    json_response(400, ["ok" => false, "message" => "id gerekli."]);
}
if ((int)($admin["id"] ?? 0) === $id) {
    json_response(400, ["ok" => false, "message" => "Kendi hesabını silemezsin."]);
}

try {
    $pdo = db();
    $del = $pdo->prepare("DELETE FROM users WHERE id = :id LIMIT 1");
    $del->execute(["id" => $id]);
    json_response(200, ["ok" => true]);
} catch (Throwable $e) {
    json_response(500, ["ok" => false, "message" => "Sunucu hatası: " . $e->getMessage()]);
}

