import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/ui/toast.service';

@Component({
  selector: 'app-check-email',
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
                  Almost there. Use the link in your email to verify your address. You can sign in only after verification.
                </p>
                <ul class="auth-feature-list" aria-label="Email checkpoint features">
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Verification email dispatch</span></li>
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Resend without re-registering</span></li>
                  <li class="auth-feature-item"><span class="auth-feature-check" aria-hidden="true"></span><span>Login unlock after verify</span></li>
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

          <section class="auth-panel-right" aria-label="Check your email">
            <div class="auth-panel-content">
              <header class="auth-form-header">
                <h1 class="settings-page-heading flex-wrap justify-center">
                  <span class="settings-page-title">Check your email</span>
                  <span class="settings-page-heading-dot" aria-hidden="true">.</span>
                  <span class="settings-page-kicker">Verification</span>
                </h1>
              </header>
              <div class="auth-form">
                <p class="auth-info-text text-center">
                  @if (email()) {
                    We sent a verification link to <strong class="text-app-text">{{ email() }}</strong>.
                  } @else {
                    We sent a verification link to your email address.
                  }
                </p>
                <p class="auth-info-text mt-3 text-center text-sm">Did not receive it? Check spam, or resend below.</p>
                <button
                  type="button"
                  class="btn-primary auth-cta mt-4 w-full"
                  [disabled]="sending() || !email()"
                  (click)="resend()"
                >
                  <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{{ sending() ? 'Sending…' : 'Resend verification email' }}</span>
                </button>
                <p class="mt-6 text-center text-sm">
                  <a routerLink="/login" class="font-medium text-app-main-accent hover:underline">Back to login</a>
                </p>
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
export class CheckEmailComponent implements OnInit {
  public readonly email = signal('');
  public readonly sending = signal(false);

  public constructor(
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService,
    private readonly toast: ToastService,
  ) {}

  public ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const e = params.get('email');
      this.email.set(e?.trim() ?? '');
    });
  }

  public resend(): void {
    const addr = this.email().trim();
    if (!addr) {
      this.toast.error('Add your email on the sign-up page first.');
      return;
    }
    this.sending.set(true);
    this.auth.resendVerification(addr).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.toast.success(res.message ?? 'If the account is unverified, a new email was sent.');
      },
      error: (err) => {
        this.sending.set(false);
        const code = err?.error?.error;
        if (code === 'email_delivery_not_configured') {
          this.toast.error('Email is not configured on the server.');
          return;
        }
        this.toast.error('Could not resend. Try again shortly.');
      },
    });
  }
}
