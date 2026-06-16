<?php

declare(strict_types=1);

namespace Blackbox\Tests\Domain\Auth;

use Blackbox\Domain\Auth\OAuthLoginService;
use Blackbox\Infrastructure\Auth\OAuthLoginStateRepository;
use Blackbox\Infrastructure\Auth\UserOAuthIdentityRepository;
use Blackbox\Infrastructure\Auth\UserRepository;
use Blackbox\Infrastructure\Http\SimpleHttpClient;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class OAuthLoginServiceTest extends TestCase
{
    public function testProvidersAvailabilityFalseWhenSecretsMissing(): void
    {
        $svc = $this->makeService([
            'state_ttl_seconds' => 600,
            'google' => ['client_id' => 'id', 'client_secret' => ''],
            'linkedin' => ['client_id' => '', 'client_secret' => 'x'],
            'facebook' => ['client_id' => '', 'client_secret' => ''],
        ]);

        $this->assertSame(
            ['google' => false, 'linkedin' => false, 'facebook' => false],
            $svc->providersAvailability(),
        );
    }

    public function testProvidersAvailabilityTrueWhenConfigured(): void
    {
        $svc = $this->makeService([
            'state_ttl_seconds' => 600,
            'google' => ['client_id' => 'a', 'client_secret' => 'b'],
            'linkedin' => ['client_id' => 'c', 'client_secret' => 'd'],
            'facebook' => ['client_id' => 'e', 'client_secret' => 'f'],
        ]);

        $this->assertSame(
            ['google' => true, 'linkedin' => true, 'facebook' => true],
            $svc->providersAvailability(),
        );
    }

    public function testBeginAuthorizationInsertsState(): void
    {
        $states = $this->createMock(OAuthLoginStateRepository::class);
        $states->expects($this->once())->method('deleteExpired');
        $states
            ->expects($this->once())
            ->method('insert')
            ->with(
                $this->callback(static fn (string $h): bool => strlen($h) === 64 && ctype_xdigit($h)),
                'google',
                600,
            );

        $svc = $this->makeService(
            [
                'state_ttl_seconds' => 600,
                'google' => ['client_id' => 'cid', 'client_secret' => 'sec'],
                'linkedin' => ['client_id' => '', 'client_secret' => ''],
                'facebook' => ['client_id' => '', 'client_secret' => ''],
            ],
            $states,
        );

        $url = $svc->beginAuthorization(OAuthLoginService::PROVIDER_GOOGLE);
        $this->assertStringStartsWith('https://accounts.google.com/o/oauth2/v2/auth?', $url);
        $this->assertStringContainsString('client_id=cid', $url);
        $this->assertMatchesRegularExpression('/[?&]state=[0-9a-f]{64}/', $url);
    }

    public function testFinishAuthorizationRejectsBadState(): void
    {
        $states = $this->createMock(OAuthLoginStateRepository::class);
        $states->method('deleteExpired');
        $states->method('consumeIfValid')->willReturn(null);

        $svc = $this->makeService(
            [
                'state_ttl_seconds' => 600,
                'google' => ['client_id' => 'cid', 'client_secret' => 'sec'],
                'linkedin' => ['client_id' => '', 'client_secret' => ''],
                'facebook' => ['client_id' => '', 'client_secret' => ''],
            ],
            $states,
        );

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('oauth_invalid_or_expired_state');
        $svc->finishAuthorization('deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', 'code');
    }

    /**
     * @param array<string,mixed> $oauth
     */
    private function makeService(
        array $oauth,
        ?OAuthLoginStateRepository $states = null,
    ): OAuthLoginService {
        return new OAuthLoginService(
            $this->createMock(UserRepository::class),
            $this->createMock(UserOAuthIdentityRepository::class),
            $states ?? $this->createMock(OAuthLoginStateRepository::class),
            $this->createMock(SimpleHttpClient::class),
            $this->createStub(LoggerInterface::class),
            'https://api.example.com',
            'https://ui.example.com',
            '2026-04-16',
            $oauth,
        );
    }
}
