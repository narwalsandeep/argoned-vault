<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Support;

use Psr\Http\Message\ServerRequestInterface;

/**
 * Restricts dev-only endpoints to loopback hosts (Host header). Uses the request URI host
 * first; does not trust X-Forwarded-* (could be spoofed off-link).
 */
final class LocalhostOnlyHostChecker
{
    public static function isLoopbackHost(ServerRequestInterface $request): bool
    {
        $host = $request->getUri()->getHost();
        if ($host === '') {
            $raw = (string) ($request->getServerParams()['HTTP_HOST'] ?? '');
            if ($raw === '') {
                $raw = $request->getHeaderLine('Host');
            }
            if ($raw === '') {
                return false;
            }
            if (str_starts_with($raw, '[')) {
                $end = strpos($raw, ']');
                if ($end === false) {
                    return false;
                }
                $host = strtolower(substr($raw, 1, $end - 1));
            } else {
                $host = strtolower(explode(':', $raw, 2)[0]);
            }
        } else {
            $host = self::normalizeHost($host);
        }

        return in_array($host, ['localhost', '127.0.0.1', '::1'], true);
    }

    private static function normalizeHost(string $host): string
    {
        $host = strtolower(trim($host));
        if (str_starts_with($host, '[') && str_ends_with($host, ']')) {
            return substr($host, 1, -1);
        }

        return $host;
    }
}
