<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";
$cfg = require __DIR__ . "/config.php";

handle_options();
cors_headers();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

require_admin_session();

$body = read_json_body();
$subject = trim((string) ($body["subject"] ?? ""));
$text = trim((string) ($body["body"] ?? ""));
$recipients = unique_emails((array) ($body["recipients"] ?? []));

if ($subject === "" || $text === "") {
    json_response(400, ["ok" => false, "message" => "Konu ve içerik zorunludur."]);
}
if (count($recipients) !== 1) {
    json_response(400, ["ok" => false, "message" => "Test e-postasinda tek alici gerekir."]);
}
if (!is_valid_email($recipients[0])) {
    json_response(400, ["ok" => false, "message" => "Gecerli bir e-posta adresi girin."]);
}
$result = send_brevo_email($cfg, $recipients[0], $subject, $text);
if (!$result["ok"]) {
    json_response((int) ($result["status"] ?? 500), ["ok" => false, "message" => $result["message"] ?? "Gonderim hatasi"]);
}

json_response(200, [
    "ok" => true,
    "message" => !empty($result["simulated"]) ? "Test e-postasi mock modda simule edildi." : "Test e-postasi gonderildi.",
    "messageId" => $result["message_id"] ?? "",
    "simulated" => !empty($result["simulated"]),
]);
