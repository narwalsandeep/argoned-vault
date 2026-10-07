<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

/**
 * Allows a new email-token purpose for user-owned account recovery.
 * Existing verify_email and password_reset rows stay valid. No vault data is rewritten.
 */
final class AuthEmailTokensRecoveryPurpose extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
ALTER TABLE auth_email_tokens DROP CONSTRAINT IF EXISTS auth_email_tokens_purpose_check;
ALTER TABLE auth_email_tokens
  ADD CONSTRAINT auth_email_tokens_purpose_check
  CHECK (purpose IN ('verify_email', 'password_reset', 'account_recovery_ownership'));
SQL);
    }

    public function down(): void
    {
        $this->execute(<<<'SQL'
DELETE FROM auth_email_tokens WHERE purpose = 'account_recovery_ownership';
ALTER TABLE auth_email_tokens DROP CONSTRAINT IF EXISTS auth_email_tokens_purpose_check;
ALTER TABLE auth_email_tokens
  ADD CONSTRAINT auth_email_tokens_purpose_check
  CHECK (purpose IN ('verify_email', 'password_reset'));
SQL);
    }
}
