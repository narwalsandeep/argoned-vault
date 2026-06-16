<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\CookieFactory;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\SessionService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class LogoutAction implements RequestHandlerInterface
{
    /**
     * @param array{cookie_name:string,ttl_seconds:int,secure_cookie:bool} $sessionConfig
     */
    public function __construct(
        private readonly SessionService $sessionService,
        private readonly array $sessionConfig,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $token = $request->getCookieParams()[$this->sessionConfig['cookie_name']] ?? null;
        if (is_string($token) && $token !== '') {
            $this->sessionService->revokeByToken($token);
        }

        $response = JsonResponder::write(new Response(), ['status' => 'ok']);
        return $response->withAddedHeader(
            'Set-Cookie',
            CookieFactory::clearCookie($this->sessionConfig['cookie_name'], $this->sessionConfig['secure_cookie'])
        );
    }
}
