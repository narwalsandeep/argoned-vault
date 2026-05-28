<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Actions\Auth\SendOnboardingSecurityGuideAction;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Domain\Auth\AuthMailNotifier;
use Blackbox\Domain\Auth\AuthService;
use Blackbox\Domain\Auth\OnboardingCompletionMailData;
use Blackbox\Domain\Vault\VaultProfileReader;
use Blackbox\Infrastructure\Auth\AuthEmailTokenRepository;
use Blackbox\Infrastructure\Auth\LoginEmailOtpChallengeRepository;
use Blackbox\Infrastructure\Auth\SessionRepository;
use Blackbox\Infrastructure\Auth\UserRepository;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Factory\ServerRequestFactory;

final class SendOnboardingSecurityGuideActionTest extends TestCase
{
    private const USER = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';

    public function testSendsCompletionEmailWhenProfileExists(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findById')->with(self::USER)->willReturn([
            'id' => self::USER,
            'email' => 'user@example.com',
            'mfa_enabled' => false,
            'mfa_state' => null,
            'first_name' => 'Jordan',
            'last_name' => 'User',
            'display_name' => null,
            'email_verified_at' => '2026-01-01 00:00:00',
        ]);

        $notifier = $this->createMock(AuthMailNotifier::class);
        $notifier->expects($this->once())->method('sendOnboardingCompletionEmail')->with(
            'user@example.com',
            'Jordan',
            'https://app.example.org/docs',
            $this->callback(static function (OnboardingCompletionMailData $d): bool {
                return $d->unlockSecret === 'ability-absence-active'
                    && $d->autoLockMinutes === 8
                    && $d->argon2TimeCost === 3;
            }),
        );

        $profiles = $this->createMock(VaultProfileReader::class);
        $profiles->method('getByUserId')->with(self::USER)->willReturn(['user_id' => self::USER]);

        $auth = $this->makeAuthService($repo, $notifier);
        $action = new SendOnboardingSecurityGuideAction($auth, $profiles);
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/api/v1/auth/onboarding/security-guide')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, self::USER)
            ->withParsedBody([
                'unlock_secret' => 'ability-absence-active',
                'auto_lock_minutes' => 8,
                'argon2_time_cost' => 3,
                'argon2_memory_kib' => 131072,
                'argon2_parallelism' => 1,
            ]);

        $response = $action->handle($request);
        $this->assertSame(200, $response->getStatusCode());
    }

    public function testRejectsWhenVaultProfileMissing(): void
    {
        $profiles = $this->createMock(VaultProfileReader::class);
        $profiles->method('getByUserId')->with(self::USER)->willReturn(null);

        $auth = $this->makeAuthService($this->createStub(UserRepository::class), $this->createStub(AuthMailNotifier::class));
        $action = new SendOnboardingSecurityGuideAction($auth, $profiles);
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/api/v1/auth/onboarding/security-guide')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, self::USER)
            ->withParsedBody([
                'unlock_secret' => 'ability-absence-active',
                'auto_lock_minutes' => 8,
                'argon2_time_cost' => 3,
                'argon2_memory_kib' => 131072,
                'argon2_parallelism' => 1,
            ]);

        $response = $action->handle($request);
        $this->assertSame(400, $response->getStatusCode());
        $this->assertStringContainsString('vault_profile_required', (string) $response->getBody());
    }

    public function testRejectsInvalidPayload(): void
    {
        $profiles = $this->createMock(VaultProfileReader::class);
        $profiles->method('getByUserId')->with(self::USER)->willReturn(['user_id' => self::USER]);

        $auth = $this->makeAuthService($this->createStub(UserRepository::class), $this->createStub(AuthMailNotifier::class));
        $action = new SendOnboardingSecurityGuideAction($auth, $profiles);
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/api/v1/auth/onboarding/security-guide')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, self::USER)
            ->withParsedBody([
                'unlock_secret' => 'short',
                'auto_lock_minutes' => 8,
                'argon2_time_cost' => 3,
                'argon2_memory_kib' => 131072,
                'argon2_parallelism' => 1,
            ]);

        $response = $action->handle($request);
        $this->assertSame(400, $response->getStatusCode());
        $this->assertStringContainsString('unlock_secret_too_short', (string) $response->getBody());
    }

    private function makeAuthService(UserRepository $users, AuthMailNotifier $notifier): AuthService
    {
        return new AuthService(
            $users,
            $this->createStub(AuthEmailTokenRepository::class),
            $notifier,
            $this->createStub(SessionRepository::class),
            $this->createStub(LoginEmailOtpChallengeRepository::class),
            $this->createStub(LoggerInterface::class),
            'https://app.example.org',
            true,
            'testing',
            '2026-04-16',
            'unit-test-login-otp-pepper',
            120,
        );
    }
}
