<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Auth;

use Blackbox\Infrastructure\Database\PdoFactory;
use PDO;

class LoginEmailOtpChallengeRepository
{
    public function __construct(
        private readonly PdoFactory $pdoFactory,
        private readonly string $otpPepper,
    ) {
    }

    public function deletePendingForUser(string $userId): void
    {
        $pdo = $this->pdoFactory->create();
        $pdo->prepare('DELETE FROM auth_login_email_otp_challenges WHERE user_id = :user_id')
            ->execute(['user_id' => $userId]);
    }

    public function findUserIdByChallengeToken(string $challengeTokenPlain): ?string
    {
        $challengeHash = hash('sha256', trim($challengeTokenPlain), false);
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT user_id FROM auth_login_email_otp_challenges
             WHERE challenge_token_hash = :h AND expires_at > CURRENT_TIMESTAMP
             LIMIT 1'
        );
        $stmt->execute(['h' => $challengeHash]);
        $v = $stmt->fetchColumn();

        return $v !== false ? (string) $v : null;
    }

    /**
     * Stores a new challenge; replaces any existing rows for this user.
     */
    public function createChallenge(
        string $userId,
        string $challengeTokenPlain,
        string $otpSixDigits,
        int $ttlSeconds,
    ): void {
        $pdo = $this->pdoFactory->create();
        $pdo->beginTransaction();
        try {
            $this->deletePendingForUserInTransaction($pdo, $userId);
            $challengeHash = hash('sha256', $challengeTokenPlain, false);
            $otpHash = $this->hashOtp($challengeHash, $otpSixDigits);
            $stmt = $pdo->prepare(
                'INSERT INTO auth_login_email_otp_challenges
                    (user_id, challenge_token_hash, otp_hash, expires_at, attempts_remaining)
                 VALUES (:user_id, :challenge_hash, :otp_hash, (CURRENT_TIMESTAMP + (:ttl || \' seconds\')::interval), 5)'
            );
            $stmt->execute([
                'user_id' => $userId,
                'challenge_hash' => $challengeHash,
                'otp_hash' => $otpHash,
                'ttl' => $ttlSeconds,
            ]);
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * On success deletes the challenge and returns the user id. On failure returns null (wrong OTP, expired, or unknown token).
     */
    public function verifyAndConsume(string $challengeTokenPlain, string $otpSixDigits): ?string
    {
        $challengeHash = hash('sha256', trim($challengeTokenPlain), false);
        $otp = preg_replace('/\D/', '', $otpSixDigits) ?? '';
        if (strlen($otp) !== 6) {
            return null;
        }

        $pdo = $this->pdoFactory->create();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'SELECT id, user_id, otp_hash, expires_at, attempts_remaining
                 FROM auth_login_email_otp_challenges
                 WHERE challenge_token_hash = :h
                 FOR UPDATE'
            );
            $stmt->execute(['h' => $challengeHash]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row === false) {
                $pdo->rollBack();

                return null;
            }
            if (strtotime((string) $row['expires_at']) <= time()) {
                $pdo->prepare('DELETE FROM auth_login_email_otp_challenges WHERE id = :id')
                    ->execute(['id' => $row['id']]);
                $pdo->commit();

                return null;
            }

            $expectedHash = (string) $row['otp_hash'];
            $actualHash = $this->hashOtp($challengeHash, $otp);
            if (!hash_equals($expectedHash, $actualHash)) {
                $attempts = (int) $row['attempts_remaining'] - 1;
                if ($attempts <= 0) {
                    $pdo->prepare('DELETE FROM auth_login_email_otp_challenges WHERE id = :id')
                        ->execute(['id' => $row['id']]);
                } else {
                    $pdo->prepare(
                        'UPDATE auth_login_email_otp_challenges SET attempts_remaining = :a WHERE id = :id'
                    )->execute(['a' => $attempts, 'id' => $row['id']]);
                }
                $pdo->commit();

                return null;
            }

            $userId = (string) $row['user_id'];
            $pdo->prepare('DELETE FROM auth_login_email_otp_challenges WHERE id = :id')
                ->execute(['id' => $row['id']]);
            $pdo->commit();

            return $userId;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Issues a fresh OTP for an existing challenge token (still within TTL). Resets attempts to 5 and extends expiry.
     */
    public function rotateOtp(string $challengeTokenPlain, string $newOtpSixDigits, int $ttlSeconds): bool
    {
        $challengeHash = hash('sha256', trim($challengeTokenPlain), false);
        $otp = preg_replace('/\D/', '', $newOtpSixDigits) ?? '';
        if (strlen($otp) !== 6) {
            return false;
        }

        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'UPDATE auth_login_email_otp_challenges
             SET otp_hash = :otp_hash,
                 expires_at = (CURRENT_TIMESTAMP + (:ttl || \' seconds\')::interval),
                 attempts_remaining = 5
             WHERE challenge_token_hash = :h AND expires_at > CURRENT_TIMESTAMP'
        );
        $stmt->execute([
            'otp_hash' => $this->hashOtp($challengeHash, $otp),
            'ttl' => $ttlSeconds,
            'h' => $challengeHash,
        ]);

        return $stmt->rowCount() === 1;
    }

    private function deletePendingForUserInTransaction(PDO $pdo, string $userId): void
    {
        $pdo->prepare('DELETE FROM auth_login_email_otp_challenges WHERE user_id = :user_id')
            ->execute(['user_id' => $userId]);
    }

    private function hashOtp(string $challengeTokenHashHex, string $otpSixDigits): string
    {
        return hash('sha256', $this->otpPepper . '|' . $challengeTokenHashHex . '|' . $otpSixDigits, false);
    }
}
