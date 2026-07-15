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

final class GetDowngradeReadinessAction implements RequestHandlerInterface
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
        $itemCount = $this->vault->countActiveItems($userId);
        $fileVaultCount = $this->vault->countActiveFileVaultItems($userId);
        $freeLimit = $this->planCapabilities->itemLimitForPlan('free');

        $allowed = $plan === 'pro' && $itemCount <= $freeLimit && $fileVaultCount === 0;
        $reason = null;
        if ($plan === 'lifetime') {
            $reason = 'lifetime_cannot_downgrade';
        } elseif ($plan !== 'pro') {
            $reason = 'no_active_pro_subscription';
        } elseif ($fileVaultCount > 0) {
            $reason = 'file_vault_not_allowed_on_free';
        } elseif ($itemCount > $freeLimit) {
            $reason = 'free_item_limit_exceeded';
        }

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'downgrade' => [
                'from_plan' => $plan,
                'allowed' => $allowed,
                'reason' => $reason,
                'free_item_limit' => $freeLimit,
                'active_item_count' => $itemCount,
                'file_vault_item_count' => $fileVaultCount,
            ],
        ]);
    }
}

