import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/ui/toast.service';

type VerifyState = 'loading' | 'ok' | 'error';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink],
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
                  Verifying your email keeps your account recoverable and confirms you control this inbox.
                </p>
                <ul class="auth-feature-list" aria-label="Email verification checks">
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Signed verification token</span></li>
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Expiry + integrity validation</span></li>
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Account activation on success</span></li>
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
            </div>
          </section>

          <section class="auth-panel-right" aria-label="Email verification">
            <div class="auth-panel-content">
              <header class="auth-form-header">
                <h1 class="settings-page-heading flex-wrap justify-center">
                  <span class="settings-page-title">Email verification</span>
                  <span class="settings-page-heading-dot" aria-hidden="true">.</span>
                  <span class="settings-page-kicker">Confirm</span>
                </h1>
              </header>
              <div class="auth-form text-center">
                @if (state() === 'loading') {
                  <p class="auth-info-text">Verifying your link…</p>
                }
                @if (state() === 'ok') {
                  <div class="auth-verified-message" role="status" aria-live="polite">
                    <div class="auth-verified-shield" aria-hidden="true">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.85"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        focusable="false"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </div>
                    <div class="auth-verified-message-body">
                      <p class="auth-verified-message-title">Your email is verified.</p>
                      <p class="auth-verified-message-lede">You can sign in with your password.</p>
                    </div>
                  </div>
                  <a
                    routerLink="/login"
                    class="btn-primary auth-cta mt-6 inline-flex w-full max-w-sm justify-center gap-2"
                  >
                    <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>Go to login</span>
                  </a>
                }
                @if (state() === 'error') {
                  <p class="auth-info-text text-app-text">This link is invalid or has expired.</p>
                  <p class="auth-info-text mt-2 text-sm">
                    Request a new message from
                    <a routerLink="/check-email" class="font-medium text-app-main-accent hover:underline">check email</a>
                    or sign up again.
                  </p>
                  <a
                    routerLink="/login"
                    class="btn-secondary mt-6 inline-flex w-full max-w-sm justify-center gap-2"
                  >
                    <svg class="auth-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>Back to login</span>
                  </a>
                }
              </div>
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
export class VerifyEmailComponent implements OnInit {
  public readonly state = signal<VerifyState>('loading');

  public constructor(
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService,
    private readonly toast: ToastService,
  ) {}

  public ngOnInit(): void {
    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      const token = params.get('token')?.trim() ?? '';
      if (!token) {
        this.state.set('error');
        return;
      }
      this.auth.verifyEmail(token).subscribe({
        next: () => {
          this.state.set('ok');
          this.toast.success('Email verified. You can sign in.');
        },
        error: () => {
          this.state.set('error');
          this.toast.error('Verification link invalid or expired.');
        },
      });
    });
  }
}
