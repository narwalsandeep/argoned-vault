import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/ui/toast.service';
import { LEGAL_SIGNUP_DOCS_VERSION } from '../../legal/legal.constants';
import { AuthOAuthButtonsComponent } from '../auth-oauth-buttons.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthOAuthButtonsComponent],
  template: `
    <div class="auth-shell">
      <div class="auth-shell-body">
        <div class="auth-split">
          <section class="auth-panel-left" aria-label="Argoned introduction">
            <div class="auth-marketing-stack">
              <div class="auth-brand !mb-4" aria-label="Argoned brand">
                <span class="auth-brand-b">a</span><span class="auth-brand-rest">rgoned</span
                ><span class="auth-brand-dot">.</span>
              </div>
              <div class="auth-hero">
                <p class="auth-info-text !mt-0">
                  Create an account and set up your vault profile. Secrets are encrypted in your browser before they reach the
                  server.
                </p>
                <ul class="auth-feature-list" aria-label="Signup platform features">
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Email ownership verification</span></li>
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Client-side encryption defaults</span></li>
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Vault profile bootstrap flow</span></li>
                </ul>
              </div>
            </div>
            <div class="auth-links">
              <a routerLink="/login">
                <svg class="auth-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                <span>Login</span>
              </a>
              <a
                href="https://www.argoned.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Pricing (opens in new tab)"
              >
                <svg class="auth-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <span>Pricing</span>
              </a>
            </div>
          </section>

          <section class="auth-panel-right" aria-label="Sign up form">
            <div class="auth-panel-content">
              <header class="auth-form-header">
                <h1 class="settings-page-heading flex-wrap justify-center">
                  <span class="settings-page-title">Create account</span>
                  <span class="settings-page-heading-dot" aria-hidden="true">.</span>
                  <span class="settings-page-kicker">Sign up</span>
                </h1>
              </header>
              <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label class="auth-field-label" for="signup-first">First name</label>
                    <input
                      id="signup-first"
                      class="auth-input"
                      type="text"
                      autocomplete="given-name"
                      formControlName="first_name"
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <label class="auth-field-label" for="signup-last">Last name</label>
                    <input
                      id="signup-last"
                      class="auth-input"
                      type="text"
                      autocomplete="family-name"
                      formControlName="last_name"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label class="auth-field-label" for="signup-email">Email</label>
                  <input
                    id="signup-email"
                    class="auth-input"
                    type="email"
                    autocomplete="email"
                    formControlName="email"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label class="auth-field-label" for="signup-password">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    class="auth-input"
                    autocomplete="new-password"
                    formControlName="password"
                    placeholder="At least 8 characters"
                  />
                </div>
                <label class="mb-1 flex cursor-pointer items-start gap-2 text-sm leading-snug text-app-text-muted">
                  <input type="checkbox" class="mt-1 shrink-0" formControlName="accept_terms_privacy" />
                  <span>
                    I agree to the
                    <a routerLink="/terms" class="font-medium text-app-main-accent hover:underline">Terms of Service</a>
                    and
                    <a routerLink="/privacy" class="font-medium text-app-main-accent hover:underline">Privacy Policy</a>.
                    We record the time and policy version you accept (see Privacy).
                  </span>
                </label>
                <button
                  class="btn-primary auth-cta mt-1 w-full"
                  type="submit"
                  [disabled]="submitting()"
                  [attr.aria-busy]="submitting()"
                >
                  <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.433-2.554M15.75 9c0 .896-.393 1.7-1.016 2.25m1.016-2.25a3 3 0 11-5.196 5.196 4.125 4.125 0 01-5.196 0A3 3 0 0115.75 9zM4.5 19.125h9"
                    />
                  </svg>
                  <span>{{ submitting() ? 'Creating account…' : 'Create account' }}</span>
                </button>
              </form>
              <app-auth-oauth-buttons groupLabel="Sign up with a connected account" />
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
export class SignupComponent {
  public readonly submitting = signal(false);

  public readonly form;

  public constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {
    const nameValidators = [Validators.required, Validators.maxLength(100)];
    this.form = this.fb.group({
      first_name: ['', nameValidators],
      last_name: ['', nameValidators],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      accept_terms_privacy: [false, [Validators.requiredTrue]],
    });
  }

  public onSubmit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const pw = this.form.get('password');
      if (pw?.invalid && (pw.hasError('required') || pw.hasError('minlength'))) {
        this.toast.error('Password must be at least 8 characters.');
        return;
      }
      return;
    }
    const values = this.form.getRawValue();
    this.submitting.set(true);
    this.auth
      .signup(
        (values.first_name ?? '').trim(),
        (values.last_name ?? '').trim(),
        values.email ?? '',
        values.password ?? '',
        !!values.accept_terms_privacy,
        LEGAL_SIGNUP_DOCS_VERSION,
      )
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (res) => {
          this.toast.success('Check your email to verify your account.');
          void this.router.navigate(['/check-email'], {
            queryParams: { email: res.email },
          });
        },
        error: (err) => {
          const code = err?.error?.error;
          if (code === 'email_taken') {
            this.toast.error('That email is already registered.');
            return;
          }
          if (code === 'email_delivery_not_configured') {
            this.toast.error('Email is not configured on the server. Contact the administrator.');
            return;
          }
          if (code === 'terms_privacy_not_accepted') {
            this.toast.error('You must agree to the Terms of Service and Privacy Policy to create an account.');
            return;
          }
          if (code === 'legal_docs_version_mismatch') {
            this.toast.error('Terms or Privacy were updated. Refresh this page, then try signing up again.');
            return;
          }
          if (code === 'invalid_signup') {
            this.toast.error('Please check your name, email, and password.');
            return;
          }
          if (code === 'verification_email_send_failed') {
            this.toast.error(
              'Account was created but the verification email could not be sent. Check API mail settings and server logs.',
            );
            return;
          }
          this.toast.error(typeof code === 'string' ? code : 'Signup failed');
        },
      });
  }
}
