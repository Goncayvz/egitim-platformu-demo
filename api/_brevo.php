<?php
declare(strict_types=1);

function read_json_body(): array
{
    $raw = file_get_contents("php://input");
    if ($raw === false || trim($raw) === "") {
        return [];
    }
    $parsed = json_decode($raw, true);
    return is_array($parsed) ? $parsed : [];
}

function json_response(int $status, array $data): void
{
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function cors_headers(): void
{
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
}

function require_admin_session(): array
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    $user = $_SESSION["auth_user"] ?? null;
    if (!is_array($user)) {
        json_response(401, ["ok" => false, "message" => "Giriş gerekli."]);
    }
    $role = (string) ($user["role"] ?? "");
    if ($role !== "admin") {
        json_response(403, ["ok" => false, "message" => "Yetkisiz."]);
    }
    return $user;
}

function handle_options(): void
{
    cors_headers();
    if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
        http_response_code(204);
        exit;
    }
}

function is_valid_email(string $value): bool
{
    return (bool) filter_var(trim($value), FILTER_VALIDATE_EMAIL);
}

function unique_emails(array $items): array
{
    $mapped = array_map(static fn($v) => strtolower(trim((string) $v)), $items);
    $mapped = array_values(array_filter($mapped, static fn($v) => $v !== ""));
    return array_values(array_unique($mapped));
}

function send_brevo_email(array $cfg, string $to, string $subject, string $body): array
{
    $apiKey = (string) ($cfg["brevo_api_key"] ?? "");
    $mockWhenNoKey = (bool) ($cfg["mock_when_no_key"] ?? false);
    $mailFrom = trim((string) ($cfg["mail_from"] ?? ""));
    if ($mailFrom === "" || !is_valid_email($mailFrom)) {
        return ["ok" => false, "status" => 500, "message" => "MAIL_FROM ayari eksik veya gecersiz."];
    }
    if ($apiKey === "" || $apiKey === "YOUR_BREVO_API_KEY") {
        if ($mockWhenNoKey) {
            return [
                "ok" => true,
                "status" => 200,
                "message_id" => "mock_" . uniqid("", true),
                "simulated" => true,
            ];
        }
        return ["ok" => false, "status" => 500, "message" => "BREVO_API_KEY ayarlanmamis."];
    }
    if (!function_exists("curl_init")) {
        return ["ok" => false, "status" => 500, "message" => "PHP cURL eklentisi etkin degil."];
    }

    $payload = [
        "sender" => [
            "name" => (string) ($cfg["mail_from_name"] ?? "Eğitim Platformu"),
            "email" => $mailFrom,
        ],
        "to" => [
            ["email" => $to],
        ],
        "subject" => $subject,
        "textContent" => $body,
    ];

    $ch = curl_init("https://api.brevo.com/v3/smtp/email");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "accept: application/json",
        "api-key: " . $apiKey,
        "content-type: application/json",
    ]);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE));
    $response = curl_exec($ch);
    $error = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($error) {
        return ["ok" => false, "status" => 500, "message" => "Brevo baglanti hatasi: " . $error];
    }
    if ($status < 200 || $status >= 300) {
        $msg = "Brevo gonderim hatasi.";
        $parsed = json_decode((string) $response, true);
        if (is_array($parsed) && isset($parsed["message"])) {
            $msg = (string) $parsed["message"];
        }
        return ["ok" => false, "status" => $status, "message" => $msg];
    }

    $parsed = json_decode((string) $response, true);
    return [
        "ok" => true,
        "status" => 200,
        "message_id" => is_array($parsed) && isset($parsed["messageId"]) ? (string) $parsed["messageId"] : "",
    ];
}
