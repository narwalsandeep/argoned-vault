<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Mail;

/**
 * Sample data for {@see DevEmailTemplatesIndexAction} / {@see DevEmailTemplatesViewAction}.
 * URLs use example.com (RFC 2606); content is not delivered from preview routes.
 */
final class AuthEmailPreviewFactory
{
    private const SAMPLE_FIRST = 'Jordan';

    private const SAMPLE_VERIFY_URL = 'https://example.com/verify-email?token=demo-token';

    private const SAMPLE_RESET_URL = 'https://example.com/reset-password?token=demo-token';

    private const SAMPLE_OTP = '482019';

    /**
     * @return list<array{slug:string,label:string}>
     */
    public static function menu(): array
    {
        return [
            ['slug' => 'verification', 'label' => 'Email verification'],
            ['slug' => 'password-reset', 'label' => 'Password reset'],
            ['slug' => 'onboarding-welcome', 'label' => 'After onboarding (secret + settings)'],
            ['slug' => 'sign-in-otp', 'label' => 'Sign-in email OTP'],
            ['slug' => 'recovery-backup', 'label' => 'Recovery backup (post create)'],
        ];
    }

    public static function isKnown(string $slug): bool
    {
        foreach (self::menu() as $row) {
            if ($row['slug'] === $slug) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array{text:string,html:string,subject:string}
     */
    public static function render(string $slug, string $uiAppBaseUrl, string $productName): array
    {
        $docsUrl = rtrim($uiAppBaseUrl, '/') . '/docs';

        return match ($slug) {
            'verification' => AuthEmailTemplates::verification(
                self::SAMPLE_FIRST,
                self::SAMPLE_VERIFY_URL,
                $productName,
            ),
            'password-reset' => AuthEmailTemplates::passwordReset(
                self::SAMPLE_FIRST,
                self::SAMPLE_RESET_URL,
                $productName,
            ),
            'onboarding-welcome' => AuthEmailTemplates::onboardingSecurityGuide(
                self::SAMPLE_FIRST,
                $docsUrl,
                $productName,
            ),
            'sign-in-otp' => AuthEmailTemplates::signInEmailOtp(
                self::SAMPLE_FIRST,
                self::SAMPLE_OTP,
                10,
                $productName,
            ),
            'recovery-backup' => AuthEmailTemplates::recoveryBackupEmail(self::SAMPLE_FIRST, $productName),
            default => throw new \InvalidArgumentException('Unknown email template slug'),
        };
    }
}
