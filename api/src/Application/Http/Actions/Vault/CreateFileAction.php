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

final class CreateFileAction implements RequestHandlerInterface
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
                ['error' => 'vault_files_requires_upgrade', 'message' => 'Encrypted file upload requires a paid plan.'],
                403,
            );
        }

        /** @var array<string,mixed> $payload */
        $payload = (array) $request->getParsedBody();
        $mime = isset($payload['mime_type']) ? (string) $payload['mime_type'] : '';
        if (!$this->planCapabilities->isAllowedVaultFileMime($mime)) {
            return JsonResponder::write(new Response(), ['error' => 'vault_file_type_not_allowed'], 400);
        }
        $incomingBytes = isset($payload['plaintext_size_bytes']) ? (int) $payload['plaintext_size_bytes'] : 0;
        if ($incomingBytes <= 0 || $incomingBytes > $this->planCapabilities->vaultFileMaxBytes()) {
            return JsonResponder::write(
                new Response(),
                ['error' => 'vault_file_too_large', 'message' => 'Maximum file size is 20MB.'],
                400,
            );
        }
        $existingBytes = $this->vaultService->sumActiveFilePlaintextBytes($userId);
        if (!$this->planCapabilities->userMayStoreVaultFileBytes($existingBytes, $incomingBytes)) {
            return JsonResponder::write(
                new Response(),
                ['error' => 'vault_file_quota_exceeded', 'message' => 'Per-user encrypted file quota (1GB) reached.'],
                403,
            );
        }

        try {
            $file = $this->vaultService->createFile($userId, $payload);
        } catch (\Throwable $e) {
            return JsonResponder::write(new Response(), ['error' => $e->getMessage()], 400);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok', 'file' => $file], 201);
    }
}
