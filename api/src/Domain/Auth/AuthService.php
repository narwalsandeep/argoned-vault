<?php

declare(strict_types=1);

namespace Blackbox\Domain\Auth;

use Blackbox\Infrastructure\Auth\AuthEmailTokenRepository;
use Blackbox\Infrastructure\Auth\LoginEmailOtpChallengeRepository;
use Blackbox\Infrastructure\Auth\SessionRepository;
use Blackbox\Infrastructure\Auth\UserRepository;
use Psr\Log\LoggerInterface;

final class AuthService
{
    private const VERIFY_TTL_SECONDS = 172800;

    private const RESET_TTL_SECONDS = 3600;

    public function __construct(
        private readonly UserRepository $users,
        private readonly AuthEmailTokenRepository $emailTokens,
        private readonly AuthMailNotifier $mailNotifier,
        private readonly SessionRepository $sessions,
        private readonly LoginEmailOtpChallengeRepository $loginEmailOtpChallenges,
        private readonly LoggerInterface $logger,
        private readonly string $uiAppBaseUrl,
        private readonly bool $mailDeliveryConfigured,
        private readonly string $appEnv,
        private readonly string $legalSignupDocsVersion,
        private readonly string $loginOtpPepper,
        private readonly int $loginOtpTtlSeconds,
    ) {
    }

    /**
     * Creates the account; email must be verified before login. Sends verification email when mail is configured
     * (or logs the link in non-production when using a null mailer).
     *
     * @return array{
     *   id:string,
     *   email:string,
     *   mfa_enabled:bool,
     *   mfa_state:?string,
     *   first_name:string,
     *   last_name:string,
     *   verification_required:bool
     * }
     */
    public function signup(
        string $email,
        string $password,
        string $firstName,
        string $lastName,
        bool $acceptedTermsPrivacy,
        string $legalDocsVersion,
    ): array {
        $email = mb_strtolower(trim($email));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Invalid email');
        }
        if (strlen($password) < 8) {
            throw new \InvalidArgumentException('Password must be at least 8 characters');
        }
        if (!$acceptedTermsPrivacy) {
            throw new \InvalidArgumentException('terms_privacy_not_accepted');
        }
        $version = trim($legalDocsVersion);
        if ($version === '' || $version !== $this->legalSignupDocsVersion) {
            throw new \InvalidArgumentException('legal_docs_version_mismatch');
        }

        $first = $this->normalizePersonName($firstName, 'First name');
        $last = $this->normalizePersonName($lastName, 'Last name');

        if ($this->users->findByEmail($email) !== null) {
            throw new \RuntimeException('Email already registered');
        }

        if ($this->appEnv === 'production' && !$this->mailDeliveryConfigured) {
            throw new \RuntimeException('email_delivery_not_configured');
        }

        $hash = password_hash($password, PASSWORD_ARGON2ID);
        if ($hash === false) {
            throw new \RuntimeException('Unable to hash password');
        }

        $user = $this->users->create($email, $hash, $first, $last, $this->legalSignupDocsVersion);
        $plain = $this->emailTokens->issueToken(
            $user['id'],
            AuthEmailTokenRepository::PURPOSE_VERIFY_EMAIL,
            self::VERIFY_TTL_SECONDS,
        );
        $url = $this->buildUiUrl('/verify-email', ['token' => $plain]);
        try {
            $this->mailNotifier->sendEmailVerification($email, $first, $url);
        } catch (\Throwable $e) {
            $this->logger->error('auth.verification_email_send_failed', [
                'email' => $email,
                'message' => $e->getMessage(),
            ]);
            throw new \RuntimeException('verification_email_send_failed', 0, $e);
        }
        if (!$this->mailDeliveryConfigured) {
            $this->logger->info('auth.email_verification_link_dev', [
                'email' => $email,
                'verify_url' => $url,
            ]);
        }

        return [
            'id' => $user['id'],
            'email' => $user['email'],
            'mfa_enabled' => $user['mfa_enabled'],
            'mfa_state' => $user['mfa_state'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'display_name' => $user['display_name'] ?? null,
            'verification_required' => true,
        ];
    }

