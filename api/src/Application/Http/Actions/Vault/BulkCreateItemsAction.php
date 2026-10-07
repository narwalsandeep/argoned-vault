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

final class BulkCreateItemsAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly PlanCapabilityService $planCapabilities,
        private readonly VaultService $vaultService,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $items = $body['items'] ?? null;
        if (!is_array($items)) {
            return JsonResponder::write(new Response(), ['error' => 'items must be an array'], 400);
        }

        if (!$this->planCapabilities->userMayBulkImportVaultItems($userId)) {
            return JsonResponder::write(
                new Response(),
                [
                    'error' => 'vault_import_requires_upgrade',
                    'message' => 'Vault import is not available on the Free plan. Upgrade your subscription to import items.',
                ],
                403,
            );
        }
        $existing = $this->vaultService->countActiveItems($userId);
        if (!$this->planCapabilities->userMayCreateVaultItems($userId, $existing, count($items))) {
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

        $importBatchId = null;
        if (isset($body['import_batch_id']) && is_string($body['import_batch_id']) && trim($body['import_batch_id']) !== '') {
            $importBatchId = trim($body['import_batch_id']);
        }

        try {
            $out = $this->vaultService->createItemsBulk($userId, $importBatchId, $items);
        } catch (\Throwable $e) {
            return JsonResponder::write(new Response(), ['error' => $e->getMessage()], 400);
        }

        return JsonResponder::write(
            new Response(),
            [
                'status' => 'ok',
                'import_batch_id' => $out['import_batch_id'],
                'results' => $out['results'],
            ],
            200,
        );
    }
}
