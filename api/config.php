<?php
declare(strict_types=1);

require_once __DIR__ . "/db.php";
load_env_file(dirname(__DIR__) . DIRECTORY_SEPARATOR . ".env");

return [
    // Sunucuda .env veya hosting panel env varsa otomatik okur.
    // Yoksa burada sabit olarak doldurabilirsiniz.
    "brevo_api_key" => getenv("BREVO_API_KEY") ?: "",
    "mail_from" => getenv("MAIL_FROM") ?: "",
    "mail_from_name" => getenv("MAIL_FROM_NAME") ?: "Eğitim Platformu",
    "max_recipients" => 200,
    // true iken API key yoksa mock basarili cevap doner (gelistirme modu)
    "mock_when_no_key" => false,
];
