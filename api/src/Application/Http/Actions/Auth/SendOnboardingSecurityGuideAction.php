<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\AuthService;
use Blackbox\Domain\Auth\OnboardingCompletionMailData;
use Blackbox\Domain\Vault\VaultProfileReader;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class SendOnboardingSecurityGuideAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly AuthService $authService,
        private readonly VaultProfileReader $vaultProfiles,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        if ($userId === '') {
            return JsonResponder::write(new Response(), ['error' => 'unauthorized'], 401);
        }

        if ($this->vaultProfiles->getByUserId($userId) === null) {
            return JsonResponder::write(new Response(), ['error' => 'vault_profile_required'], 400);
        }

        try {
            $completion = OnboardingCompletionMailData::fromRequestBody((array) $request->getParsedBody());
            $this->authService->sendOnboardingCompletionEmail($userId, $completion);
        } catch (\InvalidArgumentException $e) {
            return JsonResponder::write(new Response(), ['error' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'user_not_found') {
                return JsonResponder::write(new Response(), ['error' => 'user_not_found'], 404);
            }
            if ($e->getMessage() === 'email_not_verified') {
                return JsonResponder::write(new Response(), ['error' => 'email_not_verified'], 400);
            }

            return JsonResponder::write(new Response(), ['error' => 'onboarding_guide_send_failed'], 500);
        } catch (\Throwable) {
            return JsonResponder::write(new Response(), ['error' => 'onboarding_guide_send_failed'], 500);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok'], 200);
    }
}
