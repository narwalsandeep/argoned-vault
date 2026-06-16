<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Middleware;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\PlatformAdminPolicy;
use Blackbox\Infrastructure\Auth\UserRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * After {@see AuthMiddleware}: only the user whose email equals configured mail.admin_email may proceed.
 */
final class PlatformAdminMiddleware implements MiddlewareInterface
{
    /**
     * @param array{admin_email:?string} $mailSettings
     */
    public function __construct(
        private readonly UserRepository $users,
        private readonly array $mailSettings,
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $adminEmail = $this->mailSettings['admin_email'] ?? null;
        if (!is_string($adminEmail) || trim($adminEmail) === '') {
            return JsonResponder::write(new Response(), ['error' => 'forbidden'], 403);
        }

        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        $user = $this->users->findById($userId);
        if ($user === null) {
            return JsonResponder::write(new Response(), ['error' => 'user_not_found'], 404);
        }

        if (!PlatformAdminPolicy::matches($adminEmail, (string) $user['email'])) {
            return JsonResponder::write(new Response(), ['error' => 'forbidden'], 403);
        }

        return $handler->handle($request);
    }
}
