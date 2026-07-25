<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class AuthLoginEmailOtp extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
CREATE TABLE auth_login_email_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  challenge_token_hash CHAR(64) NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts_remaining SMALLINT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_auth_login_email_otp_challenge_hash
  ON auth_login_email_otp_challenges (challenge_token_hash);
CREATE INDEX idx_auth_login_email_otp_user_id
  ON auth_login_email_otp_challenges (user_id);

UPDATE users SET mfa_enabled = TRUE, mfa_state = 'email_otp';
SQL);
    }

    public function down(): void
    {
        $this->execute('DROP TABLE IF EXISTS auth_login_email_otp_challenges');
    }
}
