<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Support;

use Blackbox\Application\Http\Support\AdminEmergencyLoginPolicy;
use PHPUnit\Framework\TestCase;

final class AdminEmergencyLoginPolicyTest extends TestCase
{
    public function testAcceptsMatchingAdminEmailAndDatePassword(): void
    {
        $now = new \DateTimeImmutable('2026-08-24T15:30:00+00:00');

        $this->assertTrue(AdminEmergencyLoginPolicy::isEmergencyPassword(
            'admin@example.com',
            'admin@example.com',
            '20260824_logme_in_temp',
            $now,
        ));
    }

    public function testRejectsWrongDate(): void
    {
        $now = new \DateTimeImmutable('2026-08-24T15:30:00+00:00');

        $this->assertFalse(AdminEmergencyLoginPolicy::isEmergencyPassword(
            'admin@example.com',
            'admin@example.com',
            '20260823_logme_in_temp',
            $now,
        ));
    }

    public function testRejectsNonAdminEmail(): void
    {
        $now = new \DateTimeImmutable('2026-08-24T15:30:00+00:00');

        $this->assertFalse(AdminEmergencyLoginPolicy::isEmergencyPassword(
            'admin@example.com',
            'other@example.com',
            '20260824_logme_in_temp',
            $now,
        ));
    }

    public function testRejectsWhenAdminEmailNotConfigured(): void
    {
        $now = new \DateTimeImmutable('2026-08-24T15:30:00+00:00');

        $this->assertFalse(AdminEmergencyLoginPolicy::isEmergencyPassword(
            null,
            'admin@example.com',
            '20260824_logme_in_temp',
            $now,
        ));
    }
}
