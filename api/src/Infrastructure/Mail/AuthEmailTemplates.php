<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Mail;

use Blackbox\Domain\Auth\OnboardingCompletionMailData;

/**
 * Auth-related transactional email bodies. HTML shells come from {@see AuthEmailLayout}
 * (responsive type, light/dark, table layout for clients).
 */
final class AuthEmailTemplates
{
    /**
     * @return array{text:string,html:string,subject:string}
     */
    public static function verification(string $firstName, string $actionUrl, string $productName): array
    {
        $greeting = self::greeting($firstName);
        $subject = "Confirm your {$productName} account";
        $text = "{$greeting}\n\nOpen this link to verify your email (expires in 48 hours):\n{$actionUrl}\n\n"
            . "If you did not create an account, you can ignore this message.\n\n- {$productName}";

        $body = '<p class="bb-text" style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#171717;">'
            . 'Please confirm your email address to finish setting up your account.</p>';

        $html = AuthEmailLayout::render(
            $productName,
            $subject,
            $subject,
            $greeting,
            $body,
            true,
            $actionUrl,
            'Verify email',
            'This link expires in 48 hours. If you did not sign up, you can ignore this email.',
            true,
            '',
        );

        return ['text' => $text, 'html' => $html, 'subject' => $subject];
    }

    /**
     * @return array{text:string,html:string,subject:string}
     */
    public static function passwordReset(string $firstName, string $actionUrl, string $productName): array
    {
        $greeting = self::greeting($firstName);
        $subject = "Reset your {$productName} password";
        $text = "{$greeting}\n\nReset your password using this link (expires in 1 hour):\n{$actionUrl}\n\n"
            . "If you did not request a reset, you can ignore this message.\n\n- {$productName}";

        $body = '<p class="bb-text" style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#171717;">'
            . 'We received a request to reset the password for your account.</p>';

        $html = AuthEmailLayout::render(
            $productName,
            $subject,
            $subject,
            $greeting,
            $body,
            true,
            $actionUrl,
            'Choose a new password',
            'This link expires in 1 hour. If you did not request a password reset, you can ignore this email.',
            true,
            '',
        );

        return ['text' => $text, 'html' => $html, 'subject' => $subject];
    }

    /**
     * Post-onboarding welcome: vault unlock secret + session/crypto settings + security summary.
     * The unlock secret is included because the user explicitly requested a completion copy by email;
     * it is not stored on the server after send.
     *
     * @return array{text:string,html:string,subject:string}
     */
    public static function onboardingCompletion(
        string $firstName,
        string $docsUrl,
        string $productName,
        OnboardingCompletionMailData $completion,
    ): array {
        $greeting = self::greeting($firstName);
        $subject = "Welcome to {$productName}: save your vault secret";
        $secretPlain = $completion->unlockSecret;
        $autoLock = (string) $completion->autoLockMinutes;
        $timeCost = (string) $completion->argon2TimeCost;
        $memoryLabel = $completion->memoryMiBLabel();
        $parallelism = (string) $completion->argon2Parallelism;

        $text = "{$greeting}\n\n"
            . "Your encrypted vault is ready. Below is a copy of what you chose during setup.\n\n"
            . "VAULT UNLOCK SECRET (store somewhere only you control)\n"
            . "{$secretPlain}\n\n"
            . "YOUR SETTINGS\n"
            . "• Idle auto-lock: {$autoLock} minutes\n"
            . "• Argon2id time cost: {$timeCost}\n"
            . "• Argon2id memory: {$memoryLabel}\n"
            . "• Argon2id parallelism: {$parallelism}\n\n"
            . "SECURITY REMINDERS\n"
            . "• This email contains your vault unlock secret. Anyone with this message can unlock your vault if they also access your signed-in session or guess your account password.\n"
            . "• Prefer a password manager or offline note; delete this message from shared or forwarded inboxes when you are done.\n"
            . "• Export recovery material from Settings and keep it offline. Losing unlock + recovery can mean permanent data loss.\n\n"
            . "In-app security reference:\n{$docsUrl}\n\n"
            . "- {$productName}";

        $body = self::buildOnboardingCompletionBodyHtml($productName, $completion);
        $html = AuthEmailLayout::render(
            $productName,
            $subject,
            'Your vault setup is complete',
            $greeting,
            $body,
            true,
            $docsUrl,
            'Open in-app security guide',
            'This message includes your vault unlock secret. Store it safely and delete this email when you no longer need it in your inbox.',
            true,
            self::welcomeListEmailCss() . self::onboardingCompletionEmailCss(),
        );

        return ['text' => $text, 'html' => $html, 'subject' => $subject];
    }

