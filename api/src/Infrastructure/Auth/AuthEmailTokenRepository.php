<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Auth;

use Blackbox\Infrastructure\Database\PdoFactory;
use PDO;

class AuthEmailTokenRepository
{
    public const PURPOSE_VERIFY_EMAIL = 'verify_email';

    public const PURPOSE_PASSWORD_RESET = 'password_reset';

    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    /**
     * Replaces any unused token for the same purpose. Returns the plaintext token (show to user only in email).
     */
    public function issueToken(string $userId, string $purpose, int $ttlSeconds): string
    {
        if (!in_array($purpose, [self::PURPOSE_VERIFY_EMAIL, self::PURPOSE_PASSWORD_RESET], true)) {
            throw new \InvalidArgumentException('Invalid token purpose');
        }

        $pdo = $this->pdoFactory->create();
        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'DELETE FROM auth_email_tokens
                 WHERE user_id = :user_id AND purpose = :purpose AND used_at IS NULL'
            )->execute(['user_id' => $userId, 'purpose' => $purpose]);

            $plain = bin2hex(random_bytes(32));
            $hash = hash('sha256', $plain, false);
            $stmt = $pdo->prepare(
                'INSERT INTO auth_email_tokens (user_id, purpose, token_hash, expires_at)
                 VALUES (:user_id, :purpose, :token_hash, (CURRENT_TIMESTAMP + (:ttl || \' seconds\')::interval))'
            );
            $stmt->execute([
                'user_id' => $userId,
                'purpose' => $purpose,
                'token_hash' => $hash,
                'ttl' => $ttlSeconds,
            ]);
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        return $plain;
    }

    /**
     * Marks the token used and returns the owning user id, or null if invalid/expired/already used.
     */
    public function consume(string $plainToken, string $purpose): ?string
    {
        if (!in_array($purpose, [self::PURPOSE_VERIFY_EMAIL, self::PURPOSE_PASSWORD_RESET], true)) {
            throw new \InvalidArgumentException('Invalid token purpose');
        }

        $hash = hash('sha256', $plainToken, false);
        $pdo = $this->pdoFactory->create();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'SELECT id, user_id, expires_at, used_at
                 FROM auth_email_tokens
                 WHERE token_hash = :hash AND purpose = :purpose
                 FOR UPDATE'
            );
            $stmt->execute(['hash' => $hash, 'purpose' => $purpose]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row === false) {
                $pdo->rollBack();
                return null;
            }
            if ($row['used_at'] !== null) {
                $pdo->rollBack();
                return null;
            }
            if (strtotime((string) $row['expires_at']) <= time()) {
                $pdo->rollBack();
                return null;
            }

            $pdo->prepare(
                'UPDATE auth_email_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = :id'
            )->execute(['id' => $row['id']]);

            $userId = (string) $row['user_id'];
            $pdo->commit();
            return $userId;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}
