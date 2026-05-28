<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class AddAuthSessions extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  csrf_token VARCHAR(128) NOT NULL,
  ip_hash VARCHAR(128),
  user_agent_hash VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);
SQL);
    }

    public function down(): void
    {
        $this->execute('DROP TABLE IF EXISTS auth_sessions;');
    }
}
