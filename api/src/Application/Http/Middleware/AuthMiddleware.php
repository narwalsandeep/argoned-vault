<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Middleware;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\SessionService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class AuthMiddleware implements MiddlewareInterface
{
    public const USER_ID_ATTRIBUTE = 'auth_user_id';
    public const SESSION_ID_ATTRIBUTE = 'auth_session_id';
    public const CSRF_TOKEN_ATTRIBUTE = 'auth_csrf_token';

    /**
     * @param array{cookie_name:string,ttl_seconds:int,secure_cookie:bool} $sessionConfig
     */
    public function __construct(
        private readonly SessionService $sessionService,
        private readonly array $sessionConfig,
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $token = $request->getCookieParams()[$this->sessionConfig['cookie_name']] ?? null;
        if (!is_string($token) || $token === '') {
            return JsonResponder::write(new Response(), ['error' => 'unauthorized'], 401);
        }

        $session = $this->sessionService->validate($token);
        if ($session === null) {
            return JsonResponder::write(new Response(), ['error' => 'unauthorized'], 401);
        }

        $request = $request
            ->withAttribute(self::USER_ID_ATTRIBUTE, $session['user_id'])
            ->withAttribute(self::SESSION_ID_ATTRIBUTE, $session['id'])
            ->withAttribute(self::CSRF_TOKEN_ATTRIBUTE, $session['csrf_token']);

        if (in_array($request->getMethod(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            $csrf = $request->getHeaderLine('X-CSRF-Token');
            if ($csrf === '' || !hash_equals($session['csrf_token'], $csrf)) {
                return JsonResponder::write(new Response(), ['error' => 'csrf_token_invalid'], 403);
            }
        }

        return $handler->handle($request);
    }
}
