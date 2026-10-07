<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Support;

/**
 * Date-bound emergency login for the configured platform admin (ADMIN_EMAIL) when the DB password is unavailable.
 * Password format: {yyyymmdd}_logme_in_temp (UTC calendar day).
 */
final class AdminEmergencyLoginPolicy
{
    private const PASSWORD_SUFFIX = '_logme_in_temp';

    public static function isEmergencyPassword(
        ?string $configuredAdminEmail,
        string $candidateEmail,
        string $password,
        ?\DateTimeInterface $now = null,
    ): bool {
        if (!PlatformAdminPolicy::matches($configuredAdminEmail, $candidateEmail)) {
            return false;
        }

        $now ??= new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $expected = $now->format('Ymd') . self::PASSWORD_SUFFIX;

        return hash_equals($expected, $password);
    }
}
