<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class UsersDisplayName extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(200) NULL;
SQL);
    }

    public function down(): void
    {
        $this->execute(<<<'SQL'
ALTER TABLE users
  DROP COLUMN IF EXISTS display_name;
SQL);
    }
}
