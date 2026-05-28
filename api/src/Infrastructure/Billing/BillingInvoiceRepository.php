<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Billing;

use Blackbox\Infrastructure\Database\PdoFactory;

final class BillingInvoiceRepository
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    /**
     * @param array{stripe_invoice_id:string,amount_paid:int,currency:string,status:string,?string:hosted_invoice_url,?string:invoice_pdf,?string:period_start,?string:period_end,?string:created_stripe} $data
     */
    public function upsert(string $userId, array $data): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'INSERT INTO billing_invoices (
                user_id, stripe_invoice_id, amount_paid, currency, status,
                hosted_invoice_url, invoice_pdf, period_start, period_end, created_stripe, created_at
            ) VALUES (
                CAST(:user_id AS uuid), :stripe_invoice_id, :amount_paid, :currency, :status,
                :hosted_url, :pdf, :ps, :pe, :cs, CURRENT_TIMESTAMP
            )
            ON CONFLICT (stripe_invoice_id) DO UPDATE SET
                amount_paid = EXCLUDED.amount_paid,
                status = EXCLUDED.status,
                hosted_invoice_url = EXCLUDED.hosted_invoice_url,
                invoice_pdf = EXCLUDED.invoice_pdf,
                period_start = EXCLUDED.period_start,
                period_end = EXCLUDED.period_end,
                created_stripe = EXCLUDED.created_stripe'
        );
        $stmt->execute([
            'user_id' => $userId,
            'stripe_invoice_id' => $data['stripe_invoice_id'],
            'amount_paid' => $data['amount_paid'],
            'currency' => $data['currency'],
            'status' => $data['status'],
            'hosted_url' => $data['hosted_invoice_url'] ?? null,
            'pdf' => $data['invoice_pdf'] ?? null,
            'ps' => $data['period_start'] ?? null,
            'pe' => $data['period_end'] ?? null,
            'cs' => $data['created_stripe'] ?? null,
        ]);
    }

    /** @return list<array<string,mixed>> */
    public function listByUserId(string $userId, int $limit = 48): array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT stripe_invoice_id, amount_paid, currency, status, hosted_invoice_url, invoice_pdf,
                    period_start, period_end, created_stripe, created_at
             FROM billing_invoices
             WHERE user_id = CAST(:user_id AS uuid)
             ORDER BY COALESCE(created_stripe, created_at) DESC NULLS LAST
             LIMIT :lim'
        );
        $stmt->bindValue('user_id', $userId, \PDO::PARAM_STR);
        $stmt->bindValue('lim', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }
}
