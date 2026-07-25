<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Support;

use Blackbox\Application\Http\Support\LocalhostOnlyHostChecker;
use PHPUnit\Framework\TestCase;
use Slim\Psr7\Factory\ServerRequestFactory;

final class LocalhostOnlyHostCheckerTest extends TestCase
{
    public function testAllowsLocalhostWithPortFromUri(): void
    {
        $req = (new ServerRequestFactory())->createServerRequest('GET', 'http://localhost:3003/api/v1/billing/config');
        self::assertTrue(LocalhostOnlyHostChecker::isLoopbackHost($req));
    }

    public function testAllowsIpv4LoopbackFromUri(): void
    {
        $req = (new ServerRequestFactory())->createServerRequest('GET', 'http://127.0.0.1/foo');
        self::assertTrue(LocalhostOnlyHostChecker::isLoopbackHost($req));
    }

    public function testAllowsIpv6LoopbackFromUri(): void
    {
        $req = (new ServerRequestFactory())->createServerRequest('GET', 'http://[::1]:8080/foo');
        self::assertTrue(LocalhostOnlyHostChecker::isLoopbackHost($req));
    }

    public function testRejectsNonLoopbackHost(): void
    {
        $req = (new ServerRequestFactory())->createServerRequest('GET', 'https://evil.example/foo');
        self::assertFalse(LocalhostOnlyHostChecker::isLoopbackHost($req));
    }

    public function testFallsBackToHttpHostHeaderWhenUriHostMissing(): void
    {
        $req = (new ServerRequestFactory())->createServerRequest('GET', '/api')
            ->withHeader('Host', '127.0.0.1:3003');
        self::assertTrue(LocalhostOnlyHostChecker::isLoopbackHost($req));
    }

    public function testRejectsWhenNoHostInformation(): void
    {
        $req = (new ServerRequestFactory())->createServerRequest('GET', '/');
        self::assertFalse(LocalhostOnlyHostChecker::isLoopbackHost($req));
    }
}
