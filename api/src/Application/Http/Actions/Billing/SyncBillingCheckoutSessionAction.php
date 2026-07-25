<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Billing;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Billing\BillingServiceInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class SyncBillingCheckoutSessionAction implements RequestHandlerInterface
{
    public function __construct(private readonly BillingServiceInterface $billing)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $sessionId = isset($body['session_id']) && is_string($body['session_id']) ? trim($body['session_id']) : '';
        if ($sessionId === '') {
            return JsonResponder::write(new Response(), ['error' => 'session_id_required'], 400);
        }

        try {
            $this->billing->syncCheckoutSession($userId, $sessionId);
        } catch (\Throwable $e) {
            return JsonResponder::write(new Response(), ['error' => $e->getMessage()], 400);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok']);
    }
}
