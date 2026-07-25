<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Vault;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\AuthService;
use Blackbox\Domain\Vault\VaultService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Soft-deletes every vault item for the authenticated user after verifying their **account** (login) password.
 */
final class DeleteAllVaultItemsAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly VaultService $vaultService,
        private readonly AuthService $authService,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $password = trim((string) ($body['account_password'] ?? ''));
        if ($password === '') {
            return JsonResponder::write(new Response(), ['error' => 'account_password_required'], 400);
        }

        if (!$this->authService->verifyAccountPassword($userId, $password)) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_account_password'], 403);
        }

        $deleted = $this->vaultService->deleteAllItems($userId);

        return JsonResponder::write(
            new Response(),
            [
                'status' => 'ok',
                'deleted_count' => $deleted,
            ],
            200,
        );
    }
}
