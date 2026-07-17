<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

interface VaultFieldShareRepositoryInterface
{
    /**
     * @param array<string,mixed> $data
     * @return array<string,mixed>
     */
    public function insertPending(array $data): array;

    /**
     * @param array<string,mixed> $blob
     * @return array<string,mixed>|null
     */
    public function finalizePending(string $shareId, string $ownerUserId, array $blob): ?array;

    public function countActiveForOwner(string $ownerUserId): int;

    /**
     * @return list<array<string,mixed>>
     */
    public function listForOwner(string $ownerUserId): array;

    public function revokeById(string $ownerUserId, string $id): bool;

    public function deleteByVaultItemId(string $ownerUserId, string $vaultItemId): int;

    /**
     * @return array<string,mixed>|null
     */
    public function fetchActive(string $shareId): ?array;

    public function consumeShare(string $shareId, ?string $ipHash): bool;

    public function purgeExpiredAndStalePending(): int;

    public function itemOwnedByUser(string $userId, string $itemId): bool;
}
