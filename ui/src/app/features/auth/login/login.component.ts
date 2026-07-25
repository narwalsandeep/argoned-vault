import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/ui/toast.service';
import { VaultReadinessService } from '../../../core/vault/vault-readiness.service';
import { AuthOAuthButtonsComponent } from '../auth-oauth-buttons.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthOAuthButtonsComponent],
  template: `
    <div class="auth-shell">
      <div class="auth-shell-body">
      <div class="auth-split">
        <section class="auth-panel-left" aria-label="Argoned introduction">
          <div class="auth-marketing-stack">
            <div class="auth-brand !mb-4" aria-label="Argoned brand">
              <span class="auth-brand-b">a</span><span class="auth-brand-rest">rgoned</span><span class="auth-brand-dot">.</span>
            </div>
            <div class="auth-hero">
              <p class="auth-info-text !mt-0">
                Client-side vault encryption with Argon2id and AES-256-GCM, same security model as inside the app.
              </p>
              <ul class="auth-feature-list" aria-label="Login security features">
                <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Argon2id password hardening</span></li>
                <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>CSRF-protected session requests</span></li>
                <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Email one-time code on every sign-in</span></li>
                <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Vault unlock remains separate</span></li>
              </ul>
            </div>
          </div>
          <div class="auth-links">
            <a routerLink="/signup">
              <svg class="auth-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              <span>Sign up</span>
            </a>
            <a routerLink="/forgot-password">
              <svg class="auth-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              <span>Forgot password</span>
            </a>
            <!-- Pre-login account recovery chip removed; route /recovery still exists for direct URL / operators. -->
            <!--
            <a routerLink="/recovery">
              <svg class="auth-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>Recovery</span>
            </a>
            -->
          </div>
        </section>

        <section class="auth-panel-right" aria-label="Login form">
          <div class="auth-panel-content">
            <header class="auth-form-header">
              <h1 class="settings-page-heading flex-wrap justify-center">
                <span class="settings-page-title">Welcome back</span>
                <span class="settings-page-heading-dot" aria-hidden="true">.</span>
                <span class="settings-page-kicker">Sign in</span>
              </h1>
            </header>
            @if (loginStep() === 'password') {
              <form [formGroup]="form" (ngSubmit)="onSubmitPassword()" class="auth-form">
                <div>
                  <label class="auth-field-label" for="login-email">Email</label>
                  <input
                    id="login-email"
                    class="auth-input"
                    type="email"
                    autocomplete="email"
                    formControlName="email"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label class="auth-field-label" for="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    class="auth-input"
                    autocomplete="current-password"
                    formControlName="password"
                    placeholder="Password"
                  />
                </div>
                <button
                  class="btn-primary auth-cta mt-1 w-full"
                  type="submit"
                  [disabled]="passwordSubmitting()"
                  [attr.aria-busy]="passwordSubmitting()"
                >
                  <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                    />
                  </svg>
                  <span>{{ passwordSubmitting() ? 'Sending code…' : 'Continue' }}</span>
                </button>
              </form>
              <app-auth-oauth-buttons />
            } @else {
              <p class="auth-info-text mb-4 text-center">
                Enter the 6-digit code sent to <strong>{{ maskedEmail() }}</strong>.
              </p>
              <form [formGroup]="otpForm" (ngSubmit)="onSubmitOtp()" class="auth-form">
                <div>
                  <label class="auth-field-label" for="login-otp">One-time code</label>
                  <input
                    id="login-otp"
                    class="auth-input text-center font-mono text-2xl tracking-[0.35em]"
                    type="text"
                    inputmode="numeric"
                    maxlength="8"
                    autocomplete="one-time-code"
                    formControlName="otp"
                    placeholder="000000"
                    aria-describedby="login-otp-hint"
                  />
                  <p id="login-otp-hint" class="auth-info-text mt-2 text-sm">{{ otpExpiresHint() }}</p>
                </div>
                <button
                  class="btn-primary auth-cta mt-1 w-full"
                  type="submit"
                  [disabled]="otpSubmitting()"
                  [attr.aria-busy]="otpSubmitting()"
                >
                  <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{{ otpSubmitting() ? 'Signing in…' : 'Sign in' }}</span>
                </button>
                <div class="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
                  <button
                    type="button"
                    class="text-app-main-accent hover:underline"
                    [disabled]="otpSubmitting()"
                    (click)="onResendOtp()"
                  >
                    Resend code
                  </button>
                  <span class="text-app-text-muted" aria-hidden="true">·</span>
                  <button
                    type="button"
                    class="text-app-text-muted hover:underline"
                    [disabled]="otpSubmitting()"
                    (click)="backToPassword()"
                  >
                    Use different account
                  </button>
                </div>
              </form>
            }
          </div>
        </section>
      </div>
      </div>
      <nav class="auth-legal-footer" aria-label="Legal">
        <a routerLink="/terms">
          <svg class="auth-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>Terms</span>
        </a>
        <a routerLink="/privacy">
          <svg class="auth-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>Privacy</span>
        </a>
      </nav>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  public readonly form;
  public readonly otpForm;

  public readonly loginStep = signal<'password' | 'otp'>('password');
  public readonly maskedEmail = signal('');
  public readonly passwordSubmitting = signal(false);
  public readonly otpSubmitting = signal(false);
  public readonly otpExpiresInSeconds = signal(480);
  public readonly otpExpiresHint = computed(() => {
    const minutes = Math.max(1, Math.ceil(this.otpExpiresInSeconds() / 60));
    const unit = minutes === 1 ? 'minute' : 'minutes';
    return `Codes expire in ${minutes} ${unit}. You can request a new one below.`;
  });

  private readonly vaultReadiness = inject(VaultReadinessService);
  private readonly route = inject(ActivatedRoute);
  private mfaChallengeToken = '';

  public constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required]],
    });
  }

  public ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    if (q.get('oauth') === 'success') {
      this.auth.tryRestoreSession().subscribe({
        next: (ok) => {
          if (ok) {
            this.toast.success('Signed in');
            this.vaultReadiness.invalidate();
            void this.router.navigateByUrl('/dashboard', { replaceUrl: true });
          } else {
            this.toast.error('Could not restore your session. Try signing in again.');
            void this.router.navigateByUrl('/login', { replaceUrl: true });
          }
        },
        error: () => {
          this.toast.error('Could not restore your session. Try signing in again.');
          void this.router.navigateByUrl('/login', { replaceUrl: true });
        },
      });
      return;
    }
    const oauthErr = q.get('oauth_error');
    if (oauthErr) {
      this.toast.error(this.messageForOAuthError(oauthErr));
      void this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  public onSubmitPassword(): void {
    if (this.form.invalid) return;
    if (this.passwordSubmitting()) return;
    const values = this.form.getRawValue();
    const email = (values.email ?? '').trim();
    this.passwordSubmitting.set(true);
    this.auth
      .beginLogin(email, values.password ?? '')
      .pipe(finalize(() => this.passwordSubmitting.set(false)))
      .subscribe({
        next: (res) => {
          if (res.status !== 'mfa_required' || !res.mfa_challenge_token) {
            this.toast.error('Unexpected login response');
            return;
          }
          this.mfaChallengeToken = res.mfa_challenge_token;
          if (res.expires_in_seconds > 0) {
            this.otpExpiresInSeconds.set(res.expires_in_seconds);
          }
          this.maskedEmail.set(this.maskEmail(email));
          this.loginStep.set('otp');
          this.toast.success('Check your email for a sign-in code.');
        },
        error: (err) => {
          const code = err?.error?.error;
          if (code === 'email_not_verified') {
            this.toast.error('Verify your email before signing in.');
            void this.router.navigate(['/check-email'], { queryParams: { email } });
            return;
          }
          if (code === 'email_delivery_not_configured' || code === 'login_otp_misconfigured') {
            this.toast.error('Sign-in email is not available. Contact support.');
            return;
          }
          if (code === 'login_otp_email_send_failed') {
            this.toast.error('Could not send the sign-in code. Try again.');
            return;
          }
          this.toast.error(typeof code === 'string' ? code : 'Login failed');
        },
      });
  }

  public onSubmitOtp(): void {
    if (this.otpForm.invalid || !this.mfaChallengeToken) return;
    if (this.otpSubmitting()) return;
    const otp = (this.otpForm.getRawValue().otp ?? '').replace(/\D/g, '');
    if (otp.length !== 6) {
      this.toast.error('Enter the 6-digit code from your email.');
      return;
    }
    this.otpSubmitting.set(true);
    this.auth
      .completeLoginEmailOtp(this.mfaChallengeToken, otp)
      .pipe(finalize(() => this.otpSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Login successful');
          this.vaultReadiness.invalidate();
          void this.router.navigateByUrl('/dashboard');
        },
        error: (err) => {
          const code = err?.error?.error;
          if (code === 'invalid_or_expired_login_otp') {
            this.toast.error('Invalid or expired code. Try again or resend.');
            return;
          }
          this.toast.error(typeof code === 'string' ? code : 'Sign-in failed');
        },
      });
  }

  public onResendOtp(): void {
    if (!this.mfaChallengeToken) return;
    this.auth.resendLoginEmailOtp(this.mfaChallengeToken).subscribe({
      next: (res) => {
        if (res.expires_in_seconds > 0) {
          this.otpExpiresInSeconds.set(res.expires_in_seconds);
        }
        this.toast.success('A new code was sent to your email.');
      },
      error: (err) => {
        const code = err?.error?.error;
        if (code === 'invalid_or_expired_login_challenge') {
          this.toast.error('This sign-in step expired. Start over with your password.');
          this.backToPassword();
          return;
        }
        this.toast.error(typeof code === 'string' ? code : 'Could not resend code');
      },
    });
  }

  public backToPassword(): void {
    this.mfaChallengeToken = '';
    this.loginStep.set('password');
    this.otpForm.reset();
    this.otpSubmitting.set(false);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const keep = local.length <= 2 ? 1 : 2;
    const masked = local.slice(0, keep) + '…' + (local.length > keep ? local.slice(-1) : '');
    return `${masked}@${domain}`;
  }

  private messageForOAuthError(code: string): string {
    switch (code) {
      case 'oauth_user_denied':
        return 'Sign-in was cancelled.';
      case 'oauth_email_password_account':
        return 'This email already uses password sign-in. Use email and password below, or contact support to link accounts.';
      case 'oauth_email_not_verified':
      case 'oauth_email_required':
        return 'The provider did not return a verified email. Try another sign-in method.';
      case 'oauth_invalid_or_expired_state':
      case 'oauth_invalid_callback':
        return 'That sign-in link expired. Try again.';
      case 'oauth_token_exchange_failed':
      case 'oauth_profile_failed':
        return 'Could not complete sign-in with the provider. Try again later.';
      case 'oauth_account_create_failed':
        return 'Could not create your account. Try again or use email sign-up.';
      case 'oauth_start_failed':
      case 'oauth_invalid_request':
        return 'Social sign-in is not available. Use email and password or try again later.';
      case 'user_not_found':
        return 'Your account could not be loaded after sign-in. Try again or contact support.';
      case 'oauth_failed':
      case 'oauth_unknown_provider':
        return 'Social sign-in failed. Try again or use email and password.';
      default:
        return 'Social sign-in failed. Try again or use email and password.';
    }
  }
}
