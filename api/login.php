<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";
require __DIR__ . "/db.php";

handle_options();
cors_headers();

function normalize_role(string $role): string
{
    $r = mb_strtolower(trim($role), "UTF-8");
    if ($r === "admin" || $r === "yönetici" || $r === "yonetici") return "admin";
    if ($r === "eğitmen" || $r === "egitmen" || $r === "instructor") return "instructor";
    if ($r === "öğrenci" || $r === "ogrenci" || $r === "student") return "student";
    // Fallback: unknown roles treated as student.
    return "student";
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

$body = read_json_body();
$identity = trim((string) ($body["identity"] ?? ""));
$password = (string) ($body["password"] ?? "");
$remember = (bool) ($body["remember"] ?? true);

if ($identity === "" || $password === "") {
    json_response(400, ["ok" => false, "message" => "E-posta/kullanici adi ve sifre zorunludur."]);
}

// Statik admin girisi (DB kurulmadan once veya acil yonetici girisi icin).
// Not: Varsayilan olarak kapalidir; .env ile acabilirsiniz.
load_env_file(dirname(__DIR__) . DIRECTORY_SEPARATOR . ".env");
$identityLower = strtolower($identity);

$staticAdminEnabledRaw = getenv("STATIC_ADMIN_ENABLED");
$staticAdminEnabled = $staticAdminEnabledRaw === false
    ? false
    : filter_var($staticAdminEnabledRaw, FILTER_VALIDATE_BOOLEAN);
$staticAdminEmail = strtolower((string) (getenv("STATIC_ADMIN_EMAIL") ?: "admin@gmail.com"));
$staticAdminUsername = strtolower((string) (getenv("STATIC_ADMIN_USERNAME") ?: "admin"));
$staticAdminPassword = (string) (getenv("STATIC_ADMIN_PASSWORD") ?: "Admin244229!");

$identityMatches = ($identityLower === $staticAdminEmail || $identityLower === $staticAdminUsername);
$passwordMatches = hash_equals($staticAdminPassword, $password);

if ($staticAdminEnabled && $identityMatches && $passwordMatches) {
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
        "id" => 1,
        "role" => "admin",
        "full_name" => "Admin",
        "username" => $staticAdminUsername,
        "email" => $staticAdminEmail,
    ];

    json_response(200, [
        "ok" => true,
        "message" => "Giris basarili (statik admin).",
        "redirect" => "s.adminpanel.html",
        "user" => [
            "id" => 1,
            "role" => "admin",
            "fullName" => "Admin",
            "email" => $staticAdminEmail,
        ],
    ]);
}

    try {
        $pdo = db();
        $stmt = $pdo->prepare(
            "SELECT id, role, full_name, username, email, password_hash, is_active
         FROM users
         WHERE email = :identity OR username = :identity
         LIMIT 1"
    );
    $stmt->execute(["identity" => $identity]);
    $user = $stmt->fetch();

    if (!$user) {
        json_response(401, ["ok" => false, "message" => "Kullanici bulunamadi."]);
    }
    if ((int) ($user["is_active"] ?? 0) !== 1) {
        json_response(403, ["ok" => false, "message" => "Kullanici pasif durumda."]);
    }

    $hash = (string) ($user["password_hash"] ?? "");
    if ($hash === "" || !password_verify($password, $hash)) {
        json_response(401, ["ok" => false, "message" => "Sifre hatali."]);
    }

    if (session_status() !== PHP_SESSION_ACTIVE) {
        $lifetime = $remember ? 60 * 60 * 24 * 30 : 0;
        session_set_cookie_params([
            "lifetime" => $lifetime,
            "path" => "/",
            "httponly" => true,
            "samesite" => "Lax",
        ]);
        session_start();
    }
    session_regenerate_id(true);

    $_SESSION["auth_user"] = [
        "id" => (int) $user["id"],
        "role" => normalize_role((string) ($user["role"] ?? "")),
        "full_name" => (string) $user["full_name"],
        "username" => (string) ($user["username"] ?? ""),
        "email" => (string) $user["email"],
    ];

    $role = normalize_role((string) ($user["role"] ?? ""));
    $redirect = "userpanel.html";
    if ($role === "admin") {
        $redirect = "s.adminpanel.html";
    } elseif ($role === "instructor") {
        $redirect = "egitmenpanel.html";
    }

    json_response(200, [
        "ok" => true,
        "message" => "Giris basarili.",
        "redirect" => $redirect,
        "user" => [
            "id" => (int) $user["id"],
            "role" => $role,
            "fullName" => (string) $user["full_name"],
            "email" => (string) $user["email"],
            "roleLabel" => (string) ($user["role"] ?? ""),
        ],
    ]);
} catch (Throwable $e) {
    json_response(500, ["ok" => false, "message" => "Sunucu hatasi: " . $e->getMessage()]);
}
