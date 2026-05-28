<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Auth;

use Blackbox\Infrastructure\Database\PdoFactory;
use PDO;

class SessionRepository
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    public function create(string $userId, string $tokenHash, string $csrfToken, ?string $ipHash, ?string $uaHash, int $ttlSeconds): string
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'INSERT INTO auth_sessions (user_id, token_hash, csrf_token, ip_hash, user_agent_hash, expires_at)
             VALUES (:user_id, :token_hash, :csrf_token, :ip_hash, :ua_hash, (CURRENT_TIMESTAMP + (:ttl || \' seconds\')::interval))
             RETURNING id'
        );
        $stmt->execute([
            'user_id' => $userId,
            'token_hash' => $tokenHash,
            'csrf_token' => $csrfToken,
            'ip_hash' => $ipHash,
            'ua_hash' => $uaHash,
            'ttl' => $ttlSeconds,
        ]);

        return (string) $stmt->fetchColumn();
    }

    /**
     * @return array{id:string,user_id:string,csrf_token:string,expires_at:string,revoked_at:?string}|null
     */
    public function findActiveByTokenHash(string $tokenHash): ?array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT id, user_id, csrf_token, expires_at, revoked_at
             FROM auth_sessions
             WHERE token_hash = :token_hash
             LIMIT 1'
        );
        $stmt->execute(['token_hash' => $tokenHash]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        if ($row['revoked_at'] !== null) {
            return null;
        }

        if (strtotime((string) $row['expires_at']) <= time()) {
            return null;
        }

        return [
            'id' => (string) $row['id'],
            'user_id' => (string) $row['user_id'],
            'csrf_token' => (string) $row['csrf_token'],
            'expires_at' => (string) $row['expires_at'],
            'revoked_at' => $row['revoked_at'] !== null ? (string) $row['revoked_at'] : null,
        ];
    }

    public function touch(string $sessionId): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare('UPDATE auth_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = :id');
        $stmt->execute(['id' => $sessionId]);
    }

    public function revokeByIdForUser(string $sessionId, string $userId): bool
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE auth_sessions
             SET revoked_at = CURRENT_TIMESTAMP
             WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute([
            'id' => $sessionId,
            'user_id' => $userId,
        ]);
        return $stmt->rowCount() > 0;
    }

    public function revokeByTokenHash(string $tokenHash): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare('UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = :token_hash');
        $stmt->execute(['token_hash' => $tokenHash]);
    }

    public function revokeAllForUser(string $userId): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP
             WHERE user_id = :user_id AND revoked_at IS NULL'
        );
        $stmt->execute(['user_id' => $userId]);
    }

    /**
     * @return list<array{id:string,created_at:string,last_seen_at:string,expires_at:string}>
     */
    public function listActiveByUserId(string $userId): array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT id, created_at, last_seen_at, expires_at
             FROM auth_sessions
             WHERE user_id = :user_id AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
             ORDER BY created_at DESC'
        );
        $stmt->execute(['user_id' => $userId]);
        /** @var list<array{id:string,created_at:string,last_seen_at:string,expires_at:string}> $rows */
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $rows;
    }
}
