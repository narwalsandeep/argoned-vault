<?php

declare(strict_types=1);

if (!function_exists('blackbox_mail_build_smtp_dsn')) {
    /**
     * Builds the Symfony Mailer SMTP DSN from MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_ENCRYPTION, MAIL_MAILER.
     */
    function blackbox_mail_build_smtp_dsn(): string
    {
        $mailer = strtolower(trim((string) (getenv('MAIL_MAILER') ?: '')));
        if ($mailer === 'log' || $mailer === 'array' || $mailer === 'null') {
            return '';
        }

        $host = trim((string) (getenv('MAIL_HOST') ?: ''));
        if ($host === '') {
            return '';
        }

        $port = (int) (getenv('MAIL_PORT') ?: 587);
        if ($port <= 0) {
            $port = 587;
        }

        $user = (string) (getenv('MAIL_USERNAME') ?: '');
        $pass = (string) (getenv('MAIL_PASSWORD') ?: '');
        $auth = '';
        if ($user !== '' || $pass !== '') {
            $auth = rawurlencode($user) . ':' . rawurlencode($pass) . '@';
        }

        $dsn = 'smtp://' . $auth . $host . ':' . $port;

        $enc = strtolower(trim((string) (getenv('MAIL_ENCRYPTION') ?: '')));
        if ($enc === 'starttls') {
            $enc = 'tls';
        }
        if ($enc === 'tls' || $enc === 'ssl') {
            $dsn .= '?encryption=' . $enc;
        }

        return $dsn;
    }
}

$appEnv = getenv('APP_ENV') ?: 'local';
$uiOriginsRaw = getenv('UI_ORIGINS');
$uiOrigins = [];
if (is_string($uiOriginsRaw) && trim($uiOriginsRaw) !== '') {
    $parts = array_map('trim', explode(',', $uiOriginsRaw));
    $uiOrigins = array_values(array_filter($parts, static fn (string $origin): bool => $origin !== ''));
}
if ($uiOrigins === []) {
    $fallbackOrigin = getenv('UI_ORIGIN') ?: 'http://localhost:4200';
    $uiOrigins = [trim($fallbackOrigin)];
}
$uiOrigins = array_values(array_unique(array_map(
    static fn (string $o): string => rtrim($o, '/'),
    $uiOrigins,
)));
$sessionSecureCookie = (getenv('SESSION_SECURE_COOKIE') ?: ($appEnv === 'production' ? 'true' : 'false')) === 'true';

