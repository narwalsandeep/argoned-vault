<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Billing;

use Blackbox\Infrastructure\Database\PdoFactory;

final class BillingSubscriptionRepository
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    /** @return array<string,mixed>|null */
    public function findActiveForUser(string $userId): ?array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            "SELECT id::text, user_id::text, stripe_subscription_id, status, price_id, plan_key,
                    current_period_start, current_period_end, cancel_at_period_end, raw_metadata
             FROM billing_subscriptions
             WHERE user_id = CAST(:user_id AS uuid)
               AND status IN ('trialing', 'active', 'past_due')
             ORDER BY updated_at DESC
             LIMIT 1"
        );
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row === false ? null : $this->normalizeRow($row);
    }

    /**
     * @param array{
     *   stripe_subscription_id:string,
     *   status:string,
     *   price_id:string,
     *   plan_key:string,
     *   current_period_start?:\DateTimeInterface,
     *   current_period_end?:\DateTimeInterface,
     *   cancel_at_period_end:bool,
     *   raw_metadata?:array<string,mixed>
     * } $data
     */
    public function upsert(string $userId, array $data): void
    {
        $pdo = $this->pdoFactory->create();
        $meta = isset($data['raw_metadata']) ? json_encode($data['raw_metadata'], JSON_THROW_ON_ERROR) : '{}';
        $stmt = $pdo->prepare(
            'INSERT INTO billing_subscriptions (
                user_id, stripe_subscription_id, status, price_id, plan_key,
                current_period_start, current_period_end, cancel_at_period_end, raw_metadata, created_at, updated_at
            ) VALUES (
                CAST(:user_id AS uuid), :stripe_subscription_id, :status, :price_id, :plan_key,
                :cps, :cpe, :cape, CAST(:meta AS JSONB), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            ON CONFLICT (stripe_subscription_id) DO UPDATE SET
                status = EXCLUDED.status,
                price_id = EXCLUDED.price_id,
                plan_key = EXCLUDED.plan_key,
                current_period_start = EXCLUDED.current_period_start,
                current_period_end = EXCLUDED.current_period_end,
                cancel_at_period_end = EXCLUDED.cancel_at_period_end,
                raw_metadata = EXCLUDED.raw_metadata,
                updated_at = CURRENT_TIMESTAMP'
        );
        $stmt->bindValue('user_id', $userId, \PDO::PARAM_STR);
        $stmt->bindValue('stripe_subscription_id', $data['stripe_subscription_id'], \PDO::PARAM_STR);
        $stmt->bindValue('status', $data['status'], \PDO::PARAM_STR);
        $stmt->bindValue('price_id', $data['price_id'], \PDO::PARAM_STR);
        $stmt->bindValue('plan_key', $data['plan_key'], \PDO::PARAM_STR);
        $cps = isset($data['current_period_start']) ? $data['current_period_start']->format('Y-m-d H:i:sO') : null;
        $cpe = isset($data['current_period_end']) ? $data['current_period_end']->format('Y-m-d H:i:sO') : null;
        $stmt->bindValue('cps', $cps, $cps === null ? \PDO::PARAM_NULL : \PDO::PARAM_STR);
        $stmt->bindValue('cpe', $cpe, $cpe === null ? \PDO::PARAM_NULL : \PDO::PARAM_STR);
        $stmt->bindValue('cape', $data['cancel_at_period_end'], \PDO::PARAM_BOOL);
        $stmt->bindValue('meta', $meta, \PDO::PARAM_STR);
        $stmt->execute();
    }

    public function markCanceled(string $stripeSubscriptionId): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            "UPDATE billing_subscriptions SET status = 'canceled', updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = :sid"
        );
        $stmt->execute(['sid' => $stripeSubscriptionId]);
    }

    /** @param array<string,mixed> $row */
    private function normalizeRow(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'user_id' => (string) $row['user_id'],
            'stripe_subscription_id' => (string) $row['stripe_subscription_id'],
            'status' => (string) $row['status'],
            'price_id' => (string) $row['price_id'],
            'plan_key' => (string) $row['plan_key'],
            'current_period_start' => $row['current_period_start'],
            'current_period_end' => $row['current_period_end'],
            'cancel_at_period_end' => filter_var($row['cancel_at_period_end'], FILTER_VALIDATE_BOOLEAN),
            'raw_metadata' => $row['raw_metadata'],
        ];
    }
}
