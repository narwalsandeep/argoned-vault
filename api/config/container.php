<?php

declare(strict_types=1);

use Blackbox\Infrastructure\Database\PdoFactory;
use Blackbox\Infrastructure\Health\DatabaseHealthChecker;
use Blackbox\Infrastructure\Logging\LoggerFactory;
use Blackbox\Infrastructure\Auth\SessionRepository;
use Blackbox\Infrastructure\Auth\OAuthLoginStateRepository;
use Blackbox\Infrastructure\Auth\UserOAuthIdentityRepository;
use Blackbox\Infrastructure\Auth\UserRepository;
use Blackbox\Infrastructure\Http\SimpleHttpClient;
use Blackbox\Infrastructure\Auth\AuthEmailTokenRepository;
use Blackbox\Infrastructure\Auth\LoginEmailOtpChallengeRepository;
use Blackbox\Infrastructure\Mail\SymfonyAuthMailNotifier;
use Blackbox\Domain\Auth\AuthService;
use Blackbox\Domain\Auth\AuthMailNotifier;
use Blackbox\Domain\Auth\OAuthLoginService;
use Blackbox\Domain\Auth\SessionService;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mailer\Transport;
use Blackbox\Domain\Vault\VaultActiveItemCountReader;
use Blackbox\Domain\Vault\VaultProfileReader;
use Blackbox\Domain\Vault\VaultService;
use Blackbox\Infrastructure\Vault\VaultItemRepository;
use Blackbox\Infrastructure\Vault\VaultFileRepository;
use Blackbox\Infrastructure\Vault\VaultProfileRepository;
use Blackbox\Infrastructure\Vault\VaultRecoveryRepository;
use Blackbox\Application\Billing\PlanCapabilityService;
use Blackbox\Application\Mail\BillingUserMailAdapter;
use Blackbox\Application\Mail\UserTransactionalMailer;
use Blackbox\Domain\Billing\BillingServiceInterface;
use Blackbox\Domain\Billing\BillingUserMailerPort;
use Blackbox\Infrastructure\Billing\BillingCustomerRepository;
use Blackbox\Infrastructure\Billing\BillingEventLogRepository;
use Blackbox\Infrastructure\Billing\BillingInvoiceRepository;
use Blackbox\Infrastructure\Billing\BillingOneTimePurchaseRepository;
use Blackbox\Infrastructure\Billing\BillingSubscriptionRepository;
use Blackbox\Infrastructure\Billing\StripeBillingService;
use Blackbox\Application\Http\Actions\Admin\DeletePlatformCustomerAction;
use Blackbox\Application\Http\Actions\Admin\ListPlatformCustomersAction;
use Blackbox\Application\Http\Actions\Auth\AccountRecoveryResetAction;
use Blackbox\Application\Http\Actions\Auth\CurrentUserAction;
use Blackbox\Application\Http\Actions\Billing\DevSimulateProBillingAction;
use Blackbox\Application\Http\Actions\Billing\DowngradeToFreeAction;
use Blackbox\Application\Http\Actions\Dev\DevEmailTemplatesIndexAction;
use Blackbox\Application\Http\Actions\Dev\DevEmailTemplatesViewAction;
use Blackbox\Application\Http\Actions\Vault\BulkCreateItemsAction;
use Blackbox\Application\Http\Actions\Vault\DeleteAllVaultItemsAction;
use Blackbox\Application\Http\Actions\Auth\LoginAction;
use Blackbox\Application\Http\Actions\Auth\LoginEmailOtpAction;
use Blackbox\Application\Http\Actions\Auth\OAuthCallbackAction;
use Blackbox\Application\Http\Actions\Auth\OAuthProvidersAction;
use Blackbox\Application\Http\Actions\Auth\OAuthStartAction;
use Blackbox\Application\Http\Actions\Auth\ResendLoginEmailOtpAction;
use Blackbox\Application\Http\Actions\Auth\SendRecoveryBackupEmailAction;
use Blackbox\Application\Http\Actions\Auth\LogoutAction;
use Blackbox\Application\Http\Actions\Auth\SignupAction;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Middleware\PlatformAdminMiddleware;
use Blackbox\Application\Http\Actions\Auth\UpdateDisplayNameAction;
use Psr\Log\LoggerInterface;

$settings = require __DIR__ . '/settings.php';

