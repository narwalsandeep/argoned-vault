import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/ui/toast.service';
@Component({
  selector: 'app-recovery',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-shell-body">
      <div class="auth-split">
        <section class="auth-panel-left" aria-label="Recovery information">
          <div class="auth-marketing-stack">
            <div class="auth-brand !mb-4" aria-label="Argoned brand">
              <span class="auth-brand-b">a</span><span class="auth-brand-rest">rgoned</span><span class="auth-brand-dot">.</span>
            </div>
            <div class="auth-hero">
              <p class="auth-info-text !mt-0">
                This flow is for <strong class="font-semibold text-app-text">emergency account recovery</strong> when you may
                lose vault data. For a normal password reset, use
                <a routerLink="/forgot-password" class="font-medium text-app-main-accent underline">Forgot password</a>
                instead.
              </p>
              <ul class="auth-feature-list" aria-label="Recovery flow properties">
                <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Explicit data-loss confirmation</span></li>
                <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Account-level reset endpoint</span></li>
                <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Recovery-key dependent access</span></li>
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
          </div>
        </section>

        <section class="auth-panel-right" aria-label="Recovery form">
          <div class="auth-panel-content">
            <header class="auth-form-header">
              <h1 class="settings-page-heading flex-wrap justify-center">
                <span class="settings-page-title">Account recovery</span>
                <span class="settings-page-heading-dot" aria-hidden="true">.</span>
                <span class="settings-page-kicker">Reset login</span>
              </h1>
            </header>
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
              <div>
                <label class="auth-field-label" for="recovery-email">Email</label>
                <input
                  id="recovery-email"
                  class="auth-input"
                  type="email"
                  autocomplete="email"
                  formControlName="email"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label class="auth-field-label" for="recovery-new-password">New password</label>
                <input
                  id="recovery-new-password"
                  type="password"
                  class="auth-input"
                  autocomplete="new-password"
                  formControlName="newPassword"
                  placeholder="At least 8 characters"
                />
              </div>
              <label class="auth-checkbox-row" for="recovery-confirm">
                <input id="recovery-confirm" type="checkbox" formControlName="confirmDataLoss" />
                <span>I understand this action can remove access to existing vault data if recovery material is not available.</span>
              </label>
              <button class="btn-primary auth-cta mt-1 w-full" type="submit">
                <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Run recovery</span>
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
export class RecoveryComponent {
  public readonly form;

  public constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly toast: ToastService,
    route: ActivatedRoute,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmDataLoss: [false, [Validators.requiredTrue]],
    });

    route.queryParamMap.subscribe((params) => {
      const email = params.get('email');
      if (email !== null && email.trim() !== '') {
        this.form.patchValue({ email });
      }
    });
  }

  public onSubmit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.auth
      .accountOnlyRecoveryReset(value.email ?? '', value.newPassword ?? '', Boolean(value.confirmDataLoss))
      .subscribe({
        next: (res) => this.toast.success(res.message),
        error: (err) => this.toast.error(err?.error?.error ?? 'Recovery failed'),
      });
  }
}
