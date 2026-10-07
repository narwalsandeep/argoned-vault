<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

interface VaultProfileReader
{
    /**
     * @return array<string, mixed>|null
     */
    public function getByUserId(string $userId): ?array;
}
