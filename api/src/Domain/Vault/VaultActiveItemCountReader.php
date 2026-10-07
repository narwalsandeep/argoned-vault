<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

/**
 * Read-only counts for billing downgrade / eligibility checks.
 */
interface VaultActiveItemCountReader
{
    public function countActiveItems(string $userId): int;

    public function countActiveFileVaultItems(string $userId): int;
}
