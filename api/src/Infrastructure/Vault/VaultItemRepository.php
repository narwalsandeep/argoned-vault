<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Vault;

use Blackbox\Infrastructure\Database\PdoFactory;
use PDO;

final class VaultItemRepository
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function create(string $userId, array $payload, ?string $importBatchId = null): array
    {
        $pdo = $this->pdoFactory->create();
        $pdo->beginTransaction();
        try {
            $displayNumber = $this->allocateNextDisplayNumber($pdo, $userId);
            $stmt = $pdo->prepare(
                'INSERT INTO vault_items (
                    user_id, display_number, item_type, import_batch_id, searchable_words, label_ciphertext, wrapped_dek, wrapped_dek_nonce, wrapped_dek_tag,
                    payload_ciphertext, payload_nonce, payload_tag, crypto_version
                 ) VALUES (
                    :user_id, :display_number, :item_type,
                    CASE WHEN :import_batch_id = \'\' THEN NULL ELSE CAST(:import_batch_id AS UUID) END,
                    :searchable_words,
                    CASE WHEN :label_ciphertext = \'\' THEN NULL ELSE decode(:label_ciphertext, \'base64\') END,
                    decode(:wrapped_dek, \'base64\'), decode(:wrapped_dek_nonce, \'base64\'), decode(:wrapped_dek_tag, \'base64\'),
                    decode(:payload_ciphertext, \'base64\'), decode(:payload_nonce, \'base64\'), decode(:payload_tag, \'base64\'),
                    :crypto_version
                 )
                 RETURNING id, user_id, display_number, item_type, import_batch_id, searchable_words, crypto_version, created_at, updated_at, deleted_at'
            );
            $stmt->execute([
                'user_id' => $userId,
                'display_number' => $displayNumber,
                'item_type' => $payload['item_type'],
                'import_batch_id' => $importBatchId ?? '',
                'searchable_words' => $payload['searchable_words'] ?? null,
                'label_ciphertext' => (string) ($payload['label_ciphertext'] ?? ''),
                'wrapped_dek' => $payload['wrapped_dek'],
                'wrapped_dek_nonce' => $payload['wrapped_dek_nonce'],
                'wrapped_dek_tag' => $payload['wrapped_dek_tag'],
                'payload_ciphertext' => $payload['payload_ciphertext'],
                'payload_nonce' => $payload['payload_nonce'],
                'payload_tag' => $payload['payload_tag'],
                'crypto_version' => $payload['crypto_version'],
            ]);
            /** @var array<string,mixed> $row */
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $pdo->commit();

            return $row;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Atomically reserves the next per-user display number (1, 2, 3, …).
     */
    private function allocateNextDisplayNumber(PDO $pdo, string $userId): int
    {
        $stmt = $pdo->prepare(
            'INSERT INTO vault_item_display_counters (user_id, next_display_number)
             VALUES (:user_id, 2)
             ON CONFLICT (user_id) DO UPDATE SET next_display_number = vault_item_display_counters.next_display_number + 1
             RETURNING next_display_number - 1 AS display_number'
        );
        $stmt->execute(['user_id' => $userId]);
        /** @var array<string,mixed>|false $row */
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false || !isset($row['display_number'])) {
            throw new \RuntimeException('Could not allocate vault item display number');
        }

        return (int) $row['display_number'];
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listMetadata(string $userId): array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT id, user_id, display_number, item_type, searchable_words, crypto_version, created_at, updated_at, deleted_at
             FROM vault_items
             WHERE user_id = :user_id AND deleted_at IS NULL
             ORDER BY display_number ASC, id ASC'
        );
        $stmt->execute(['user_id' => $userId]);
        /** @var list<array<string,mixed>> $rows */
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $rows;
    }

    public function countActiveByUserId(string $userId): int
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) AS c
             FROM vault_items
             WHERE user_id = :user_id AND deleted_at IS NULL'
        );
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return (int) ($row['c'] ?? 0);
    }

    public function countActiveByUserIdAndType(string $userId, string $itemType): int
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) AS c
             FROM vault_items
             WHERE user_id = :user_id AND item_type = :item_type AND deleted_at IS NULL'
        );
        $stmt->execute(['user_id' => $userId, 'item_type' => $itemType]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return (int) ($row['c'] ?? 0);
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listForJsonExport(string $userId): array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT
                id, user_id, display_number, item_type, searchable_words,
                encode(label_ciphertext, \'base64\') AS label_ciphertext,
                encode(wrapped_dek, \'base64\') AS wrapped_dek,
                encode(wrapped_dek_nonce, \'base64\') AS wrapped_dek_nonce,
                encode(wrapped_dek_tag, \'base64\') AS wrapped_dek_tag,
                encode(payload_ciphertext, \'base64\') AS payload_ciphertext,
                encode(payload_nonce, \'base64\') AS payload_nonce,
                encode(payload_tag, \'base64\') AS payload_tag,
                crypto_version, created_at, updated_at, deleted_at
             FROM vault_items
             WHERE user_id = :user_id AND deleted_at IS NULL AND item_type <> :file_type
             ORDER BY display_number ASC, id ASC'
        );
        $stmt->execute(['user_id' => $userId, 'file_type' => 'file']);
        /** @var list<array<string,mixed>> $rows */
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $rows;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getById(string $userId, string $id): ?array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT
                id, user_id, display_number, item_type, searchable_words,
                encode(label_ciphertext, \'base64\') AS label_ciphertext,
                encode(wrapped_dek, \'base64\') AS wrapped_dek,
                encode(wrapped_dek_nonce, \'base64\') AS wrapped_dek_nonce,
                encode(wrapped_dek_tag, \'base64\') AS wrapped_dek_tag,
                encode(payload_ciphertext, \'base64\') AS payload_ciphertext,
                encode(payload_nonce, \'base64\') AS payload_nonce,
                encode(payload_tag, \'base64\') AS payload_tag,
                crypto_version, created_at, updated_at, deleted_at
             FROM vault_items
             WHERE user_id = :user_id AND id = :id AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $userId, 'id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? $row : null;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>|null
     */
    public function update(string $userId, string $id, array $payload): ?array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE vault_items
             SET
                item_type = :item_type,
                searchable_words = :searchable_words,
                label_ciphertext = CASE WHEN :label_ciphertext = \'\' THEN NULL ELSE decode(:label_ciphertext, \'base64\') END,
                wrapped_dek = decode(:wrapped_dek, \'base64\'),
                wrapped_dek_nonce = decode(:wrapped_dek_nonce, \'base64\'),
                wrapped_dek_tag = decode(:wrapped_dek_tag, \'base64\'),
                payload_ciphertext = decode(:payload_ciphertext, \'base64\'),
                payload_nonce = decode(:payload_nonce, \'base64\'),
                payload_tag = decode(:payload_tag, \'base64\'),
                crypto_version = :crypto_version,
                updated_at = CURRENT_TIMESTAMP
             WHERE user_id = :user_id AND id = :id AND deleted_at IS NULL
             RETURNING id, user_id, display_number, item_type, searchable_words, crypto_version, created_at, updated_at, deleted_at'
        );
        $stmt->execute([
            'user_id' => $userId,
            'id' => $id,
            'item_type' => $payload['item_type'],
            'searchable_words' => $payload['searchable_words'] ?? null,
            'label_ciphertext' => (string) ($payload['label_ciphertext'] ?? ''),
            'wrapped_dek' => $payload['wrapped_dek'],
            'wrapped_dek_nonce' => $payload['wrapped_dek_nonce'],
            'wrapped_dek_tag' => $payload['wrapped_dek_tag'],
            'payload_ciphertext' => $payload['payload_ciphertext'],
            'payload_nonce' => $payload['payload_nonce'],
            'payload_tag' => $payload['payload_tag'],
            'crypto_version' => $payload['crypto_version'],
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? $row : null;
    }

    public function softDelete(string $userId, string $id): bool
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE vault_items SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = :user_id AND id = :id AND deleted_at IS NULL'
        );
        $stmt->execute(['user_id' => $userId, 'id' => $id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Soft-delete every non-deleted vault item for the user. Returns how many rows were updated.
     */
    public function softDeleteAllForUser(string $userId): int
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE vault_items SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = :user_id AND deleted_at IS NULL'
        );
        $stmt->execute(['user_id' => $userId]);

        return $stmt->rowCount();
    }
}

