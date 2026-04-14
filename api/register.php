<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";
require __DIR__ . "/db.php";

handle_options();
cors_headers();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

function normalize_username(string $value): string
{
    $v = mb_strtolower(trim($value), "UTF-8");
    $map = [
        "ğ" => "g", "ü" => "u", "ş" => "s", "ı" => "i", "ö" => "o", "ç" => "c",
        "Ğ" => "g", "Ü" => "u", "Ş" => "s", "İ" => "i", "Ö" => "o", "Ç" => "c",
    ];
    $v = strtr($v, $map);
    // Only allow a-z0-9._-
    $v = preg_replace("/[^a-z0-9._-]+/u", "", $v) ?? "";
    $v = trim($v, "._-");
    if (strlen($v) > 60) {
        $v = substr($v, 0, 60);
        $v = trim($v, "._-");
    }
    return $v;
}

function make_unique_username(PDO $pdo, string $base): string
{
    $base = normalize_username($base);
    if ($base === "") {
        $base = "user";
    }

    $candidate = $base;
    for ($i = 0; $i < 50; $i++) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :u LIMIT 1");
        $stmt->execute(["u" => $candidate]);
        $exists = $stmt->fetch();
        if (!$exists) {
            return $candidate;
        }
        $suffix = (string) ($i + 2);
        $trimLen = 60 - (1 + strlen($suffix)); // "_" + suffix
        $prefix = $base;
        if (strlen($prefix) > $trimLen) {
            $prefix = substr($prefix, 0, $trimLen);
            $prefix = trim($prefix, "._-");
            if ($prefix === "") {
                $prefix = "user";
            }
        }
        $candidate = $prefix . "_" . $suffix;
    }

    // As a last resort
    return substr("user_" . bin2hex(random_bytes(6)), 0, 60);
}

try {
    $body = read_json_body();
    $firstName = trim((string)($body["firstName"] ?? ""));
    $lastName = trim((string)($body["lastName"] ?? ""));
    $email = strtolower(trim((string)($body["email"] ?? "")));
    $password = (string)($body["password"] ?? "");
    $remember = (bool)($body["remember"] ?? true);

    if ($firstName === "" || $lastName === "" || $email === "" || $password === "") {
        json_response(400, ["ok" => false, "message" => "Ad, soyad, e-posta ve şifre zorunludur."]);
    }
    if (!is_valid_email($email)) {
        json_response(400, ["ok" => false, "message" => "Geçerli bir e-posta girin."]);
    }
    if (mb_strlen($password, "UTF-8") < 4) {
        json_response(400, ["ok" => false, "message" => "Şifre en az 4 karakter olmalı."]);
    }

    $fullName = trim($firstName . " " . $lastName);
    if (mb_strlen($fullName, "UTF-8") > 120) {
        json_response(400, ["ok" => false, "message" => "Ad soyad çok uzun."]);
    }

    $pdo = db();

    // Ensure email unique
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :e LIMIT 1");
    $stmt->execute(["e" => $email]);
    if ($stmt->fetch()) {
        json_response(409, ["ok" => false, "message" => "Bu e-posta ile zaten kayıt var."]);
    }

    $emailPrefix = explode("@", $email, 2)[0] ?? "user";
    $username = make_unique_username($pdo, $emailPrefix);
    $hash = password_hash($password, PASSWORD_DEFAULT);
    if (!is_string($hash) || $hash === "") {
        json_response(500, ["ok" => false, "message" => "Şifre hashlenemedi."]);
    }

    $ins = $pdo->prepare(
        "INSERT INTO users (role, full_name, username, email, phone, password_hash, is_active)
         VALUES ('student', :full_name, :username, :email, NULL, :password_hash, 1)"
    );
    $ins->execute([
        "full_name" => $fullName,
        "username" => $username,
        "email" => $email,
        "password_hash" => $hash,
    ]);

    $id = (int)$pdo->lastInsertId();

    // Start session and authenticate
    $lifetime = $remember ? 60 * 60 * 24 * 30 : 0;
    session_set_cookie_params([
        "lifetime" => $lifetime,
        "path" => "/",
        "httponly" => true,
        "samesite" => "Lax",
    ]);
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    session_regenerate_id(true);

    $_SESSION["auth_user"] = [
        "id" => $id,
        "role" => "student",
        "full_name" => $fullName,
        "username" => $username,
        "email" => $email,
    ];

    json_response(200, [
        "ok" => true,
        "message" => "Kayıt başarılı.",
        "redirect" => "userpanel.html",
        "user" => [
            "id" => $id,
            "role" => "student",
            "fullName" => $fullName,
            "username" => $username,
            "email" => $email,
            "roleLabel" => "student",
        ],
    ]);
} catch (PDOException $e) {
    $code = (string)($e->getCode() ?? "");
    // 23000: integrity constraint violation (duplicate)
    if ($code === "23000") {
        json_response(409, ["ok" => false, "message" => "Bu kullanıcı zaten kayıtlı olabilir."]);
    }
    json_response(500, ["ok" => false, "message" => "DB hatası: " . $e->getMessage()]);
} catch (Throwable $e) {
    json_response(500, ["ok" => false, "message" => "Sunucu hatası: " . $e->getMessage()]);
}

