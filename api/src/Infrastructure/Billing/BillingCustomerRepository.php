<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Billing;

use Blackbox\Infrastructure\Database\PdoFactory;

final class BillingCustomerRepository
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    public function findUserIdByStripeCustomerId(string $stripeCustomerId): ?string
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT user_id::text AS uid FROM billing_customers WHERE stripe_customer_id = :sid LIMIT 1'
        );
        $stmt->execute(['sid' => $stripeCustomerId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row === false ? null : (string) $row['uid'];
    }

    public function findByUserId(string $userId): ?array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT user_id::text, stripe_customer_id, default_payment_method_id FROM billing_customers WHERE user_id = CAST(:id AS uuid) LIMIT 1'
        );
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row === false ? null : [
            'user_id' => (string) $row['user_id'],
            'stripe_customer_id' => (string) $row['stripe_customer_id'],
            'default_payment_method_id' => $row['default_payment_method_id'] !== null ? (string) $row['default_payment_method_id'] : null,
        ];
    }

    public function upsert(string $userId, string $stripeCustomerId, ?string $defaultPaymentMethodId = null): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'INSERT INTO billing_customers (user_id, stripe_customer_id, default_payment_method_id, created_at, updated_at)
             VALUES (CAST(:user_id AS uuid), :stripe_customer_id, :default_pm, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id) DO UPDATE SET
               stripe_customer_id = EXCLUDED.stripe_customer_id,
               default_payment_method_id = COALESCE(EXCLUDED.default_payment_method_id, billing_customers.default_payment_method_id),
               updated_at = CURRENT_TIMESTAMP'
        );
        $stmt->execute([
            'user_id' => $userId,
            'stripe_customer_id' => $stripeCustomerId,
            'default_pm' => $defaultPaymentMethodId,
        ]);
    }

    public function updateDefaultPaymentMethod(string $userId, ?string $paymentMethodId): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE billing_customers SET default_payment_method_id = :pm, updated_at = CURRENT_TIMESTAMP WHERE user_id = CAST(:user_id AS uuid)'
        );
        $stmt->execute(['user_id' => $userId, 'pm' => $paymentMethodId]);
    }

    /** Removes the Stripe customer → user mapping (e.g. after Stripe `customer.deleted`). */
    public function deleteByStripeCustomerId(string $stripeCustomerId): bool
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare('DELETE FROM billing_customers WHERE stripe_customer_id = :sid');
        $stmt->execute(['sid' => $stripeCustomerId]);

        return $stmt->rowCount() > 0;
    }
}
