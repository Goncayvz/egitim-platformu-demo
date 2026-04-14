<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";
require __DIR__ . "/_payment_settings.php";

handle_options();
cors_headers();

if (($_SERVER["REQUEST_METHOD"] ?? "") !== "GET") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

require_admin_session();

$cfg = read_payment_settings();
$provider = normalize_provider((string) ($cfg["provider"] ?? "")) ?: normalize_provider((string) (getenv("PAYMENT_PROVIDER") ?: ""));

$iyzico = is_array($cfg["iyzico"] ?? null) ? $cfg["iyzico"] : [];
$paytr = is_array($cfg["paytr"] ?? null) ? $cfg["paytr"] : [];
$stripe = is_array($cfg["stripe"] ?? null) ? $cfg["stripe"] : [];

json_response(200, [
    "ok" => true,
    "provider" => $provider,
    "source" => is_array($cfg) && !empty($cfg) ? "file" : "env",
    "iyzico" => [
        "baseUrl" => (string) (($iyzico["baseUrl"] ?? "") ?: (string) (getenv("IYZICO_BASE_URL") ?: "")),
        "apiKeyMasked" => mask_secret((string) (($iyzico["apiKey"] ?? "") ?: (string) (getenv("IYZICO_API_KEY") ?: ""))),
        "secretKeyMasked" => mask_secret((string) (($iyzico["secretKey"] ?? "") ?: (string) (getenv("IYZICO_SECRET_KEY") ?: ""))),
        "hasApiKey" => trim((string) (($iyzico["apiKey"] ?? "") ?: (string) (getenv("IYZICO_API_KEY") ?: ""))) !== "",
        "hasSecretKey" => trim((string) (($iyzico["secretKey"] ?? "") ?: (string) (getenv("IYZICO_SECRET_KEY") ?: ""))) !== "",
    ],
    "paytr" => [
        "merchantIdMasked" => mask_secret((string) (($paytr["merchantId"] ?? "") ?: (string) (getenv("PAYTR_MERCHANT_ID") ?: ""))),
        "merchantKeyMasked" => mask_secret((string) (($paytr["merchantKey"] ?? "") ?: (string) (getenv("PAYTR_MERCHANT_KEY") ?: ""))),
        "merchantSaltMasked" => mask_secret((string) (($paytr["merchantSalt"] ?? "") ?: (string) (getenv("PAYTR_MERCHANT_SALT") ?: ""))),
    ],
    "stripe" => [
        "publishableKeyMasked" => mask_secret((string) (($stripe["publishableKey"] ?? "") ?: (string) (getenv("STRIPE_PUBLISHABLE_KEY") ?: ""))),
        "secretKeyMasked" => mask_secret((string) (($stripe["secretKey"] ?? "") ?: (string) (getenv("STRIPE_SECRET_KEY") ?: ""))),
    ],
]);

