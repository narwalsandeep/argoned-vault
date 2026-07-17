<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

interface ShareRateLimiterInterface
{
    /**
     * @return array{allowed:bool,retry_after:int,storage_failed:bool}
     */
    public function consumeFetch(string $ip, string $shareId): array;

    /**
     * @return array{allowed:bool,retry_after:int,storage_failed:bool}
     */
    public function consumeCreate(string $userId): array;
}
