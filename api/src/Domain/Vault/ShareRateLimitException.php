<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

final class ShareRateLimitException extends \RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $retryAfter,
        public readonly bool $storageFailed = false,
    ) {
        parent::__construct($message);
    }
}
