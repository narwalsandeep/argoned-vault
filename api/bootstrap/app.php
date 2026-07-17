<?php

declare(strict_types=1);

use Blackbox\Application\Http\Middleware\AbuseProtectionMiddleware;
use Blackbox\Application\Http\Middleware\CorsMiddleware;
use Blackbox\Application\Http\Middleware\PayloadSizeMiddleware;
use Blackbox\Application\Http\Middleware\RequestIdMiddleware;
use Blackbox\Application\Http\Middleware\SecurityHeadersMiddleware;
use Blackbox\Application\Http\Middleware\StripeWebhookRawPayloadMiddleware;
use DI\ContainerBuilder;
use Psr\Log\LoggerInterface;
use Slim\App;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$apiEnvFile = dirname(__DIR__) . '/.env';
if (is_file($apiEnvFile) && is_readable($apiEnvFile)) {
    // Does not override variables already set (e.g. by Docker Compose).
    (new Symfony\Component\Dotenv\Dotenv())->load($apiEnvFile);
}

$settings = require __DIR__ . '/../config/settings.php';

$containerBuilder = new ContainerBuilder();
$containerBuilder->useAutowiring(true);
$containerBuilder->addDefinitions(__DIR__ . '/../config/container.php');
$container = $containerBuilder->build();

AppFactory::setContainer($container);
/** @var App $app */
$app = AppFactory::create();

$app->addRoutingMiddleware();
$app->add(new PayloadSizeMiddleware($settings['security']['max_request_bytes']));
$app->addBodyParsingMiddleware();
$app->add(new StripeWebhookRawPayloadMiddleware());

$logger = $container->get(LoggerInterface::class);
$app->addErrorMiddleware(
    $settings['display_error_details'],
    true,
    true,
    $logger,
);

$app->add(new SecurityHeadersMiddleware());
$app->add(new RequestIdMiddleware());
$app->add(new AbuseProtectionMiddleware($settings['security']['rate_limit'], $logger));
// Outermost: every response (including rate-limit short-circuits) must pass through CORS or browsers show a misleading CORS error.
$app->add(new CorsMiddleware($settings['ui_origins']));

$routes = require __DIR__ . '/../config/routes.php';
$routes($app);

return $app;
