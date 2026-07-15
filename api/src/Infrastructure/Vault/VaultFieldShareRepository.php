<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Vault;

use Blackbox\Infrastructure\Database\PdoFactory;
use PDO;

final class VaultFieldShareRepository
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    /**
     * @param array{
     *   share_id:string,
     *   owner_user_id:string,
     *   vault_item_id:string,
     *   field_key:string|null,
     *   label:string|null,
     *   expires_at:string,
     *   max_views:int,
     *   pending_expires_at:string,
     *   kdf_algo:string,
     *   kdf_params_json:string,
     *   kdf_salt:string
     * } $data
     * @return array<string,mixed>
     */
    public function insertPending(array $data): array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'INSERT INTO vault_field_shares (
                share_id, owner_user_id, vault_item_id, field_key, label,
                crypto_version, kdf_algo, kdf_params_json, kdf_salt,
                expires_at, max_views, status, pending_expires_at
             ) VALUES (
                :share_id, CAST(:owner_user_id AS uuid), CAST(:vault_item_id AS uuid),
                :field_key, :label,
                :crypto_version, :kdf_algo, CAST(:kdf_params_json AS jsonb),
                decode(:kdf_salt, \'base64\'),
                CAST(:expires_at AS timestamptz), :max_views, \'pending\', CAST(:pending_expires_at AS timestamptz)
             )
             RETURNING id::text, share_id, expires_at, max_views, status, pending_expires_at, created_at'
        );
        $stmt->execute([
            'share_id' => $data['share_id'],
            'owner_user_id' => $data['owner_user_id'],
            'vault_item_id' => $data['vault_item_id'],
            'field_key' => $data['field_key'],
            'label' => $data['label'],
            'crypto_version' => 1,
            'kdf_algo' => $data['kdf_algo'],
            'kdf_params_json' => $data['kdf_params_json'],
            'kdf_salt' => $data['kdf_salt'],
            'expires_at' => $data['expires_at'],
            'max_views' => $data['max_views'],
            'pending_expires_at' => $data['pending_expires_at'],
        ]);
        /** @var array<string,mixed> $row */
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row;
    }

    /**
     * @param array{
     *   kdf_salt:string,
     *   ciphertext:string,
     *   payload_nonce:string,
     *   payload_tag:string
     * } $blob
     * @return array<string,mixed>|null
     */
    public function finalizePending(string $shareId, string $ownerUserId, array $blob): ?array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE vault_field_shares
             SET kdf_salt = decode(:kdf_salt, \'base64\'),
                 ciphertext = decode(:ciphertext, \'base64\'),
                 payload_nonce = decode(:payload_nonce, \'base64\'),
                 payload_tag = decode(:payload_tag, \'base64\'),
                 status = \'active\',
                 pending_expires_at = NULL
             WHERE share_id = :share_id
               AND owner_user_id = CAST(:owner_user_id AS uuid)
               AND status = \'pending\'
               AND pending_expires_at > NOW()
             RETURNING id::text, share_id, expires_at, max_views, status, created_at'
        );
        $stmt->execute([
            'share_id' => $shareId,
            'owner_user_id' => $ownerUserId,
            'kdf_salt' => $blob['kdf_salt'],
            'ciphertext' => $blob['ciphertext'],
            'payload_nonce' => $blob['payload_nonce'],
            'payload_tag' => $blob['payload_tag'],
        ]);
        /** @var array<string,mixed>|false $row */
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row !== false ? $row : null;
    }

    public function countActiveForOwner(string $ownerUserId): int
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM vault_field_shares
             WHERE owner_user_id = CAST(:user_id AS uuid)
               AND status IN (\'pending\', \'active\')
               AND expires_at > NOW()'
        );
        $stmt->execute(['user_id' => $ownerUserId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listForOwner(string $ownerUserId): array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT id::text, share_id, label, field_key, status, expires_at, max_views, view_count, created_at
             FROM vault_field_shares
             WHERE owner_user_id = CAST(:user_id AS uuid)
               AND status IN (\'pending\', \'active\')
               AND expires_at > NOW()
             ORDER BY created_at DESC'
        );
        $stmt->execute(['user_id' => $ownerUserId]);
        /** @var list<array<string,mixed>> $rows */
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $rows;
    }

    public function revokeById(string $ownerUserId, string $id): bool
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'DELETE FROM vault_field_shares
             WHERE id = CAST(:id AS uuid)
               AND owner_user_id = CAST(:user_id AS uuid)
               AND status IN (\'pending\', \'active\')'
        );
        $stmt->execute(['id' => $id, 'user_id' => $ownerUserId]);

        return $stmt->rowCount() > 0;
    }

    public function deleteByVaultItemId(string $ownerUserId, string $vaultItemId): int
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'DELETE FROM vault_field_shares
             WHERE owner_user_id = CAST(:user_id AS uuid)
               AND vault_item_id = CAST(:item_id AS uuid)
               AND status IN (\'pending\', \'active\')'
        );
        $stmt->execute(['user_id' => $ownerUserId, 'item_id' => $vaultItemId]);

        return $stmt->rowCount();
    }

    /**
     * Fetch and consume share in a transaction. Returns null when unavailable.
     *
     * @return array<string,mixed>|null
     */
    public function fetchAndConsume(string $shareId, ?string $ipHash): ?array
    {
        $pdo = $this->pdoFactory->create();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'SELECT id::text, share_id, crypto_version, kdf_algo, kdf_params_json,
                        encode(kdf_salt, \'base64\') AS kdf_salt,
                        encode(ciphertext, \'base64\') AS ciphertext,
                        encode(payload_nonce, \'base64\') AS payload_nonce,
                        encode(payload_tag, \'base64\') AS payload_tag,
                        expires_at, max_views, view_count
                 FROM vault_field_shares
                 WHERE share_id = :share_id
                   AND status = \'active\'
                   AND expires_at > NOW()
                 FOR UPDATE'
            );
            $stmt->execute(['share_id' => $shareId]);
            /** @var array<string,mixed>|false $row */
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row === false) {
                $pdo->rollBack();

                return null;
            }

            $newViewCount = ((int) $row['view_count']) + 1;
            $maxViews = (int) $row['max_views'];

            if ($newViewCount >= $maxViews) {
                $del = $pdo->prepare('DELETE FROM vault_field_shares WHERE share_id = :share_id');
                $del->execute(['share_id' => $shareId]);
            } else {
                $upd = $pdo->prepare(
                    'UPDATE vault_field_shares
                     SET view_count = :view_count,
                         last_access_ip_hash = :ip_hash,
                         consumed_at = CASE WHEN :view_count >= max_views THEN NOW() ELSE consumed_at END
                     WHERE share_id = :share_id'
                );
                $upd->execute([
                    'view_count' => $newViewCount,
                    'ip_hash' => $ipHash,
                    'share_id' => $shareId,
                ]);
            }

            $pdo->commit();
            $row['kdf_params_json'] = json_decode((string) $row['kdf_params_json'], true);

            return $row;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public function purgeExpiredAndStalePending(): int
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'DELETE FROM vault_field_shares
             WHERE expires_at < NOW()
                OR (status = \'pending\' AND pending_expires_at IS NOT NULL AND pending_expires_at < NOW())'
        );
        $stmt->execute();

        return $stmt->rowCount();
    }

    public function itemOwnedByUser(string $userId, string $itemId): bool
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT 1 FROM vault_items
             WHERE id = CAST(:id AS uuid)
               AND user_id = CAST(:user_id AS uuid)
               AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $itemId, 'user_id' => $userId]);

        return $stmt->fetchColumn() !== false;
    }
}
