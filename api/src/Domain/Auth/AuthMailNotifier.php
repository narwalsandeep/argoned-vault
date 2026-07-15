<?php

declare(strict_types=1);

namespace Blackbox\Domain\Auth;

interface AuthMailNotifier
{
    public function sendEmailVerification(string $toEmail, string $displayFirstName, string $verificationUrl): void;

    public function sendPasswordReset(string $toEmail, string $displayFirstName, string $resetUrl): void;

    public function sendOnboardingCompletionEmail(
        string $toEmail,
        string $displayFirstName,
        string $docsUrl,
        OnboardingCompletionMailData $completion,
    ): void;

    public function sendSignInEmailOtp(string $toEmail, string $displayFirstName, string $otpCode, int $ttlMinutes): void;

    /**
     * @param string $artifactAttachmentJson UTF-8 JSON (pretty-printed ciphertext row); not the user's recovery passphrase.
     */
    public function sendRecoveryBackupEmail(
        string $toEmail,
        string $displayFirstName,
        string $productName,
        string $artifactAttachmentJson,
    ): void;

    public function sendAccountPasswordChanged(string $toEmail, string $displayFirstName, string $settingsUrl): void;

    public function sendVaultDataErased(string $toEmail, string $displayFirstName, int $deletedCount, string $settingsUrl): void;

    public function sendVaultCryptoSettingsChanged(string $toEmail, string $displayFirstName, string $settingsUrl): void;

    public function sendPlanChanged(
        string $toEmail,
        string $displayFirstName,
        string $fromLabel,
        string $toLabel,
        string $subscriptionUrl,
    ): void;

    public function sendInvoiceAvailable(
        string $toEmail,
        string $displayFirstName,
        string $amountLine,
        string $periodLine,
        string $invoiceUrl,
    ): void;
}