return [
    'settings' => $settings,
    LoggerInterface::class => static function () use ($settings): LoggerInterface {
        return LoggerFactory::create($settings['app_env']);
    },
    PdoFactory::class => static fn () => new PdoFactory($settings['db']),
    DatabaseHealthChecker::class => \DI\autowire(),
    UserRepository::class => \DI\autowire(),
    UserOAuthIdentityRepository::class => \DI\autowire(),
    OAuthLoginStateRepository::class => \DI\autowire(),
    SimpleHttpClient::class => static fn () => new SimpleHttpClient(),
    OAuthLoginService::class => static function (\Psr\Container\ContainerInterface $c): OAuthLoginService {
        /** @var array<string,mixed> $settings */
        $settings = $c->get('settings');

        return new OAuthLoginService(
            $c->get(UserRepository::class),
            $c->get(UserOAuthIdentityRepository::class),
            $c->get(OAuthLoginStateRepository::class),
            $c->get(SimpleHttpClient::class),
            $c->get(LoggerInterface::class),
            (string) ($settings['api_public_base_url'] ?? ''),
            (string) ($settings['ui_app_base_url'] ?? ''),
            (string) ($settings['legal']['signup_docs_version'] ?? '2026-04-16'),
            (array) ($settings['oauth'] ?? []),
        );
    },
    SessionRepository::class => \DI\autowire(),
    AuthEmailTokenRepository::class => \DI\autowire(),
    LoginEmailOtpChallengeRepository::class => static function (\Psr\Container\ContainerInterface $c) use ($settings): LoginEmailOtpChallengeRepository {
        return new LoginEmailOtpChallengeRepository(
            $c->get(PdoFactory::class),
            (string) ($settings['security']['login_otp_pepper'] ?? ''),
        );
    },
    MailerInterface::class => static function () use ($settings): MailerInterface {
        $dsn = $settings['mail']['dsn'] !== '' ? $settings['mail']['dsn'] : 'null://null';

        return new Mailer(Transport::fromDsn($dsn));
    },
    AuthMailNotifier::class => static function (\Psr\Container\ContainerInterface $c) use ($settings): AuthMailNotifier {
        return new SymfonyAuthMailNotifier(
            $c->get(MailerInterface::class),
            [
                'from_address' => $settings['mail']['from_address'],
                'from_name' => $settings['mail']['from_name'],
                'product_name' => $settings['mail']['product_name'],
            ],
        );
    },
    AuthService::class => static function (\Psr\Container\ContainerInterface $c) use ($settings): AuthService {
        return new AuthService(
            $c->get(UserRepository::class),
            $c->get(AuthEmailTokenRepository::class),
            $c->get(AuthMailNotifier::class),
            $c->get(SessionRepository::class),
            $c->get(LoginEmailOtpChallengeRepository::class),
            $c->get(LoggerInterface::class),
            $settings['ui_app_base_url'],
            $settings['mail']['delivery_configured'],
            $settings['app_env'],
            (string) ($settings['legal']['signup_docs_version'] ?? '2026-04-16'),
            (string) ($settings['security']['login_otp_pepper'] ?? ''),
            (int) ($settings['security']['login_otp_ttl_seconds'] ?? 120),
        );
    },
    SessionService::class => \DI\autowire(),
    VaultProfileReader::class => \DI\get(VaultProfileRepository::class),
    VaultProfileRepository::class => \DI\autowire(),
    VaultItemRepository::class => \DI\autowire(),
    VaultFileRepository::class => \DI\autowire(),
    VaultRecoveryRepository::class => \DI\autowire(),
    VaultService::class => \DI\autowire(),
    VaultActiveItemCountReader::class => \DI\get(VaultService::class),
    BillingCustomerRepository::class => \DI\autowire(),
    BillingSubscriptionRepository::class => \DI\autowire(),
    BillingInvoiceRepository::class => \DI\autowire(),
    BillingEventLogRepository::class => \DI\autowire(),
    BillingOneTimePurchaseRepository::class => \DI\autowire(),
    BillingServiceInterface::class => static function (\Psr\Container\ContainerInterface $c): BillingServiceInterface {
        /** @var array<string,mixed> $settings */
        $settings = $c->get('settings');

        return new StripeBillingService(
            $settings['stripe'],
            $c->get(BillingCustomerRepository::class),
            $c->get(BillingSubscriptionRepository::class),
            $c->get(BillingInvoiceRepository::class),
            $c->get(BillingEventLogRepository::class),
            $c->get(BillingOneTimePurchaseRepository::class),
            $c->get(LoggerInterface::class),
            $c->get(BillingUserMailerPort::class),
            (bool) ($settings['billing_dev_simulate_pro'] ?? false),
        );
    },
    BillingUserMailerPort::class => \DI\get(BillingUserMailAdapter::class),
    BillingUserMailAdapter::class => \DI\autowire(),
    DevSimulateProBillingAction::class => static fn (\Psr\Container\ContainerInterface $c): DevSimulateProBillingAction => new DevSimulateProBillingAction(
        $c->get('settings'),
        $c->get(BillingServiceInterface::class),
        $c->get(BillingSubscriptionRepository::class),
        $c->get(BillingUserMailerPort::class),
    ),
    UserTransactionalMailer::class => static function (\Psr\Container\ContainerInterface $c): UserTransactionalMailer {
        /** @var array<string,mixed> $settings */
        $settings = $c->get('settings');
        /** @var array<string,mixed> $mail */
        $mail = $settings['mail'] ?? [];

        return new UserTransactionalMailer(
            $c->get(UserRepository::class),
            $c->get(AuthMailNotifier::class),
            (string) ($settings['ui_app_base_url'] ?? ''),
            (bool) ($mail['delivery_configured'] ?? false),
            $c->get(LoggerInterface::class),
        );
    },
    PlanCapabilityService::class => static function (\Psr\Container\ContainerInterface $c): PlanCapabilityService {
        /** @var array<string,mixed> $settings */
        $settings = $c->get('settings');
        /** @var array<string,mixed> $vault */
        $vault = $settings['vault'] ?? [];

        return new PlanCapabilityService(
            $c->get(BillingServiceInterface::class),
            (bool) ($vault['require_non_free_plan_for_import_and_files'] ?? false),
        );
    },
    AuthMiddleware::class => static fn (\Psr\Container\ContainerInterface $c) => new AuthMiddleware(
        $c->get(SessionService::class),
        $c->get('settings')['session']
    ),
    SignupAction::class => static fn (\Psr\Container\ContainerInterface $c): SignupAction => new SignupAction(
        $c->get(AuthService::class),
        $c->get('settings')['mail']['admin_email'] ?? null,
    ),
    CurrentUserAction::class => static fn (\Psr\Container\ContainerInterface $c): CurrentUserAction => new CurrentUserAction(
        $c->get(UserRepository::class),
        $c->get('settings')['mail']['admin_email'] ?? null,
    ),
    UpdateDisplayNameAction::class => static fn (\Psr\Container\ContainerInterface $c): UpdateDisplayNameAction => new UpdateDisplayNameAction(
        $c->get(AuthService::class),
        $c->get(UserRepository::class),
        $c->get('settings')['mail']['admin_email'] ?? null,
    ),
    PlatformAdminMiddleware::class => static fn (\Psr\Container\ContainerInterface $c): PlatformAdminMiddleware => new PlatformAdminMiddleware(
        $c->get(UserRepository::class),
        $c->get('settings')['mail'],
    ),
    ListPlatformCustomersAction::class => \DI\autowire(),
    DeletePlatformCustomerAction::class => static fn (\Psr\Container\ContainerInterface $c): DeletePlatformCustomerAction => new DeletePlatformCustomerAction(
        $c->get(UserRepository::class),
        $c->get(BillingServiceInterface::class),
        $c->get('settings')['mail']['admin_email'] ?? null,
    ),
    LoginAction::class => static fn (\Psr\Container\ContainerInterface $c) => new LoginAction(
        $c->get(AuthService::class),
    ),
    LoginEmailOtpAction::class => static fn (\Psr\Container\ContainerInterface $c) => new LoginEmailOtpAction(
        $c->get(AuthService::class),
        $c->get(SessionService::class),
        $c->get('settings')['session'],
        $c->get('settings')['mail']['admin_email'] ?? null,
    ),
    ResendLoginEmailOtpAction::class => static fn (\Psr\Container\ContainerInterface $c) => new ResendLoginEmailOtpAction(
        $c->get(AuthService::class),
    ),
    OAuthStartAction::class => static fn (\Psr\Container\ContainerInterface $c): OAuthStartAction => new OAuthStartAction(
        $c->get(OAuthLoginService::class),
    ),
    OAuthProvidersAction::class => static fn (\Psr\Container\ContainerInterface $c): OAuthProvidersAction => new OAuthProvidersAction(
        $c->get(OAuthLoginService::class),
    ),
    OAuthCallbackAction::class => static fn (\Psr\Container\ContainerInterface $c): OAuthCallbackAction => new OAuthCallbackAction(
        $c->get(OAuthLoginService::class),
        $c->get(SessionService::class),
        $c->get('settings')['session'],
    ),
    LogoutAction::class => static fn (\Psr\Container\ContainerInterface $c) => new LogoutAction(
        $c->get(SessionService::class),
        $c->get('settings')['session']
    ),
    AccountRecoveryResetAction::class => static fn (\Psr\Container\ContainerInterface $c) => new AccountRecoveryResetAction(
        $c->get(AuthService::class),
        $c->get('settings')['security']['account_recovery']
    ),
    SendRecoveryBackupEmailAction::class => static fn (\Psr\Container\ContainerInterface $c): SendRecoveryBackupEmailAction => new SendRecoveryBackupEmailAction(
        $c->get(UserRepository::class),
        $c->get(VaultService::class),
        $c->get(AuthMailNotifier::class),
        $c->get('settings')['mail'],
    ),
    DevEmailTemplatesIndexAction::class => static fn (\Psr\Container\ContainerInterface $c) => new DevEmailTemplatesIndexAction(
        ['app_env' => (string) ($c->get('settings')['app_env'] ?? 'local')],
    ),
    DevEmailTemplatesViewAction::class => static fn (\Psr\Container\ContainerInterface $c) => new DevEmailTemplatesViewAction(
        $c->get('settings'),
    ),
    BulkCreateItemsAction::class => \DI\autowire(),
    DeleteAllVaultItemsAction::class => \DI\autowire(),
    DowngradeToFreeAction::class => \DI\autowire(),
];
