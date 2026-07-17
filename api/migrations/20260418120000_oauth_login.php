<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class OAuthLogin extends AbstractMigration
{
    public function up(): void
    {
        $this->execute('ALTER TABLE users ALTER COLUMN auth_password_hash DROP NOT NULL');

        $this->execute(<<<'SQL'
CREATE TABLE user_oauth_identities (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  provider VARCHAR(32) NOT NULL,
  provider_subject TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, provider),
  UNIQUE (provider, provider_subject)
);
SQL);

        $this->execute(<<<'SQL'
CREATE TABLE oauth_login_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_token_hash VARCHAR(64) NOT NULL UNIQUE,
  provider VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL
);
SQL);

        $this->execute('CREATE INDEX idx_oauth_login_states_expires_at ON oauth_login_states (expires_at)');
    }

    public function down(): void
    {
        $this->execute('DROP INDEX IF EXISTS idx_oauth_login_states_expires_at');
        $this->execute('DROP TABLE IF EXISTS oauth_login_states');
        $this->execute('DROP TABLE IF EXISTS user_oauth_identities');
        $placeholder = password_hash('__oauth_rollback_placeholder__', PASSWORD_ARGON2ID);
        if ($placeholder === false) {
            throw new \RuntimeException('password_hash_failed');
        }
        $pdo = $this->getAdapter()->getConnection();
        $stmt = $pdo->prepare('UPDATE users SET auth_password_hash = ? WHERE auth_password_hash IS NULL');
        $stmt->execute([$placeholder]);
        $this->execute('ALTER TABLE users ALTER COLUMN auth_password_hash SET NOT NULL');
    }
}
