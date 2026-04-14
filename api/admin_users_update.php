<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";
require __DIR__ . "/db.php";

handle_options();
cors_headers();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

$admin = require_admin_session();

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

try {
    $body = read_json_body();
    $id = (int)($body["id"] ?? 0);
    $fullName = trim((string)($body["fullName"] ?? ""));
    $email = strtolower(trim((string)($body["email"] ?? "")));
    $phone = trim((string)($body["phone"] ?? ""));
    $password = (string)($body["password"] ?? "");
    $role = normalize_role_input((string)($body["role"] ?? "student"));
    $isActive = (bool)($body["isActive"] ?? true);
    $usernameInput = trim((string)($body["username"] ?? ""));

    if ($id <= 0) {
        json_response(400, ["ok" => false, "message" => "id gerekli."]);
    }
    if ($fullName === "" || $email === "") {
        json_response(400, ["ok" => false, "message" => "Ad soyad ve e-posta zorunludur."]);
    }
    if (!is_valid_email($email)) {
        json_response(400, ["ok" => false, "message" => "Geçerli bir e-posta girin."]);
    }
    if ($password !== "" && mb_strlen($password, "UTF-8") < 4) {
        json_response(400, ["ok" => false, "message" => "Şifre en az 4 karakter olmalı."]);
    }

    $username = normalize_username($usernameInput);
    if ($role !== "student" && $username === "") {
        json_response(400, ["ok" => false, "message" => "Eğitmen/Admin için kullanıcı adı zorunludur."]);
    }

    $pdo = db();

    $stmt = $pdo->prepare("SELECT id FROM users WHERE id = :id LIMIT 1");
    $stmt->execute(["id" => $id]);
    if (!$stmt->fetch()) {
        json_response(404, ["ok" => false, "message" => "Kullanıcı bulunamadı."]);
    }

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :e AND id <> :id LIMIT 1");
    $stmt->execute(["e" => $email, "id" => $id]);
    if ($stmt->fetch()) {
        json_response(409, ["ok" => false, "message" => "Bu e-posta başka bir kullanıcı tarafından kullanılıyor."]);
    }

    if ($username !== "") {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :u AND id <> :id LIMIT 1");
        $stmt->execute(["u" => $username, "id" => $id]);
        if ($stmt->fetch()) {
            json_response(409, ["ok" => false, "message" => "Bu kullanıcı adı başka bir kullanıcı tarafından kullanılıyor."]);
        }
    } else {
        $username = null;
    }

    $fields = [
        "role" => $role,
        "full_name" => $fullName,
        "username" => $username,
        "email" => $email,
        "phone" => $phone !== "" ? $phone : null,
        "is_active" => $isActive ? 1 : 0,
    ];

    $setSql = "role = :role, full_name = :full_name, username = :username, email = :email, phone = :phone, is_active = :is_active";
    if ($password !== "") {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        if (!is_string($hash) || $hash === "") {
            json_response(500, ["ok" => false, "message" => "Şifre hashlenemedi."]);
        }
        $fields["password_hash"] = $hash;
        $setSql .= ", password_hash = :password_hash";
    }
    $fields["id"] = $id;

    $upd = $pdo->prepare("UPDATE users SET {$setSql} WHERE id = :id");
    $upd->execute($fields);

    json_response(200, ["ok" => true]);
} catch (PDOException $e) {
    if ((string)($e->getCode() ?? "") === "23000") {
        json_response(409, ["ok" => false, "message" => "Bu kullanıcı zaten kayıtlı olabilir."]);
    }
    json_response(500, ["ok" => false, "message" => "DB hatası: " . $e->getMessage()]);
} catch (Throwable $e) {
    json_response(500, ["ok" => false, "message" => "Sunucu hatası: " . $e->getMessage()]);
}

