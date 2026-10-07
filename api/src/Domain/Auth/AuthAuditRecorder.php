<?php

declare(strict_types=1);

namespace Blackbox\Domain\Auth;

use Blackbox\Infrastructure\Database\PdoFactory;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Log\LoggerInterface;

/**
 * Append-only security audit rows. A failed insert never blocks login, logout, or other account actions.
 * Existing vault rows are not read or updated.
 */
final class AuthAuditRecorder
{
    public function __construct(
        private readonly PdoFactory $pdoFactory,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * @param array<string, scalar|null> $metadata
     */
    public function record(
        ?string $userId,
        string $eventType,
        ?ServerRequestInterface $request = null,
        array $metadata = [],
    ): void {
        $eventType = trim($eventType);
        if ($eventType === '' || strlen($eventType) > 128) {
            return;
        }

        $ip = null;
        $ua = null;
        if ($request !== null) {
            $rawIp = $request->getServerParams()['REMOTE_ADDR'] ?? null;
            $ip = is_string($rawIp) && $rawIp !== '' ? hash('sha256', $rawIp) : null;
            $rawUa = $request->getHeaderLine('User-Agent');
            $ua = $rawUa !== '' ? hash('sha256', $rawUa) : null;
        }

        try {
            $pdo = $this->pdoFactory->create();
            $stmt = $pdo->prepare(
                'INSERT INTO audit_events (user_id, event_type, ip_hash, ua_hash, metadata_json)
                 VALUES (CAST(:user_id AS uuid), :event_type, :ip_hash, :ua_hash, CAST(:metadata AS JSONB))'
            );
            $stmt->execute([
                'user_id' => $userId,
                'event_type' => $eventType,
                'ip_hash' => $ip,
                'ua_hash' => $ua,
                'metadata' => json_encode($metadata, JSON_THROW_ON_ERROR),
            ]);
        } catch (\Throwable $e) {
            $this->logger->warning('auth.audit_write_failed', [
                'event_type' => $eventType,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
