<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Actions\Auth\DeleteOwnAccountAction;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Domain\Auth\AuthAuditRecorder;
use Blackbox\Domain\Auth\AuthMailNotifier;
use Blackbox\Domain\Auth\AuthService;
use Blackbox\Domain\Auth\SessionService;
use Blackbox\Domain\Billing\BillingServiceInterface;
use Blackbox\Infrastructure\Auth\AuthEmailTokenRepository;
use Blackbox\Infrastructure\Auth\LoginEmailOtpChallengeRepository;
use Blackbox\Infrastructure\Auth\SessionRepository;
use Blackbox\Infrastructure\Auth\UserRepository;
use Blackbox\Infrastructure\Database\PdoFactory;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Factory\ServerRequestFactory;

final class DeleteOwnAccountActionTest extends TestCase
{
    private const USER = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';

    public function testRejectsWrongConfirmationPhraseWithoutDeleting(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->expects($this->never())->method('deleteUserAndAllRelatedData');
        $billing = $this->createMock(BillingServiceInterface::class);
        $billing->expects($this->never())->method('purgeRemoteCustomerForUser');

        $action = $this->action($users, $billing);
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/api/v1/auth/account/delete')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, self::USER)
            ->withParsedBody(['confirm_phrase' => 'delete', 'current_password' => 'secret']);

        $response = $action->handle($request);
        $this->assertSame(422, $response->getStatusCode());
    }

    public function testRejectsWrongPasswordWithoutDeleting(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findById')->willReturn([
            'id' => self::USER,
            'email' => 'user@example.com',
            'email_verified_at' => '2026-01-01',
            'first_name' => 'User',
            'display_name' => null,
        ]);
        $users->method('findIdAndPasswordHashById')->willReturn([
            'id' => self::USER,
            'auth_password_hash' => password_hash('correct-secret', PASSWORD_ARGON2ID),
        ]);
        $users->expects($this->never())->method('deleteUserAndAllRelatedData');

        $billing = $this->createMock(BillingServiceInterface::class);
        $billing->expects($this->never())->method('purgeRemoteCustomerForUser');

        $action = $this->action($users, $billing);
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/api/v1/auth/account/delete')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, self::USER)
            ->withParsedBody(['confirm_phrase' => 'DELETE', 'current_password' => 'wrong']);

        $response = $action->handle($request);
        $this->assertSame(401, $response->getStatusCode());
    }

    public function testDeletesOnlyTheSignedInUser(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findById')->willReturn([
            'id' => self::USER,
            'email' => 'user@example.com',
            'email_verified_at' => '2026-01-01',
            'first_name' => 'User',
            'display_name' => null,
        ]);
        $users->method('findIdAndPasswordHashById')->willReturn([
            'id' => self::USER,
            'auth_password_hash' => password_hash('correct-secret', PASSWORD_ARGON2ID),
        ]);
        $users->expects($this->once())->method('deleteUserAndAllRelatedData')->with(self::USER)->willReturn(true);

        $billing = $this->createMock(BillingServiceInterface::class);
        $billing->expects($this->once())->method('purgeRemoteCustomerForUser')->with(self::USER);

        $action = $this->action($users, $billing);
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/api/v1/auth/account/delete')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, self::USER)
            ->withCookieParams([])
            ->withParsedBody(['confirm_phrase' => 'DELETE', 'current_password' => 'correct-secret']);

        $response = $action->handle($request);
        $this->assertSame(200, $response->getStatusCode());
    }

    private function action(UserRepository $users, BillingServiceInterface $billing): DeleteOwnAccountAction
    {
        return new DeleteOwnAccountAction(
            $this->authService($users),
            $users,
            $billing,
            new SessionService($this->createStub(SessionRepository::class)),
            new AuthAuditRecorder(
                new PdoFactory([
                    'host' => '127.0.0.1',
                    'port' => '1',
                    'name' => 'none',
                    'user' => 'none',
                    'password' => 'none',
                ]),
                $this->createStub(LoggerInterface::class),
            ),
            ['cookie_name' => 'bb_session', 'ttl_seconds' => 60, 'secure_cookie' => false],
            null,
        );
    }

    private function authService(UserRepository $users): AuthService
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
