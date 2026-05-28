<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Billing;

use Blackbox\Domain\Billing\BillingServiceInterface;
use Blackbox\Domain\Billing\BillingUserMailerPort;
use Psr\Log\LoggerInterface;
use Stripe\Charge;
use Stripe\Checkout\Session;
use Stripe\Customer;
use Stripe\Exception\ApiErrorException;
use Stripe\Invoice;
use Stripe\Refund;
use Stripe\StripeClient;
use Stripe\Subscription;
use Stripe\Webhook;

final class StripeBillingService implements BillingServiceInterface
{
    private const DEV_SIMULATED_SUBSCRIPTION_PREFIX = 'bb_dev_sim_';

    private ?StripeClient $client = null;

    /** @param array<string, mixed> $stripeConfig from settings['stripe'] */
    public function __construct(
        private readonly array $stripeConfig,
        private readonly BillingCustomerRepository $customers,
        private readonly BillingSubscriptionRepository $subscriptions,
        private readonly BillingInvoiceRepository $invoices,
        private readonly BillingEventLogRepository $eventLog,
        private readonly BillingOneTimePurchaseRepository $oneTime,
        private readonly LoggerInterface $logger,
        private readonly BillingUserMailerPort $billingUserMail,
        private readonly bool $billingDevSimulateProInSettings = false,
    ) {
        if ($this->isEnabled()) {
            $this->client = new StripeClient($stripeConfig['secret_key']);
        }
    }

    public function isEnabled(): bool
    {
        return ($this->stripeConfig['enabled'] ?? false) === true
            && ($this->stripeConfig['secret_key'] ?? '') !== '';
    }

    public function getPublicConfig(): array
    {
        return [
            'enabled' => $this->isEnabled(),
            'payment_links' => [
                'pro' => (string) ($this->stripeConfig['payment_link_pro'] ?? ''),
                'lifetime' => (string) ($this->stripeConfig['payment_link_lifetime'] ?? ''),
            ],
            'dev_simulate_pro' => $this->billingDevSimulateProInSettings,
        ];
    }

    public function getEffectivePlanKey(string $userId): string
    {
        if (!$this->isEnabled()) {
            $sub = $this->subscriptions->findActiveForUser($userId);
            if ($this->isDevSimulatedProSubscription($sub)) {
                return 'pro';
            }

            return 'free';
        }

        $lifetime = $this->oneTime->findByUserId($userId);
        if ($lifetime !== null && ($lifetime['plan_key'] ?? '') === 'lifetime') {
            return 'lifetime';
        }

        $sub = $this->subscriptions->findActiveForUser($userId);
        if ($sub !== null && ($sub['plan_key'] ?? '') === 'pro') {
            return 'pro';
        }

        return 'free';
    }

