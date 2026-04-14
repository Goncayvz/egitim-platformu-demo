<?php
declare(strict_types=1);

require_once __DIR__ . "/db.php";

/**
 * iyzico REST helpers (IYZWSv2 signing).
 *
 * Notes:
 * - Does NOT log payloads (card data etc).
 * - Reads env from project root .env via load_env_file().
 */

load_env_file(dirname(__DIR__) . DIRECTORY_SEPARATOR . ".env");

function iyzico_config(): array
{
    // Prefer admin-saved settings file (api/storage/payment_settings.json), fallback to env.
    $saved = [];
    try {
        require_once __DIR__ . "/_payment_settings.php";
        $saved = read_payment_settings();
    } catch (Throwable $e) {
        $saved = [];
    }

    $iy = is_array($saved["iyzico"] ?? null) ? $saved["iyzico"] : [];

    $baseUrl = trim((string) (($iy["baseUrl"] ?? "") ?: (getenv("IYZICO_BASE_URL") ?: "https://sandbox-api.iyzipay.com")));
    if ($baseUrl === "") $baseUrl = "https://sandbox-api.iyzipay.com";
    return [
        "apiKey" => (string) (($iy["apiKey"] ?? "") ?: (getenv("IYZICO_API_KEY") ?: "")),
        "secretKey" => (string) (($iy["secretKey"] ?? "") ?: (getenv("IYZICO_SECRET_KEY") ?: "")),
        "baseUrl" => rtrim($baseUrl, "/"),
    ];
}

function iyzico_random_key(): string
{
    try {
        return bin2hex(random_bytes(16));
    } catch (Throwable $e) {
        return (string) (microtime(true) . "_" . mt_rand());
    }
}

function iyzico_build_authorization(string $randomKey, string $uriPath, string $bodyJson, string $apiKey, string $secretKey): string
{
    // According to IYZWSv2 signing:
    // signature = HMACSHA256(randomKey + uriPath + requestBody, secretKey)
    $signature = hash_hmac("sha256", $randomKey . $uriPath . $bodyJson, $secretKey);
    $authString = "apiKey:" . $apiKey . "&randomKey:" . $randomKey . "&signature:" . $signature;
    return "IYZWSv2 " . base64_encode($authString);
}

function iyzico_post_json(string $uriPath, array $body): array
{
    $cfg = iyzico_config();
    $apiKey = trim($cfg["apiKey"] ?? "");
    $secretKey = trim($cfg["secretKey"] ?? "");
    $baseUrl = trim($cfg["baseUrl"] ?? "");

    if ($apiKey === "" || $secretKey === "" || $baseUrl === "") {
        return [
            "ok" => false,
            "httpCode" => 200,
            "error" => "IYZICO_KEYS_MISSING",
            "json" => [
                "status" => "failure",
                "errorCode" => "IYZICO_KEYS_MISSING",
                "errorMessage" => "iyzico anahtarları eksik.",
            ],
            "raw" => "",
        ];
    }

    $bodyJson = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($bodyJson)) $bodyJson = "{}";

    $randomKey = iyzico_random_key();
    $auth = iyzico_build_authorization($randomKey, $uriPath, $bodyJson, $apiKey, $secretKey);

    $url = $baseUrl . $uriPath;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $bodyJson);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "Authorization: " . $auth,
        "x-iyzi-rnd: " . $randomKey,
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 25);

    $raw = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if (!is_string($raw)) $raw = "";

    $json = null;
    try {
        $decoded = $raw ? json_decode($raw, true) : null;
        $json = is_array($decoded) ? $decoded : null;
    } catch (Throwable $e) {
        $json = null;
    }

    if ($curlErr) {
        return [
            "ok" => false,
            "httpCode" => $httpCode ?: 0,
            "error" => "CURL_ERROR",
            "curlError" => $curlErr,
            "json" => $json,
            "raw" => $raw,
        ];
    }

    return [
        "ok" => ($httpCode >= 200 && $httpCode < 300),
        "httpCode" => $httpCode,
        "json" => $json,
        "raw" => $raw,
    ];
}
