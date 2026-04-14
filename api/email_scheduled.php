<?php
declare(strict_types=1);

require __DIR__ . "/_brevo.php";

handle_options();
cors_headers();

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    json_response(405, ["ok" => false, "message" => "Method not allowed"]);
}

json_response(200, [
    "ok" => true,
    "count" => 0,
    "jobs" => [],
    "message" => "PHP/Brevo hizli kurulumunda zamanli gonderim kapali.",
]);