    public function getSummaryForUser(string $userId, ?string $userEmail): array
    {
        $featuresFree = [
            'Up to 8 vault items',
            'Full client-side encryption (Argon2id + AES-256-GCM)',
            'Recovery artifacts & session controls',
        ];
        $featuresPro = [
            'Up to 512 vault items',
            'Same security model as Free',
            'Billed via Stripe (Payment Link / subscription)',
        ];
        $featuresLifetime = [
            'Up to 512 vault items',
            'One-time payment; no renewal',
            'Lifetime tier for as long as we operate the service (see Terms)',
            'Same security model as Free',
        ];

        if (!$this->isEnabled()) {
            if ($this->getEffectivePlanKey($userId) === 'pro') {
                $sub = $this->subscriptions->findActiveForUser($userId);
                if ($sub !== null) {
                    return [
                        'plan' => 'pro',
                        'status' => (string) $sub['status'],
                        'features' => $featuresPro,
                        'subscription' => $sub,
                        'payment_method' => null,
                        'cancel_at_period_end' => (bool) $sub['cancel_at_period_end'],
                        'billing_available' => true,
                    ];
                }
            }

            return [
                'plan' => 'free',
                'status' => null,
                'features' => $featuresFree,
                'subscription' => null,
                'payment_method' => null,
                'cancel_at_period_end' => false,
                'billing_available' => false,
            ];
        }

        $plan = $this->getEffectivePlanKey($userId);
        if ($plan === 'lifetime') {
            $lifetime = $this->oneTime->findByUserId($userId);
            if ($lifetime !== null) {
                $purchasedAt = new \DateTimeImmutable($lifetime['purchased_at']);
                $refundRequestUntil = $purchasedAt->modify('+30 days')->format(\DateTimeInterface::ATOM);

                return [
                    'plan' => 'lifetime',
                    'status' => 'paid',
                    'features' => $featuresLifetime,
                    'subscription' => [
                        'plan_key' => 'lifetime',
                        'amount_paid' => $lifetime['amount_paid'],
                        'currency' => $lifetime['currency'],
                        'purchased_at' => $lifetime['purchased_at'],
                        'refund_request_until' => $refundRequestUntil,
                    ],
                    'payment_method' => null,
                    'cancel_at_period_end' => false,
                    'billing_available' => true,
                ];
            }
        }

        if ($plan === 'pro') {
            $sub = $this->subscriptions->findActiveForUser($userId);
            if ($sub !== null) {
                return [
                    'plan' => 'pro',
                    'status' => (string) $sub['status'],
                    'features' => $featuresPro,
                    'subscription' => $sub,
                    'payment_method' => $this->fetchDefaultCardSummary($userId),
                    'cancel_at_period_end' => (bool) $sub['cancel_at_period_end'],
                    'billing_available' => true,
                ];
            }
        }

        // Default: new signups and anyone without an active paid record (no subscription / lifetime row).
        return [
            'plan' => 'free',
            'status' => null,
            'features' => $featuresFree,
            'subscription' => null,
            'payment_method' => $this->fetchDefaultCardSummary($userId),
            'cancel_at_period_end' => false,
            'billing_available' => true,
        ];
    }

    /** @return list<array<string,mixed>> */
    public function listInvoicesForUser(string $userId): array
    {
        if (!$this->isEnabled()) {
            return [];
        }

        return $this->invoices->listByUserId($userId);
    }

    public function cancelSubscriptionAtPeriodEnd(string $userId): void
    {
        $sub = $this->subscriptions->findActiveForUser($userId);
        if ($sub === null) {
            throw new \RuntimeException('no_active_subscription');
        }
        $sid = (string) $sub['stripe_subscription_id'];
        if (str_starts_with($sid, self::DEV_SIMULATED_SUBSCRIPTION_PREFIX)) {
            $oldPlan = $this->getEffectivePlanKey($userId);
            $this->subscriptions->markCanceled($sid);
            $this->tryNotifyPlanChanged($userId, $oldPlan, $this->getEffectivePlanKey($userId));

            return;
        }
        $this->assertEnabled();
        $this->client->subscriptions->update($sid, [
            'cancel_at_period_end' => true,
        ]);
        $this->syncSubscriptionFromStripeId($sid, $userId);
    }

    public function downgradeProToFreeDatabaseOnly(string $userId): void
    {
        $sub = $this->subscriptions->findActiveForUser($userId);
        if ($sub === null) {
            throw new \RuntimeException('no_active_subscription');
        }
        $before = $this->getEffectivePlanKey($userId);
        $this->subscriptions->markCanceled((string) $sub['stripe_subscription_id']);
        $after = $this->getEffectivePlanKey($userId);
        $this->tryNotifyPlanChanged($userId, $before, $after);
    }

    public function syncCheckoutSession(string $userId, string $checkoutSessionId): void
    {
        $this->assertEnabled();
        /** @var Session $session */
        $session = $this->client->checkout->sessions->retrieve($checkoutSessionId, [
            'expand' => ['subscription', 'payment_intent', 'line_items'],
        ]);
        $resolved = $this->userIdFromCheckoutSession($session);
        if ($resolved !== $userId) {
            throw new \RuntimeException('session_user_mismatch');
        }
        if ($session->status !== 'complete') {
            return;
        }
        $this->applyCheckoutSession($session, $userId);
    }

