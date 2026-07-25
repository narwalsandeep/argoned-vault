<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Auth;

use Blackbox\Infrastructure\Database\PdoFactory;
use PDO;

class UserRepository
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    /**
     * @return array{
     *   id:string,
     *   email:string,
     *   auth_password_hash:?string,
     *   mfa_enabled:bool,
     *   mfa_state:?string,
     *   first_name:string,
     *   last_name:string,
     *   display_name:?string,
     *   email_verified_at:?string
     * }|null
     */
    public function findByEmail(string $email): ?array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT id, email, auth_password_hash, mfa_enabled, mfa_state, first_name, last_name, display_name, email_verified_at
             FROM users WHERE email = :email LIMIT 1'
        );
        $stmt->execute(['email' => mb_strtolower(trim($email))]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row !== false ? $this->mapAuthRow($row) : null;
    }

    /**
     * @return array{
     *   id:string,
     *   email:string,
     *   mfa_enabled:bool,
     *   mfa_state:?string,
     *   first_name:string,
     *   last_name:string,
     *   display_name:?string,
     *   email_verified_at:?string
     * }|null
     */
    public function findById(string $id): ?array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT id, email, mfa_enabled, mfa_state, first_name, last_name, display_name, email_verified_at
             FROM users WHERE id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row !== false ? $this->mapPublicRow($row) : null;
    }

    /**
     * @return array{id:string,email:string,mfa_enabled:bool,mfa_state:?string,first_name:string,last_name:string,display_name:?string}
     */
    public function create(
        string $email,
        string $passwordHash,
        string $firstName,
        string $lastName,
        string $termsPrivacyDocsVersion,
    ): array {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'INSERT INTO users (
                email,
                auth_password_hash,
                first_name,
                last_name,
                mfa_enabled,
                mfa_state,
                email_verified_at,
                terms_privacy_accepted_at,
                terms_privacy_docs_version
            )
             VALUES (:email, :hash, :first_name, :last_name, true, :state, NULL, CURRENT_TIMESTAMP, :docs_version)
             RETURNING id, email, mfa_enabled, mfa_state, first_name, last_name, display_name'
        );
        $stmt->execute([
            'email' => mb_strtolower(trim($email)),
            'hash' => $passwordHash,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'state' => 'email_otp',
            'docs_version' => $termsPrivacyDocsVersion,
        ]);
        /** @var array<string,mixed> $row */
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'id' => (string) $row['id'],
            'email' => (string) $row['email'],
            'mfa_enabled' => (bool) $row['mfa_enabled'],
            'mfa_state' => $row['mfa_state'] !== null ? (string) $row['mfa_state'] : null,
            'first_name' => (string) $row['first_name'],
            'last_name' => (string) $row['last_name'],
            'display_name' => isset($row['display_name']) && $row['display_name'] !== null && $row['display_name'] !== ''
                ? (string) $row['display_name']
                : null,
        ];
    }

    /**
     * OAuth-only account: no password hash; email is treated as verified at creation.
     *
     * @return array{id:string,email:string,mfa_enabled:bool,mfa_state:?string,first_name:string,last_name:string,display_name:?string}
     */
    public function createOAuthUser(
        string $email,
        string $firstName,
        string $lastName,
        string $termsPrivacyDocsVersion,
    ): array {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'INSERT INTO users (
                email,
                auth_password_hash,
                first_name,
                last_name,
                mfa_enabled,
                mfa_state,
                email_verified_at,
                terms_privacy_accepted_at,
                terms_privacy_docs_version
            )
             VALUES (:email, NULL, :first_name, :last_name, true, :state, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :docs_version)
             RETURNING id, email, mfa_enabled, mfa_state, first_name, last_name, display_name'
        );
        $stmt->execute([
            'email' => mb_strtolower(trim($email)),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'state' => 'oauth',
            'docs_version' => $termsPrivacyDocsVersion,
        ]);
        /** @var array<string,mixed> $row */
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'id' => (string) $row['id'],
            'email' => (string) $row['email'],
            'mfa_enabled' => (bool) $row['mfa_enabled'],
            'mfa_state' => $row['mfa_state'] !== null ? (string) $row['mfa_state'] : null,
            'first_name' => (string) $row['first_name'],
            'last_name' => (string) $row['last_name'],
            'display_name' => isset($row['display_name']) && $row['display_name'] !== null && $row['display_name'] !== ''
                ? (string) $row['display_name']
                : null,
        ];
    }

    public function markEmailVerified(string $userId): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE users SET email_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = :id'
        );
        $stmt->execute(['id' => $userId]);
    }

    /**
     * @return array{id:string,auth_password_hash:?string}|null
     */
    public function findIdAndPasswordHashById(string $userId): ?array
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare('SELECT id, auth_password_hash FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        $hash = $row['auth_password_hash'];

        return [
            'id' => (string) $row['id'],
            'auth_password_hash' => $hash !== null && $hash !== '' ? (string) $hash : null,
        ];
    }

    public function updateAuthPasswordHash(string $userId, string $passwordHash): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE users SET auth_password_hash = :hash, updated_at = CURRENT_TIMESTAMP WHERE id = :id'
        );
        $stmt->execute(['hash' => $passwordHash, 'id' => $userId]);
    }

    public function setMfaState(string $userId, bool $enabled, string $state): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE users SET mfa_enabled = :enabled, mfa_state = :state, updated_at = CURRENT_TIMESTAMP WHERE id = :id'
        );
        $stmt->execute([
            'enabled' => $enabled,
            'state' => $state,
            'id' => $userId,
        ]);
    }

    public function updateDisplayName(string $userId, ?string $displayName): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE users SET display_name = :display_name, updated_at = CURRENT_TIMESTAMP WHERE id = :id'
        );
        $stmt->execute([
            'display_name' => $displayName,
            'id' => $userId,
        ]);
    }

    /**
     * Platform admin directory: one row per user, plan matches {@see \Blackbox\Infrastructure\Billing\StripeBillingService::getEffectivePlanKey}
     * when billing is enabled (caller may override to free when billing is off).
     *
     * @return list<array{
     *   id:string,
     *   email:string,
     *   display_name:?string,
     *   first_name:string,
     *   last_name:string,
     *   email_verified:bool,
     *   created_at:string,
     *   last_login_at:?string,
     *   plan_key:string,
     *   mfa_state:?string
     * }>
     */
    public function listCustomersWithPlansForAdmin(): array
    {
        $pdo = $this->pdoFactory->create();
        $sql = <<<'SQL'
SELECT
  u.id::text AS id,
  u.email,
  u.display_name,
  u.first_name,
  u.last_name,
  (u.email_verified_at IS NOT NULL) AS email_verified,
  to_char(u.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
  CASE
    WHEN u.last_login_at IS NULL THEN NULL
    ELSE to_char(u.last_login_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  END AS last_login_at,
  u.mfa_state,
  CASE
    WHEN ot.user_id IS NOT NULL THEN 'lifetime'
    WHEN bs.plan_key = 'pro' THEN 'pro'
    ELSE 'free'
  END AS plan_key
FROM users u
LEFT JOIN billing_one_time_purchases ot
  ON ot.user_id = u.id AND ot.plan_key = 'lifetime'
LEFT JOIN (
  SELECT DISTINCT ON (user_id) user_id, plan_key
  FROM billing_subscriptions
  WHERE status IN ('trialing', 'active', 'past_due')
  ORDER BY user_id, updated_at DESC
) bs ON bs.user_id = u.id
ORDER BY u.created_at DESC
SQL;
        $stmt = $pdo->query($sql);
        if ($stmt === false) {
            throw new \RuntimeException('list_customers_query_failed');
        }

        /** @var list<array<string,mixed>> $rows */
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $row) {
            $display = $row['display_name'] ?? null;
            $out[] = [
                'id' => (string) $row['id'],
                'email' => (string) $row['email'],
                'display_name' => is_string($display) && $display !== '' ? $display : null,
                'first_name' => (string) ($row['first_name'] ?? ''),
                'last_name' => (string) ($row['last_name'] ?? ''),
                'email_verified' => $this->pgBool($row['email_verified'] ?? false),
                'created_at' => (string) $row['created_at'],
                'last_login_at' => isset($row['last_login_at']) && is_string($row['last_login_at']) && $row['last_login_at'] !== ''
                    ? (string) $row['last_login_at']
                    : null,
                'plan_key' => (string) $row['plan_key'],
                'mfa_state' => isset($row['mfa_state']) && $row['mfa_state'] !== null && $row['mfa_state'] !== ''
                    ? (string) $row['mfa_state']
                    : null,
            ];
        }

        return $out;
    }

    private function pgBool(mixed $v): bool
    {
        return $v === true || $v === 1 || $v === '1' || $v === 't' || $v === 'true';
    }

    /**
     * Permanently removes the user row; FK CASCADE clears vault, sessions, billing cache tables, auth tokens, etc.
     * Explicitly deletes audit and billing event rows that would otherwise only be nullified.
     */
    public function deleteUserAndAllRelatedData(string $userId): bool
    {
        $pdo = $this->pdoFactory->create();
        $pdo->beginTransaction();
        try {
            $check = $pdo->prepare('SELECT 1 FROM users WHERE id = CAST(:id AS uuid) LIMIT 1');
            $check->execute(['id' => $userId]);
            if ($check->fetchColumn() === false) {
                $pdo->rollBack();

                return false;
            }

            $pdo->prepare('DELETE FROM audit_events WHERE user_id = CAST(:id AS uuid)')->execute(['id' => $userId]);
            $pdo->prepare('DELETE FROM billing_event_log WHERE user_id = CAST(:id AS uuid)')->execute(['id' => $userId]);

            $del = $pdo->prepare('DELETE FROM users WHERE id = CAST(:id AS uuid)');
            $del->execute(['id' => $userId]);
            if ($del->rowCount() !== 1) {
                $pdo->rollBack();

                return false;
            }
            $pdo->commit();

            return true;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw new \RuntimeException('user_delete_failed', 0, $e);
        }
    }

    /**
     * Account-only recovery lane:
     * reset login credentials and clear vault data when recovery material is unavailable.
     */
    public function resetAccountOnlyRecovery(string $email, string $passwordHash): bool
    {
        $pdo = $this->pdoFactory->create();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
            $stmt->execute(['email' => mb_strtolower(trim($email))]);
            $userId = $stmt->fetchColumn();
            if ($userId === false) {
                $pdo->rollBack();
                return false;
            }

            $userId = (string) $userId;
            $pdo->prepare('UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = :user_id')
                ->execute(['user_id' => $userId]);
            $pdo->prepare('DELETE FROM vault_items WHERE user_id = :user_id')
                ->execute(['user_id' => $userId]);
            $pdo->prepare('DELETE FROM vault_profiles WHERE user_id = :user_id')
                ->execute(['user_id' => $userId]);
            $pdo->prepare('DELETE FROM vault_recovery_artifacts WHERE user_id = :user_id')
                ->execute(['user_id' => $userId]);
            $pdo->prepare(
                'UPDATE users
                 SET auth_password_hash = :hash,
                     mfa_enabled = true,
                     mfa_state = :state,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            )->execute([
                'hash' => $passwordHash,
                'state' => 'email_otp',
                'id' => $userId,
            ]);
            $pdo->prepare(
                'INSERT INTO audit_events (user_id, event_type, metadata_json)
                 VALUES (:user_id, :event_type, CAST(:metadata AS JSONB))'
            )->execute([
                'user_id' => $userId,
                'event_type' => 'account_recovery_reset',
                'metadata' => json_encode(['vault_data_cleared' => true], JSON_THROW_ON_ERROR),
            ]);

            $pdo->commit();
            return true;
        } catch (\Throwable) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw new \RuntimeException('Recovery reset failed');
        }
    }

    /**
     * @param array<string,mixed> $row
     * @return array{
     *   id:string,
     *   email:string,
     *   auth_password_hash:?string,
     *   mfa_enabled:bool,
     *   mfa_state:?string,
     *   first_name:string,
     *   last_name:string,
     *   display_name:?string,
     *   email_verified_at:?string
     * }
     */
    private function mapAuthRow(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'email' => (string) $row['email'],
            'auth_password_hash' => isset($row['auth_password_hash']) && $row['auth_password_hash'] !== null && $row['auth_password_hash'] !== ''
                ? (string) $row['auth_password_hash']
                : null,
            'mfa_enabled' => (bool) $row['mfa_enabled'],
            'mfa_state' => $row['mfa_state'] !== null ? (string) $row['mfa_state'] : null,
            'first_name' => (string) ($row['first_name'] ?? ''),
            'last_name' => (string) ($row['last_name'] ?? ''),
            'display_name' => isset($row['display_name']) && $row['display_name'] !== null && $row['display_name'] !== ''
                ? (string) $row['display_name']
                : null,
            'email_verified_at' => $row['email_verified_at'] !== null ? (string) $row['email_verified_at'] : null,
        ];
    }

    /**
     * @param array<string,mixed> $row
     * @return array{
     *   id:string,
     *   email:string,
     *   mfa_enabled:bool,
     *   mfa_state:?string,
     *   first_name:string,
     *   last_name:string,
     *   display_name:?string,
     *   email_verified_at:?string
     * }
     */
    private function mapPublicRow(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'email' => (string) $row['email'],
            'mfa_enabled' => (bool) $row['mfa_enabled'],
            'mfa_state' => $row['mfa_state'] !== null ? (string) $row['mfa_state'] : null,
            'first_name' => (string) ($row['first_name'] ?? ''),
            'last_name' => (string) ($row['last_name'] ?? ''),
            'display_name' => isset($row['display_name']) && $row['display_name'] !== null && $row['display_name'] !== ''
                ? (string) $row['display_name']
                : null,
            'email_verified_at' => $row['email_verified_at'] !== null ? (string) $row['email_verified_at'] : null,
        ];
    }
}
