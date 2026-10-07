<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Support;

use Blackbox\Application\Http\Support\AuthenticatedLoginResponseFactory;
use Blackbox\Domain\Auth\SessionService;
use Blackbox\Infrastructure\Auth\SessionRepository;
use PHPUnit\Framework\TestCase;
use Slim\Psr7\Factory\ServerRequestFactory;

final class AuthenticatedLoginResponseFactoryTest extends TestCase
{
    public function testWriteUsesRememberTtlWhenRememberMeIsTrue(): void
    {
        $captured = null;
        $sessionService = $this->sessionServiceCapturingCreate($captured);

        $request = (new ServerRequestFactory())->createServerRequest(
            'POST',
            '/api/v1/auth/login/email-otp',
            ['REMOTE_ADDR' => '127.0.0.1'],
        )
            ->withParsedBody(['remember_me' => true])
            ->withHeader('User-Agent', 'TestAgent/1.0');

        $response = AuthenticatedLoginResponseFactory::write(
            $sessionService,
            $this->user(),
            $request,
            $this->sessionConfig(),
            null,
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertIsArray($captured);
        $this->assertSame('user-1', $captured['user_id']);
        $this->assertSame(hash('sha256', '127.0.0.1'), $captured['ip_hash']);
        $this->assertSame(hash('sha256', 'TestAgent/1.0'), $captured['ua_hash']);
        $this->assertSame(7776000, $captured['ttl_seconds']);
        $this->assertTrue($captured['is_persistent']);

        $cookie = $response->getHeaderLine('Set-Cookie');
        $this->assertSame(1, preg_match('/bb_session=([a-f0-9]{64})/', $cookie, $matches));
        $this->assertSame($captured['token_hash'], hash('sha256', $matches[1]));
        $this->assertStringContainsString('Max-Age=7776000', $cookie);
    }

    public function testWriteUsesStandardTtlWhenRememberMeIsFalse(): void
    {
        $captured = null;
        $sessionService = $this->sessionServiceCapturingCreate($captured);

        $request = (new ServerRequestFactory())->createServerRequest('POST', '/api/v1/auth/login/email-otp');

        $response = AuthenticatedLoginResponseFactory::write(
            $sessionService,
            $this->user(),
            $request,
            $this->sessionConfig(),
            null,
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertIsArray($captured);
        $this->assertSame('user-1', $captured['user_id']);
        $this->assertNull($captured['ip_hash']);
        $this->assertNull($captured['ua_hash']);
        $this->assertSame(86400, $captured['ttl_seconds']);
        $this->assertFalse($captured['is_persistent']);
        $this->assertStringContainsString('Max-Age=86400', $response->getHeaderLine('Set-Cookie'));
    }

    /**
     * @param array<string, mixed>|null $captured
     */
    private function sessionServiceCapturingCreate(?array &$captured): SessionService
    {
        $sessions = $this->createMock(SessionRepository::class);
        $sessions->expects($this->once())
            ->method('create')
            ->willReturnCallback(function (
                string $userId,
                string $tokenHash,
                string $csrfToken,
                ?string $ipHash,
                ?string $uaHash,
                int $ttlSeconds,
                bool $isPersistent = false,
            ) use (&$captured): string {
                $captured = [
                    'user_id' => $userId,
                    'token_hash' => $tokenHash,
                    'csrf_token' => $csrfToken,
                    'ip_hash' => $ipHash,
                    'ua_hash' => $uaHash,
                    'ttl_seconds' => $ttlSeconds,
                    'is_persistent' => $isPersistent,
                ];

                return 'sess-1';
            });

        return new SessionService($sessions);
    }

    /**
     * @return array{
     *   id:string,
     *   email:string,
     *   mfa_enabled:bool,
     *   first_name:string,
     *   last_name:string,
     *   display_name:?string,
     *   email_verified:bool
     * }
     */
    private function user(): array
    {
        return [
            'id' => 'user-1',
            'email' => 'user@example.com',
            'mfa_enabled' => true,
            'first_name' => 'User',
            'last_name' => 'Example',
            'display_name' => null,
            'email_verified' => true,
        ];
    }

    /**
     * @return array{cookie_name:string,ttl_seconds:int,remember_ttl_seconds:int,secure_cookie:bool}
     */
    private function sessionConfig(): array
    {
        return [
            'cookie_name' => 'bb_session',
            'ttl_seconds' => 86400,
            'remember_ttl_seconds' => 7776000,
            'secure_cookie' => false,
        ];
    }
}
