<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class VaultFilesVaultItemId extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
ALTER TABLE vault_files
  ADD COLUMN vault_item_id UUID NULL REFERENCES vault_items(id) ON DELETE CASCADE;

CREATE INDEX idx_vault_files_vault_item_active
  ON vault_files(vault_item_id)
  WHERE deleted_at IS NULL;
SQL);
        $this->execute(<<<'SQL'
UPDATE vault_files
SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
WHERE vault_item_id IS NULL;
SQL);
    }

    public function down(): void
    {
        $this->execute(<<<'SQL'
DROP INDEX IF EXISTS idx_vault_files_vault_item_active;

ALTER TABLE vault_files DROP COLUMN IF EXISTS vault_item_id;
SQL);
    }
}
