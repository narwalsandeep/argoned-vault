<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\AuthMailNotifier;
use Blackbox\Domain\Vault\RecoveryArtifactReader;
use Blackbox\Infrastructure\Auth\UserRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Emails a recovery backup summary plus a JSON attachment of the server-stored ciphertext (not the user's recovery phrase).
 */
final class SendRecoveryBackupEmailAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly RecoveryArtifactReader $recoveryArtifacts,
        private readonly AuthMailNotifier $mailNotifier,
        private readonly array $mailSettings,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        if ($userId === '') {
            return JsonResponder::write(new Response(), ['error' => 'unauthorized'], 401);
        }

        $user = $this->users->findById($userId);
        if ($user === null) {
            return JsonResponder::write(new Response(), ['error' => 'user_not_found'], 404);
        }
        if ($user['email_verified_at'] === null) {
            return JsonResponder::write(new Response(), ['error' => 'email_not_verified'], 400);
        }

        $artifact = $this->recoveryArtifacts->getRecoveryArtifact($userId);
        if ($artifact === null) {
            return JsonResponder::write(new Response(), ['error' => 'recovery_artifact_not_found'], 404);
        }

        $greeting = trim((string) ($user['display_name'] ?? ''));
        if ($greeting === '') {
            $greeting = (string) $user['first_name'];
        }

        $productName = (string) ($this->mailSettings['product_name'] ?? 'Argoned');

        try {
            $attachmentJson = json_encode($artifact, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT);
        } catch (\JsonException) {
            return JsonResponder::write(new Response(), ['error' => 'recovery_backup_encode_failed'], 500);
        }

        try {
            $this->mailNotifier->sendRecoveryBackupEmail(
                (string) $user['email'],
                $greeting,
                $productName,
                $attachmentJson,
            );
        } catch (\Throwable) {
            return JsonResponder::write(new Response(), ['error' => 'recovery_backup_email_failed'], 500);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok'], 200);
    }
}
