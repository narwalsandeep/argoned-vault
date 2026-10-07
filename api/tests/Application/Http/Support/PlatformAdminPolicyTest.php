<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Support;

use Blackbox\Application\Http\Support\PlatformAdminPolicy;
use PHPUnit\Framework\TestCase;

final class PlatformAdminPolicyTest extends TestCase
{
    public function testEmptyConfiguredEmailNeverMatches(): void
    {
        $this->assertFalse(PlatformAdminPolicy::matches(null, 'admin@example.com'));
        $this->assertFalse(PlatformAdminPolicy::matches('', 'admin@example.com'));
        $this->assertFalse(PlatformAdminPolicy::matches('   ', 'admin@example.com'));
    }

    public function testMatchesCaseInsensitiveWithTrim(): void
    {
        $this->assertTrue(PlatformAdminPolicy::matches('Admin@Example.com', '  admin@example.com  '));
    }

    public function testRejectsNonAdmin(): void
    {
        $this->assertFalse(PlatformAdminPolicy::matches('admin@example.com', 'other@example.com'));
    }
}
