<?php
declare(strict_types=1);

require_once __DIR__ . "/db.php";

load_env_file(dirname(__DIR__) . DIRECTORY_SEPARATOR . ".env");

function payment_settings_dir(): string
{
    return __DIR__ . DIRECTORY_SEPARATOR . "storage";
}

function payment_settings_path(): string
{
    return payment_settings_dir() . DIRECTORY_SEPARATOR . "payment_settings.json";
}

function read_payment_settings(): array
{
    $path = payment_settings_path();
    if (!is_file($path) || !is_readable($path)) {
        return [];
    }
    $raw = file_get_contents($path);
    if (!is_string($raw) || trim($raw) === "") {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function write_payment_settings(array $settings): bool
{
    $dir = payment_settings_dir();
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $path = payment_settings_path();
    $json = json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) $json = "{}";
    return file_put_contents($path, $json, LOCK_EX) !== false;
}

function normalize_provider(string $value): string
{
    $v = strtolower(trim($value));
    if (in_array($v, ["mock", "paytr", "iyzico", "stripe"], true)) return $v;
    return "";
}

function mask_secret(string $value): string
{
    $v = trim($value);
    if ($v === "") return "";
    $len = strlen($v);
    if ($len <= 6) return str_repeat("*", $len);
    return substr($v, 0, 2) . str_repeat("*", max(0, $len - 6)) . substr($v, -4);
}

