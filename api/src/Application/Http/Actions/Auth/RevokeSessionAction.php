<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\RouteArguments;
use Blackbox\Domain\Auth\SessionService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class RevokeSessionAction implements RequestHandlerInterface
{
    public function __construct(private readonly SessionService $sessionService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $sessionId = RouteArguments::getString($request, 'id') ?? '';
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        if ($sessionId === '') {
            return JsonResponder::write(new Response(), ['error' => 'session_id_required'], 400);
        }
        if ($userId === '') {
            return JsonResponder::write(new Response(), ['error' => 'unauthorized'], 401);
        }

        $revoked = $this->sessionService->revokeByIdForUser($sessionId, $userId);
        if (!$revoked) {
            return JsonResponder::write(new Response(), ['error' => 'session_not_found'], 404);
        }
        return JsonResponder::write(new Response(), ['status' => 'ok']);
    }
}
