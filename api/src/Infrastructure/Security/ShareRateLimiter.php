<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Security;

use Psr\Log\LoggerInterface;

/**
 * File-backed rate limiter for share endpoints. Fail-closed when storage is unavailable.
 */
final class ShareRateLimiter
{
    private const STORAGE_PATH = '/tmp/blackbox-share-rate-limit.json';

    /**
     * @param array{
     *   window_seconds:int,
     *   fetch_max:int,
     *   fetch_per_id_max:int,
     *   create_max:int,
     *   create_window_seconds:int
     * } $config
     */
    public function __construct(
        private readonly array $config,
        private readonly LoggerInterface $logger,
        private readonly string $storagePath = self::STORAGE_PATH,
    ) {
    }

    /**
     * @return array{allowed:bool,retry_after:int,storage_failed:bool}
     */
    public function consumeFetch(string $ip, string $shareId): array
    {
        $window = $this->config['window_seconds'];
        $ipKey = sprintf('share_fetch:%s:%s', $ip, date('YmdHi'));
        $idKey = sprintf('share_fetch_id:%s:%s:%s', $shareId, $ip, date('YmdHi'));

        $ipResult = $this->consume($ipKey, $this->config['fetch_max'], $window);
        if (!$ipResult['allowed']) {
            return $ipResult;
        }

        return $this->consume($idKey, $this->config['fetch_per_id_max'], $window);
    }

    /**
     * @return array{allowed:bool,retry_after:int,storage_failed:bool}
     */
    public function consumeCreate(string $userId): array
    {
        $window = $this->config['create_window_seconds'];
        $key = sprintf('share_create:%s:%s', $userId, date('YmdH'));

        return $this->consume($key, $this->config['create_max'], $window);
    }

    /**
     * @return array{allowed:bool,retry_after:int,storage_failed:bool}
     */
    private function consume(string $key, int $max, int $windowSeconds): array
    {
        $now = time();
        $handle = fopen($this->storagePath, 'c+');
        if ($handle === false) {
            $this->logger->error('share_rate_limit_storage_unavailable');

            return ['allowed' => false, 'retry_after' => 60, 'storage_failed' => true];
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                $this->logger->error('share_rate_limit_lock_failed');

                return ['allowed' => false, 'retry_after' => 60, 'storage_failed' => true];
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

                return ['allowed' => false, 'retry_after' => $retryAfter, 'storage_failed' => false];
            }

            return ['allowed' => true, 'retry_after' => 0, 'storage_failed' => false];
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
