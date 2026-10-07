<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

/** Matches client access-code shape: four groups of four alphanumeric characters. */
final class ShareAccessCodeFormat
{
    private const GROUPS = 4;
    private const GROUP_LENGTH = 4;

    public static function normalize(string $raw): string
    {
        return preg_replace('/\s+/', '', trim($raw)) ?? '';
    }

    public static function isValid(string $raw): bool
    {
        $normalized = self::normalize($raw);
        if ($normalized === '') {
            return false;
        }
        $pattern = '/^[A-Za-z0-9]{' . self::GROUP_LENGTH . '}'
            . '(-[A-Za-z0-9]{' . self::GROUP_LENGTH . '}){' . (self::GROUPS - 1) . '}$/';

        return (bool) preg_match($pattern, $normalized);
    }
}
