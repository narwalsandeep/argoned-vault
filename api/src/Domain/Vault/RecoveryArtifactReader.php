<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

interface RecoveryArtifactReader
{
    /**
     * @return array<string,mixed>|null
     */
    public function getRecoveryArtifact(string $userId): ?array;
}
