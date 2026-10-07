<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

/** Marks long-lived “keep me signed in” sessions for auditing and session list APIs. */
final class AuthSessionsIsPersistent extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS is_persistent BOOLEAN NOT NULL DEFAULT FALSE;
SQL);
    }

    public function down(): void
    {
        $this->execute(<<<'SQL'
ALTER TABLE auth_sessions
  DROP COLUMN IF EXISTS is_persistent;
SQL);
    }
}