return [
    'app_env' => $appEnv,
    'display_error_details' => $appEnv !== 'production',
    'log_errors' => true,
    'ui_origins' => $uiOrigins,
    'db' => [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => getenv('DB_PORT') ?: '5454',
        'name' => getenv('DB_NAME') ?: 'blackbox',
        'user' => getenv('DB_USER') ?: 'blackbox',
        'password' => getenv('DB_PASSWORD') ?: '',
    ],
    'session' => [
        'cookie_name' => getenv('SESSION_COOKIE_NAME') ?: 'bb_session',
        'ttl_seconds' => (int) (getenv('SESSION_TTL_SECONDS') ?: 86400),
        'secure_cookie' => $sessionSecureCookie,
    ],
    'security' => [
        'login_otp_pepper' => (static function () use ($appEnv): string {
            $p = trim((string) (getenv('LOGIN_OTP_PEPPER') ?: ''));
            if ($p !== '') {
                return $p;
            }
            if ($appEnv === 'production') {
                return '';
            }

            return 'dev-login-otp-pepper-not-for-production';
        })(),
        'login_otp_ttl_seconds' => (int) (getenv('LOGIN_OTP_TTL_SECONDS') ?: 480),
        'max_request_bytes' => (int) (getenv('MAX_REQUEST_BYTES') ?: 26214400),
        'rate_limit' => [
            'window_seconds' => (int) (getenv('RATE_LIMIT_WINDOW_SECONDS') ?: 60),
            'auth_max' => (int) (getenv('RATE_LIMIT_AUTH_MAX') ?: 10),
            'recovery_max' => (int) (getenv('RATE_LIMIT_RECOVERY_MAX') ?: 3),
        ],
        'account_recovery' => [
            'enabled' => (getenv('ACCOUNT_RECOVERY_ENABLED') ?: 'false') === 'true',
            'token' => getenv('ACCOUNT_RECOVERY_TOKEN') ?: '',
        ],
    ],
    'stripe' => (static function (): array {
        $secret = trim((string) (getenv('STRIPE_SECRET_KEY') ?: ''));

        return [
            'enabled' => $secret !== '',
            'secret_key' => $secret,
            'webhook_secret' => trim((string) (getenv('STRIPE_WEBHOOK_SECRET') ?: '')),
            'payment_link_pro' => trim((string) (getenv('STRIPE_PAYMENT_LINK_PRO') ?: '')),
            'payment_link_lifetime' => trim((string) (getenv('STRIPE_PAYMENT_LINK_LIFETIME') ?: '')),
        ];
    })(),
    /**
     * When true (APP_ENV=local + BILLING_DEV_SIMULATE_PRO=true), API exposes a localhost-only
     * POST that inserts a synthetic Pro subscription row for testing without Stripe.
     */
    'billing_dev_simulate_pro' => (static function (): bool {
        if ((getenv('APP_ENV') ?: 'local') !== 'local') {
            return false;
        }

        return (getenv('BILLING_DEV_SIMULATE_PRO') ?: 'false') === 'true';
    })(),
    'mail' => (static function (): array {
        $stripQuotes = static function (?string $value): string {
            return trim((string) $value, " \t\n\r\0\x0B\"'");
        };

        $dsn = blackbox_mail_build_smtp_dsn();

        $fromAddress = $stripQuotes(getenv('MAIL_FROM') ?: '') ?: $stripQuotes(getenv('MAIL_FROM_ADDRESS') ?: '');
        if ($fromAddress === '') {
            $fromAddress = 'noreply@localhost';
        }

        $fromName = $stripQuotes(getenv('MAIL_NAME') ?: '') ?: $stripQuotes(getenv('MAIL_FROM_NAME') ?: '');
        if ($fromName === '') {
            $fromName = 'Argoned';
        }

        $productName = $stripQuotes(getenv('MAIL_PRODUCT_NAME') ?: '') ?: $fromName;
        if ($productName === '') {
            $productName = 'Argoned';
        }

        $adminRaw = getenv('ADMIN_EMAIL');
        $adminEmail = is_string($adminRaw) && trim($adminRaw) !== '' ? trim($adminRaw) : null;

        $logChannelRaw = getenv('MAIL_LOG_CHANNEL');
        $logChannel = is_string($logChannelRaw) ? trim($logChannelRaw) : '';

        return [
            'dsn' => $dsn,
            'delivery_configured' => $dsn !== '',
            'from_address' => $fromAddress,
            'from_name' => $fromName,
            'product_name' => $productName,
            'admin_email' => $adminEmail,
            'log_channel' => $logChannel,
        ];
    })(),
    /** Public SPA origin for links inside auth emails (first entry in UI_ORIGINS / UI_ORIGIN). */
    'ui_app_base_url' => $uiOrigins[0],
    /**
     * Machine-readable id for the Terms + Privacy bundle shown at signup (ISO date recommended).
     * Must match vault UI `LEGAL_SIGNUP_DOCS_VERSION` when you publish a material policy change.
     */
    'legal' => [
        'signup_docs_version' => trim((string) (getenv('LEGAL_SIGNUP_DOCS_VERSION') ?: '2026-04-16')),
    ],
    /**
     * When true, users on the Free plan cannot use vault bulk import or (when shipped) encrypted file items.
     * Paid plans (pro / lifetime) keep access. Set false in dev if Stripe is off and you need import locally.
     */
    'vault' => [
        'require_non_free_plan_for_import_and_files' => (getenv('VAULT_REQUIRE_NON_FREE_PLAN_FOR_IMPORT_AND_FILES') ?: 'false') === 'true',
    ],
    /**
     * Public base URL of this API (scheme + host + optional port, no trailing slash).
     * Used to build OAuth redirect_uri values, e.g. http://localhost:3003
     */
    'api_public_base_url' => rtrim((string) (getenv('API_PUBLIC_BASE_URL') ?: ''), '/') ?: 'http://localhost:3003',
    'oauth' => (static function (): array {
        /** getenv() can return false; cast covers false/null for trimming */
        $trim = static fn (mixed $v): string => trim((string) $v);

        return [
            'state_ttl_seconds' => (int) (getenv('OAUTH_STATE_TTL_SECONDS') ?: 600),
            'google' => [
                'client_id' => $trim(getenv('OAUTH_GOOGLE_CLIENT_ID')),
                'client_secret' => $trim(getenv('OAUTH_GOOGLE_CLIENT_SECRET')),
            ],
            'linkedin' => [
                'client_id' => $trim(getenv('OAUTH_LINKEDIN_CLIENT_ID')),
                'client_secret' => $trim(getenv('OAUTH_LINKEDIN_CLIENT_SECRET')),
            ],
            'facebook' => [
                'client_id' => $trim(getenv('OAUTH_FACEBOOK_CLIENT_ID')),
                'client_secret' => $trim(getenv('OAUTH_FACEBOOK_CLIENT_SECRET')),
            ],
        ];
    })(),
];
