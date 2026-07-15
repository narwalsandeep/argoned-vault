<?php

declare(strict_types=1);

use Blackbox\Application\Http\Actions\Api\V1\RootAction;
use Blackbox\Application\Http\Actions\Auth\CurrentUserAction;
use Blackbox\Application\Http\Actions\Auth\ListSessionsAction;
use Blackbox\Application\Http\Actions\Auth\LoginAction;
use Blackbox\Application\Http\Actions\Auth\LoginEmailOtpAction;
use Blackbox\Application\Http\Actions\Auth\OAuthCallbackAction;
use Blackbox\Application\Http\Actions\Auth\OAuthProvidersAction;
use Blackbox\Application\Http\Actions\Auth\OAuthStartAction;
use Blackbox\Application\Http\Actions\Auth\ResendLoginEmailOtpAction;
use Blackbox\Application\Http\Actions\Auth\LogoutAction;
use Blackbox\Application\Http\Actions\Auth\AccountRecoveryResetAction;
use Blackbox\Application\Http\Actions\Auth\ChangePasswordAction;
use Blackbox\Application\Http\Actions\Auth\RevokeSessionAction;
use Blackbox\Application\Http\Actions\Auth\SignupAction;
use Blackbox\Application\Http\Actions\Auth\VerifyEmailAction;
use Blackbox\Application\Http\Actions\Auth\ResendVerificationAction;
use Blackbox\Application\Http\Actions\Auth\SendOnboardingSecurityGuideAction;
use Blackbox\Application\Http\Actions\Auth\SendRecoveryBackupEmailAction;
use Blackbox\Application\Http\Actions\Auth\UpdateDisplayNameAction;
use Blackbox\Application\Http\Actions\Admin\DeletePlatformCustomerAction;
use Blackbox\Application\Http\Actions\Admin\ListPlatformCustomersAction;
use Blackbox\Application\Http\Actions\Auth\ForgotPasswordAction;
use Blackbox\Application\Http\Actions\Auth\ResetPasswordAction;
use Blackbox\Application\Http\Actions\Vault\BulkCreateItemsAction;
use Blackbox\Application\Http\Actions\Vault\CreateItemAction;
use Blackbox\Application\Http\Actions\Vault\CreateRecoveryArtifactAction;
use Blackbox\Application\Http\Actions\Vault\CreateFileAction;
use Blackbox\Application\Http\Actions\Vault\DeleteAllVaultItemsAction;
use Blackbox\Application\Http\Actions\Vault\ExportItemsAction;
use Blackbox\Application\Http\Actions\Vault\DeleteFileAction;
use Blackbox\Application\Http\Actions\Vault\DeleteItemAction;
use Blackbox\Application\Http\Actions\Vault\FinalizeVaultFieldShareAction;
use Blackbox\Application\Http\Actions\Vault\ListVaultFieldSharesAction;
use Blackbox\Application\Http\Actions\Vault\PrepareVaultFieldShareAction;
use Blackbox\Application\Http\Actions\Vault\RevokeVaultFieldShareAction;
use Blackbox\Application\Http\Actions\Vault\GetFileAction;
use Blackbox\Application\Http\Actions\Vault\GetVaultFileUsageAction;
use Blackbox\Application\Http\Actions\Vault\GetItemAction;
use Blackbox\Application\Http\Actions\Vault\GetProfileAction;
use Blackbox\Application\Http\Actions\Vault\GetRecoveryArtifactAction;
use Blackbox\Application\Http\Actions\Vault\ListFilesAction;
use Blackbox\Application\Http\Actions\Vault\ListItemsAction;
use Blackbox\Application\Http\Actions\Vault\RotateRecoveryArtifactAction;
use Blackbox\Application\Http\Actions\Vault\UpdateItemAction;
use Blackbox\Application\Http\Actions\Vault\UpsertProfileAction;
use Blackbox\Application\Http\Actions\Billing\CancelBillingSubscriptionAction;
use Blackbox\Application\Http\Actions\Billing\DevSimulateProBillingAction;
use Blackbox\Application\Http\Actions\Billing\DowngradeToFreeAction;
use Blackbox\Application\Http\Actions\Billing\GetBillingConfigAction;
use Blackbox\Application\Http\Actions\Billing\GetDowngradeReadinessAction;
use Blackbox\Application\Http\Actions\Billing\GetBillingSummaryAction;
use Blackbox\Application\Http\Actions\Billing\ListBillingInvoicesAction;
use Blackbox\Application\Http\Actions\Billing\StripeBillingWebhookAction;
use Blackbox\Application\Http\Actions\Billing\SyncBillingCheckoutSessionAction;
use Blackbox\Application\Http\Actions\Dev\DevEmailTemplatesIndexAction;
use Blackbox\Application\Http\Actions\Dev\DevEmailTemplatesViewAction;
use Blackbox\Application\Http\Actions\Share\ConsumeVaultFieldShareAction;
use Blackbox\Application\Http\Actions\Share\FetchVaultFieldShareAction;
use Blackbox\Application\Http\Actions\Health\ReadyAction;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Middleware\PlatformAdminMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return static function (App $app): void {
    $app->get('/health/live', LiveAction::class);
    $app->get('/health/ready', ReadyAction::class);

    $app->group('/api/v1', function (RouteCollectorProxy $group): void {
        $group->get('', RootAction::class);
        $group->get('/', RootAction::class);
        $group->post('/auth/signup', SignupAction::class);
        $group->post('/auth/login', LoginAction::class);
        $group->get('/auth/oauth/providers', OAuthProvidersAction::class);
        $group->get('/auth/oauth/{provider}/start', OAuthStartAction::class);
        $group->get('/auth/oauth/callback', OAuthCallbackAction::class);
        $group->post('/auth/login/email-otp', LoginEmailOtpAction::class);
        $group->post('/auth/login/email-otp/resend', ResendLoginEmailOtpAction::class);
        $group->post('/auth/verify-email', VerifyEmailAction::class);
        $group->post('/auth/verify-email/resend', ResendVerificationAction::class);
        $group->post('/auth/forgot-password', ForgotPasswordAction::class);
        $group->post('/auth/reset-password', ResetPasswordAction::class);
        $group->post('/auth/recovery/account-reset', AccountRecoveryResetAction::class);

        $group->get('/dev/email-templates', DevEmailTemplatesIndexAction::class);
        $group->get('/dev/email-templates/view/{slug}', DevEmailTemplatesViewAction::class);

        $group->post('/billing/webhook', StripeBillingWebhookAction::class);

        $group->post('/share/{share_id}/fetch', FetchVaultFieldShareAction::class);
        $group->post('/share/{share_id}/consume', ConsumeVaultFieldShareAction::class);

        $group->group('/billing', function (RouteCollectorProxy $billing): void {
            $billing->get('/config', GetBillingConfigAction::class);
            $billing->get('/summary', GetBillingSummaryAction::class);
            $billing->get('/downgrade-readiness', GetDowngradeReadinessAction::class);
            $billing->get('/invoices', ListBillingInvoicesAction::class);
            $billing->post('/cancel-subscription', CancelBillingSubscriptionAction::class);
            $billing->post('/downgrade-to-free', DowngradeToFreeAction::class);
            $billing->post('/sync-checkout-session', SyncBillingCheckoutSessionAction::class);
            $billing->post('/dev-simulate-pro', DevSimulateProBillingAction::class);
        })->add(AuthMiddleware::class);

        $group->group('/auth', function (RouteCollectorProxy $auth): void {
            $auth->get('/me', CurrentUserAction::class);
            $auth->post('/logout', LogoutAction::class);
            $auth->post('/password', ChangePasswordAction::class);
            $auth->get('/sessions', ListSessionsAction::class);
            $auth->delete('/sessions/{id}', RevokeSessionAction::class);
            $auth->post('/onboarding/security-guide', SendOnboardingSecurityGuideAction::class);
            $auth->post('/recovery/backup-email', SendRecoveryBackupEmailAction::class);
            $auth->post('/display-name', UpdateDisplayNameAction::class);
        })->add(AuthMiddleware::class);

        $group->group('/admin', function (RouteCollectorProxy $admin): void {
            $admin->get('/customers', ListPlatformCustomersAction::class);
            $admin->delete('/customers/{id}', DeletePlatformCustomerAction::class);
        })->add(PlatformAdminMiddleware::class)->add(AuthMiddleware::class);

        $group->group('/vault', function (RouteCollectorProxy $vault): void {
            $vault->post('/profile', UpsertProfileAction::class);
            $vault->put('/profile', UpsertProfileAction::class);
            $vault->get('/profile', GetProfileAction::class);

            $vault->post('/items', CreateItemAction::class);
            $vault->post('/items/bulk', BulkCreateItemsAction::class);
            $vault->get('/items', ListItemsAction::class);
            $vault->get('/items/export', ExportItemsAction::class);
            $vault->get('/items/{id}', GetItemAction::class);
            $vault->put('/items/{id}', UpdateItemAction::class);
            $vault->post('/items/delete-all', DeleteAllVaultItemsAction::class);
            $vault->delete('/items/{id}', DeleteItemAction::class);

            $vault->post('/files', CreateFileAction::class);
            $vault->get('/files/usage', GetVaultFileUsageAction::class);
            $vault->get('/files', ListFilesAction::class);
            $vault->get('/files/{id}', GetFileAction::class);
            $vault->delete('/files/{id}', DeleteFileAction::class);

            $vault->post('/recovery/artifact', CreateRecoveryArtifactAction::class);
            $vault->get('/recovery/artifact', GetRecoveryArtifactAction::class);
            $vault->post('/recovery/rotate-unlock-material', RotateRecoveryArtifactAction::class);

            $vault->post('/shares/prepare', PrepareVaultFieldShareAction::class);
            $vault->post('/shares/{share_id}/finalize', FinalizeVaultFieldShareAction::class);
            $vault->get('/shares', ListVaultFieldSharesAction::class);
            $vault->delete('/shares/{id}', RevokeVaultFieldShareAction::class);
        })->add(AuthMiddleware::class);
    });
};