    /**
     * @deprecated Use {@see onboardingCompletion} with {@see OnboardingCompletionMailData}. Kept for legacy previews.
     *
     * @return array{text:string,html:string,subject:string}
     */
    public static function onboardingSecurityGuide(string $firstName, string $docsUrl, string $productName): array
    {
        return self::onboardingCompletion(
            $firstName,
            $docsUrl,
            $productName,
            new OnboardingCompletionMailData(
                'ability-absence-active-example',
                8,
                3,
                131072,
                1,
            ),
        );
    }

    /**
     * @return array{text:string,html:string,subject:string}
     */
    public static function signInEmailOtp(string $firstName, string $otpCode, int $ttlMinutes, string $productName): array
    {
        $greeting = self::greeting($firstName);
        $codeEsc = htmlspecialchars($otpCode, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $subject = "Your {$productName} sign-in code";
        $text = "{$greeting}\n\nYour one-time sign-in code is: {$otpCode}\n\n"
            . "It expires in {$ttlMinutes} minutes. If you did not try to sign in, change your password and contact support.\n\n- {$productName}";

        $ttlEsc = htmlspecialchars((string) $ttlMinutes, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $body = '<p class="bb-text" style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#171717;">'
            . 'Use this one-time code to finish signing in:</p>'
            . '<p class="bb-otp-code bb-text" style="margin:0 0 18px;font-size:clamp(26px, 8vw, 34px);font-weight:700;letter-spacing:0.22em;font-family:ui-monospace,Consolas,monospace;color:#171717;line-height:1.2;">'
            . $codeEsc
            . '</p>'
            . '<p class="bb-muted" style="margin:0;font-size:14px;line-height:1.55;color:#525252;">'
            . 'This code expires in ' . $ttlEsc
            . ' minutes. If you did not request it, secure your account immediately.</p>';

        $html = AuthEmailLayout::render(
            $productName,
            $subject,
            $subject,
            $greeting,
            $body,
            false,
            null,
            null,
            null,
            false,
            self::signInOtpEmailCss(),
        );

        return ['text' => $text, 'html' => $html, 'subject' => $subject];
    }

    /**
     * After recovery artifact create/rotate: explains passphrase is never emailed; attachment is ciphertext only.
     *
     * @return array{text:string,html:string,subject:string}
     */
    public static function recoveryBackupEmail(string $firstName, string $productName): array
    {
        $greeting = self::greeting($firstName);
        $subject = "{$productName} recovery backup: save this email safely";
        $text = "{$greeting}\n\n"
            . "A vault recovery backup was just saved on your {$productName} account.\n\n"
            . "WHAT IS ATTACHED\n"
            . "• File argoned-recovery-artifact.json: encrypted vault-key material from our database. "
            . "It is useless without your recovery passphrase (the separate phrase you typed in Settings).\n\n"
            . "WHAT IS NOT IN THIS EMAIL (by design)\n"
            . "• Your vault unlock secret.\n"
            . "• Your recovery passphrase.\n"
            . "We never send those by email. Store the passphrase only where you trust (password manager, paper in a safe).\n\n"
            . "WHAT TO DO\n"
            . "• Keep this message and attachment with your other disaster backups (USB, printout, family lawyer envelope).\n"
            . "• In the app: Settings → Recovery → Load from server before using “Unlock from artifact”.\n\n"
            . "If you did not just update recovery in {$productName}, secure your email and change your account password.\n\n"
            . "- {$productName}";

        $productEsc = htmlspecialchars($productName, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $body = '<p class="bb-text" style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#171717;">'
            . 'A <strong>vault recovery backup</strong> was just saved on your account. Below is what this email contains, and what it deliberately does <strong>not</strong> contain.</p>'
            . '<ul class="bb-text" style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.55;color:#171717;">'
            . '<li style="margin-bottom:8px;"><strong>Attachment</strong> <code style="font-size:0.9em;">argoned-recovery-artifact.json</code>: encrypted data from our servers. It only works together with <strong>your recovery passphrase</strong> (the separate phrase you chose in Settings).</li>'
            . '<li style="margin-bottom:8px;"><strong>Not included:</strong> your vault unlock secret and your recovery passphrase. We never email those.</li>'
            . '<li><strong>Tip:</strong> keep the passphrase in a password manager or offline note only you control; treat this email like a spare key.</li>'
            . '</ul>'
            . '<p class="bb-muted" style="margin:0;font-size:14px;line-height:1.55;color:#525252;">'
            . 'In the app, open <strong>Settings → Recovery</strong>, click <strong>Load from server</strong> before using <strong>Unlock from artifact</strong>. '
            . 'If you did not just update recovery in ' . $productEsc . ', secure your email and change your account password.</p>';

        $html = AuthEmailLayout::render(
            $productName,
            $subject,
            'Recovery backup saved',
            $greeting,
            $body,
            false,
            null,
            null,
            null,
            false,
            '',
        );

        return ['text' => $text, 'html' => $html, 'subject' => $subject];
    }

    /**
     * @return array{text:string,html:string,subject:string}
     */
    public static function accountPasswordChanged(string $firstName, string $productName, string $settingsUrl): array
    {
        $greeting = self::greeting($firstName);
        $subject = "Your {$productName} account password was changed";
        $text = "{$greeting}\n\n"
            . "The password for your account was just changed. If this was you, you can ignore this message.\n\n"
            . "If you did not make this change, use “Forgot password” on the sign-in page to secure your account, "
            . "then contact support.\n\n- {$productName}";

        $body = '<p class="bb-text" style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#171717;">'
            . 'The <strong>password for your account</strong> was just changed from an active session. '
            . 'We never include your new password in email.</p>'
            . '<p class="bb-text" style="margin:0;font-size:15px;line-height:1.55;color:#171717;">'
            . 'If you <strong>did not</strong> make this change, sign in and reset your password, then consider revoking other sessions in Settings.</p>';

        $html = AuthEmailLayout::render(
            $productName,
            $subject,
            $subject,
            $greeting,
            $body,
            true,
            $settingsUrl,
            'Open account settings',
            'If you did not change your password, secure your account immediately.',
            true,
            '',
        );

        return ['text' => $text, 'html' => $html, 'subject' => $subject];
    }

    /**
     * @return array{text:string,html:string,subject:string}
     */
    public static function vaultDataErased(string $firstName, string $productName, int $deletedCount, string $settingsUrl): array
    {
        $greeting = self::greeting($firstName);
        $n = max(0, $deletedCount);
        $subject = "Vault data removed on your {$productName} account";
        $text = "{$greeting}\n\n"
            . "All vault items for your account were permanently removed ({$n} item(s)) using the erase-data action.\n\n"
            . "If you did not request this, sign in, change your password, and contact support.\n\n- {$productName}";

        $body = '<p class="bb-text" style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#171717;">'
            . 'A <strong>full vault erase</strong> completed on your account: <strong>' . (string) (int) $n
            . '</strong> item(s) were removed. This is permanent for those items.</p>'
            . '<p class="bb-text" style="margin:0;font-size:15px;line-height:1.55;color:#171717;">'
            . 'If you did <strong>not</strong> run this action, secure your account immediately.</p>';

        $html = AuthEmailLayout::render(
            $productName,
            $subject,
            $subject,
            $greeting,
            $body,
            true,
            $settingsUrl,
            'Open Settings',
            'We send this notice so you have a record outside the app.',
            true,
            '',
        );

        return ['text' => $text, 'html' => $html, 'subject' => $subject];
    }

    /**
     * Vault KDF / wrapped key material was updated (unlock flow); no secrets are sent by email.
     *
     * @return array{text:string,html:string,subject:string}
     */
    public static function vaultCryptoSettingsChanged(string $firstName, string $productName, string $settingsUrl): array
    {
        $greeting = self::greeting($firstName);
        $subject = "{$productName}: vault security material was updated";
        $text = "{$greeting}\n\n"
            . "The encrypted vault settings for your account were updated (for example, after changing your vault unlock flow). "
            . "Your vault master secret and recovery passphrase are never sent by email.\n\n- {$productName}";

        $body = '<p class="bb-text" style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#171717;">'
            . 'Your <strong>encrypted vault key material</strong> on the server was just updated&mdash;for example after you '
            . 'changed your vault unlock flow in Settings. We <strong>never</strong> send your master unlock secret or recovery phrase by email.</p>'
            . '<p class="bb-text" style="margin:0;font-size:15px;line-height:1.55;color:#171717;">'
            . 'If you did <strong>not</strong> make this change, sign in from a device you trust and review Settings &rarr; Vault &amp; session.</p>';

        $html = AuthEmailLayout::render(
            $productName,
            $subject,
            $subject,
            $greeting,
            $body,
            true,
            $settingsUrl,
            'Open Settings',
            'This is a security heads-up, not a bill or marketing message.',
            true,
            '',
        );

        return ['text' => $text, 'html' => $html, 'subject' => $subject];
    }

    /**
     * @return array{text:string,html:string,subject:string}
     */
    public static function planChanged(
        string $firstName,
        string $productName,
        string $fromLabel,
        string $toLabel,
        string $subscriptionUrl,
    ): array {
        $greeting = self::greeting($firstName);
        $subject = "{$productName} plan: {$fromLabel} → {$toLabel}";
        $text = "{$greeting}\n\n"
            . "Your subscription tier was updated: from {$fromLabel} to {$toLabel}.\n\n"
            . "Details and billing: {$subscriptionUrl}\n\n- {$productName}";

        $fl = htmlspecialchars($fromLabel, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $tl = htmlspecialchars($toLabel, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $body = '<p class="bb-text" style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#171717;">'
            . 'Your <strong>plan</strong> was updated: <strong>' . $fl . '</strong> &rarr; <strong>' . $tl . '</strong>.</p>'
            . '<p class="bb-text" style="margin:0;font-size:15px;line-height:1.55;color:#171717;">'
            . 'You can review billing, invoices, and usage in the app.</p>';

        $html = AuthEmailLayout::render(
            $productName,
            $subject,
            $subject,
            $greeting,
            $body,
            true,
            $subscriptionUrl,
            'View billing &amp; plan',
            'This email confirms a change to your entitlements, not a receipt by itself.',
            true,
            '',
        );

        return ['text' => $text, 'html' => $html, 'subject' => $subject];
    }

    /**
     * @return array{text:string,html:string,subject:string}
     */
    public static function invoiceAvailable(
        string $firstName,
        string $productName,
        string $amountLine,
        string $periodLine,
        string $invoiceUrl,
    ): array {
        $greeting = self::greeting($firstName);
        $subject = "New invoice from {$productName} ({$amountLine})";
        $text = "{$greeting}\n\n"
            . "A new invoice is available: {$amountLine}.\n"
            . "Service period: {$periodLine}.\n\n"
            . "View or download (Stripe-hosted):\n{$invoiceUrl}\n\n- {$productName}";

        $al = htmlspecialchars($amountLine, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $pl = htmlspecialchars($periodLine, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $body = '<p class="bb-text" style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#171717;">'
            . 'A <strong>new invoice</strong> is ready: <strong>' . $al . '</strong></p>'
            . '<p class="bb-text" style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#171717;">'
            . '<span style="color:#525252;">Billing period:</span> ' . $pl . '</p>'
            . '<p class="bb-text" style="margin:0;font-size:15px;line-height:1.55;color:#171717;">'
            . 'Open the hosted invoice to download a PDF and see payment details.</p>';

        $html = AuthEmailLayout::render(
            $productName,
            'New invoice',
            "Invoice {$amountLine} — {$productName}",
            $greeting,
            $body,
            true,
            $invoiceUrl,
            'View invoice',
            'If you have billing questions, reply to your usual support contact.',
            true,
            '',
        );

        return ['text' => $text, 'html' => $html, 'subject' => $subject];
    }

    private static function greeting(string $firstName): string
    {
        $name = trim($firstName);
        if ($name === '') {
            return 'Hello,';
        }

        return "Hi {$name},";
    }

    private static function buildOnboardingCompletionBodyHtml(string $productName, OnboardingCompletionMailData $completion): string
    {
        $secretEsc = htmlspecialchars($completion->unlockSecret, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $autoLockEsc = htmlspecialchars((string) $completion->autoLockMinutes, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $timeEsc = htmlspecialchars((string) $completion->argon2TimeCost, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $memoryEsc = htmlspecialchars($completion->memoryMiBLabel(), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $parallelEsc = htmlspecialchars((string) $completion->argon2Parallelism, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $settingsRow = static function (string $label, string $valueEsc): string {
            $labelEsc = htmlspecialchars($label, ENT_QUOTES | ENT_HTML5, 'UTF-8');

            return '<tr>'
                . '<th scope="row" class="bb-onboard-settings-label">' . $labelEsc . '</th>'
                . '<td class="bb-onboard-settings-value">' . $valueEsc . '</td>'
                . '</tr>';
        };

        return '<p class="bb-text" style="margin:0 0 18px;font-size:16px;line-height:1.55;color:#171717;">'
            . 'Your encrypted vault is ready. This message includes the <strong>unlock secret</strong> and session settings you chose during setup.</p>'
            . '<p class="bb-onboard-section-title">Vault unlock secret</p>'
            . '<p class="bb-onboard-secret bb-text" style="margin:0 0 8px;padding:14px 16px;border-radius:10px;border:1px solid #fecaca;background-color:#fff1f2;font-family:ui-monospace,Consolas,monospace;font-size:15px;line-height:1.5;color:#171717;word-break:break-word;">'
            . $secretEsc
            . '</p>'
            . '<p class="bb-muted" style="margin:0 0 22px;font-size:13px;line-height:1.55;color:#57534e;">'
            . 'Not your account password. Store this somewhere only you control (password manager or offline backup).</p>'
            . '<p class="bb-onboard-section-title">Your settings</p>'
            . '<table class="bb-onboard-settings" role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;border-collapse:collapse;">'
            . '<tbody>'
            . $settingsRow('Idle auto-lock', $autoLockEsc . ' minutes')
            . $settingsRow('Argon2id time cost', $timeEsc)
            . $settingsRow('Argon2id memory', $memoryEsc)
            . $settingsRow('Argon2id parallelism', $parallelEsc)
            . '</tbody>'
            . '</table>'
            . '<p class="bb-onboard-section-title">How ' . htmlspecialchars($productName, ENT_QUOTES | ENT_HTML5, 'UTF-8') . ' protects you</p>'
            . self::buildOnboardingWelcomeBodyHtml($productName);
    }

    private static function buildOnboardingWelcomeBodyHtml(string $productName): string
    {
        $productEsc = htmlspecialchars($productName, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $li = static function (string $title, string $textHtml): string {
            $t = htmlspecialchars($title, ENT_QUOTES | ENT_HTML5, 'UTF-8');

            return '<li class="bb-welcome-li">'
                . '<span class="bb-welcome-li-title">' . $t . '</span>'
                . '<span class="bb-welcome-li-text">' . $textHtml . '</span>'
                . '</li>';
        };

        return '<p class="bb-welcome-lede bb-text" style="margin:0 0 20px;font-size:17px;line-height:1.55;color:#262626;">'
            . 'Here is a concise picture of how this platform protects you day to day.</p>'
            . '<ul class="bb-welcome-list" role="list" style="margin:0;padding:0;list-style:none;">'
            . $li(
                'Encryption on your device',
                'Items are encrypted in your browser with <strong>AES-256-GCM</strong> before they reach our servers. '
                . 'Your vault unlock uses <strong>Argon2id</strong>. We never store your master unlock secret in plaintext.',
            )
            . $li(
                'Unlock secret and idle lock',
                'Choose a vault unlock secret you <strong>do not reuse</strong> on other websites. '
                . 'On shared or public devices, prefer a <strong>shorter idle auto-lock</strong> so the vault locks quickly when you step away.',
            )
            . $li(
                'Recovery you control',
                'From <strong>Settings</strong>, export recovery or emergency material and keep a copy <strong>offline</strong> (print or encrypted USB). '
                . 'Without it, losing your unlock secret can mean <strong>permanent</strong> loss of vault data; your login email alone cannot decrypt old items.',
            )
            . $li(
                'Account sign-in and saved logins',
                '<strong>' . $productEsc . '</strong> sends a <strong>one-time email code</strong> after your password every time you sign in. '
                . 'For entries you store in the vault, still use <strong>long, unique passwords</strong> per site.',
            )
            . '</ul>'
            . '<p class="bb-welcome-note bb-muted" style="margin:22px 0 0;padding:14px 16px;border-radius:10px;border:1px solid #e7e5e4;background-color:#fafaf9;font-size:13px;line-height:1.55;color:#57534e;">'
            . '<strong style="font-weight:600;color:#1c1917;">Remember:</strong> if you reset your account without recovery material, '
            . 'earlier vault data cannot be decrypted. Treat your unlock secret, recovery export, and access to this email address with equal care.</p>';
    }

    private static function welcomeListEmailCss(): string
    {
        return <<<'CSS'

  .bb-welcome-lede { color: #262626; }
  .bb-welcome-list { margin: 0; padding: 0; }
  .bb-welcome-li { margin: 0 0 18px; padding: 0 0 0 14px; border-left: 3px solid #fecaca; list-style: none; }
  .bb-welcome-li:last-child { margin-bottom: 0; }
  .bb-welcome-li-title { display: block; font-weight: 600; font-size: 15px; line-height: 1.35; margin-bottom: 6px; color: #171717; letter-spacing: -0.01em; }
  .bb-welcome-li-text { display: block; font-size: 14px; line-height: 1.55; color: #44403c; }
    .bb-welcome-li-text strong { font-weight: 600; color: #1c1917; }
    @media (prefers-color-scheme: dark) {
    .bb-welcome-lede { color: #e5e5e5 !important; }
    .bb-welcome-li { border-left-color: #7f1d1d !important; }
    .bb-welcome-li-title { color: #fafafa !important; }
    .bb-welcome-li-text { color: #d6d3d1 !important; }
    .bb-welcome-li-text strong { color: #fafafa !important; }
    .bb-welcome-note { border-color: #404040 !important; background-color: #1c1917 !important; color: #d6d3d1 !important; }
    .bb-welcome-note strong { color: #fafafa !important; }
  }
CSS;
    }

    private static function onboardingCompletionEmailCss(): string
    {
        return <<<'CSS'

  .bb-onboard-section-title { margin: 0 0 10px; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #44403c; }
  .bb-onboard-settings-label { padding: 10px 12px 10px 0; font-size: 14px; font-weight: 600; color: #57534e; text-align: left; vertical-align: top; width: 42%; border-bottom: 1px solid #e7e5e4; }
  .bb-onboard-settings-value { padding: 10px 0; font-size: 14px; color: #171717; text-align: left; vertical-align: top; border-bottom: 1px solid #e7e5e4; }
  .bb-onboard-secret { word-break: break-word; }
  @media (prefers-color-scheme: dark) {
    .bb-onboard-section-title { color: #d6d3d1 !important; }
    .bb-onboard-settings-label { color: #a8a29e !important; border-bottom-color: #404040 !important; }
    .bb-onboard-settings-value { color: #fafafa !important; border-bottom-color: #404040 !important; }
    .bb-onboard-secret { border-color: #7f1d1d !important; background-color: #1c1917 !important; color: #fafafa !important; }
  }
CSS;
    }

    private static function signInOtpEmailCss(): string
    {
        return <<<'CSS'

  .bb-otp-code { letter-spacing: 0.22em; }
  @media (prefers-color-scheme: dark) {
    .bb-otp-code { color: #fafafa !important; }
  }
CSS;
    }
}
