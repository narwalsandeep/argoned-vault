<?php

declare(strict_types=1);

namespace Blackbox\Tests\Domain\Auth;

use Blackbox\Domain\Auth\AuthMailNotifier;
use Blackbox\Domain\Auth\AuthService;
use Blackbox\Domain\Auth\EmailNotVerifiedException;
use Blackbox\Domain\Auth\OnboardingCompletionMailData;
use Blackbox\Infrastructure\Auth\AuthEmailTokenRepository;
use Blackbox\Infrastructure\Auth\LoginEmailOtpChallengeRepository;
use Blackbox\Infrastructure\Auth\SessionRepository;
use Blackbox\Infrastructure\Auth\UserRepository;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class AuthServiceTest extends TestCase
{
    public function testSignupRejectsWeakPassword(): void
    {
        $service = $this->makeService($this->createMock(UserRepository::class));

        $this->expectException(\InvalidArgumentException::class);
        $service->signup('user@example.com', '123', 'A', 'B', true, '2026-04-16');
    }

    public function testSignupRejectsEmptyFirstName(): void
    {
        $service = $this->makeService($this->createMock(UserRepository::class));

        $this->expectException(\InvalidArgumentException::class);
        $service->signup('user@example.com', 'password12', '', 'Last', true, '2026-04-16');
    }

    public function testSignupRejectsWithoutTermsAcceptance(): void
    {
        $service = $this->makeService($this->createMock(UserRepository::class));

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('terms_privacy_not_accepted');
        $service->signup('user@example.com', 'password12', 'A', 'B', false, '2026-04-16');
    }

    public function testSignupRejectsWrongLegalDocsVersion(): void
    {
        $service = $this->makeService($this->createMock(UserRepository::class));

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('legal_docs_version_mismatch');
        $service->signup('user@example.com', 'password12', 'A', 'B', true, '1999-01-01');
    }

    public function testLoginRejectsInvalidCredentials(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findByEmail')->willReturn(null);
        $service = $this->makeService($repo);

        $this->expectException(\RuntimeException::class);
        $service->login('none@example.com', 'password');
    }

    public function testLoginRejectsUnverifiedEmail(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findByEmail')->willReturn([
            'id' => 'u1',
            'email' => 'a@b.com',
            'auth_password_hash' => password_hash('secret1234', PASSWORD_ARGON2ID),
            'mfa_enabled' => false,
            'mfa_state' => null,
            'first_name' => 'A',
            'last_name' => 'B',
            'display_name' => null,
            'email_verified_at' => null,
        ]);
        $service = $this->makeService($repo);

        $this->expectException(EmailNotVerifiedException::class);
        $service->login('a@b.com', 'secret1234');
    }

    public function testSendOnboardingCompletionEmailSendsMailForVerifiedUser(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findById')->with('u1')->willReturn([
            'id' => 'u1',
            'email' => 'u1@example.com',
            'mfa_enabled' => false,
            'mfa_state' => null,
            'first_name' => 'Sandeep',
            'last_name' => 'User',
            'display_name' => null,
            'email_verified_at' => '2026-04-17T00:00:00+00:00',
        ]);
        $completion = new OnboardingCompletionMailData('ability-absence-active', 8, 3, 131072, 1);
        $mailer = $this->createMock(AuthMailNotifier::class);
        $mailer
            ->expects($this->once())
            ->method('sendOnboardingCompletionEmail')
            ->with(
                'u1@example.com',
                'Sandeep',
                'http://localhost:4200/docs',
                $this->callback(static fn (OnboardingCompletionMailData $d): bool => $d->unlockSecret === 'ability-absence-active'),
            );
        $service = $this->makeService($repo, $mailer);

        $service->sendOnboardingCompletionEmail('u1', $completion);
    }

    public function testSendOnboardingCompletionEmailUsesDisplayNameWhenSet(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findById')->with('u1')->willReturn([
            'id' => 'u1',
            'email' => 'u1@example.com',
            'mfa_enabled' => false,
            'mfa_state' => null,
            'first_name' => 'Sandeep',
            'last_name' => 'User',
            'display_name' => 'Pat Q',
            'email_verified_at' => '2026-04-17T00:00:00+00:00',
        ]);
        $completion = new OnboardingCompletionMailData('ability-absence-active', 8, 3, 131072, 1);
        $mailer = $this->createMock(AuthMailNotifier::class);
        $mailer
            ->expects($this->once())
            ->method('sendOnboardingCompletionEmail')
            ->with('u1@example.com', 'Pat Q', 'http://localhost:4200/docs', $completion);
        $service = $this->makeService($repo, $mailer);

        $service->sendOnboardingCompletionEmail('u1', $completion);
    }

    public function testSendOnboardingCompletionEmailRejectsUnverifiedUser(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findById')->with('u1')->willReturn([
            'id' => 'u1',
            'email' => 'u1@example.com',
            'mfa_enabled' => false,
            'mfa_state' => null,
            'first_name' => 'Sandeep',
            'last_name' => 'User',
            'display_name' => null,
            'email_verified_at' => null,
        ]);
        $completion = new OnboardingCompletionMailData('ability-absence-active', 8, 3, 131072, 1);
        $service = $this->makeService($repo);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('email_not_verified');
        $service->sendOnboardingCompletionEmail('u1', $completion);
    }

    public function testUpdateDisplayNameClearsWhenWhitespaceOnly(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->expects($this->once())->method('updateDisplayName')->with('u1', null);
        $service = $this->makeService($repo);

        $service->updateDisplayName('u1', '   ');
    }

    public function testUpdateDisplayNameRejectsTooLong(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->expects($this->never())->method('updateDisplayName');
        $service = $this->makeService($repo);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('display_name_too_long');
        $service->updateDisplayName('u1', str_repeat('a', 201));
    }

    private function makeService(
        UserRepository $users,
        ?AuthMailNotifier $mailNotifier = null,
        ?LoginEmailOtpChallengeRepository $loginOtp = null,
    ): AuthService {
        return new AuthService(
            $users,
            $this->createStub(AuthEmailTokenRepository::class),
            $mailNotifier ?? $this->createStub(AuthMailNotifier::class),
            $this->createStub(SessionRepository::class),
            $loginOtp ?? $this->createStub(LoginEmailOtpChallengeRepository::class),
            $this->createStub(LoggerInterface::class),
            'http://localhost:4200',
            false,
            'testing',
            '2026-04-16',
            'unit-test-login-otp-pepper',
            120,
        );
    }

    public function testLoginRejectsOAuthOnlyAccount(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findByEmail')->willReturn([
            'id' => 'u1',
            'email' => 'a@b.com',
            'auth_password_hash' => null,
            'mfa_enabled' => true,
            'mfa_state' => 'oauth',
            'first_name' => 'A',
            'last_name' => 'B',
            'display_name' => null,
            'email_verified_at' => '2026-04-17T00:00:00+00:00',
        ]);
        $service = $this->makeService($repo);

        $this->expectException(\RuntimeException::class);
        $service->login('a@b.com', 'anything');
    }

    public function testChangePasswordRejectsOAuthOnlyAccount(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findIdAndPasswordHashById')->willReturn([
            'id' => 'u1',
            'auth_password_hash' => null,
        ]);
        $service = $this->makeService($repo);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('password_not_set_for_oauth_account');
        $service->changePassword('u1', 'x', 'newpass1234');
    }

    public function testBeginLoginWithEmailOtpCreatesChallengeAndSendsMail(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findByEmail')->willReturn([
            'id' => 'u1',
            'email' => 'a@b.com',
            'auth_password_hash' => password_hash('secret1234', PASSWORD_ARGON2ID),
            'mfa_enabled' => true,
            'mfa_state' => 'email_otp',
            'first_name' => 'A',
            'last_name' => 'B',
            'display_name' => null,
            'email_verified_at' => '2026-04-17T00:00:00+00:00',
        ]);

        $otpRepo = $this->createMock(LoginEmailOtpChallengeRepository::class);
        $otpRepo->expects($this->once())->method('createChallenge')->with(
            'u1',
            $this->callback(static fn (string $t): bool => strlen($t) === 64 && ctype_xdigit($t)),
            $this->callback(static fn (string $o): bool => strlen($o) === 6 && ctype_digit($o)),
            120,
        );

        $mailer = $this->createMock(AuthMailNotifier::class);
        $mailer
            ->expects($this->once())
            ->method('sendSignInEmailOtp')
            ->with(
                'a@b.com',
                'A',
                $this->callback(static fn (string $o): bool => strlen($o) === 6 && ctype_digit($o)),
                2,
            );

        $service = $this->makeService($repo, $mailer, $otpRepo);
        $out = $service->beginLoginWithEmailOtp('a@b.com', 'secret1234');

        $this->assertArrayHasKey('mfa_challenge_token', $out);
        $this->assertSame(120, $out['expires_in_seconds']);
        $this->assertSame(64, strlen($out['mfa_challenge_token']));
    }
}
