<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\AuthService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class AccountRecoveryResetAction implements RequestHandlerInterface
{
    /**
     * @param array{
     *   enabled:bool,
     *   token:string
     * } $accountRecoveryConfig
     */
    public function __construct(
        private readonly AuthService $authService,
        private readonly array $accountRecoveryConfig,
    )
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        if ($this->accountRecoveryConfig['enabled'] !== true) {
            return JsonResponder::write(new Response(), ['error' => 'account_recovery_disabled'], 403);
        }

        $providedToken = $request->getHeaderLine('X-Account-Recovery-Token');
        $configuredToken = (string) $this->accountRecoveryConfig['token'];
        if ($configuredToken === '' || !hash_equals($configuredToken, $providedToken)) {
            return JsonResponder::write(new Response(), ['error' => 'unauthorized'], 401);
        }

        $body = (array) $request->getParsedBody();
        $email = (string) ($body['email'] ?? '');
        $newPassword = (string) ($body['new_password'] ?? '');
        $confirmDataLoss = (bool) ($body['confirm_data_loss'] ?? false);

        try {
            $this->authService->accountOnlyRecoveryReset($email, $newPassword, $confirmDataLoss);

            return JsonResponder::write(new Response(), [
                'status' => 'ok',
                'account_reset' => true,
                'vault_data_recoverable' => false,
                'message' => 'If the account exists and verification is valid, account recovery reset was applied.',
            ]);
        } catch (\InvalidArgumentException) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_recovery_request'], 422);
        } catch (\RuntimeException) {
            return JsonResponder::write(new Response(), ['error' => 'recovery_reset_failed'], 500);
        }
    }
}
