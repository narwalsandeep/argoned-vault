<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Mail;

use Blackbox\Domain\Auth\AuthMailNotifier;
use Blackbox\Domain\Auth\OnboardingCompletionMailData;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

final class SymfonyAuthMailNotifier implements AuthMailNotifier
{
    /**
     * @param array{from_address:string,from_name:string,product_name:string} $mailSettings
     */
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly array $mailSettings,
    ) {
    }

    public function sendEmailVerification(string $toEmail, string $displayFirstName, string $verificationUrl): void
    {
        $pack = AuthEmailTemplates::verification(
            $displayFirstName,
            $verificationUrl,
            $this->mailSettings['product_name'],
        );
        $this->send($toEmail, $pack['subject'], $pack['text'], $pack['html']);
    }

    public function sendPasswordReset(string $toEmail, string $displayFirstName, string $resetUrl): void
    {
        $pack = AuthEmailTemplates::passwordReset(
            $displayFirstName,
            $resetUrl,
            $this->mailSettings['product_name'],
        );
        $this->send($toEmail, $pack['subject'], $pack['text'], $pack['html']);
    }

    public function sendOnboardingCompletionEmail(
        string $toEmail,
        string $displayFirstName,
        string $docsUrl,
        OnboardingCompletionMailData $completion,
    ): void {
        $pack = AuthEmailTemplates::onboardingCompletion(
            $displayFirstName,
            $docsUrl,
            $this->mailSettings['product_name'],
            $completion,
        );
        $this->send($toEmail, $pack['subject'], $pack['text'], $pack['html']);
    }

    public function sendSignInEmailOtp(string $toEmail, string $displayFirstName, string $otpCode, int $ttlMinutes): void
    {
        $pack = AuthEmailTemplates::signInEmailOtp(
            $displayFirstName,
            $otpCode,
            $ttlMinutes,
            $this->mailSettings['product_name'],
        );
        $this->send($toEmail, $pack['subject'], $pack['text'], $pack['html']);
    }

    public function sendRecoveryBackupEmail(
        string $toEmail,
        string $displayFirstName,
        string $productName,
        string $artifactAttachmentJson,
    ): void {
        $pack = AuthEmailTemplates::recoveryBackupEmail($displayFirstName, $productName);
        $from = new Address(
            $this->mailSettings['from_address'],
            $this->mailSettings['from_name'],
        );
        $message = (new Email())
            ->from($from)
            ->to($toEmail)
            ->subject($pack['subject'])
            ->text($pack['text'])
            ->html($pack['html'])
            ->attach($artifactAttachmentJson, 'argoned-recovery-artifact.json', 'application/json; charset=utf-8');

        $this->mailer->send($message);
    }

    public function sendAccountPasswordChanged(string $toEmail, string $displayFirstName, string $settingsUrl): void
    {
        $pack = AuthEmailTemplates::accountPasswordChanged(
            $displayFirstName,
            $this->mailSettings['product_name'],
            $settingsUrl,
        );
        $this->send($toEmail, $pack['subject'], $pack['text'], $pack['html']);
    }

    public function sendVaultDataErased(string $toEmail, string $displayFirstName, int $deletedCount, string $settingsUrl): void
    {
        $pack = AuthEmailTemplates::vaultDataErased(
            $displayFirstName,
            $this->mailSettings['product_name'],
            $deletedCount,
            $settingsUrl,
        );
        $this->send($toEmail, $pack['subject'], $pack['text'], $pack['html']);
    }

    public function sendVaultCryptoSettingsChanged(string $toEmail, string $displayFirstName, string $settingsUrl): void
    {
        $pack = AuthEmailTemplates::vaultCryptoSettingsChanged(
            $displayFirstName,
            $this->mailSettings['product_name'],
            $settingsUrl,
        );
        $this->send($toEmail, $pack['subject'], $pack['text'], $pack['html']);
    }

    public function sendPlanChanged(
        string $toEmail,
        string $displayFirstName,
        string $fromLabel,
        string $toLabel,
        string $subscriptionUrl,
    ): void {
        $pack = AuthEmailTemplates::planChanged(
            $displayFirstName,
            $this->mailSettings['product_name'],
            $fromLabel,
            $toLabel,
            $subscriptionUrl,
        );
        $this->send($toEmail, $pack['subject'], $pack['text'], $pack['html']);
    }

    public function sendInvoiceAvailable(
        string $toEmail,
        string $displayFirstName,
        string $amountLine,
        string $periodLine,
        string $invoiceUrl,
    ): void {
        $pack = AuthEmailTemplates::invoiceAvailable(
            $displayFirstName,
            $this->mailSettings['product_name'],
            $amountLine,
            $periodLine,
            $invoiceUrl,
        );
        $this->send($toEmail, $pack['subject'], $pack['text'], $pack['html']);
    }

    private function send(string $to, string $subject, string $text, string $html): void
    {
        $from = new Address(
            $this->mailSettings['from_address'],
            $this->mailSettings['from_name'],
        );
        $message = (new Email())
            ->from($from)
            ->to($to)
            ->subject($subject)
            ->text($text)
            ->html($html);

        $this->mailer->send($message);
    }
}
