<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Vault;

use Blackbox\Domain\Vault\VaultFilePolicy;
use Blackbox\Infrastructure\Database\PdoFactory;
use PDO;

final class VaultFileRepository
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    /**
     * Attaches a file to a `file` vault item under row lock (per-item file cap + parent validation).
     *
     * @param array<string,mixed> $payload output of {@see \Blackbox\Domain\Vault\VaultFileContractValidator::validate}
     * @return array<string,mixed>
     */
    public function createForVaultItem(string $userId, array $payload): array
    {
        $vaultItemId = (string) $payload['vault_item_id'];
        $pdo = $this->pdoFactory->create();
        $pdo->beginTransaction();
        try {
            $lock = $pdo->prepare(
                'SELECT id, item_type FROM vault_items
                 WHERE user_id = CAST(:user_id AS uuid) AND id = CAST(:item_id AS uuid) AND deleted_at IS NULL
                 FOR UPDATE'
            );
            $lock->execute(['user_id' => $userId, 'item_id' => $vaultItemId]);
            /** @var array<string,mixed>|false $item */
            $item = $lock->fetch(PDO::FETCH_ASSOC);
            if ($item === false) {
                throw new \InvalidArgumentException('vault_file_parent_not_found');
            }
            if (($item['item_type'] ?? '') !== 'file') {
                throw new \InvalidArgumentException('vault_file_parent_invalid');
            }
            $cstmt = $pdo->prepare(
                'SELECT COUNT(*)::int AS c FROM vault_files
                 WHERE user_id = CAST(:user_id AS uuid)
                   AND vault_item_id = CAST(:item_id AS uuid)
                   AND deleted_at IS NULL'
            );
            $cstmt->execute(['user_id' => $userId, 'item_id' => $vaultItemId]);
            $countRow = $cstmt->fetch(PDO::FETCH_ASSOC);
            $n = (int) ($countRow['c'] ?? 0);
            if ($n >= VaultFilePolicy::MAX_FILES_PER_VAULT_ITEM) {
                throw new \InvalidArgumentException('vault_file_per_item_limit');
            }

            $ins = $pdo->prepare(
                'INSERT INTO vault_files (
                    user_id, vault_item_id, original_filename, mime_type, plaintext_size_bytes,
                    wrapped_dek, wrapped_dek_nonce, wrapped_dek_tag,
                    payload_ciphertext, payload_nonce, payload_tag, crypto_version
                ) VALUES (
                    CAST(:user_id AS uuid), CAST(:vault_item_id AS uuid), :original_filename, :mime_type, :plaintext_size_bytes,
                    decode(:wrapped_dek, \'base64\'), decode(:wrapped_dek_nonce, \'base64\'), decode(:wrapped_dek_tag, \'base64\'),
                    decode(:payload_ciphertext, \'base64\'), decode(:payload_nonce, \'base64\'), decode(:payload_tag, \'base64\'),
                    :crypto_version
                )
                RETURNING
                    id, user_id::text AS user_id, vault_item_id::text AS vault_item_id, original_filename, mime_type, plaintext_size_bytes,
                    encode(wrapped_dek, \'base64\') AS wrapped_dek,
                    encode(wrapped_dek_nonce, \'base64\') AS wrapped_dek_nonce,
                    encode(wrapped_dek_tag, \'base64\') AS wrapped_dek_tag,
                    encode(payload_ciphertext, \'base64\') AS payload_ciphertext,
                    encode(payload_nonce, \'base64\') AS payload_nonce,
                    encode(payload_tag, \'base64\') AS payload_tag,
                    crypto_version, created_at, updated_at, deleted_at'
            );
            $ins->execute([
                'user_id' => $userId,
                'vault_item_id' => $vaultItemId,
                'original_filename' => $payload['original_filename'],
                'mime_type' => $payload['mime_type'],
                'plaintext_size_bytes' => $payload['plaintext_size_bytes'],
                'wrapped_dek' => $payload['wrapped_dek'],
                'wrapped_dek_nonce' => $payload['wrapped_dek_nonce'],
                'wrapped_dek_tag' => $payload['wrapped_dek_tag'],
                'payload_ciphertext' => $payload['payload_ciphertext'],
                'payload_nonce' => $payload['payload_nonce'],
                'payload_tag' => $payload['payload_tag'],
                'crypto_version' => $payload['crypto_version'],
            ]);
            /** @var array<string,mixed>|false $row */
            $row = $ins->fetch(PDO::FETCH_ASSOC);
            if ($row === false) {
                throw new \RuntimeException('Could not create vault file');
            }
            $pdo->commit();

            return $row;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listByVaultItemId(string $userId, string $vaultItemId): array
    {
        $iid = $this->normalizeIncomingId($vaultItemId);
        if ($iid === null) {
            return [];
        }
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT
                vf.id::text AS id, vf.user_id::text AS user_id, vf.vault_item_id::text AS vault_item_id,
                vf.original_filename, vf.mime_type, vf.plaintext_size_bytes, vf.crypto_version, vf.created_at, vf.updated_at
             FROM vault_files vf
             INNER JOIN vault_items vi ON vi.id = vf.vault_item_id
             WHERE LOWER(vf.user_id::text) = :user_id
               AND LOWER(vi.id::text) = :item_id
               AND vi.deleted_at IS NULL
               AND vi.item_type = \'file\'
               AND vf.deleted_at IS NULL
             ORDER BY vf.created_at ASC'
        );
        $stmt->execute(['user_id' => strtolower(trim($userId)), 'item_id' => $iid]);
        /** @var list<array<string,mixed>> $rows */
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $rows;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getById(string $userId, string $fileId): ?array
    {
        $normalizedUserId = strtolower(trim($userId));
        $normalizedFileId = $this->normalizeIncomingId($fileId);
        if ($normalizedUserId === '' || $normalizedFileId === null) {
            return null;
        }
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT
                vf.id::text AS id, vf.user_id::text AS user_id, vf.vault_item_id::text AS vault_item_id,
                vf.original_filename, vf.mime_type, vf.plaintext_size_bytes,
                encode(vf.wrapped_dek, \'base64\') AS wrapped_dek,
                encode(vf.wrapped_dek_nonce, \'base64\') AS wrapped_dek_nonce,
                encode(vf.wrapped_dek_tag, \'base64\') AS wrapped_dek_tag,
                encode(vf.payload_ciphertext, \'base64\') AS payload_ciphertext,
                encode(vf.payload_nonce, \'base64\') AS payload_nonce,
                encode(vf.payload_tag, \'base64\') AS payload_tag,
                vf.crypto_version, vf.created_at, vf.updated_at
             FROM vault_files vf
             INNER JOIN vault_items vi ON vi.id = vf.vault_item_id
             WHERE LOWER(vf.user_id::text) = :user_id
               AND LOWER(vf.id::text) = :id
               AND vi.deleted_at IS NULL
               AND vi.item_type = \'file\'
               AND vf.deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $normalizedUserId, 'id' => $normalizedFileId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $row;
    }

    public function softDelete(string $userId, string $fileId): bool
    {
        if ($this->getById($userId, $fileId) === null) {
            return false;
        }
        $normalizedUserId = strtolower(trim($userId));
        $normalizedFileId = $this->normalizeIncomingId($fileId);
        if ($normalizedUserId === '' || $normalizedFileId === null) {
            return false;
        }
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE vault_files
             SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE LOWER(user_id::text) = :user_id AND LOWER(id::text) = :id AND deleted_at IS NULL'
        );
        $stmt->execute(['user_id' => $normalizedUserId, 'id' => $normalizedFileId]);

        return $stmt->rowCount() > 0;
    }

    public function softDeleteByVaultItemId(string $userId, string $vaultItemId): int
    {
        $iid = $this->normalizeIncomingId($vaultItemId);
        if ($iid === null) {
            return 0;
        }
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE vault_files vf
             SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             FROM vault_items vi
             WHERE vi.id = vf.vault_item_id
               AND LOWER(vf.user_id::text) = :user_id
               AND LOWER(vi.id::text) = :item_id
               AND LOWER(vi.user_id::text) = :user_id
               AND vi.item_type = \'file\'
               AND vf.deleted_at IS NULL'
        );
        $uid = strtolower(trim($userId));
        $stmt->execute(['user_id' => $uid, 'item_id' => $iid]);

        return $stmt->rowCount();
    }

    public function softDeleteAllForUser(string $userId): int
    {
        $uid = strtolower(trim($userId));
        if ($uid === '') {
            return 0;
        }
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE vault_files
             SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE LOWER(user_id::text) = :user_id AND deleted_at IS NULL'
        );
        $stmt->execute(['user_id' => $uid]);

        return $stmt->rowCount();
    }

    public function countActiveForVaultItem(string $userId, string $vaultItemId): int
    {
        $iid = $this->normalizeIncomingId($vaultItemId);
        if ($iid === null) {
            return 0;
        }
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT COUNT(*)::int AS c
             FROM vault_files
             WHERE LOWER(user_id::text) = :user_id
               AND LOWER(vault_item_id::text) = :item_id
               AND deleted_at IS NULL'
        );
        $stmt->execute(['user_id' => strtolower(trim($userId)), 'item_id' => $iid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return (int) ($row['c'] ?? 0);
    }

    public function sumActivePlaintextBytes(string $userId): int
    {
        $normalizedUserId = strtolower(trim($userId));
        if ($normalizedUserId === '') {
            return 0;
        }
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT COALESCE(SUM(plaintext_size_bytes), 0) AS total
             FROM vault_files
             WHERE LOWER(user_id::text) = :user_id AND deleted_at IS NULL'
        );
        $stmt->execute(['user_id' => $normalizedUserId]);
        /** @var array<string,mixed>|false $row */
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return (int) ($row['total'] ?? 0);
    }

    private function normalizeIncomingId(string $incomingId): ?string
    {
        $raw = trim($incomingId);
        if ($raw === '') {
            return null;
        }
        $raw = trim($raw, "\"'{}");
        if (preg_match('/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i', $raw, $m) !== 1) {
            return null;
        }

        return strtolower($m[1]);
    }
}
