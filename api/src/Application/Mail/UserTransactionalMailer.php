<?php

declare(strict_types=1);

namespace Blackbox\Application\Mail;

use Blackbox\Domain\Auth\AuthMailNotifier;
use Blackbox\Infrastructure\Auth\UserRepository;
use Psr\Log\LoggerInterface;

/**
 * Sends account security and billing notice emails by reusing {@see AuthEmailTemplates} via {@see AuthMailNotifier}.
 * Fails open: mail errors are logged; callers should not block primary operations.
 */
final class UserTransactionalMailer
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly AuthMailNotifier $mail,
        private readonly string $uiAppBaseUrl,
        private readonly bool $mailDeliveryConfigured,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function notifyAccountPasswordChanged(string $userId): void
    {
        $u = $this->resolvedVerifiedUser($userId);
        if ($u === null) {
            return;
        }
        $url = $this->settingsUrl();
        try {
            $this->mail->sendAccountPasswordChanged($u['email'], $u['greeting'], $url);
        } catch (\Throwable $e) {
            $this->logger->warning('mail.account_password_changed_failed', [
                'user_id' => $userId,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function notifyVaultDataErased(string $userId, int $deletedCount): void
    {
        $u = $this->resolvedVerifiedUser($userId);
        if ($u === null) {
            return;
        }
        try {
            $this->mail->sendVaultDataErased($u['email'], $u['greeting'], $deletedCount, $this->settingsUrl());
        } catch (\Throwable $e) {
            $this->logger->warning('mail.vault_data_erased_failed', [
                'user_id' => $userId,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function notifyVaultCryptoSettingsChanged(string $userId): void
    {
        $u = $this->resolvedVerifiedUser($userId);
        if ($u === null) {
            return;
        }
        try {
            $this->mail->sendVaultCryptoSettingsChanged($u['email'], $u['greeting'], $this->settingsUrl());
        } catch (\Throwable $e) {
            $this->logger->warning('mail.vault_crypto_settings_changed_failed', [
                'user_id' => $userId,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param 'free'|'pro'|'lifetime'|string $fromKey
     * @param 'free'|'pro'|'lifetime'|string $toKey
     */
    public function notifyPlanChanged(string $userId, string $fromKey, string $toKey): void
    {
        if ($fromKey === $toKey) {
            return;
        }
        $u = $this->resolvedVerifiedUser($userId);
        if ($u === null) {
            return;
        }
        try {
            $this->mail->sendPlanChanged(
                $u['email'],
                $u['greeting'],
                $this->planLabel($fromKey),
                $this->planLabel($toKey),
                $this->subscriptionUrl(),
            );
        } catch (\Throwable $e) {
            $this->logger->warning('mail.plan_changed_failed', [
                'user_id' => $userId,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param positive-int|0 $amountPaidMinor
     */
    public function notifyInvoiceAvailable(
        string $userId,
        int $amountPaidMinor,
        string $currency,
        string $periodLine,
        string $invoiceUrl,
    ): void {
        if ($invoiceUrl === '') {
            return;
        }
        $u = $this->resolvedVerifiedUser($userId);
        if ($u === null) {
            return;
        }
        $amountLine = $this->formatMoneyMinor($amountPaidMinor, $currency);
        try {
            $this->mail->sendInvoiceAvailable(
                $u['email'],
                $u['greeting'],
                $amountLine,
                $periodLine,
                $invoiceUrl,
            );
        } catch (\Throwable $e) {
            $this->logger->warning('mail.invoice_available_failed', [
                'user_id' => $userId,
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function planLabel(string $key): string
    {
        $k = strtolower($key);

        return match ($k) {
            'free' => 'Free',
            'pro' => 'Pro',
            'lifetime' => 'Lifetime',
            default => $key === '' ? 'Unknown' : ucfirst($k),
        };
    }

    private function formatMoneyMinor(int $minor, string $currency): string
    {
        $cur = strtoupper(trim($currency) !== '' ? $currency : 'GBP');
        $major = $minor / 100;

        return sprintf('%.2f %s', $major, $cur);
    }

    private function settingsUrl(): string
    {
        return rtrim($this->uiAppBaseUrl, '/') . '/settings';
    }

    private function subscriptionUrl(): string
    {
        return rtrim($this->uiAppBaseUrl, '/') . '/subscription';
    }

    /**
     * @return array{email: string, greeting: string}|null
     */
    private function resolvedVerifiedUser(string $userId): ?array
    {
        if (!$this->mailDeliveryConfigured) {
            return null;
        }
        $user = $this->users->findById($userId);
        if ($user === null || $user['email_verified_at'] === null) {
            return null;
        }
        $greeting = trim((string) ($user['display_name'] ?? ''));
        if ($greeting === '') {
            $greeting = (string) $user['first_name'];
        }

        return ['email' => (string) $user['email'], 'greeting' => $greeting];
    }
}
