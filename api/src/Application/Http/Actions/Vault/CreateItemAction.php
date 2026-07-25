<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Vault;

use Blackbox\Application\Billing\PlanCapabilityService;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Vault\VaultService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class CreateItemAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly VaultService $vaultService,
        private readonly PlanCapabilityService $planCapabilities,
    )
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        $existing = $this->vaultService->countActiveItems($userId);
        if (!$this->planCapabilities->userMayCreateVaultItems($userId, $existing, 1)) {
            $limit = $this->planCapabilities->itemLimitForUser($userId);

            return JsonResponder::write(
                new Response(),
                [
                    'error' => 'vault_item_limit_reached',
                    'message' => "Plan item limit reached ({$limit}). Upgrade or delete items to continue.",
                ],
                403,
            );
        }
        /** @var array<string,mixed> $payload */
        $payload = (array) $request->getParsedBody();

        try {
            $item = $this->vaultService->createItem($userId, $payload);
        } catch (\Throwable $e) {
            return JsonResponder::write(new Response(), ['error' => $e->getMessage()], 400);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok', 'item' => $item], 201);
    }
}

