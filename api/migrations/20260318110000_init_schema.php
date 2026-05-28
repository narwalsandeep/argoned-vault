<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class InitSchema extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) NOT NULL UNIQUE,
  auth_password_hash TEXT NOT NULL,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_state VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMPTZ
);

CREATE TABLE vault_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  kdf_algo VARCHAR(32) NOT NULL,
  kdf_params_json JSONB NOT NULL,
  kdf_salt BYTEA NOT NULL,
  wrapped_vault_key BYTEA NOT NULL,
  wrapped_vault_key_nonce BYTEA NOT NULL,
  wrapped_vault_key_tag BYTEA NOT NULL,
  crypto_version INTEGER NOT NULL DEFAULT 1,
  vault_initialized_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vault_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  item_type VARCHAR(64) NOT NULL,
  label_ciphertext BYTEA,
  wrapped_dek BYTEA NOT NULL,
  wrapped_dek_nonce BYTEA NOT NULL,
  wrapped_dek_tag BYTEA NOT NULL,
  payload_ciphertext BYTEA NOT NULL,
  payload_nonce BYTEA NOT NULL,
  payload_tag BYTEA NOT NULL,
  crypto_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_vault_items_user_id ON vault_items(user_id);
CREATE INDEX idx_vault_items_user_id_id ON vault_items(user_id, id);

CREATE TABLE vault_recovery_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  artifact_type VARCHAR(64) NOT NULL,
  wrapped_vault_key_recovery BYTEA NOT NULL,
  nonce BYTEA NOT NULL,
  tag BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_vault_recovery_artifacts_user_id ON vault_recovery_artifacts(user_id);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  event_type VARCHAR(128) NOT NULL,
  ip_hash VARCHAR(128),
  ua_hash VARCHAR(128),
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_events_user_created ON audit_events(user_id, created_at);
SQL);
    }

    public function down(): void
    {
        $this->execute(<<<'SQL'
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS vault_recovery_artifacts;
DROP TABLE IF EXISTS vault_items;
DROP TABLE IF EXISTS vault_profiles;
DROP TABLE IF EXISTS users;
SQL);
    }
}
