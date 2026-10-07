<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Vault;

use Blackbox\Infrastructure\Database\PdoFactory;
use PDO;

final class VaultRecoveryRepository
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    /**
     * @param array{artifact_type:string,wrapped_vault_key_recovery:string,nonce:string,tag:string} $payload
     */
    public function createArtifact(string $userId, array $payload): array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'INSERT INTO vault_recovery_artifacts (user_id, artifact_type, wrapped_vault_key_recovery, nonce, tag, created_at)
             VALUES (:user_id, :artifact_type, decode(:wrapped, \'base64\'), decode(:nonce, \'base64\'), decode(:tag, \'base64\'), CURRENT_TIMESTAMP)
             RETURNING id, user_id, artifact_type,
                    encode(wrapped_vault_key_recovery, \'base64\') AS wrapped_vault_key_recovery,
                    encode(nonce, \'base64\') AS nonce,
                    encode(tag, \'base64\') AS tag,
                    created_at, revoked_at'
        );
        $stmt->execute([
            'user_id' => $userId,
            'artifact_type' => $payload['artifact_type'],
            'wrapped' => $payload['wrapped_vault_key_recovery'],
            'nonce' => $payload['nonce'],
            'tag' => $payload['tag'],
        ]);
        /** @var array<string,mixed> $row */
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getLatestActive(string $userId): ?array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT id, user_id, artifact_type,
                    encode(wrapped_vault_key_recovery, \'base64\') AS wrapped_vault_key_recovery,
                    encode(nonce, \'base64\') AS nonce,
                    encode(tag, \'base64\') AS tag,
                    created_at, revoked_at
             FROM vault_recovery_artifacts
             WHERE user_id = :user_id AND revoked_at IS NULL
             ORDER BY created_at DESC
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? $row : null;
    }

    public function revokeActive(string $userId): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE vault_recovery_artifacts
             SET revoked_at = CURRENT_TIMESTAMP
             WHERE user_id = :user_id AND revoked_at IS NULL'
        );
        $stmt->execute(['user_id' => $userId]);
    }
}

