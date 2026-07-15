<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Billing;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\LocalhostOnlyHostChecker;
use Blackbox\Domain\Billing\BillingServiceInterface;
use Blackbox\Domain\Billing\BillingUserMailerPort;
use Blackbox\Infrastructure\Billing\BillingSubscriptionRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Inserts a synthetic Pro subscription (without Stripe) for local development only.
 * Gated by settings (APP_ENV=local + BILLING_DEV_SIMULATE_PRO) and {@see LocalhostOnlyHostChecker}.
 */
final class DevSimulateProBillingAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly array $settings,
        private readonly BillingServiceInterface $billing,
        private readonly BillingSubscriptionRepository $subscriptions,
        private readonly BillingUserMailerPort $billingUserMail,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        if (!($this->settings['billing_dev_simulate_pro'] ?? false)) {
            return JsonResponder::write(new Response(), ['error' => 'not_found'], 404);
        }
        if (!LocalhostOnlyHostChecker::isLoopbackHost($request)) {
            return JsonResponder::write(new Response(), ['error' => 'not_found'], 404);
        }

        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        $plan = $this->billing->getEffectivePlanKey($userId);
        if ($plan === 'lifetime') {
            return JsonResponder::write(new Response(), ['error' => 'not_applicable'], 400);
        }
        if ($plan === 'pro') {
            return JsonResponder::write(new Response(), ['status' => 'ok', 'already' => true]);
        }

        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $end = $now->modify('+1 year');
        $sid = 'bb_dev_sim_' . str_replace('-', '', $userId);
        $this->subscriptions->upsert($userId, [
            'stripe_subscription_id' => $sid,
            'status' => 'active',
            'price_id' => 'price_dev_local',
            'plan_key' => 'pro',
            'current_period_start' => $now,
            'current_period_end' => $end,
            'cancel_at_period_end' => false,
            'raw_metadata' => [
                'source' => 'dev_simulate_pro',
            ],
        ]);
        $this->billingUserMail->notifyPlanChanged($userId, 'free', 'pro');

        return JsonResponder::write(new Response(), ['status' => 'ok', 'already' => false]);
    }
}
