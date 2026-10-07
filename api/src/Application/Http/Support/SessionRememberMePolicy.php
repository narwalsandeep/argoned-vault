<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Support;

/** Parses remember-me preference and resolves account session TTL. */
final class SessionRememberMePolicy
{
    public static function parseRememberMe(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value) || is_float($value)) {
            return (bool) $value;
        }

        $normalized = strtolower(trim((string) $value));

        return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
    }

    /**
     * @param array{ttl_seconds:int, remember_ttl_seconds:int} $sessionConfig
     */
    public static function sessionTtlSeconds(array $sessionConfig, bool $rememberMe): int
    {
        if ($rememberMe) {
            return max(1, $sessionConfig['remember_ttl_seconds']);
        }

        return max(1, $sessionConfig['ttl_seconds']);
    }
}
