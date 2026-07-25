<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\PlatformAdminPolicy;
use Blackbox\Infrastructure\Auth\UserRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Returns the authenticated user and CSRF token for the current session cookie.
 * Used by the SPA after refresh so mutating requests can send X-CSRF-Token.
 */
final class CurrentUserAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly ?string $platformAdminEmail,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        $csrfToken = (string) $request->getAttribute(AuthMiddleware::CSRF_TOKEN_ATTRIBUTE);

        $user = $this->users->findById($userId);
        if ($user === null) {
            return JsonResponder::write(new Response(), ['error' => 'user_not_found'], 404);
        }

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'mfa_enabled' => $user['mfa_enabled'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'display_name' => $user['display_name'],
                'email_verified' => $user['email_verified_at'] !== null,
                'platform_admin' => PlatformAdminPolicy::matches($this->platformAdminEmail, (string) $user['email']),
            ],
            'csrf_token' => $csrfToken,
        ]);
    }
}
