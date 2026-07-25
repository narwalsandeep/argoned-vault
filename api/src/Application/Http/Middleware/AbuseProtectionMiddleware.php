<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Middleware;

use Blackbox\Application\Http\Support\JsonResponder;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;

final class AbuseProtectionMiddleware implements MiddlewareInterface
{
    private const STORAGE_PATH = '/tmp/blackbox-rate-limit.json';

    /**
     * @param array{
     *   window_seconds:int,
     *   auth_max:int,
     *   recovery_max:int
     * } $rateLimitConfig
     */
    public function __construct(
        private readonly array $rateLimitConfig,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $rule = $this->resolveRule($request->getMethod(), $request->getUri()->getPath());
        if ($rule === null) {
            return $handler->handle($request);
        }

        $ip = $this->resolveClientIp($request);
        $key = sprintf('%s:%s:%s', $rule['name'], $ip, date('YmdHi'));
        $windowSeconds = $this->rateLimitConfig['window_seconds'];
        $max = $rule['max'];

        $result = $this->consume($key, $max, $windowSeconds);
        if (!$result['allowed']) {
            $this->logger->warning('rate_limit_exceeded', [
                'route' => $rule['name'],
                'ip_hash' => hash('sha256', $ip),
                'window_seconds' => $windowSeconds,
                'max' => $max,
            ]);

            return JsonResponder::write(new Response(), ['error' => 'too_many_requests'], 429)
                ->withHeader('Retry-After', (string) $result['retry_after']);
        }

        return $handler->handle($request);
    }

    /**
     * @return array{name:string,max:int}|null
     */
    private function resolveRule(string $method, string $path): ?array
    {
        $authPosts = [
            '/api/v1/auth/login',
            '/api/v1/auth/login/email-otp',
            '/api/v1/auth/login/email-otp/resend',
            '/api/v1/auth/signup',
            '/api/v1/auth/verify-email',
            '/api/v1/auth/verify-email/resend',
            '/api/v1/auth/forgot-password',
            '/api/v1/auth/reset-password',
        ];
        if ($method === 'POST' && in_array($path, $authPosts, true)) {
            return ['name' => 'auth', 'max' => $this->rateLimitConfig['auth_max']];
        }

        if ($method === 'POST' && $path === '/api/v1/auth/recovery/account-reset') {
            return ['name' => 'recovery', 'max' => $this->rateLimitConfig['recovery_max']];
        }

        return null;
    }

    private function resolveClientIp(ServerRequestInterface $request): string
    {
        $forwarded = $request->getHeaderLine('X-Forwarded-For');
        if ($forwarded !== '') {
            $first = trim(explode(',', $forwarded)[0]);
            if ($first !== '') {
                return $first;
            }
        }

        return (string) ($request->getServerParams()['REMOTE_ADDR'] ?? 'unknown');
    }

    /**
     * @return array{allowed:bool,retry_after:int}
     */
    private function consume(string $key, int $max, int $windowSeconds): array
    {
        $now = time();
        $storage = self::STORAGE_PATH;
        $handle = fopen($storage, 'c+');
        if ($handle === false) {
            return ['allowed' => true, 'retry_after' => 0];
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                return ['allowed' => true, 'retry_after' => 0];
            }

            $raw = stream_get_contents($handle);
            $data = [];
            if (is_string($raw) && $raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $data = $decoded;
                }
            }

            $bucket = $data[$key] ?? ['window_start' => $now, 'count' => 0];
            $windowStart = (int) ($bucket['window_start'] ?? $now);
            $count = (int) ($bucket['count'] ?? 0);
            if (($windowStart + $windowSeconds) <= $now) {
                $windowStart = $now;
                $count = 0;
            }

            $count++;
            $data[$key] = [
                'window_start' => $windowStart,
                'count' => $count,
            ];

            $this->cleanupExpired($data, $now, $windowSeconds);

            rewind($handle);
            ftruncate($handle, 0);
            $encoded = json_encode($data);
            if ($encoded !== false) {
                fwrite($handle, $encoded);
            }
            fflush($handle);
            flock($handle, LOCK_UN);

            if ($count > $max) {
                $retryAfter = max(1, ($windowStart + $windowSeconds) - $now);
                return ['allowed' => false, 'retry_after' => $retryAfter];
            }

            return ['allowed' => true, 'retry_after' => 0];
        } finally {
            fclose($handle);
        }
    }

    /**
     * @param array<string,mixed> $data
     */
    private function cleanupExpired(array &$data, int $now, int $windowSeconds): void
    {
        foreach ($data as $existingKey => $bucket) {
            if (!is_array($bucket)) {
                unset($data[$existingKey]);
                continue;
            }

            $start = (int) ($bucket['window_start'] ?? 0);
            if (($start + ($windowSeconds * 2)) <= $now) {
                unset($data[$existingKey]);
            }
        }
    }
}
