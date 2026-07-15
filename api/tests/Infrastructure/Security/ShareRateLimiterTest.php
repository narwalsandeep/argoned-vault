<?php

declare(strict_types=1);

namespace Blackbox\Tests\Infrastructure\Security;

use Blackbox\Infrastructure\Security\ShareRateLimiter;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;

final class ShareRateLimiterTest extends TestCase
{
    public function testFailClosedWhenStorageUnavailable(): void
    {
        $limiter = new ShareRateLimiter(
            [
                'window_seconds' => 60,
                'fetch_max' => 30,
                'fetch_per_id_max' => 10,
                'create_max' => 20,
                'create_window_seconds' => 3600,
            ],
            new NullLogger(),
            '/tmp/blackbox-share-rate-limit-not-writable/by-design/rate.json',
        );

        $result = $limiter->consumeFetch('127.0.0.1', 'abc123');

        $this->assertFalse($result['allowed']);
        $this->assertTrue($result['storage_failed']);
    }

    public function testAllowsFetchWithinLimit(): void
    {
        $path = sys_get_temp_dir() . '/bb-share-rate-test-' . bin2hex(random_bytes(4)) . '.json';
        $limiter = new ShareRateLimiter(
            [
                'window_seconds' => 60,
                'fetch_max' => 5,
                'fetch_per_id_max' => 5,
                'create_max' => 5,
                'create_window_seconds' => 3600,
            ],
            new NullLogger(),
            $path,
        );

        $result = $limiter->consumeFetch('10.0.0.1', 'share1');
        $this->assertTrue($result['allowed']);
        @unlink($path);
    }
}
