<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\CookieFactory;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\PlatformAdminPolicy;
use Blackbox\Domain\Auth\AuthAuditRecorder;
use Blackbox\Domain\Auth\AuthService;
use Blackbox\Domain\Auth\SessionService;
use Blackbox\Domain\Billing\BillingServiceInterface;
use Blackbox\Infrastructure\Auth\UserRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Self-serve erasure for the signed-in account only.
 * Requires the exact phrase DELETE, and the current password when one is set.
 * Does not delete any other user.
 */
final class DeleteOwnAccountAction implements RequestHandlerInterface
{
    public const CONFIRM_PHRASE = 'DELETE';

    /**
     * @param array{cookie_name:string,ttl_seconds:int,remember_ttl_seconds?:int,secure_cookie:bool} $sessionConfig
     */
    public function __construct(
        private readonly AuthService $authService,
        private readonly UserRepository $users,
        private readonly BillingServiceInterface $billing,
        private readonly SessionService $sessionService,
        private readonly AuthAuditRecorder $audit,
        private readonly array $sessionConfig,
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
        $phrase = trim((string) ($body['confirm_phrase'] ?? ''));
        $password = (string) ($body['current_password'] ?? '');
        if ($phrase !== self::CONFIRM_PHRASE) {
            return JsonResponder::write(new Response(), ['error' => 'confirm_phrase_required'], 422);
        }

        $user = $this->users->findById($userId);
        if ($user === null) {
            return JsonResponder::write(new Response(), ['error' => 'unauthorized'], 401);
        }
        if (PlatformAdminPolicy::matches($this->platformAdminEmail, (string) $user['email'])) {
            return JsonResponder::write(new Response(), ['error' => 'cannot_delete_platform_admin_account'], 403);
        }

        $credentials = $this->users->findIdAndPasswordHashById($userId);
        $hash = $credentials['auth_password_hash'] ?? null;
        $hasPassword = is_string($hash) && $hash !== '';
        if ($hasPassword && !$this->authService->verifyAccountPassword($userId, $password)) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_credentials'], 401);
        }

        $this->audit->record($userId, 'account_self_delete_requested', $request);

        $this->billing->purgeRemoteCustomerForUser($userId);

        if (!$this->users->deleteUserAndAllRelatedData($userId)) {
            return JsonResponder::write(new Response(), ['error' => 'account_delete_failed'], 500);
        }

        $token = $request->getCookieParams()[$this->sessionConfig['cookie_name']] ?? null;
        if (is_string($token) && $token !== '') {
            $this->sessionService->revokeByToken($token);
        }

        $response = JsonResponder::write(new Response(), ['status' => 'ok']);

        return $response->withAddedHeader(
            'Set-Cookie',
            CookieFactory::clearCookie($this->sessionConfig['cookie_name'], $this->sessionConfig['secure_cookie']),
        );
    }
}
