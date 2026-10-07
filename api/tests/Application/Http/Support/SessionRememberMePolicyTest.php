<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Support;

use Blackbox\Application\Http\Support\SessionRememberMePolicy;
use PHPUnit\Framework\TestCase;

final class SessionRememberMePolicyTest extends TestCase
{
    public function testParseRememberMeAcceptsTruthyValues(): void
    {
        $this->assertTrue(SessionRememberMePolicy::parseRememberMe(true));
        $this->assertTrue(SessionRememberMePolicy::parseRememberMe(1));
        $this->assertTrue(SessionRememberMePolicy::parseRememberMe('true'));
        $this->assertTrue(SessionRememberMePolicy::parseRememberMe('yes'));
    }

    public function testParseRememberMeRejectsFalsyValues(): void
    {
        $this->assertFalse(SessionRememberMePolicy::parseRememberMe(false));
        $this->assertFalse(SessionRememberMePolicy::parseRememberMe(0));
        $this->assertFalse(SessionRememberMePolicy::parseRememberMe('false'));
        $this->assertFalse(SessionRememberMePolicy::parseRememberMe(''));
        $this->assertFalse(SessionRememberMePolicy::parseRememberMe(null));
    }

    public function testSessionTtlSecondsUsesRememberTtlWhenChecked(): void
    {
        $config = ['ttl_seconds' => 86400, 'remember_ttl_seconds' => 7776000];
        $this->assertSame(7776000, SessionRememberMePolicy::sessionTtlSeconds($config, true));
    }

    public function testSessionTtlSecondsUsesStandardTtlWhenUnchecked(): void
    {
        $config = ['ttl_seconds' => 86400, 'remember_ttl_seconds' => 7776000];
        $this->assertSame(86400, SessionRememberMePolicy::sessionTtlSeconds($config, false));
    }
}
