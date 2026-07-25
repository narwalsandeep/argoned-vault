import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/ui/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
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
                  Enter your email and we will send a secure link to choose a new login password.
                </p>
                <!-- Was: vault data loss → <a routerLink="/recovery">account recovery</a> (pre-login recovery nav removed). -->
                <ul class="auth-feature-list" aria-label="Password reset features">
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Signed reset token by email</span></li>
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Short-lived reset window</span></li>
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>No vault key exposure</span></li>
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
              <!-- Pre-login account recovery chip removed; see login.component.ts comment. -->
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

          <section class="auth-panel-right" aria-label="Forgot password">
            <div class="auth-panel-content">
              <header class="auth-form-header">
                <h1 class="settings-page-heading flex-wrap justify-center">
                  <span class="settings-page-title">Forgot password</span>
                  <span class="settings-page-heading-dot" aria-hidden="true">.</span>
                  <span class="settings-page-kicker">Email link</span>
                </h1>
              </header>
              <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
                <div>
                  <label class="auth-field-label" for="forgot-email">Email</label>
                  <input
                    id="forgot-email"
                    class="auth-input"
                    type="email"
                    autocomplete="email"
                    formControlName="email"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  class="btn-primary auth-cta mt-1 w-full"
                  type="submit"
                  [disabled]="submitting()"
                >
                  <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{{ submitting() ? 'Sending…' : 'Send reset link' }}</span>
                </button>
              </form>
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
export class ForgotPasswordComponent {
  public readonly form;
  public readonly submitting = signal(false);

  public constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly toast: ToastService,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  public onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const email = (this.form.getRawValue().email ?? '').trim();
    this.auth.forgotPassword(email).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.toast.success(res.message ?? 'If an account exists, instructions were sent.');
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error('Could not send email. Try again shortly.');
      },
    });
  }
}