    public function handleWebhook(string $payload, string $signatureHeader): void
    {
        $this->assertEnabled();
        $secret = (string) ($this->stripeConfig['webhook_secret'] ?? '');
        if ($secret === '') {
            throw new \RuntimeException('webhook_secret_not_configured');
        }
        $event = Webhook::constructEvent($payload, $signatureHeader, $secret);
        $eventId = (string) $event->id;
        $type = $event->type;
        $live = (bool) $event->livemode;
        $object = $event->data->object;

        $this->logger->info('Stripe webhook received', [
            'stripe_event_id' => $eventId,
            'event_type' => $type,
            'livemode' => $live,
            'api_version' => $event->api_version ?? null,
            'payload_bytes' => strlen($payload),
        ]);

        $summary = $this->webhookEventSummary($type, $object);
        $userId = null;

        if ($type === 'checkout.session.completed' && $object instanceof Session) {
            $userId = $this->userIdFromCheckoutSession($object);
            $this->eventLog->tryInsert($eventId, $type, $userId, $live, $summary);
            if ($userId !== null) {
                $this->applyCheckoutSession($object, $userId);
                $this->logger->info('Stripe webhook applied checkout.session.completed', [
                    'stripe_event_id' => $eventId,
                    'user_id' => $userId,
                    'session_id' => (string) ($object->id ?? ''),
                    'mode' => (string) ($object->mode ?? ''),
                ]);
            } else {
                $this->logger->warning('Stripe webhook checkout.session.completed missing user binding', [
                    'stripe_event_id' => $eventId,
                    'session_id' => (string) ($object->id ?? ''),
                    'hint' => 'Expect client_reference_id (UUID) or metadata bb_user_id on the Checkout Session / Payment Link flow.',
                ]);
            }

            return;
        }

        if (($object instanceof Subscription) && in_array($type, ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'], true)) {
            $userId = $this->metadataUserId($object->metadata ?? null);
            if ($userId === null) {
                $userId = $this->findUserIdByStripeCustomerId((string) $object->customer);
            }
            $this->eventLog->tryInsert($eventId, $type, $userId, $live, $summary);
            if ($userId !== null) {
                if ($type === 'customer.subscription.deleted' || $object->status === 'canceled') {
                    $beforePlan = $this->getEffectivePlanKey($userId);
                    $this->subscriptions->markCanceled((string) $object->id);
                    $this->tryNotifyPlanChanged($userId, $beforePlan, $this->getEffectivePlanKey($userId));
                    $this->logger->info('Stripe webhook marked subscription canceled', [
                        'stripe_event_id' => $eventId,
                        'user_id' => $userId,
                        'stripe_subscription_id' => (string) $object->id,
                    ]);
                } else {
                    $this->persistSubscription($object, $userId);
                    $this->logger->info('Stripe webhook upserted subscription', [
                        'stripe_event_id' => $eventId,
                        'user_id' => $userId,
                        'stripe_subscription_id' => (string) $object->id,
                        'status' => (string) ($object->status ?? ''),
                    ]);
                }
            } else {
                $this->logger->notice('Stripe webhook subscription event without local user mapping', [
                    'stripe_event_id' => $eventId,
                    'event_type' => $type,
                    'stripe_subscription_id' => (string) ($object->id ?? ''),
                    'stripe_customer_id' => (string) ($object->customer ?? ''),
                ]);
            }

            return;
        }

        if ($object instanceof Invoice && $this->isInvoiceWebhookEventType($type)) {
            $userId = $this->findUserIdByStripeCustomerId((string) $object->customer);
            $this->eventLog->tryInsert($eventId, $type, $userId, $live, $summary);
            if ($userId !== null) {
                $this->persistInvoice($object, $userId);
                $this->logger->info('Stripe webhook upserted invoice', [
                    'stripe_event_id' => $eventId,
                    'user_id' => $userId,
                    'stripe_invoice_id' => (string) ($object->id ?? ''),
                    'invoice_status' => (string) ($object->status ?? ''),
                ]);
            } else {
                $this->logger->notice('Stripe webhook invoice event without billing_customers mapping', [
                    'stripe_event_id' => $eventId,
                    'event_type' => $type,
                    'stripe_invoice_id' => (string) ($object->id ?? ''),
                    'stripe_customer_id' => (string) ($object->customer ?? ''),
                ]);
            }

            return;
        }

        if ($type === 'customer.created' && $object instanceof Customer) {
            $userId = $this->metadataUserId($object->metadata ?? null);
            $this->eventLog->tryInsert($eventId, $type, $userId, $live, $summary);
            if ($userId !== null && is_string($object->id) && $object->id !== '') {
                $this->customers->upsert($userId, $object->id);
                $this->logger->info('Stripe webhook linked customer.created to user', [
                    'stripe_event_id' => $eventId,
                    'user_id' => $userId,
                    'stripe_customer_id' => $object->id,
                ]);
            } else {
                $this->logger->info('Stripe webhook customer.created recorded (no bb_user_id metadata yet)', [
                    'stripe_event_id' => $eventId,
                    'stripe_customer_id' => is_string($object->id) ? $object->id : null,
                ]);
            }

            return;
        }

        if ($type === 'customer.deleted' && $object instanceof Customer) {
            $cid = is_string($object->id) ? $object->id : '';
            $userId = $cid !== '' ? $this->findUserIdByStripeCustomerId($cid) : null;
            $this->eventLog->tryInsert($eventId, $type, $userId, $live, $summary);
            if ($cid !== '') {
                $removed = $this->customers->deleteByStripeCustomerId($cid);
                $this->logger->info('Stripe webhook processed customer.deleted', [
                    'stripe_event_id' => $eventId,
                    'user_id' => $userId,
                    'stripe_customer_id' => $cid,
                    'billing_customers_deleted' => $removed,
                ]);
            }

            return;
        }

        if ($type === 'refund.created' && $object instanceof Refund) {
            $userId = $this->handleRefundCreated($eventId, $object, $live, $summary);

            return;
        }

        if ($type === 'charge.refunded' && $object instanceof Charge) {
            $userId = $this->handleChargeRefunded($eventId, $object, $live, $summary);

            return;
        }

        $this->eventLog->tryInsert($eventId, $type, $userId, $live, $summary);
        $this->logger->notice('Stripe webhook event recorded without handler', [
            'stripe_event_id' => $eventId,
            'event_type' => $type,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function webhookEventSummary(string $eventType, mixed $object): array
    {
        $summary = [
            'event_type' => $eventType,
            'object_id' => is_object($object) && isset($object->id) ? (string) $object->id : null,
        ];
        if (is_object($object) && isset($object->object)) {
            $summary['stripe_resource'] = (string) $object->object;
        }
        if ($object instanceof Subscription && isset($object->customer)) {
            $summary['stripe_customer_id'] = (string) $object->customer;
        }
        if ($object instanceof Invoice && isset($object->customer)) {
            $summary['stripe_customer_id'] = (string) $object->customer;
        }
        if ($object instanceof Charge) {
            $summary['stripe_customer_id'] = isset($object->customer) ? (string) $object->customer : null;
            $summary['stripe_payment_intent_id'] = isset($object->payment_intent) ? (string) $object->payment_intent : null;
            $summary['amount'] = isset($object->amount) ? (int) $object->amount : null;
            $summary['amount_refunded'] = isset($object->amount_refunded) ? (int) $object->amount_refunded : null;
            $summary['refunded'] = isset($object->refunded) ? (bool) $object->refunded : null;
        }
        if ($object instanceof Refund) {
            $summary['stripe_charge_id'] = isset($object->charge) ? (string) $object->charge : null;
            $summary['stripe_payment_intent_id'] = isset($object->payment_intent) ? (string) $object->payment_intent : null;
            $summary['amount'] = isset($object->amount) ? (int) $object->amount : null;
            $summary['status'] = isset($object->status) ? (string) $object->status : null;
        }

        return $summary;
    }

    /**
     * Records refund creation events for audit/debug; entitlement changes are applied on charge.refunded only.
     */
    private function handleRefundCreated(string $eventId, Refund $refund, bool $live, array $summary): ?string
    {
        $userId = null;
        $paymentIntentId = is_string($refund->payment_intent) ? $refund->payment_intent : '';
        if ($paymentIntentId !== '') {
            $userId = $this->oneTime->findUserIdByPaymentIntentId($paymentIntentId);
        }

        $this->eventLog->tryInsert($eventId, 'refund.created', $userId, $live, $summary);
        $this->logger->info('Stripe webhook recorded refund.created', [
            'stripe_event_id' => $eventId,
            'user_id' => $userId,
            'stripe_refund_id' => (string) ($refund->id ?? ''),
            'stripe_charge_id' => is_string($refund->charge) ? $refund->charge : '',
            'stripe_payment_intent_id' => $paymentIntentId,
            'status' => (string) ($refund->status ?? ''),
        ]);

        return $userId;
    }

    /**
     * Applies entitlement rollback only for full charge refunds tied to a known lifetime payment intent.
     */
    private function handleChargeRefunded(string $eventId, Charge $charge, bool $live, array $summary): ?string
    {
        $userId = $this->resolveUserIdForCharge($charge);
        $this->eventLog->tryInsert($eventId, 'charge.refunded', $userId, $live, $summary);

        $amount = (int) ($charge->amount ?? 0);
        $amountRefunded = (int) ($charge->amount_refunded ?? 0);
        $isFullyRefunded = (bool) ($charge->refunded ?? false) || ($amount > 0 && $amountRefunded >= $amount);
        $paymentIntentId = is_string($charge->payment_intent) ? $charge->payment_intent : '';

        if (!$isFullyRefunded) {
            $this->logger->notice('Stripe webhook ignored partial charge.refunded for entitlement rollback', [
                'stripe_event_id' => $eventId,
                'user_id' => $userId,
                'stripe_charge_id' => (string) ($charge->id ?? ''),
                'stripe_payment_intent_id' => $paymentIntentId,
                'amount' => $amount,
                'amount_refunded' => $amountRefunded,
            ]);

            return $userId;
        }

        if ($paymentIntentId === '') {
            $this->logger->notice('Stripe webhook full charge.refunded missing payment intent id', [
                'stripe_event_id' => $eventId,
                'user_id' => $userId,
                'stripe_charge_id' => (string) ($charge->id ?? ''),
            ]);

            return $userId;
        }

        $beforePlan = $userId !== null ? $this->getEffectivePlanKey($userId) : null;
        $removed = $this->oneTime->deleteByPaymentIntentId($paymentIntentId);
        $this->logger->info('Stripe webhook processed full charge.refunded', [
            'stripe_event_id' => $eventId,
            'user_id' => $userId,
            'stripe_charge_id' => (string) ($charge->id ?? ''),
            'stripe_payment_intent_id' => $paymentIntentId,
            'billing_one_time_purchases_deleted' => $removed,
        ]);
        if ($userId !== null && $removed > 0 && $beforePlan !== null) {
            $this->tryNotifyPlanChanged($userId, $beforePlan, $this->getEffectivePlanKey($userId));
        }

        return $userId;
    }

    private function resolveUserIdForCharge(Charge $charge): ?string
    {
        $fromMeta = $this->metadataUserId($charge->metadata ?? null);
        if ($fromMeta !== null) {
            return $fromMeta;
        }

        $customerId = is_string($charge->customer) ? $charge->customer : '';
        if ($customerId !== '') {
            $fromCustomer = $this->findUserIdByStripeCustomerId($customerId);
            if ($fromCustomer !== null) {
                return $fromCustomer;
            }
        }

        $paymentIntentId = is_string($charge->payment_intent) ? $charge->payment_intent : '';
        if ($paymentIntentId !== '') {
            return $this->oneTime->findUserIdByPaymentIntentId($paymentIntentId);
        }

        return null;
    }

    private function isInvoiceWebhookEventType(string $type): bool
    {
        return in_array(
            $type,
            [
                'invoice.created',
                'invoice.updated',
                'invoice.finalized',
                'invoice.paid',
                'invoice.payment_succeeded',
            ],
            true,
        );
    }

    private function applyCheckoutSession(Session $session, string $userId): void
    {
        $sid = $session->id ?? null;
        if (is_string($sid) && $sid !== '') {
            /** @var Session $session */
            $session = $this->client->checkout->sessions->retrieve($sid, [
                'expand' => ['subscription', 'payment_intent', 'line_items'],
            ]);
        }
        if ($session->mode === 'subscription' && $session->subscription !== null) {
            $subId = is_string($session->subscription) ? $session->subscription : $session->subscription->id;
            $this->syncSubscriptionFromStripeId($subId, $userId);
            $this->linkCheckoutCustomerToUser($session, $userId);

            return;
        }
        if ($session->mode === 'payment' && $session->payment_intent !== null) {
            $beforePlan = $this->getEffectivePlanKey($userId);
            $pi = is_string($session->payment_intent)
                ? $this->client->paymentIntents->retrieve($session->payment_intent)
                : $session->payment_intent;
            $planKey = (string) ($pi->metadata['plan_key'] ?? '');
            if ($planKey === '') {
                $planKey = 'lifetime';
            }
            $this->oneTime->upsert(
                $userId,
                (string) $pi->id,
                $planKey,
                (int) ($pi->amount_received ?? $pi->amount ?? 0),
                (string) ($pi->currency ?? 'gbp')
            );
            $this->linkCheckoutCustomerToUser($session, $userId);
            $this->tryNotifyPlanChanged($userId, $beforePlan, $this->getEffectivePlanKey($userId));
        }
    }

    private function syncSubscriptionFromStripeId(string $subscriptionId, string $expectedUserId): void
    {
        /** @var Subscription $sub */
        $sub = $this->client->subscriptions->retrieve($subscriptionId);
        $fromMeta = $this->metadataUserId($sub->metadata ?? null);
        $fromCustomer = $this->findUserIdByStripeCustomerId((string) $sub->customer);
        $uid = $fromMeta ?? $fromCustomer;
        if ($uid !== null && $uid !== $expectedUserId) {
            $this->logger->warning('Stripe subscription user mismatch', ['expected' => $expectedUserId, 'resolved' => $uid]);

            return;
        }
        $this->persistSubscription($sub, $expectedUserId);
    }

    private function persistSubscription(Subscription $sub, string $userId): void
    {
        $beforePlan = $this->getEffectivePlanKey($userId);
        $priceId = '';
        $items = $sub->items->data[0] ?? null;
        if ($items !== null && isset($items->price->id)) {
            $priceId = (string) $items->price->id;
        }
        $planKey = (string) ($sub->metadata['plan_key'] ?? '');
        if ($planKey === '') {
            $planKey = 'pro';
        }
        $this->subscriptions->upsert($userId, [
            'stripe_subscription_id' => (string) $sub->id,
            'status' => (string) $sub->status,
            'price_id' => $priceId,
            'plan_key' => $planKey,
            'current_period_start' => isset($sub->current_period_start) ? (new \DateTimeImmutable('@' . $sub->current_period_start)) : null,
            'current_period_end' => isset($sub->current_period_end) ? (new \DateTimeImmutable('@' . $sub->current_period_end)) : null,
            'cancel_at_period_end' => (bool) $sub->cancel_at_period_end,
            'raw_metadata' => $sub->metadata !== null ? $sub->metadata->toArray() : [],
        ]);
        $this->tryNotifyPlanChanged($userId, $beforePlan, $this->getEffectivePlanKey($userId));
    }

    /**
     * @param 'free'|'pro'|'lifetime'|string $beforeKey
     * @param 'free'|'pro'|'lifetime'|string $afterKey
     */
    private function tryNotifyPlanChanged(string $userId, string $beforeKey, string $afterKey): void
    {
        if ($beforeKey === $afterKey) {
            return;
        }
        try {
            $this->billingUserMail->notifyPlanChanged($userId, $beforeKey, $afterKey);
        } catch (\Throwable $e) {
            $this->logger->warning('billing.plan_change_mail_failed', [
                'user_id' => $userId,
                'before' => $beforeKey,
                'after' => $afterKey,
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function persistInvoice(Invoice $inv, string $userId): void
    {
        $this->invoices->upsert($userId, [
            'stripe_invoice_id' => (string) $inv->id,
            'amount_paid' => (int) ($inv->amount_paid ?? 0),
            'currency' => (string) ($inv->currency ?? 'gbp'),
            'status' => (string) ($inv->status ?? 'open'),
            'hosted_invoice_url' => $inv->hosted_invoice_url !== null ? (string) $inv->hosted_invoice_url : null,
            'invoice_pdf' => $inv->invoice_pdf !== null ? (string) $inv->invoice_pdf : null,
            'period_start' => isset($inv->period_start) ? (new \DateTimeImmutable('@' . $inv->period_start))->format('Y-m-d H:i:sO') : null,
            'period_end' => isset($inv->period_end) ? (new \DateTimeImmutable('@' . $inv->period_end))->format('Y-m-d H:i:sO') : null,
            'created_stripe' => isset($inv->created) ? (new \DateTimeImmutable('@' . $inv->created))->format('Y-m-d H:i:sO') : null,
        ]);
    }

    private function userIdFromCheckoutSession(Session $session): ?string
    {
        $fromMeta = $this->metadataUserId($session->metadata ?? null);
        if ($fromMeta !== null) {
            return $fromMeta;
        }
        $ref = $session->client_reference_id ?? null;
        if (!is_string($ref) || $ref === '') {
            return null;
        }
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $ref)) {
            return null;
        }

        return $ref;
    }

    private function linkCheckoutCustomerToUser(Session $session, string $userId): void
    {
        $cid = $session->customer;
        if (is_string($cid) && $cid !== '') {
            $this->customers->upsert($userId, $cid);
        }
    }

    /** @param \Stripe\StripeObject|null $metadata */
    private function metadataUserId($metadata): ?string
    {
        if ($metadata === null) {
            return null;
        }
        $arr = $metadata->toArray();

        return isset($arr['bb_user_id']) && is_string($arr['bb_user_id']) ? $arr['bb_user_id'] : null;
    }

    private function findUserIdByStripeCustomerId(string $customerId): ?string
    {
        return $this->customers->findUserIdByStripeCustomerId($customerId);
    }

    /** @return array{brand:string,last4:string}? */
    private function fetchDefaultCardSummary(string $userId): ?array
    {
        $row = $this->customers->findByUserId($userId);
        if ($row === null) {
            return null;
        }
        try {
            $pms = $this->client->paymentMethods->all([
                'customer' => $row['stripe_customer_id'],
                'type' => 'card',
            ]);
            $first = $pms->data[0] ?? null;
            if ($first === null || $first->card === null) {
                return null;
            }

            return [
                'brand' => (string) $first->card->brand,
                'last4' => (string) $first->card->last4,
            ];
        } catch (ApiErrorException $e) {
            $this->logger->notice('Stripe list payment methods failed', ['exception' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * @param array<string,mixed>|null $sub
     */
    private function isDevSimulatedProSubscription(?array $sub): bool
    {
        if ($sub === null) {
            return false;
        }
        if (($sub['plan_key'] ?? '') !== 'pro') {
            return false;
        }

        return str_starts_with((string) ($sub['stripe_subscription_id'] ?? ''), self::DEV_SIMULATED_SUBSCRIPTION_PREFIX);
    }

    private function assertEnabled(): void
    {
        if (!$this->isEnabled() || $this->client === null) {
            throw new \RuntimeException('billing_disabled');
        }
    }

    public function purgeRemoteCustomerForUser(string $userId): void
    {
        if (!$this->isEnabled() || $this->client === null) {
            return;
        }
        $row = $this->customers->findByUserId($userId);
        if ($row === null) {
            return;
        }
        try {
            $this->client->customers->delete($row['stripe_customer_id'], []);
        } catch (ApiErrorException $e) {
            $this->logger->warning('stripe_customer_delete_failed', [
                'user_id' => $userId,
                'stripe_customer_id' => $row['stripe_customer_id'],
                'message' => $e->getMessage(),
            ]);
        }
    }
}
