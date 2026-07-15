<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Support;

/**
 * Platform operator: exactly one configured email (ADMIN_EMAIL) may access admin APIs and UI affordances.
 */
final class PlatformAdminPolicy
{
    public static function matches(?string $configuredAdminEmail, string $candidateEmail): bool
    {
        if (!is_string($configuredAdminEmail) || trim($configuredAdminEmail) === '') {
            return false;
        }

        return mb_strtolower(trim($candidateEmail)) === mb_strtolower(trim($configuredAdminEmail));
    }
}
