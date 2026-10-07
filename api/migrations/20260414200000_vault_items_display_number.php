<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

/**
 * Per-user sequential display numbers (1, 2, 3, …) for vault items.
 * Stable across edits; not reused after soft-delete. New items use a monotonic counter per user.
 */
final class VaultItemsDisplayNumber extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
CREATE TABLE vault_item_display_counters (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  next_display_number BIGINT NOT NULL DEFAULT 2
);

ALTER TABLE vault_items
  ADD COLUMN display_number BIGINT NULL;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS rn
  FROM vault_items
)
UPDATE vault_items v
SET display_number = ranked.rn
FROM ranked
WHERE v.id = ranked.id;

ALTER TABLE vault_items
  ALTER COLUMN display_number SET NOT NULL;

CREATE UNIQUE INDEX uq_vault_items_user_display_number
  ON vault_items (user_id, display_number);

INSERT INTO vault_item_display_counters (user_id, next_display_number)
SELECT user_id, COALESCE(MAX(display_number), 0) + 1
FROM vault_items
GROUP BY user_id;
SQL);
    }

    public function down(): void
    {
        $this->execute(<<<'SQL'
DROP INDEX IF EXISTS uq_vault_items_user_display_number;

ALTER TABLE vault_items
  DROP COLUMN IF EXISTS display_number;

DROP TABLE IF EXISTS vault_item_display_counters;
SQL);
    }
}
