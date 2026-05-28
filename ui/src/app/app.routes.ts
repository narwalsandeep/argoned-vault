import { Routes } from '@angular/router';

import { AlertComponent } from './features/alert/alert.component';
import { DocsComponent } from './features/docs/docs.component';
import { PricingComponent } from './features/pricing/pricing.component';
import { SubscriptionComponent } from './features/subscription/subscription.component';
import { SubscriptionDowngradeCheckComponent } from './features/subscription/subscription-downgrade-check.component';
import { CredentialFormComponent } from './features/create/credential-form/credential-form.component';
import { ChooseCredentialTypeComponent } from './features/create/choose-credential-type/choose-credential-type.component';
import { ChooseTypeComponent } from './features/create/choose-type/choose-type.component';
import { SimpleVaultItemFormComponent } from './features/create/simple-vault-item-form/simple-vault-item-form.component';
import { ImportVaultItemsComponent } from './features/create/import-vault-items/import-vault-items.component';
import { LogoutComponent } from './features/logout/logout.component';
import { ProfileComponent } from './features/profile/profile.component';
import { SettingsComponent } from './features/settings/settings.component';
import { StatusComponent } from './features/status/status.component';
import { VaultListPageComponent } from './features/vault/vault-list-page.component';
import { VaultSessionPageComponent } from './features/vault/vault-session-page.component';
import { LoginComponent } from './features/auth/login/login.component';
import { SignupComponent } from './features/auth/signup/signup.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { CheckEmailComponent } from './features/auth/check-email/check-email.component';
import { VerifyEmailComponent } from './features/auth/verify-email/verify-email.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { RecoveryComponent } from './features/auth/recovery/recovery.component';
import { TermsComponent } from './features/legal/terms/terms.component';
import { PrivacyComponent } from './features/legal/privacy/privacy.component';
import { MasterLayoutComponent } from './core/layout/master-layout/master-layout.component';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';
import { onboardingAllowedGuard } from './core/vault/onboarding-allowed.guard';
import { vaultProfileRequiredGuard } from './core/vault/vault-profile-required.guard';
import { vaultUnlockedGuard } from './core/vault/vault-unlocked.guard';
import { vaultImportEntitledGuard } from './core/billing/vault-import-entitled.guard';
import { platformAdminGuard } from './core/auth/platform-admin.guard';
import { OnboardingWizardComponent } from './features/onboarding/onboarding-wizard.component';
import { AdminCustomersComponent } from './features/admin/admin-customers.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'signup', component: SignupComponent, canActivate: [guestGuard] },
  { path: 'check-email', component: CheckEmailComponent, canActivate: [guestGuard] },
  { path: 'verify-email', component: VerifyEmailComponent, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPasswordComponent, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [guestGuard] },
  { path: 'recovery', component: RecoveryComponent, canActivate: [guestGuard] },
  { path: 'terms', component: TermsComponent },
  { path: 'privacy', component: PrivacyComponent },
  {
    path: 'onboarding',
    component: OnboardingWizardComponent,
    canActivate: [authGuard, onboardingAllowedGuard],
  },
  /** Outside the vault-gated shell so first-run users can sign out before profile exists. */
  { path: 'logout', component: LogoutComponent, canActivate: [authGuard] },
  {
    path: '',
    component: MasterLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [vaultProfileRequiredGuard],
    children: [
      { path: 'dashboard', pathMatch: 'full', redirectTo: 'settings' },
      { path: 'new', component: ChooseTypeComponent, canActivate: [vaultUnlockedGuard] },
      {
        path: 'new/import',
        component: ImportVaultItemsComponent,
        canActivate: [vaultUnlockedGuard, vaultImportEntitledGuard],
      },
      { path: 'new/file', redirectTo: 'new/item/file', pathMatch: 'full' },
      { path: 'new/credentials', component: ChooseCredentialTypeComponent, canActivate: [vaultUnlockedGuard] },
      { path: 'new/credentials/:subtype', component: CredentialFormComponent, canActivate: [vaultUnlockedGuard] },
      { path: 'new/item/:kind', component: SimpleVaultItemFormComponent, canActivate: [vaultUnlockedGuard] },
      { path: 'vault/items', component: VaultListPageComponent, canActivate: [vaultUnlockedGuard] },
      { path: 'vault/session', component: VaultSessionPageComponent },
      { path: 'vault', redirectTo: 'settings', pathMatch: 'full' },
      { path: 'settings', component: SettingsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'alert', component: AlertComponent },
      { path: 'status', component: StatusComponent },
      { path: 'docs', component: DocsComponent },
      { path: 'pricing', component: PricingComponent },
      { path: 'subscription', component: SubscriptionComponent },
      { path: 'subscription/downgrade', component: SubscriptionDowngradeCheckComponent },
      {
        path: 'admin/customers',
        component: AdminCustomersComponent,
        canActivate: [platformAdminGuard],
      },
      { path: 'home', pathMatch: 'full', redirectTo: 'settings' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
