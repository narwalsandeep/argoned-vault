<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Support;

final class CookieFactory
{
    public static function sessionCookie(string $name, string $value, int $ttlSeconds, bool $secure): string
    {
        return sprintf(
            '%s=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=%d%s',
            rawurlencode($name),
            rawurlencode($value),
            $ttlSeconds,
            $secure ? '; Secure' : ''
        );
    }

    public static function clearCookie(string $name, bool $secure): string
    {
        return sprintf(
            '%s=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0%s',
            rawurlencode($name),
            $secure ? '; Secure' : ''
        );
    }
}
