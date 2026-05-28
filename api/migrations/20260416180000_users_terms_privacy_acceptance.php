<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class UsersTermsPrivacyAcceptance extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
ALTER TABLE users
  ADD COLUMN terms_privacy_accepted_at TIMESTAMPTZ NULL,
  ADD COLUMN terms_privacy_docs_version VARCHAR(64) NULL;
SQL);
    }

    public function down(): void
    {
        $this->execute(<<<'SQL'
ALTER TABLE users
  DROP COLUMN IF EXISTS terms_privacy_docs_version,
  DROP COLUMN IF EXISTS terms_privacy_accepted_at;
SQL);
    }
}
