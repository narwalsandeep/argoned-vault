<?php

declare(strict_types=1);

/**
 * Purges expired vault field shares and abandoned pending rows.
 * Schedule hourly in production (cron / systemd timer).
 */
require __DIR__ . '/../vendor/autoload.php';

$apiEnvFile = dirname(__DIR__) . '/.env';
if (is_file($apiEnvFile) && is_readable($apiEnvFile)) {
    (new Symfony\Component\Dotenv\Dotenv())->load($apiEnvFile);
}

$containerBuilder = new DI\ContainerBuilder();
$containerBuilder->useAutowiring(true);
$containerBuilder->addDefinitions(__DIR__ . '/../config/container.php');
$container = $containerBuilder->build();

/** @var \Blackbox\Domain\Vault\VaultFieldShareService $service */
$service = $container->get(\Blackbox\Domain\Vault\VaultFieldShareService::class);
$deleted = $service->purgeExpired();

fwrite(STDOUT, sprintf("Purged %d vault field share row(s).\n", $deleted));
