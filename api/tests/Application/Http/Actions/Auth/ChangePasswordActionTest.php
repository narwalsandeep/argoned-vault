<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Actions\Auth\ChangePasswordAction;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Mail\UserTransactionalMailer;
use Blackbox\Domain\Auth\AuthMailNotifier;
use Blackbox\Domain\Auth\AuthService;
use Blackbox\Infrastructure\Auth\AuthEmailTokenRepository;
use Blackbox\Infrastructure\Auth\LoginEmailOtpChallengeRepository;
use Blackbox\Infrastructure\Auth\SessionRepository;
use Blackbox\Infrastructure\Auth\UserRepository;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Factory\ServerRequestFactory;

final class ChangePasswordActionTest extends TestCase
{
    private const USER = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';

    public function testSendsPasswordChangedEmailAfterSuccess(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findIdAndPasswordHashById')->with(self::USER)->willReturn([
            'id' => self::USER,
            'auth_password_hash' => password_hash('current-secret', PASSWORD_ARGON2ID),
        ]);
        $repo->expects($this->once())->method('updateAuthPasswordHash')->with(
            self::USER,
            $this->callback(static fn (string $h): bool => $h !== '' && password_verify('new-secret-ok', $h)),
        );
        $repo->method('findById')->with(self::USER)->willReturn([
            'email' => 'user@example.com',
            'email_verified_at' => '2026-01-01 00:00:00',
            'first_name' => 'Jordan',
            'display_name' => null,
        ]);

        $notifier = $this->createMock(AuthMailNotifier::class);
        $notifier->expects($this->once())->method('sendAccountPasswordChanged')->with(
            'user@example.com',
            'Jordan',
            'https://app.example.org/settings',
        );

        $auth = $this->makeAuthService($repo);
        $mailer = new UserTransactionalMailer(
            $repo,
            $notifier,
            'https://app.example.org',
            true,
            $this->createStub(LoggerInterface::class),
        );

        $action = new ChangePasswordAction($auth, $mailer);
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/api/v1/auth/password')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, self::USER)
            ->withParsedBody([
                'current_password' => 'current-secret',
                'new_password' => 'new-secret-ok',
            ]);

        $response = $action->handle($request);
        $this->assertSame(200, $response->getStatusCode());
    }

    public function testDoesNotSendEmailWhenChangePasswordFails(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findIdAndPasswordHashById')->with(self::USER)->willReturn([
            'id' => self::USER,
            'auth_password_hash' => password_hash('other-password', PASSWORD_ARGON2ID),
        ]);
        $repo->expects($this->never())->method('updateAuthPasswordHash');
        $repo->expects($this->never())->method('findById');

        $notifier = $this->createMock(AuthMailNotifier::class);
        $notifier->expects($this->never())->method('sendAccountPasswordChanged');

        $auth = $this->makeAuthService($repo);
        $mailer = new UserTransactionalMailer(
            $repo,
            $notifier,
            'https://app.example.org',
            true,
            $this->createStub(LoggerInterface::class),
        );

        $action = new ChangePasswordAction($auth, $mailer);
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, self::USER)
            ->withParsedBody([
                'current_password' => 'wrong',
                'new_password' => 'new-secret-ok',
            ]);

        $response = $action->handle($request);
        $this->assertSame(400, $response->getStatusCode());
    }

    public function testReturns401WhenUserIdMissing(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->expects($this->never())->method('findIdAndPasswordHashById');

        $notifier = $this->createMock(AuthMailNotifier::class);
        $notifier->expects($this->never())->method('sendAccountPasswordChanged');

        $auth = $this->makeAuthService($repo);
        $mailer = new UserTransactionalMailer(
            $repo,
            $notifier,
            'https://app.example.org',
            true,
            $this->createStub(LoggerInterface::class),
        );

        $action = new ChangePasswordAction($auth, $mailer);
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, '')
            ->withParsedBody(['current_password' => 'a', 'new_password' => 'bbbbbbbb']);

        $response = $action->handle($request);
        $this->assertSame(401, $response->getStatusCode());
    }

    private function makeAuthService(UserRepository $users): AuthService
    {
        return new AuthService(
            $users,
            $this->createStub(AuthEmailTokenRepository::class),
            $this->createStub(AuthMailNotifier::class),
            $this->createStub(SessionRepository::class),
            $this->createStub(LoginEmailOtpChallengeRepository::class),
            $this->createStub(LoggerInterface::class),
            'https://app.example.org',
            false,
            'testing',
            '2026-04-16',
            'unit-test-login-otp-pepper',
            480,
        );
    }
}
