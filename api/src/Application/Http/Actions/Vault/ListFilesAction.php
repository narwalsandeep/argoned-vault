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

final class ListFilesAction implements RequestHandlerInterface
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
        if (!$this->planCapabilities->userMayUseVaultFilesWhenAvailable($userId)) {
            return JsonResponder::write(
                new Response(),
                ['error' => 'vault_files_requires_upgrade', 'message' => 'Encrypted files require a paid plan.'],
                403,
            );
        }
        $q = $request->getQueryParams();
        $vaultItemId = trim((string) ($q['vault_item_id'] ?? ''));
        if ($vaultItemId === '') {
            return JsonResponder::write(new Response(), ['error' => 'invalid_vault_item_id', 'message' => 'vault_item_id is required.'], 400);
        }
        $parent = $this->vaultService->getItem($userId, $vaultItemId);
        if ($parent === null) {
            return JsonResponder::write(new Response(), ['error' => 'item_not_found'], 404);
        }
        if (($parent['item_type'] ?? '') !== 'file') {
            return JsonResponder::write(new Response(), ['error' => 'vault_file_parent_invalid', 'message' => 'Not a file vault item.'], 400);
        }
        $files = $this->vaultService->listFilesForVaultItem($userId, $vaultItemId);

        return JsonResponder::write(new Response(), ['status' => 'ok', 'files' => $files]);
    }
}
