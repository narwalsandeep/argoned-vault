import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/ui/toast.service';

@Component({
  selector: 'app-reset-password',
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
                  Choose a new login password. This does not change your vault unlock secret. After saving, sign in again on all
                  devices.
                </p>
                <ul class="auth-feature-list" aria-label="Reset password properties">
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>One-time reset token</span></li>
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Credential rotation only</span></li>
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Vault keys remain unchanged</span></li>
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

          <section class="auth-panel-right" aria-label="Reset password">
            <div class="auth-panel-content">
              <header class="auth-form-header">
                <h1 class="settings-page-heading flex-wrap justify-center">
                  <span class="settings-page-title">New password</span>
                  <span class="settings-page-heading-dot" aria-hidden="true">.</span>
                  <span class="settings-page-kicker">Reset</span>
                </h1>
              </header>
              @if (!token()) {
                <div class="auth-form">
                  <p class="auth-info-text text-center">This page needs a valid reset link from your email.</p>
                  <a
                    routerLink="/forgot-password"
                    class="btn-primary auth-cta mt-4 inline-flex w-full justify-center gap-2"
                  >
                    <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Request a new link</span>
                  </a>
                </div>
              } @else {
                <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
                  <div>
                    <label class="auth-field-label" for="reset-password">New password</label>
                    <input
                      id="reset-password"
                      type="password"
                      class="auth-input"
                      autocomplete="new-password"
                      formControlName="password"
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div>
                    <label class="auth-field-label" for="reset-confirm">Confirm password</label>
                    <input
                      id="reset-confirm"
                      type="password"
                      class="auth-input"
                      autocomplete="new-password"
                      formControlName="confirm"
                      placeholder="Re-enter password"
                    />
                  </div>
                  <button class="btn-primary auth-cta mt-1 w-full" type="submit">
                    <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    <span>Update password</span>
                  </button>
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
export class ResetPasswordComponent implements OnInit {
  public readonly token = signal('');
  public readonly form;

  public constructor(
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]],
    });
  }

  public ngOnInit(): void {
    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      this.token.set(params.get('token')?.trim() ?? '');
    });
  }

  public onSubmit(): void {
    if (this.form.invalid || !this.token()) return;
    const raw = this.form.getRawValue();
    const p = raw.password ?? '';
    if (p !== (raw.confirm ?? '')) {
      this.toast.error('Passwords do not match');
      return;
    }
    this.auth.resetPassword(this.token(), p).subscribe({
      next: (res) => {
        this.toast.success(res.message ?? 'Password updated.');
        void this.router.navigate(['/login']);
      },
      error: (err) => {
        const code = err?.error?.error;
        if (code === 'invalid_or_expired_token') {
          this.toast.error('This reset link is invalid or expired. Request a new one.');
          return;
        }
        if (code === 'weak_password') {
          this.toast.error('Use at least 8 characters.');
          return;
        }
        this.toast.error('Could not reset password.');
      },
    });
  }
}
