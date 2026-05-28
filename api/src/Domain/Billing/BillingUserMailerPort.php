<?php

declare(strict_types=1);

namespace Blackbox\Domain\Billing;

/**
 * Outbound product emails for plan and invoice events (see {@see \Blackbox\Application\Mail\UserTransactionalMailer}).
 */
interface BillingUserMailerPort
{
    /**
     * @param 'free'|'pro'|'lifetime'|string $fromPlan
     * @param 'free'|'pro'|'lifetime'|string $toPlan
     */
    public function notifyPlanChanged(string $userId, string $fromPlan, string $toPlan): void;

    public function notifyInvoiceAvailable(
        string $userId,
        int $amountPaidMinor,
        string $currency,
        string $periodLine,
        string $invoiceUrl,
    ): void;
}
