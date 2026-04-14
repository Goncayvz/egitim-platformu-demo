<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";
require __DIR__ . "/_payment_settings.php";

handle_options();
cors_headers();

if (($_SERVER["REQUEST_METHOD"] ?? "") !== "POST") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

require_admin_session();

$body = read_json_body();
$provider = normalize_provider((string) ($body["provider"] ?? ""));

$next = read_payment_settings();
if (!is_array($next)) $next = [];

if ($provider !== "") {
    $next["provider"] = $provider;
}

// iyzico
$iy = is_array($next["iyzico"] ?? null) ? $next["iyzico"] : [];
$iyApiKey = trim((string) ($body["iyzicoApiKey"] ?? ""));
$iySecret = trim((string) ($body["iyzicoSecretKey"] ?? ""));
$iyBase = trim((string) ($body["iyzicoBaseUrl"] ?? ""));
if ($iyApiKey !== "") $iy["apiKey"] = $iyApiKey;
if ($iySecret !== "") $iy["secretKey"] = $iySecret;
if ($iyBase !== "") $iy["baseUrl"] = $iyBase;
if (!empty($iy)) $next["iyzico"] = $iy;

// Simple validation when provider is iyzico
if (($next["provider"] ?? "") === "iyzico") {
    $apiKey = trim((string) ($next["iyzico"]["apiKey"] ?? ""));
    $secretKey = trim((string) ($next["iyzico"]["secretKey"] ?? ""));
    $baseUrl = trim((string) ($next["iyzico"]["baseUrl"] ?? ""));
    if ($apiKey === "" || $secretKey === "" || $baseUrl === "") {
        json_response(400, ["ok" => false, "message" => "iyzico için API Key, Secret Key ve Base URL zorunlu."]);
    }
    if (!str_starts_with($baseUrl, "https://")) {
        json_response(400, ["ok" => false, "message" => "Base URL https:// ile başlamalı."]);
    }
}

$next["updatedAt"] = date("c");

if (!write_payment_settings($next)) {
    json_response(500, ["ok" => false, "message" => "Ayarlar kaydedilemedi."]);
}

json_response(200, ["ok" => true]);

