<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\AuthAuditRecorder;
use Blackbox\Domain\Auth\AuthService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Completes account recovery after the emailed ownership link is used.
 * Clears vault data only for the account that owns the token.
 */
final class ConfirmAccountRecoveryOwnershipAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly AuthService $authService,
        private readonly AuthAuditRecorder $audit,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $token = trim((string) ($body['token'] ?? ''));
        $newPassword = (string) ($body['new_password'] ?? '');
        $confirmDataLoss = filter_var($body['confirm_data_loss'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($token === '') {
            return JsonResponder::write(new Response(), ['error' => 'invalid_recovery_request'], 422);
        }

        try {
            $applied = $this->authService->completeAccountRecoveryOwnership($token, $newPassword, $confirmDataLoss);
        } catch (\InvalidArgumentException) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_recovery_request'], 422);
        } catch (\RuntimeException) {
            return JsonResponder::write(new Response(), ['error' => 'recovery_reset_failed'], 500);
        }

        if ($applied) {
            $this->audit->record(null, 'account_recovery_ownership_completed', $request, [
                'vault_data_cleared' => true,
            ]);
        }

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'account_reset' => $applied,
            'vault_data_recoverable' => false,
            'message' => 'If the recovery link was valid, the account password was reset and existing vault data was removed.',
        ]);
    }
}
