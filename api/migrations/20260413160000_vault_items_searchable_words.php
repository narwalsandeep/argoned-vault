<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class VaultItemsSearchableWords extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
ALTER TABLE vault_items
  ADD COLUMN searchable_words TEXT NULL;
SQL);
    }

    public function down(): void
    {
        $this->execute(<<<'SQL'
ALTER TABLE vault_items
  DROP COLUMN IF EXISTS searchable_words;
SQL);
    }
}
