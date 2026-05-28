<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Billing;

use Blackbox\Infrastructure\Database\PdoFactory;

final class BillingOneTimePurchaseRepository
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    /**
     * @return array{
     *   plan_key:string,
     *   stripe_payment_intent_id:string,
     *   amount_paid:int,
     *   currency:string,
     *   purchased_at:string
     * }|null
     */
    public function findByUserId(string $userId): ?array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT plan_key, stripe_payment_intent_id, amount_paid, currency, created_at
             FROM billing_one_time_purchases WHERE user_id = CAST(:id AS uuid) LIMIT 1'
        );
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($row === false) {
            return null;
        }

        $purchasedAt = self::normalizePurchasedAtIso8601($row['created_at'] ?? null);

        return [
            'plan_key' => (string) $row['plan_key'],
            'stripe_payment_intent_id' => (string) $row['stripe_payment_intent_id'],
            'amount_paid' => (int) $row['amount_paid'],
            'currency' => (string) $row['currency'],
            'purchased_at' => $purchasedAt,
        ];
    }

    public function findUserIdByPaymentIntentId(string $paymentIntentId): ?string
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT user_id::text
             FROM billing_one_time_purchases
             WHERE stripe_payment_intent_id = :pi
             LIMIT 1'
        );
        $stmt->execute(['pi' => $paymentIntentId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($row === false || !is_string($row['user_id'] ?? null) || $row['user_id'] === '') {
            return null;
        }

        return $row['user_id'];
    }

    private static function normalizePurchasedAtIso8601(mixed $createdAt): string
    {
        if ($createdAt instanceof \DateTimeInterface) {
            return \DateTimeImmutable::createFromInterface($createdAt)->setTimezone(new \DateTimeZone('UTC'))->format(\DateTimeInterface::ATOM);
        }
        if (is_string($createdAt) && trim($createdAt) !== '') {
            $dt = new \DateTimeImmutable($createdAt);

            return $dt->setTimezone(new \DateTimeZone('UTC'))->format(\DateTimeInterface::ATOM);
        }

        return (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(\DateTimeInterface::ATOM);
    }

    public function upsert(string $userId, string $paymentIntentId, string $planKey, int $amountPaid, string $currency): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'INSERT INTO billing_one_time_purchases (user_id, stripe_payment_intent_id, plan_key, amount_paid, currency, created_at)
             VALUES (CAST(:user_id AS uuid), :pi, :plan, :amt, :cur, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id) DO UPDATE SET
               stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
               plan_key = EXCLUDED.plan_key,
               amount_paid = EXCLUDED.amount_paid,
               currency = EXCLUDED.currency'
        );
        $stmt->execute([
            'user_id' => $userId,
            'pi' => $paymentIntentId,
            'plan' => $planKey,
            'amt' => $amountPaid,
            'cur' => $currency,
        ]);
    }

    public function deleteByPaymentIntentId(string $paymentIntentId): int
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'DELETE FROM billing_one_time_purchases
             WHERE stripe_payment_intent_id = :pi'
        );
        $stmt->execute(['pi' => $paymentIntentId]);

        return $stmt->rowCount();
    }
}
