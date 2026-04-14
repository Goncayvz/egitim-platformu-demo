<?php
declare(strict_types=1);

require_once __DIR__ . "/db.php";
load_env_file(dirname(__DIR__) . DIRECTORY_SEPARATOR . ".env");
require_once __DIR__ . "/_payment_settings.php";

header("Content-Type: application/json; charset=utf-8");

$providerEnv = normalize_provider((string) (getenv("PAYMENT_PROVIDER") ?: ""));
$cfg = read_payment_settings();
$providerFile = normalize_provider((string) ($cfg["provider"] ?? ""));
$provider = $providerEnv ?: $providerFile;
$remote = (string) ($_SERVER["REMOTE_ADDR"] ?? "");
$isLocal = ($remote === "127.0.0.1" || $remote === "::1");

function has_env(string $k): bool
{
    $v = getenv($k);
    return is_string($v) && trim($v) !== "";
}

$keys = [
    "paytr" => [
        "PAYTR_MERCHANT_ID",
        "PAYTR_MERCHANT_KEY",
        "PAYTR_MERCHANT_SALT",
    ],
    "iyzico" => [
        "IYZICO_API_KEY",
        "IYZICO_SECRET_KEY",
        "IYZICO_BASE_URL",
    ],
    "stripe" => [
        "STRIPE_SECRET_KEY",
        "STRIPE_PUBLISHABLE_KEY",
    ],
];

$required = $keys[$provider] ?? [];
$missing = array_values(array_filter($required, fn($k) => !has_env($k)));

echo json_encode([
    "ok" => true,
    "provider" => $provider,
    "source" => $providerEnv ? "env" : ($providerFile ? "file" : "none"),
    "isLocal" => $isLocal,
    "requiredKeys" => $required,
    "missingKeys" => $missing,
    "mockStatus" => (string) (getenv("PAYMENT_MOCK_STATUS") ?: "success"),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
