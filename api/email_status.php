<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";
$cfg = require __DIR__ . "/config.php";

handle_options();
cors_headers();

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

require_admin_session();

$configured = trim((string) ($cfg["brevo_api_key"] ?? "")) !== "" && trim((string) ($cfg["mail_from"] ?? "")) !== "";

json_response(200, [
    "ok" => true,
    "configured" => $configured,
    "mockWhenNoKey" => (bool) ($cfg["mock_when_no_key"] ?? false),
    "maxRecipients" => (int) ($cfg["max_recipients"] ?? 200),
    "mailFrom" => (string) ($cfg["mail_from"] ?? ""),
    "mailFromName" => (string) ($cfg["mail_from_name"] ?? ""),
]);

