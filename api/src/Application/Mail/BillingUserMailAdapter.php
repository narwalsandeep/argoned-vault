<?php

declare(strict_types=1);

namespace Blackbox\Application\Mail;

use Blackbox\Domain\Billing\BillingUserMailerPort;

/**
 * Adapts {@see UserTransactionalMailer} to {@see BillingUserMailerPort} for injection into billing infrastructure.
 */
final class BillingUserMailAdapter implements BillingUserMailerPort
{
    public function __construct(
        private readonly UserTransactionalMailer $mailer,
    ) {
    }

    public function notifyPlanChanged(string $userId, string $fromPlan, string $toPlan): void
    {
        $this->mailer->notifyPlanChanged($userId, $fromPlan, $toPlan);
    }

    public function notifyInvoiceAvailable(
        string $userId,
        int $amountPaidMinor,
        string $currency,
        string $periodLine,
        string $invoiceUrl,
    ): void {
        $this->mailer->notifyInvoiceAvailable($userId, $amountPaidMinor, $currency, $periodLine, $invoiceUrl);
    }
}
