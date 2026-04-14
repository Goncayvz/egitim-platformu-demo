<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";

handle_options();
cors_headers();

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

$user = $_SESSION["auth_user"] ?? null;
if (!is_array($user)) {
    json_response(200, ["ok" => false, "authenticated" => false]);
}

json_response(200, [
    "ok" => true,
    "authenticated" => true,
    "user" => [
        "id" => (int) ($user["id"] ?? 0),
        "role" => (string) ($user["role"] ?? ""),
        "fullName" => (string) ($user["full_name"] ?? ""),
        "username" => (string) ($user["username"] ?? ""),
        "email" => (string) ($user["email"] ?? ""),
    ],
]);

