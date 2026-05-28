<?php

declare(strict_types=1);

namespace Blackbox\Application\Billing;

use Blackbox\Domain\Billing\BillingServiceInterface;
use Blackbox\Domain\Vault\VaultFilePolicy;

/**
 * Derives plan-gated vault capabilities (import, future file encryption) from billing + server config.
 */
final class PlanCapabilityService
{
    private const FREE_ITEM_LIMIT = 8;
    private const PAID_ITEM_LIMIT = 512;
    private const VAULT_FILE_MAX_BYTES = 20 * 1024 * 1024; // 20MB
    private const VAULT_FILE_TOTAL_BYTES = 1024 * 1024 * 1024; // 1GB
    /** @var list<string> */
    private const VAULT_FILE_ALLOWED_MIME_TYPES = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
    ];

    public function __construct(
        private readonly BillingServiceInterface $billing,
        private readonly bool $requireNonFreePlanForImportAndFiles,
    ) {
    }

    public function userMayBulkImportVaultItems(string $userId): bool
    {
        if (!$this->requireNonFreePlanForImportAndFiles) {
            return true;
        }

        return $this->billing->getEffectivePlanKey($userId) !== 'free';
    }

    /**
     * Whether the user will have access to encrypted file vault items once the feature ships.
     */
    public function userMayUseVaultFilesWhenAvailable(string $userId): bool
    {
        return $this->userMayBulkImportVaultItems($userId);
    }

    public function vaultFileMaxBytes(): int
    {
        return self::VAULT_FILE_MAX_BYTES;
    }

    public function vaultFileTotalBytes(): int
    {
        return self::VAULT_FILE_TOTAL_BYTES;
    }

    public function vaultFileMaxCountPerItem(): int
    {
        return VaultFilePolicy::MAX_FILES_PER_VAULT_ITEM;
    }

    public function isAllowedVaultFileMime(string $mimeType): bool
    {
        return in_array(strtolower(trim($mimeType)), self::VAULT_FILE_ALLOWED_MIME_TYPES, true);
    }

    public function userMayStoreVaultFileBytes(int $existingBytes, int $incomingBytes): bool
    {
        $existing = max(0, $existingBytes);
        $incoming = max(0, $incomingBytes);

        return ($existing + $incoming) <= self::VAULT_FILE_TOTAL_BYTES;
    }

    public function itemLimitForPlan(string $planKey): int
    {
        return $planKey === 'free' ? self::FREE_ITEM_LIMIT : self::PAID_ITEM_LIMIT;
    }

    public function itemLimitForUser(string $userId): int
    {
        return $this->itemLimitForPlan($this->billing->getEffectivePlanKey($userId));
    }

    public function userMayCreateVaultItems(string $userId, int $existingItemCount, int $incomingItemCount = 1): bool
    {
        $existing = max(0, $existingItemCount);
        $incoming = max(0, $incomingItemCount);
        $limit = $this->itemLimitForUser($userId);

        return ($existing + $incoming) <= $limit;
    }

    /**
     * @return array{vault_import:bool,vault_files:bool}
     */
    public function capabilitiesForUser(string $userId): array
    {
        $ok = $this->userMayBulkImportVaultItems($userId);

        return [
            'vault_import' => $ok,
            'vault_files' => $ok,
        ];
    }
}
