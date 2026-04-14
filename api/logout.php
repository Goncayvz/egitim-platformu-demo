<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";

handle_options();
cors_headers();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

$_SESSION = [];

if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), "", time() - 42000, $params["path"] ?? "/", $params["domain"] ?? "", (bool) ($params["secure"] ?? false), (bool) ($params["httponly"] ?? true));
}

session_destroy();

json_response(200, ["ok" => true]);

