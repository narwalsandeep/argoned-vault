<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\PlatformAdminPolicy;
use Blackbox\Domain\Auth\AuthService;
use Blackbox\Infrastructure\Auth\UserRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class UpdateDisplayNameAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly AuthService $authService,
        private readonly UserRepository $users,
        private readonly ?string $platformAdminEmail,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        if ($userId === '') {
            return JsonResponder::write(new Response(), ['error' => 'unauthorized'], 401);
        }

        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $displayName = (string) ($body['display_name'] ?? '');

        try {
            $this->authService->updateDisplayName($userId, $displayName);
        } catch (\InvalidArgumentException $e) {
            if ($e->getMessage() === 'display_name_too_long') {
                return JsonResponder::write(new Response(), ['error' => 'display_name_too_long'], 400);
            }

            return JsonResponder::write(new Response(), ['error' => 'invalid_display_name'], 400);
        }

        $user = $this->users->findById($userId);
        if ($user === null) {
            return JsonResponder::write(new Response(), ['error' => 'user_not_found'], 404);
        }

        $csrfToken = (string) $request->getAttribute(AuthMiddleware::CSRF_TOKEN_ATTRIBUTE);

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
        ], 200);
    }
}
