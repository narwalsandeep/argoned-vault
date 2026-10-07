<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class VaultFiles extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
CREATE TABLE vault_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  plaintext_size_bytes BIGINT NOT NULL,
  wrapped_dek BYTEA NOT NULL,
  wrapped_dek_nonce BYTEA NOT NULL,
  wrapped_dek_tag BYTEA NOT NULL,
  payload_ciphertext BYTEA NOT NULL,
  payload_nonce BYTEA NOT NULL,
  payload_tag BYTEA NOT NULL,
  crypto_version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_vault_files_user_created ON vault_files(user_id, created_at DESC);
CREATE INDEX idx_vault_files_user_active ON vault_files(user_id) WHERE deleted_at IS NULL;
SQL);
    }

    public function down(): void
    {
        $this->execute(<<<'SQL'
DROP TABLE IF EXISTS vault_files;
SQL);
    }
}
