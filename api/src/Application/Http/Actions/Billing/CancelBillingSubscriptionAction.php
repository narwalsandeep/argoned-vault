<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Billing;

use Blackbox\Application\Billing\PlanCapabilityService;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Billing\BillingServiceInterface;
use Blackbox\Domain\Vault\VaultService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class CancelBillingSubscriptionAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly BillingServiceInterface $billing,
        private readonly VaultService $vault,
        private readonly PlanCapabilityService $planCapabilities,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        $plan = $this->billing->getEffectivePlanKey($userId);
        if ($plan === 'lifetime') {
            return JsonResponder::write(new Response(), ['error' => 'lifetime_cannot_downgrade'], 400);
        }
        if ($plan !== 'pro') {
            return JsonResponder::write(new Response(), ['error' => 'no_active_subscription'], 400);
        }
        $freeLimit = $this->planCapabilities->itemLimitForPlan('free');
        $itemCount = $this->vault->countActiveItems($userId);
        $fileVaultCount = $this->vault->countActiveFileVaultItems($userId);
        if ($itemCount > $freeLimit || $fileVaultCount > 0) {
            return JsonResponder::write(new Response(), [
                'error' => 'downgrade_requirements_not_met',
                'downgrade' => [
                    'free_item_limit' => $freeLimit,
                    'active_item_count' => $itemCount,
                    'file_vault_item_count' => $fileVaultCount,
                ],
            ], 400);
        }

        try {
            $this->billing->cancelSubscriptionAtPeriodEnd($userId);
        } catch (\Throwable $e) {
            return JsonResponder::write(new Response(), ['error' => $e->getMessage()], 400);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok']);
    }
}
