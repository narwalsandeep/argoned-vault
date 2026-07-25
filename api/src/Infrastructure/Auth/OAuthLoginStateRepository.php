<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Auth;

use Blackbox\Infrastructure\Database\PdoFactory;
use PDO;

class OAuthLoginStateRepository
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    public function insert(string $stateTokenHash, string $provider, int $ttlSeconds): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'INSERT INTO oauth_login_states (state_token_hash, provider, expires_at)
             VALUES (:hash, :provider, CURRENT_TIMESTAMP + (:ttl || \' seconds\')::interval)'
        );
        $stmt->execute([
            'hash' => $stateTokenHash,
            'provider' => $provider,
            'ttl' => $ttlSeconds,
        ]);
    }

    /**
     * @return array{provider:string}|null
     */
    public function consumeIfValid(string $stateTokenHash): ?array
    {
        $pdo = $this->pdoFactory->create();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'SELECT provider FROM oauth_login_states
                 WHERE state_token_hash = :hash AND expires_at > CURRENT_TIMESTAMP
                 FOR UPDATE'
            );
            $stmt->execute(['hash' => $stateTokenHash]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row === false) {
                $pdo->rollBack();

                return null;
            }
            $pdo->prepare('DELETE FROM oauth_login_states WHERE state_token_hash = :hash')
                ->execute(['hash' => $stateTokenHash]);
            $pdo->commit();

            return ['provider' => (string) $row['provider']];
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public function deleteExpired(): void
    {
        $pdo = $this->pdoFactory->create();
        $pdo->exec('DELETE FROM oauth_login_states WHERE expires_at <= CURRENT_TIMESTAMP');
    }
}
