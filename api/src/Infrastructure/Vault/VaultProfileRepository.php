<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Vault;

use Blackbox\Domain\Vault\VaultProfileReader;
use Blackbox\Infrastructure\Database\PdoFactory;
use PDO;

final class VaultProfileRepository implements VaultProfileReader
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    /**
     * @param array{kdf_algo:string,kdf_params_json:array<string,mixed>,kdf_salt:string,wrapped_vault_key:string,wrapped_vault_key_nonce:string,wrapped_vault_key_tag:string,crypto_version:int} $payload
     */
    public function upsert(string $userId, array $payload): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'INSERT INTO vault_profiles (
                user_id, kdf_algo, kdf_params_json, kdf_salt, wrapped_vault_key,
                wrapped_vault_key_nonce, wrapped_vault_key_tag, crypto_version, vault_initialized_at, created_at, updated_at
             ) VALUES (
                :user_id, :kdf_algo, CAST(:kdf_params_json AS JSONB), decode(:kdf_salt, \'base64\'), decode(:wrapped_vault_key, \'base64\'),
                decode(:wrapped_vault_key_nonce, \'base64\'), decode(:wrapped_vault_key_tag, \'base64\'), :crypto_version, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
             )
             ON CONFLICT (user_id) DO UPDATE SET
                kdf_algo = EXCLUDED.kdf_algo,
                kdf_params_json = EXCLUDED.kdf_params_json,
                kdf_salt = EXCLUDED.kdf_salt,
                wrapped_vault_key = EXCLUDED.wrapped_vault_key,
                wrapped_vault_key_nonce = EXCLUDED.wrapped_vault_key_nonce,
                wrapped_vault_key_tag = EXCLUDED.wrapped_vault_key_tag,
                crypto_version = EXCLUDED.crypto_version,
                updated_at = CURRENT_TIMESTAMP'
        );
        $stmt->execute([
            'user_id' => $userId,
            'kdf_algo' => $payload['kdf_algo'],
            'kdf_params_json' => json_encode($payload['kdf_params_json'], JSON_THROW_ON_ERROR),
            'kdf_salt' => $payload['kdf_salt'],
            'wrapped_vault_key' => $payload['wrapped_vault_key'],
            'wrapped_vault_key_nonce' => $payload['wrapped_vault_key_nonce'],
            'wrapped_vault_key_tag' => $payload['wrapped_vault_key_tag'],
            'crypto_version' => $payload['crypto_version'],
        ]);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getByUserId(string $userId): ?array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT
                user_id,
                kdf_algo,
                kdf_params_json,
                encode(kdf_salt, \'base64\') AS kdf_salt,
                encode(wrapped_vault_key, \'base64\') AS wrapped_vault_key,
                encode(wrapped_vault_key_nonce, \'base64\') AS wrapped_vault_key_nonce,
                encode(wrapped_vault_key_tag, \'base64\') AS wrapped_vault_key_tag,
                crypto_version,
                vault_initialized_at,
                created_at,
                updated_at
             FROM vault_profiles
             WHERE user_id = :user_id
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        $row['kdf_params_json'] = json_decode((string) $row['kdf_params_json'], true, 512, JSON_THROW_ON_ERROR);
        return $row;
    }
}

