<?php

declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

$apiEnvFile = __DIR__ . '/.env';
if (is_file($apiEnvFile) && is_readable($apiEnvFile)) {
    (new Symfony\Component\Dotenv\Dotenv())->load($apiEnvFile);
}

$dbHost = getenv('DB_HOST') ?: '127.0.0.1';
$dbPort = getenv('DB_PORT') ?: '5454';
$dbName = getenv('DB_NAME') ?: 'blackbox';
$dbUser = getenv('DB_USER') ?: 'blackbox';
$dbPassword = getenv('DB_PASSWORD') ?: '';

return [
    'paths' => [
        'migrations' => '%%PHINX_CONFIG_DIR%%/migrations',
        'seeds' => '%%PHINX_CONFIG_DIR%%/seeds',
    ],
    'environments' => [
        'default_migration_table' => 'phinxlog',
        'default_environment' => 'default',
        'default' => [
            'adapter' => 'pgsql',
            'host' => $dbHost,
            'name' => $dbName,
            'user' => $dbUser,
            'pass' => $dbPassword,
            'port' => (int) $dbPort,
            'charset' => 'utf8',
            'schema' => 'public',
        ],
    ],
    'version_order' => 'creation',
];
