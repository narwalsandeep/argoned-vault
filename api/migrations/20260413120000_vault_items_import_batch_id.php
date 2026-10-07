<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class VaultItemsImportBatchId extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
ALTER TABLE vault_items
  ADD COLUMN import_batch_id UUID NULL;

CREATE INDEX idx_vault_items_user_import_batch
  ON vault_items (user_id, import_batch_id)
  WHERE import_batch_id IS NOT NULL;
SQL);
    }

    public function down(): void
    {
        $this->execute(<<<'SQL'
DROP INDEX IF EXISTS idx_vault_items_user_import_batch;

ALTER TABLE vault_items
  DROP COLUMN IF EXISTS import_batch_id;
SQL);
    }
}
