<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Admin;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\PlatformAdminPolicy;
use Blackbox\Application\Http\Support\RouteArguments;
use Blackbox\Domain\Billing\BillingServiceInterface;
use Blackbox\Infrastructure\Auth\UserRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Permanently erases another account (vault, billing cache, sessions, tokens, audit rows for that user).
 * Cannot delete yourself or the configured platform admin identity.
 */
final class DeletePlatformCustomerAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly BillingServiceInterface $billing,
        private readonly ?string $platformAdminEmail,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $authUserId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        $targetId = RouteArguments::getString($request, 'id') ?? '';
        if ($targetId === '' || !self::isUuid($targetId)) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_user_id'], 400);
        }
        if ($targetId === $authUserId) {
            return JsonResponder::write(new Response(), ['error' => 'cannot_delete_self'], 403);
        }

        $target = $this->users->findById($targetId);
        if ($target === null) {
            return JsonResponder::write(new Response(), ['error' => 'user_not_found'], 404);
        }
        if (PlatformAdminPolicy::matches($this->platformAdminEmail, (string) $target['email'])) {
            return JsonResponder::write(new Response(), ['error' => 'cannot_delete_platform_admin_account'], 403);
        }

        $this->billing->purgeRemoteCustomerForUser($targetId);

        if (!$this->users->deleteUserAndAllRelatedData($targetId)) {
            return JsonResponder::write(new Response(), ['error' => 'user_not_found'], 404);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok']);
    }

    private static function isUuid(string $id): bool
    {
        return (bool) preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/Di',
            $id
        );
    }
}
