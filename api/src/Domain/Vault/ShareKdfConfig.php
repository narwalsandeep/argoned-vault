<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

/**
 * Fixed Argon2id parameters for ephemeral field shares (not user-tunable).
 */
final class ShareKdfConfig
{
    public const ALGO = 'argon2id';
    public const CRYPTO_VERSION = 1;
    public const TIME_COST = 3;
    public const MEMORY_KIB = 65536;
    public const PARALLELISM = 1;
    public const PENDING_TTL_SECONDS = 900;
    public const MAX_EXPIRY_DAYS = 7;
    public const MAX_LABEL_LENGTH = 200;
    public const MAX_FIELD_KEY_LENGTH = 64;
    public const MAX_CIPHERTEXT_BYTES = 8192;
    public const MAX_VIEWS = 5;

    /**
     * @return array{timeCost:int,memoryKiB:int,parallelism:int}
     */
    public static function kdfParams(): array
    {
        return [
            'timeCost' => self::TIME_COST,
            'memoryKiB' => self::MEMORY_KIB,
            'parallelism' => self::PARALLELISM,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public static function kdfParamsJsonForStorage(): array
    {
        return self::kdfParams();
    }
}