    public function verifyEmailWithToken(string $plainToken): void
    {
        $token = trim($plainToken);
        if ($token === '') {
            throw new \InvalidArgumentException('Token is required');
        }

        $userId = $this->emailTokens->consume($token, AuthEmailTokenRepository::PURPOSE_VERIFY_EMAIL);
        if ($userId === null) {
            throw new \RuntimeException('invalid_or_expired_token');
        }

        $this->users->markEmailVerified($userId);
    }

    public function resendVerificationEmail(string $email): void
    {
        $email = mb_strtolower(trim($email));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Invalid email');
        }

        if ($this->appEnv === 'production' && !$this->mailDeliveryConfigured) {
            throw new \RuntimeException('email_delivery_not_configured');
        }

        $user = $this->users->findByEmail($email);
        if ($user === null || $user['email_verified_at'] !== null) {
            return;
        }

        $plain = $this->emailTokens->issueToken(
            $user['id'],
            AuthEmailTokenRepository::PURPOSE_VERIFY_EMAIL,
            self::VERIFY_TTL_SECONDS,
        );
        $url = $this->buildUiUrl('/verify-email', ['token' => $plain]);
        $this->mailNotifier->sendEmailVerification($email, $user['first_name'], $url);
        if (!$this->mailDeliveryConfigured) {
            $this->logger->info('auth.email_verification_link_dev', [
                'email' => $email,
                'verify_url' => $url,
            ]);
        }
    }

    /**
     * Always completes without revealing whether the address exists.
     */
    public function requestPasswordReset(string $email): void
    {
        $email = mb_strtolower(trim($email));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        if ($this->appEnv === 'production' && !$this->mailDeliveryConfigured) {
            $this->logger->warning('auth.password_reset_skipped_mail_unconfigured', ['email' => $email]);
            return;
        }

        $user = $this->users->findByEmail($email);
        if ($user === null || $user['email_verified_at'] === null) {
            return;
        }

        $plain = $this->emailTokens->issueToken(
            $user['id'],
            AuthEmailTokenRepository::PURPOSE_PASSWORD_RESET,
            self::RESET_TTL_SECONDS,
        );
        $url = $this->buildUiUrl('/reset-password', ['token' => $plain]);
        $this->mailNotifier->sendPasswordReset($email, $user['first_name'], $url);
        if (!$this->mailDeliveryConfigured) {
            $this->logger->info('auth.password_reset_link_dev', [
                'email' => $email,
                'reset_url' => $url,
            ]);
        }
    }

    public function resetPasswordWithToken(string $plainToken, string $newPassword): void
    {
        if (strlen($newPassword) < 8) {
            throw new \InvalidArgumentException('Password must be at least 8 characters');
        }

        $token = trim($plainToken);
        if ($token === '') {
            throw new \InvalidArgumentException('Token is required');
        }

        $userId = $this->emailTokens->consume($token, AuthEmailTokenRepository::PURPOSE_PASSWORD_RESET);
        if ($userId === null) {
            throw new \RuntimeException('invalid_or_expired_token');
        }

        $hash = password_hash($newPassword, PASSWORD_ARGON2ID);
        if ($hash === false) {
            throw new \RuntimeException('Unable to hash password');
        }

        $this->users->updateAuthPasswordHash($userId, $hash);
        $this->sessions->revokeAllForUser($userId);
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
     *   email_verified:bool
     * }
     */
    public function login(string $email, string $password): array
    {
        return $this->assertVerifiedUserFromCredentials($email, $password);
    }

    /**
     * Validates password and email verification, then emails a 6-digit OTP. Does not create a session.
     *
     * @return array{mfa_challenge_token:string,expires_in_seconds:int}
     */
    public function beginLoginWithEmailOtp(string $email, string $password): array
    {
        if ($this->appEnv === 'production' && $this->loginOtpPepper === '') {
            throw new \RuntimeException('login_otp_misconfigured');
        }
        if ($this->appEnv === 'production' && !$this->mailDeliveryConfigured) {
            throw new \RuntimeException('email_delivery_not_configured');
        }

        $user = $this->assertVerifiedUserFromCredentials($email, $password);
        $otp = $this->generateLoginOtpCode();
        $challenge = bin2hex(random_bytes(32));

        $this->loginEmailOtpChallenges->createChallenge(
            $user['id'],
            $challenge,
            $otp,
            $this->loginOtpTtlSeconds,
        );

        $ttlMinutes = max(1, (int) ceil($this->loginOtpTtlSeconds / 60));
        try {
            $this->mailNotifier->sendSignInEmailOtp(
                $user['email'],
                $user['first_name'],
                $otp,
                $ttlMinutes,
            );
        } catch (\Throwable $e) {
            $this->loginEmailOtpChallenges->deletePendingForUser($user['id']);
            $this->logger->error('auth.login_otp_email_send_failed', [
                'email' => $user['email'],
                'message' => $e->getMessage(),
            ]);
            throw new \RuntimeException('login_otp_email_send_failed', 0, $e);
        }

        if (!$this->mailDeliveryConfigured) {
            $this->logger->info('auth.login_otp_dev', [
                'email' => $user['email'],
                'otp' => $otp,
            ]);
        }

        return [
            'mfa_challenge_token' => $challenge,
            'expires_in_seconds' => $this->loginOtpTtlSeconds,
        ];
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
     *   email_verified:bool
     * }
     */
    public function completeLoginWithEmailOtp(string $mfaChallengeToken, string $otp): array
    {
        $userId = $this->loginEmailOtpChallenges->verifyAndConsume($mfaChallengeToken, $otp);
        if ($userId === null) {
            throw new \RuntimeException('invalid_or_expired_login_otp');
        }

        $row = $this->users->findById($userId);
        if ($row === null) {
            throw new \RuntimeException('user_not_found');
        }

        return [
            'id' => $row['id'],
            'email' => $row['email'],
            'mfa_enabled' => $row['mfa_enabled'],
            'mfa_state' => $row['mfa_state'],
            'first_name' => $row['first_name'],
            'last_name' => $row['last_name'],
            'display_name' => $row['display_name'] ?? null,
            'email_verified' => $row['email_verified_at'] !== null,
        ];
    }

    /**
     * Sends a fresh OTP for an in-flight login challenge (same challenge token).
     */
    public function resendLoginEmailOtp(string $mfaChallengeToken): int
    {
        if ($this->appEnv === 'production' && $this->loginOtpPepper === '') {
            throw new \RuntimeException('login_otp_misconfigured');
        }
        if ($this->appEnv === 'production' && !$this->mailDeliveryConfigured) {
            throw new \RuntimeException('email_delivery_not_configured');
        }

        $userId = $this->loginEmailOtpChallenges->findUserIdByChallengeToken($mfaChallengeToken);
        if ($userId === null) {
            throw new \RuntimeException('invalid_or_expired_login_challenge');
        }

        $otp = $this->generateLoginOtpCode();
        if (!$this->loginEmailOtpChallenges->rotateOtp($mfaChallengeToken, $otp, $this->loginOtpTtlSeconds)) {
            throw new \RuntimeException('invalid_or_expired_login_challenge');
        }

        $row = $this->users->findById($userId);
        if ($row === null) {
            throw new \RuntimeException('user_not_found');
        }

        $ttlMinutes = max(1, (int) ceil($this->loginOtpTtlSeconds / 60));
        try {
            $this->mailNotifier->sendSignInEmailOtp(
                (string) $row['email'],
                (string) $row['first_name'],
                $otp,
                $ttlMinutes,
            );
        } catch (\Throwable $e) {
            $this->logger->error('auth.login_otp_resend_email_failed', [
                'user_id' => $userId,
                'message' => $e->getMessage(),
            ]);
            throw new \RuntimeException('login_otp_email_send_failed', 0, $e);
        }

        if (!$this->mailDeliveryConfigured) {
            $this->logger->info('auth.login_otp_dev', [
                'email' => $row['email'],
                'otp' => $otp,
            ]);
        }

        return $this->loginOtpTtlSeconds;
    }

    public function updateDisplayName(string $userId, string $rawDisplayName): void
    {
        $t = trim($rawDisplayName);
        if ($t === '') {
            $this->users->updateDisplayName($userId, null);

            return;
        }
        if (mb_strlen($t) > 200) {
            throw new \InvalidArgumentException('display_name_too_long');
        }

        $this->users->updateDisplayName($userId, $t);
    }

    public function setMfaState(string $userId, bool $enabled, string $state): void
    {
        $this->users->setMfaState($userId, $enabled, $state);
    }

    /**
     * Verifies the user's **account** (login) password without changing it.
     */
    public function verifyAccountPassword(string $userId, string $password): bool
    {
        $row = $this->users->findIdAndPasswordHashById($userId);
        if ($row === null) {
            return false;
        }
        $hash = $row['auth_password_hash'];
        if ($hash === null || $hash === '') {
            return false;
        }

        return password_verify($password, $hash);
    }

    public function changePassword(string $userId, string $currentPassword, string $newPassword): void
    {
        if (strlen($newPassword) < 8) {
            throw new \InvalidArgumentException('Password must be at least 8 characters');
        }

        $row = $this->users->findIdAndPasswordHashById($userId);
        if ($row === null) {
            throw new \RuntimeException('user_not_found');
        }
        $hash = $row['auth_password_hash'];
        if ($hash === null || $hash === '' || !password_verify($currentPassword, $hash)) {
            if ($hash === null || $hash === '') {
                throw new \RuntimeException('password_not_set_for_oauth_account');
            }
            throw new \RuntimeException('Current password is incorrect');
        }

        $hash = password_hash($newPassword, PASSWORD_ARGON2ID);
        if ($hash === false) {
            throw new \RuntimeException('Unable to hash password');
        }

        $this->users->updateAuthPasswordHash($userId, $hash);
    }

    public function accountOnlyRecoveryReset(string $email, string $newPassword, bool $confirmDataLoss): bool
    {
        $email = mb_strtolower(trim($email));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Invalid email');
        }
        if (!$confirmDataLoss) {
            throw new \InvalidArgumentException('Recovery reset requires explicit data-loss confirmation');
        }
        if (strlen($newPassword) < 8) {
            throw new \InvalidArgumentException('Password must be at least 8 characters');
        }

        $hash = password_hash($newPassword, PASSWORD_ARGON2ID);
        if ($hash === false) {
            throw new \RuntimeException('Unable to hash password');
        }

        return $this->users->resetAccountOnlyRecovery($email, $hash);
    }

    public function sendOnboardingCompletionEmail(string $userId, OnboardingCompletionMailData $completion): void
    {
        $user = $this->users->findById($userId);
        if ($user === null) {
            throw new \RuntimeException('user_not_found');
        }
        if ($user['email_verified_at'] === null) {
            throw new \RuntimeException('email_not_verified');
        }

        $docsUrl = $this->buildUiUrl('/docs', []);
        $greeting = trim((string) ($user['display_name'] ?? ''));
        if ($greeting === '') {
            $greeting = (string) $user['first_name'];
        }

        $this->mailNotifier->sendOnboardingCompletionEmail(
            (string) $user['email'],
            $greeting,
            $docsUrl,
            $completion,
        );
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
     *   email_verified:bool
     * }
     */
    private function assertVerifiedUserFromCredentials(string $email, string $password): array
    {
        $email = mb_strtolower(trim($email));
        $user = $this->users->findByEmail($email);
        if ($user === null) {
            throw new \RuntimeException('Invalid credentials');
        }
        $storedHash = $user['auth_password_hash'] ?? null;
        if ($storedHash === null || $storedHash === '' || !password_verify($password, $storedHash)) {
            throw new \RuntimeException('Invalid credentials');
        }

        if ($user['email_verified_at'] === null) {
            throw new EmailNotVerifiedException('Email not verified');
        }

        return [
            'id' => $user['id'],
            'email' => $user['email'],
            'mfa_enabled' => $user['mfa_enabled'],
            'mfa_state' => $user['mfa_state'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'display_name' => $user['display_name'] ?? null,
            'email_verified' => true,
        ];
    }

    private function generateLoginOtpCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    private function normalizePersonName(string $value, string $label): string
    {
        $t = trim($value);
        if ($t === '') {
            throw new \InvalidArgumentException("{$label} is required");
        }
        if (mb_strlen($t) > 100) {
            throw new \InvalidArgumentException("{$label} is too long");
        }

        return $t;
    }

    /**
     * @param array<string,string> $query
     */
    private function buildUiUrl(string $path, array $query): string
    {
        $base = rtrim($this->uiAppBaseUrl, '/');
        $q = http_build_query($query);

        return $base . $path . ($q !== '' ? '?' . $q : '');
    }
}
