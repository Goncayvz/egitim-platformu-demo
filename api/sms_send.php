<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";

handle_options();
cors_headers();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

$body = read_json_body();
$phone = trim((string) ($body["phone"] ?? ""));
$message = trim((string) ($body["message"] ?? ""));

if ($phone === "" || $message === "") {
    json_response(400, ["ok" => false, "message" => "Telefon ve mesaj zorunludur."]);
}
if (!preg_match('/^\+?[0-9\s\-\(\)]{8,20}$/', $phone)) {
    json_response(400, ["ok" => false, "message" => "Telefon numarasi gecersiz."]);
}

// Gercek SMS saglayicisi baglanana kadar mock cevap dondurur.
json_response(200, [
    "ok" => true,
    "simulated" => true,
    "provider" => "mock",
    "phone" => $phone,
    "messageLength" => strlen($message),
    "sentAt" => gmdate("c"),
]);

