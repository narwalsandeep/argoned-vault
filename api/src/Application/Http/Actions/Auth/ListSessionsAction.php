<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\SessionService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class ListSessionsAction implements RequestHandlerInterface
{
    public function __construct(private readonly SessionService $sessionService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        $sessions = $this->sessionService->listByUserId($userId);

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'sessions' => $sessions,
        ]);
    }
}
