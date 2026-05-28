<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

use Blackbox\Infrastructure\Vault\VaultItemRepository;
use Blackbox\Infrastructure\Vault\VaultFileRepository;
use Blackbox\Infrastructure\Vault\VaultProfileRepository;
use Blackbox\Infrastructure\Vault\VaultRecoveryRepository;

final class VaultService implements RecoveryArtifactReader, VaultActiveItemCountReader
{
    private const BULK_CREATE_MAX_ITEMS = 512;

    public function __construct(
        private readonly VaultProfileRepository $profiles,
        private readonly VaultItemRepository $items,
        private readonly VaultRecoveryRepository $recovery,
        private readonly VaultFileRepository $files,
    ) {
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function upsertProfile(string $userId, array $payload): void
    {
        $this->profiles->upsert($userId, VaultContractValidator::validateProfile($payload));
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getProfile(string $userId): ?array
    {
        return $this->profiles->getByUserId($userId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createItem(string $userId, array $payload): array
    {
        return $this->items->create($userId, VaultContractValidator::validateItem($payload), null);
    }

    public function countActiveItems(string $userId): int
    {
        return $this->items->countActiveByUserId($userId);
    }

    public function countActiveItemsByType(string $userId, string $itemType): int
    {
        return $this->items->countActiveByUserIdAndType($userId, $itemType);
    }

    public function countActiveFileVaultItems(string $userId): int
    {
        return $this->countActiveItemsByType($userId, 'file');
    }

    public function createFile(string $userId, array $payload): array
    {
        return $this->files->createForVaultItem($userId, VaultFileContractValidator::validate($payload));
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listFilesForVaultItem(string $userId, string $vaultItemId): array
    {
        return $this->files->listByVaultItemId($userId, $vaultItemId);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getFile(string $userId, string $fileId): ?array
    {
        return $this->files->getById($userId, $fileId);
    }

    public function deleteFile(string $userId, string $fileId): bool
    {
        return $this->files->softDelete($userId, $fileId);
    }

    public function sumActiveFilePlaintextBytes(string $userId): int
    {
        return $this->files->sumActivePlaintextBytes($userId);
    }

    /**
     * Bulk-create encrypted vault items (same contract as single create per row).
     * Each row must include `client_index` (int) plus validated item keys; `client_index` is stripped before validation.
     *
     * @param list<array<string,mixed>> $rows
     * @return array{import_batch_id: ?string, results: list<array<string,mixed>>}
     */
    public function createItemsBulk(string $userId, ?string $importBatchId, array $rows): array
    {
        $max = self::BULK_CREATE_MAX_ITEMS;
        if (count($rows) === 0) {
            throw new \InvalidArgumentException('items must be a non-empty array');
        }
        if (count($rows) > $max) {
            throw new \InvalidArgumentException("bulk import exceeds maximum of {$max} items");
        }

        $results = [];
        foreach ($rows as $row) {
            $idx = (int) ($row['client_index'] ?? -1);
            $payload = $row;
            unset($payload['client_index']);
            try {
                $validated = VaultContractValidator::validateItem($payload);
                $item = $this->items->create($userId, $validated, $importBatchId);
                $results[] = ['client_index' => $idx, 'status' => 'ok', 'id' => (string) $item['id']];
            } catch (\Throwable) {
                $results[] = ['client_index' => $idx, 'status' => 'error', 'error' => 'invalid_item'];
            }
        }

        return ['import_batch_id' => $importBatchId, 'results' => $results];
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listItemMetadata(string $userId, string $search = '', bool $searchFullWord = false, bool $searchCaseSensitive = false): array
    {
        $rows = $this->items->listMetadata($userId);
        $search = trim($search);
        if ($search === '') {
            return $rows;
        }

        return array_values(array_filter(
            $rows,
            static fn (array $row): bool => VaultListItemSearch::matches($search, $row, $searchFullWord, $searchCaseSensitive),
        ));
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listItemsForJsonExport(string $userId): array
    {
        return $this->items->listForJsonExport($userId);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getItem(string $userId, string $id): ?array
    {
        return $this->items->getById($userId, $id);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>|null
     */
    public function updateItem(string $userId, string $id, array $payload): ?array
    {
        $existing = $this->items->getById($userId, $id);
        if ($existing === null) {
            return null;
        }
        $validated = VaultContractValidator::validateItem($payload);
        $oldType = (string) ($existing['item_type'] ?? '');
        $newType = $validated['item_type'] ?? '';
        if ($oldType === 'file' && $newType !== 'file' && $this->files->countActiveForVaultItem($userId, $id) > 0) {
            throw new \InvalidArgumentException('vault_file_item_cannot_change_type');
        }
        if ($oldType !== 'file' && $newType === 'file') {
            throw new \InvalidArgumentException('vault_item_cannot_change_to_file');
        }

        return $this->items->update($userId, $id, $validated);
    }

    public function deleteItem(string $userId, string $id): bool
    {
        if (!$this->items->softDelete($userId, $id)) {
            return false;
        }
        $this->files->softDeleteByVaultItemId($userId, $id);

        return true;
    }

    /**
     * Soft-delete every vault item for the user.
     *
     * @return int Number of rows updated
     */
    public function deleteAllItems(string $userId): int
    {
        $this->files->softDeleteAllForUser($userId);

        return $this->items->softDeleteAllForUser($userId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createRecoveryArtifact(string $userId, array $payload): array
    {
        return $this->recovery->createArtifact($userId, VaultRecoveryValidator::validateArtifact($payload));
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getRecoveryArtifact(string $userId): ?array
    {
        return $this->recovery->getLatestActive($userId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function rotateRecoveryArtifact(string $userId, array $payload): array
    {
        $validated = VaultRecoveryValidator::validateArtifact($payload);
        $this->recovery->revokeActive($userId);
        return $this->recovery->createArtifact($userId, $validated);
    }
}

