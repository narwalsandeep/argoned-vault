<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class UserNamesVerificationTokens extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
ALTER TABLE users
  ADD COLUMN first_name VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN last_name VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN email_verified_at TIMESTAMPTZ NULL;

UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;

CREATE TABLE auth_email_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('verify_email', 'password_reset')),
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_auth_email_tokens_hash ON auth_email_tokens (token_hash);
CREATE INDEX idx_auth_email_tokens_user_purpose ON auth_email_tokens (user_id, purpose);
SQL);
    }

    public function down(): void
    {
        $this->execute(<<<'SQL'
DROP TABLE IF EXISTS auth_email_tokens;

ALTER TABLE users
  DROP COLUMN IF EXISTS email_verified_at,
  DROP COLUMN IF EXISTS last_name,
  DROP COLUMN IF EXISTS first_name;
SQL);
    }
}
