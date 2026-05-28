<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Stream;

/**
 * Captures the exact POST body for Stripe webhook signature verification and re-seeds the request body
 * so Slim's body parser can still run for the same bytes.
 */
final class StripeWebhookRawPayloadMiddleware implements MiddlewareInterface
{
    public const ATTRIBUTE_RAW_BODY = 'stripe_webhook_raw_body';

    private const WEBHOOK_PATH = '/api/v1/billing/webhook';

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $path = $request->getUri()->getPath();
        if ($request->getMethod() !== 'POST' || $path !== self::WEBHOOK_PATH) {
            return $handler->handle($request);
        }

        $raw = (string) $request->getBody();
        $memory = fopen('php://temp', 'r+b');
        if ($memory === false) {
            return $handler->handle($request);
        }
        fwrite($memory, $raw);
        rewind($memory);

        $request = $request
            ->withAttribute(self::ATTRIBUTE_RAW_BODY, $raw)
            ->withBody(new Stream($memory));

        return $handler->handle($request);
    }
}
