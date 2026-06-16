<?php

declare(strict_types=1);

namespace Blackbox\Domain\Auth;

/**
 * Client-supplied onboarding snapshot for a one-time completion email.
 * The unlock secret is never stored server-side; it is used only to render the outbound message.
 */
final class OnboardingCompletionMailData
{
    public const UNLOCK_SECRET_MIN_LENGTH = 12;

    public const UNLOCK_SECRET_MAX_LENGTH = 512;

    /** @var list<int> */
    private const AUTO_LOCK_MINUTES_PRESETS = [2, 4, 8, 16, 32, 64];

    private const ARGON2_TIME_MIN = 2;

    private const ARGON2_TIME_MAX = 6;

    private const ARGON2_MEMORY_KIB_MIN = 65536;

    private const ARGON2_MEMORY_KIB_MAX = 262144;

    private const ARGON2_MEMORY_KIB_STEP = 32768;

    private const ARGON2_PARALLELISM_MIN = 1;

    private const ARGON2_PARALLELISM_MAX = 2;

    public function __construct(
        public readonly string $unlockSecret,
        public readonly int $autoLockMinutes,
        public readonly int $argon2TimeCost,
        public readonly int $argon2MemoryKiB,
        public readonly int $argon2Parallelism,
    ) {
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function fromRequestBody(array $body): self
    {
        $secret = (string) ($body['unlock_secret'] ?? '');
        if (mb_strlen($secret) < self::UNLOCK_SECRET_MIN_LENGTH) {
            throw new \InvalidArgumentException('unlock_secret_too_short');
        }
        if (mb_strlen($secret) > self::UNLOCK_SECRET_MAX_LENGTH) {
            throw new \InvalidArgumentException('unlock_secret_too_long');
        }

        $autoLock = self::parseIntField($body, 'auto_lock_minutes', 'auto_lock_minutes_invalid');
        if (!in_array($autoLock, self::AUTO_LOCK_MINUTES_PRESETS, true)) {
            throw new \InvalidArgumentException('auto_lock_minutes_invalid');
        }

        $timeCost = self::parseIntField($body, 'argon2_time_cost', 'argon2_params_invalid');
        $memoryKiB = self::parseIntField($body, 'argon2_memory_kib', 'argon2_params_invalid');
        $parallelism = self::parseIntField($body, 'argon2_parallelism', 'argon2_params_invalid');

        if ($timeCost < self::ARGON2_TIME_MIN || $timeCost > self::ARGON2_TIME_MAX) {
            throw new \InvalidArgumentException('argon2_params_invalid');
        }
        if (
            $memoryKiB < self::ARGON2_MEMORY_KIB_MIN
            || $memoryKiB > self::ARGON2_MEMORY_KIB_MAX
            || ($memoryKiB - self::ARGON2_MEMORY_KIB_MIN) % self::ARGON2_MEMORY_KIB_STEP !== 0
        ) {
            throw new \InvalidArgumentException('argon2_params_invalid');
        }
        if ($parallelism < self::ARGON2_PARALLELISM_MIN || $parallelism > self::ARGON2_PARALLELISM_MAX) {
            throw new \InvalidArgumentException('argon2_params_invalid');
        }

        return new self($secret, $autoLock, $timeCost, $memoryKiB, $parallelism);
    }

    public function memoryMiBLabel(): string
    {
        $mib = (int) round($this->argon2MemoryKiB / 1024);

        return $mib . ' MiB';
    }

    /**
     * @param array<string, mixed> $body
     */
    private static function parseIntField(array $body, string $key, string $errorCode): int
    {
        if (!array_key_exists($key, $body)) {
            throw new \InvalidArgumentException($errorCode);
        }
        $raw = $body[$key];
        if (is_int($raw)) {
            return $raw;
        }
        if (is_string($raw) && preg_match('/^-?\d+$/', $raw) === 1) {
            return (int) $raw;
        }
        if (is_float($raw) && floor($raw) === $raw) {
            return (int) $raw;
        }

        throw new \InvalidArgumentException($errorCode);
    }
}
