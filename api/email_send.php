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
$sendAt = trim((string) ($body["sendAt"] ?? ""));
$maxRecipients = (int) ($cfg["max_recipients"] ?? 200);

if ($subject === "" || $text === "") {
    json_response(400, ["ok" => false, "message" => "Konu ve icerik zorunludur."]);
}
if (count($recipients) === 0) {
    json_response(400, ["ok" => false, "message" => "En az bir alici zorunludur."]);
}
if (count($recipients) > $maxRecipients) {
    json_response(400, ["ok" => false, "message" => "En fazla {$maxRecipients} alici desteklenir."]);
}
foreach ($recipients as $email) {
    if (!is_valid_email($email)) {
        json_response(400, ["ok" => false, "message" => "Alici listesinde gecersiz e-posta var."]);
    }
}
if ($sendAt !== "") {
    json_response(400, [
        "ok" => false,
        "message" => "PHP/Brevo hizli kurulumunda zamanli gonderim kapali. sendAt bos birakin."
    ]);
}
$delivered = 0;
$failed = 0;
$lastError = "";
 $simulatedAny = false;

foreach ($recipients as $email) {
    $result = send_brevo_email($cfg, $email, $subject, $text);
    if ($result["ok"]) {
        $delivered++;
        if (!empty($result["simulated"])) $simulatedAny = true;
    } else {
        $failed++;
        $lastError = (string) ($result["message"] ?? "Brevo gonderim hatasi");
    }
}

if ($delivered === 0 && $failed > 0) {
    json_response(500, [
        "ok" => false,
        "message" => $lastError !== "" ? $lastError : "Toplu gonderim basarisiz.",
    ]);
}

json_response(200, [
    "ok" => true,
    "scheduled" => false,
    "recipientCount" => count($recipients),
    "delivered" => $delivered,
    "failed" => $failed,
    "simulated" => $simulatedAny,
]);
