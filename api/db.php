<?php
declare(strict_types=1);

function load_env_file(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return;
    }

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === "" || str_starts_with($trimmed, "#")) {
            continue;
        }
        $parts = explode("=", $trimmed, 2);
        if (count($parts) !== 2) {
            continue;
        }
        $key = trim($parts[0]);
        $value = trim($parts[1]);
        if ($key === "") {
            continue;
        }
        if (
            (str_starts_with($value, "\"") && str_ends_with($value, "\"")) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }
        if (getenv($key) === false) {
            putenv($key . "=" . $value);
            $_ENV[$key] = $value;
        }
    }
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    load_env_file(dirname(__DIR__) . DIRECTORY_SEPARATOR . ".env");

    $host = getenv("DB_HOST") ?: "127.0.0.1";
    $port = getenv("DB_PORT") ?: "3306";
    $name = getenv("DB_NAME") ?: "edu_platform_demo";
    $user = getenv("DB_USER") ?: "root";
    $pass = getenv("DB_PASS") ?: "";

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

