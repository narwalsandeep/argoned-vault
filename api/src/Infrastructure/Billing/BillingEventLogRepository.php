<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Billing;

use Blackbox\Infrastructure\Database\PdoFactory;

final class BillingEventLogRepository
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    /**
     * @param array<string, mixed> $summary
     */
    public function tryInsert(string $stripeEventId, string $eventType, ?string $userId, bool $livemode, array $summary): bool
    {
        $pdo = $this->pdoFactory->create();
        $sum = json_encode($summary, JSON_THROW_ON_ERROR);

        if ($userId !== null && $userId !== '' && preg_match('/^[a-f0-9-]{36}$/i', $userId)) {
            $stmt = $pdo->prepare(
                'INSERT INTO billing_event_log (stripe_event_id, event_type, user_id, livemode, summary_json, created_at)
                 VALUES (:eid, :etype, CAST(:uid AS uuid), :live, CAST(:sum AS JSONB), CURRENT_TIMESTAMP)
                 ON CONFLICT (stripe_event_id) DO NOTHING'
            );
            $stmt->bindValue('eid', $stripeEventId, \PDO::PARAM_STR);
            $stmt->bindValue('etype', $eventType, \PDO::PARAM_STR);
            $stmt->bindValue('uid', $userId, \PDO::PARAM_STR);
            $stmt->bindValue('live', $livemode, \PDO::PARAM_BOOL);
            $stmt->bindValue('sum', $sum, \PDO::PARAM_STR);
            $stmt->execute();
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO billing_event_log (stripe_event_id, event_type, user_id, livemode, summary_json, created_at)
                 VALUES (:eid, :etype, NULL, :live, CAST(:sum AS JSONB), CURRENT_TIMESTAMP)
                 ON CONFLICT (stripe_event_id) DO NOTHING'
            );
            $stmt->bindValue('eid', $stripeEventId, \PDO::PARAM_STR);
            $stmt->bindValue('etype', $eventType, \PDO::PARAM_STR);
            $stmt->bindValue('live', $livemode, \PDO::PARAM_BOOL);
            $stmt->bindValue('sum', $sum, \PDO::PARAM_STR);
            $stmt->execute();
        }

        return $stmt->rowCount() > 0;
    }
}
