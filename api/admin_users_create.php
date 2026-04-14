<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";
require __DIR__ . "/db.php";

handle_options();
cors_headers();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

require_admin_session();

function normalize_role_input(string $value): string
{
    $v = mb_strtolower(trim($value), "UTF-8");
    if ($v === "admin" || $v === "yönetici" || $v === "yonetici") return "admin";
    if ($v === "instructor" || $v === "eğitmen" || $v === "egitmen") return "instructor";
    if ($v === "student" || $v === "öğrenci" || $v === "ogrenci") return "student";
    return "student";
}

function normalize_username(string $value): string
{
    $v = mb_strtolower(trim($value), "UTF-8");
    $map = [
        "ğ" => "g", "ü" => "u", "ş" => "s", "ı" => "i", "ö" => "o", "ç" => "c",
        "Ğ" => "g", "Ü" => "u", "Ş" => "s", "İ" => "i", "Ö" => "o", "Ç" => "c",
    ];
    $v = strtr($v, $map);
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
    if ($base === "") $base = "user";

    $candidate = $base;
    for ($i = 0; $i < 50; $i++) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :u LIMIT 1");
        $stmt->execute(["u" => $candidate]);
        if (!$stmt->fetch()) return $candidate;

        $suffix = (string)($i + 2);
        $trimLen = 60 - (1 + strlen($suffix));
        $prefix = $base;
        if (strlen($prefix) > $trimLen) {
            $prefix = substr($prefix, 0, $trimLen);
            $prefix = trim($prefix, "._-");
            if ($prefix === "") $prefix = "user";
        }
        $candidate = $prefix . "_" . $suffix;
    }
    return substr("user_" . bin2hex(random_bytes(6)), 0, 60);
}

try {
    $body = read_json_body();
    $fullName = trim((string)($body["fullName"] ?? ""));
    $email = strtolower(trim((string)($body["email"] ?? "")));
    $phone = trim((string)($body["phone"] ?? ""));
    $password = (string)($body["password"] ?? "");
    $role = normalize_role_input((string)($body["role"] ?? "student"));
    $isActive = (bool)($body["isActive"] ?? true);
    $usernameInput = trim((string)($body["username"] ?? ""));

    if ($fullName === "" || $email === "" || $password === "") {
        json_response(400, ["ok" => false, "message" => "Ad soyad, e-posta ve şifre zorunludur."]);
    }
    if (!is_valid_email($email)) {
        json_response(400, ["ok" => false, "message" => "Geçerli bir e-posta girin."]);
    }
    if (mb_strlen($password, "UTF-8") < 4) {
        json_response(400, ["ok" => false, "message" => "Şifre en az 4 karakter olmalı."]);
    }
    if ($role !== "student" && normalize_username($usernameInput) === "") {
        json_response(400, ["ok" => false, "message" => "Eğitmen/Admin için kullanıcı adı zorunludur."]);
    }

    $pdo = db();

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :e LIMIT 1");
    $stmt->execute(["e" => $email]);
    if ($stmt->fetch()) {
        json_response(409, ["ok" => false, "message" => "Bu e-posta ile kayıtlı kullanıcı var."]);
    }

    $username = "";
    if ($usernameInput !== "") {
        $username = normalize_username($usernameInput);
        if ($username === "") {
            json_response(400, ["ok" => false, "message" => "Kullanıcı adı geçersiz."]);
        }
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :u LIMIT 1");
        $stmt->execute(["u" => $username]);
        if ($stmt->fetch()) {
            json_response(409, ["ok" => false, "message" => "Bu kullanıcı adı zaten kullanılıyor."]);
        }
    } else {
        $prefix = explode("@", $email, 2)[0] ?? "user";
        $username = make_unique_username($pdo, $prefix);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    if (!is_string($hash) || $hash === "") {
        json_response(500, ["ok" => false, "message" => "Şifre hashlenemedi."]);
    }

    $ins = $pdo->prepare(
        "INSERT INTO users (role, full_name, username, email, phone, password_hash, is_active)
         VALUES (:role, :full_name, :username, :email, :phone, :password_hash, :is_active)"
    );
    $ins->execute([
        "role" => $role,
        "full_name" => $fullName,
        "username" => $username,
        "email" => $email,
        "phone" => $phone !== "" ? $phone : null,
        "password_hash" => $hash,
        "is_active" => $isActive ? 1 : 0,
    ]);
    $id = (int)$pdo->lastInsertId();

    json_response(200, [
        "ok" => true,
        "user" => [
            "id" => $id,
            "role" => $role,
            "fullName" => $fullName,
            "username" => $username,
            "email" => $email,
            "phone" => $phone,
            "isActive" => $isActive,
        ],
    ]);
} catch (PDOException $e) {
    if ((string)($e->getCode() ?? "") === "23000") {
        json_response(409, ["ok" => false, "message" => "Bu kullanıcı zaten kayıtlı olabilir."]);
    }
    json_response(500, ["ok" => false, "message" => "DB hatası: " . $e->getMessage()]);
} catch (Throwable $e) {
    json_response(500, ["ok" => false, "message" => "Sunucu hatası: " . $e->getMessage()]);
}

