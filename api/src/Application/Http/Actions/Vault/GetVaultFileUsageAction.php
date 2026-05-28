<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Vault;

use Blackbox\Application\Billing\PlanCapabilityService;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Vault\VaultFilePolicy;
use Blackbox\Domain\Vault\VaultService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Exposes per-user encrypted-file quota usage for the UI (no filenames or item contents).
 */
final class GetVaultFileUsageAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly VaultService $vaultService,
        private readonly PlanCapabilityService $planCapabilities,
    ) {
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
        $used = $this->vaultService->sumActiveFilePlaintextBytes($userId);

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'used_bytes' => $used,
            'limit_bytes' => $this->planCapabilities->vaultFileTotalBytes(),
            'max_bytes_per_file' => $this->planCapabilities->vaultFileMaxBytes(),
            'max_files_per_vault_item' => $this->planCapabilities->vaultFileMaxCountPerItem(),
            'suggested_client_batch' => VaultFilePolicy::SUGGESTED_CLIENT_BATCH,
        ]);
    }
}
