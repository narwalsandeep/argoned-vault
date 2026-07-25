<?php

declare(strict_types=1);

namespace Blackbox\Domain\Billing;

/**
 * Payment-agnostic billing port. Current implementation: Stripe ({@see \Blackbox\Infrastructure\Billing\StripeBillingService}).
 */
interface BillingServiceInterface
{
    public function isEnabled(): bool;

    /**
     * @return array{enabled:bool,payment_links:array{pro:string,lifetime:string},dev_simulate_pro?:bool}
     */
    public function getPublicConfig(): array;

    /**
     * Effective subscription tier for feature gating: free | pro | lifetime.
     * When billing is disabled, this is always free.
     */
    public function getEffectivePlanKey(string $userId): string;

    /**
     * @return array{
     *   plan:string,
     *   status:?string,
     *   features:list<string>,
     *   subscription:?array<string,mixed>,
     *   payment_method:?array<string,string>,
     *   cancel_at_period_end:bool,
     *   billing_available:bool
     * }
     *
     * When the effective plan is lifetime, subscription (if present) includes at least plan_key,
     * amount_paid, currency, purchased_at, and refund_request_until (ISO 8601, purchase time + 30 calendar days).
     */
    public function getSummaryForUser(string $userId, ?string $userEmail): array;

    /** @return list<array<string,mixed>> */
    public function listInvoicesForUser(string $userId): array;

    public function cancelSubscriptionAtPeriodEnd(string $userId): void;

    /**
     * Marks the active Pro subscription as canceled in the local DB so the account resolves as Free.
     * Does not call the payment provider (e.g. Stripe). Suitable for dev/simulated subs; production
     * flows that must cancel a paid Stripe subscription should use {@see self::cancelSubscriptionAtPeriodEnd} instead.
     */
    public function downgradeProToFreeDatabaseOnly(string $userId): void;

    public function syncCheckoutSession(string $userId, string $checkoutSessionId): void;

    /**
     * @throws \Stripe\Exception\SignatureVerificationException
     */
    public function handleWebhook(string $payload, string $signatureHeader): void;

    /**
     * Best-effort remove the remote billing holder for this user (e.g. Stripe Customer) before local rows disappear.
     * Implementations should swallow provider errors after logging; callers still delete the account in the database.
     */
    public function purgeRemoteCustomerForUser(string $userId): void;
}
