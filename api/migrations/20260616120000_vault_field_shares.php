<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

/**
 * Ephemeral field shares: ciphertext + metadata only (zero-knowledge).
 */
final class VaultFieldShares extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
CREATE TABLE vault_field_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id VARCHAR(64) NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  vault_item_id UUID NULL REFERENCES vault_items(id) ON DELETE SET NULL ON UPDATE CASCADE,
  field_key VARCHAR(64) NULL,
  label VARCHAR(200) NULL,
  crypto_version SMALLINT NOT NULL DEFAULT 1,
  kdf_algo VARCHAR(32) NOT NULL,
  kdf_params_json JSONB NOT NULL,
  kdf_salt BYTEA NOT NULL,
  ciphertext BYTEA NOT NULL DEFAULT '\x',
  payload_nonce BYTEA NOT NULL DEFAULT '\x',
  payload_tag BYTEA NOT NULL DEFAULT '\x',
  expires_at TIMESTAMPTZ NOT NULL,
  max_views SMALLINT NOT NULL DEFAULT 1,
  view_count SMALLINT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  pending_expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consumed_at TIMESTAMPTZ NULL,
  last_access_ip_hash VARCHAR(64) NULL
);

CREATE INDEX idx_vault_field_shares_owner ON vault_field_shares(owner_user_id, status, expires_at);
CREATE INDEX idx_vault_field_shares_status_expires ON vault_field_shares(status, expires_at);
SQL);
    }

    public function down(): void
    {
        $this->execute('DROP TABLE IF EXISTS vault_field_shares');
    }
}
