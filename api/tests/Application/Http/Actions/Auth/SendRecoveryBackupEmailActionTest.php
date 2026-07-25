<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Actions\Auth\SendRecoveryBackupEmailAction;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Domain\Auth\AuthMailNotifier;
use Blackbox\Domain\Vault\RecoveryArtifactReader;
use Blackbox\Infrastructure\Auth\UserRepository;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Psr7\Factory\ServerRequestFactory;

final class SendRecoveryBackupEmailActionTest extends TestCase
{
    public function testReturns400WhenEmailNotVerified(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findById')->willReturn([
            'id' => 'u1',
            'email' => 'a@example.com',
            'first_name' => 'A',
            'last_name' => 'B',
            'display_name' => null,
            'email_verified_at' => null,
        ]);
        $recovery = $this->createMock(RecoveryArtifactReader::class);
        $recovery->expects($this->never())->method('getRecoveryArtifact');
        $mail = $this->createMock(AuthMailNotifier::class);
        $mail->expects($this->never())->method('sendRecoveryBackupEmail');

        $action = new SendRecoveryBackupEmailAction($users, $recovery, $mail, ['product_name' => 'Argoned Test']);
        $response = $action->handle($this->requestWithUserId('u1'));

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testReturns404WhenArtifactMissing(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findById')->willReturn([
            'id' => 'u1',
            'email' => 'a@example.com',
            'first_name' => 'A',
            'last_name' => 'B',
            'display_name' => null,
            'email_verified_at' => '2020-01-01',
        ]);
        $recovery = $this->createMock(RecoveryArtifactReader::class);
        $recovery->method('getRecoveryArtifact')->willReturn(null);
        $mail = $this->createMock(AuthMailNotifier::class);
        $mail->expects($this->never())->method('sendRecoveryBackupEmail');

        $action = new SendRecoveryBackupEmailAction($users, $recovery, $mail, ['product_name' => 'Argoned Test']);
        $request = $this->requestWithUserId('u1');
        $response = $action->handle($request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testSendsMailWhenArtifactPresent(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findById')->willReturn([
            'id' => 'u1',
            'email' => 'a@example.com',
            'first_name' => 'A',
            'last_name' => 'B',
            'display_name' => null,
            'email_verified_at' => '2020-01-01',
        ]);
        $artifact = [
            'id' => '1',
            'user_id' => 'u1',
            'artifact_type' => 'recovery_key_wrap',
            'wrapped_vault_key_recovery' => 'AA',
            'nonce' => 'BB',
            'tag' => 'CC',
            'created_at' => '2020-01-01',
            'revoked_at' => null,
        ];
        $recovery = $this->createMock(RecoveryArtifactReader::class);
        $recovery->method('getRecoveryArtifact')->willReturn($artifact);
        $mail = $this->createMock(AuthMailNotifier::class);
        $mail->expects($this->once())->method('sendRecoveryBackupEmail')->with(
            'a@example.com',
            'A',
            'Argoned Test',
            $this->callback(static function (string $json): bool {
                return str_contains($json, 'recovery_key_wrap') && str_contains($json, 'wrapped_vault_key_recovery');
            }),
        );

        $action = new SendRecoveryBackupEmailAction($users, $recovery, $mail, ['product_name' => 'Argoned Test']);
        $response = $action->handle($this->requestWithUserId('u1'));

        $this->assertSame(200, $response->getStatusCode());
    }

    private function requestWithUserId(string $userId): ServerRequestInterface
    {
        $req = (new ServerRequestFactory())->createServerRequest('POST', '/api/v1/auth/recovery/backup-email');

        return $req->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, $userId);
    }
}
