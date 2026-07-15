import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LEGAL_SIGNUP_DOCS_VERSION } from '../legal/legal.constants';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-content px-8 pt-12 pb-12">
      <h1 class="mb-8 text-3xl font-semibold tracking-tight text-app-text">Argoned</h1>

      @if (!auth.isLoggedIn()) {
        <div class="grid w-full grid-cols-1 gap-8 md:grid-cols-2">
          <form [formGroup]="signupForm" (ngSubmit)="onSignup()" class="rounded-xl border border-app-border bg-app-surface p-6">
            <h2 class="mb-4 text-xl font-semibold">Create account</h2>
            <div class="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm text-app-text-muted">First name</label>
                <input class="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2" formControlName="firstName" />
              </div>
              <div>
                <label class="mb-1 block text-sm text-app-text-muted">Last name</label>
                <input class="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2" formControlName="lastName" />
              </div>
            </div>
            <div class="mb-3">
              <label class="mb-1 block text-sm text-app-text-muted">Email</label>
              <input class="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2" formControlName="email" />
            </div>
            <div class="mb-4">
              <label class="mb-1 block text-sm text-app-text-muted">Password</label>
              <input type="password" class="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2" formControlName="password" />
            </div>
            <label class="mb-4 flex cursor-pointer items-start gap-2 text-sm leading-snug text-app-text-muted">
              <input type="checkbox" class="mt-1 shrink-0" formControlName="accept_terms_privacy" />
              <span>
                I agree to the
                <a routerLink="/terms" class="font-medium text-app-main-accent hover:underline">Terms of Service</a>
                and
                <a routerLink="/privacy" class="font-medium text-app-main-accent hover:underline">Privacy Policy</a>.
              </span>
            </label>
            <button class="btn-primary" type="submit">
              <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.433-2.554M15.75 9c0 .896-.393 1.7-1.016 2.25m1.016-2.25a3 3 0 11-5.196 5.196 4.125 4.125 0 01-5.196 0A3 3 0 0115.75 9zM4.5 19.125h9"
                />
              </svg>
              <span>Sign up</span>
            </button>
          </form>

          <div class="rounded-xl border border-app-border bg-app-surface p-6">
            <h2 class="mb-4 text-xl font-semibold">Login</h2>
            @if (loginStep() === 'password') {
              <form [formGroup]="loginForm" (ngSubmit)="onLoginPassword()">
                <div class="mb-3">
                  <label class="mb-1 block text-sm text-app-text-muted">Email</label>
                  <input class="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2" formControlName="email" />
                </div>
                <div class="mb-4">
                  <label class="mb-1 block text-sm text-app-text-muted">Password</label>
                  <input type="password" class="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2" formControlName="password" />
                </div>
                <button class="btn-primary" type="submit">
                  <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                    />
                  </svg>
                  <span>Continue</span>
                </button>
              </form>
            } @else {
              <p class="mb-3 text-sm text-app-text-muted">Enter the 6-digit code emailed to you.</p>
              <form [formGroup]="loginOtpForm" (ngSubmit)="onLoginOtp()">
                <div class="mb-4">
                  <label class="mb-1 block text-sm text-app-text-muted">Code</label>
                  <input
                    class="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 font-mono tracking-widest"
                    formControlName="otp"
                    inputmode="numeric"
                    maxlength="8"
                    autocomplete="one-time-code"
                  />
                </div>
                <button class="btn-primary mb-3" type="submit">Sign in</button>
              </form>
              <button type="button" class="text-sm text-app-main-accent hover:underline" (click)="onResendHomeOtp()">
                Resend code
              </button>
              <button type="button" class="ml-3 text-sm text-app-text-muted hover:underline" (click)="resetHomeLogin()">
                Start over
              </button>
            }
            <p class="mt-4 text-sm text-app-text-muted">
              Full sign-in experience:
              <a routerLink="/login" class="font-medium text-app-main-accent hover:underline">Login page</a>
            </p>
          </div>
        </div>

        <form
          [formGroup]="accountRecoveryForm"
          (ngSubmit)="onAccountRecoveryReset()"
          class="mt-8 w-full rounded-xl border border-red-900/50 bg-app-surface p-6"
        >
          <h2 class="mb-4 text-xl font-semibold text-red-400">Account-only recovery</h2>
          <div class="mb-3">
            <label class="mb-1 block text-sm text-app-text-muted">Email</label>
            <input class="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2" formControlName="email" />
          </div>
          <div class="mb-3">
            <label class="mb-1 block text-sm text-app-text-muted">New password</label>
            <input type="password" class="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2" formControlName="newPassword" />
          </div>
          <label class="mb-4 flex items-start gap-2 text-sm text-app-text-muted">
            <input type="checkbox" class="mt-1" formControlName="confirmDataLoss" />
            <span>I understand this action cannot recover old vault data.</span>
          </label>
          <button class="btn-primary" type="submit">
            <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <span>Reset account access</span>
          </button>
        </form>
      } @else {
        <div class="w-full rounded-xl border border-app-border bg-app-surface p-6">
          <h2 class="mb-6 text-xl font-semibold">Welcome, {{ auth.user()?.email }}</h2>
          <div class="flex flex-wrap gap-3">
            <a routerLink="/vault/items" class="btn-primary">
              <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              <span>Encrypted vault</span>
            </a>
            <a routerLink="/settings" class="btn-secondary">
              <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </a>
          </div>
        </div>
      }

      @if (message()) {
        <p class="mt-6 text-app-text-muted">{{ message() }}</p>
      }
    </div>
  `,
})
export class HomeComponent {
  public readonly message = signal<string>('');
  public readonly loginStep = signal<'password' | 'otp'>('password');

  public readonly signupForm;
  public readonly loginForm;
  public readonly loginOtpForm;
  public readonly accountRecoveryForm;

  private homeMfaToken = '';

  constructor(
    private readonly fb: FormBuilder,
    public readonly auth: AuthService,
    private readonly router: Router,
  ) {
    const nameValidators = [Validators.required, Validators.maxLength(100)];
    this.signupForm = this.fb.group({
      firstName: ['', nameValidators],
      lastName: ['', nameValidators],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      accept_terms_privacy: [false, [Validators.requiredTrue]],
    });

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });

    this.loginOtpForm = this.fb.group({
      otp: ['', [Validators.required]],
    });

    this.accountRecoveryForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmDataLoss: [false, [Validators.requiredTrue]],
    });

    this.auth.tryRestoreSession().subscribe();
  }

  public onSignup(): void {
    if (this.signupForm.invalid) return;
    const raw = this.signupForm.getRawValue();
    this.auth
      .signup(
        (raw.firstName ?? '').trim(),
        (raw.lastName ?? '').trim(),
        raw.email ?? '',
        raw.password ?? '',
        !!raw.accept_terms_privacy,
        LEGAL_SIGNUP_DOCS_VERSION,
      )
      .subscribe({
        next: () =>
          this.message.set('Account created. Check your email for a verification link before logging in.'),
        error: (err) => {
          const code = err?.error?.error;
          if (code === 'terms_privacy_not_accepted') {
            this.message.set('You must agree to the Terms and Privacy Policy to create an account.');
            return;
          }
          if (code === 'legal_docs_version_mismatch') {
            this.message.set('Terms or Privacy were updated. Refresh the page and try again.');
            return;
          }
          this.message.set(typeof code === 'string' ? code : 'Signup failed');
        },
      });
  }

  public onLoginPassword(): void {
    if (this.loginForm.invalid) return;
    const { email, password } = this.loginForm.getRawValue();
    this.auth.beginLogin((email ?? '').trim(), password ?? '').subscribe({
      next: (res) => {
        if (res.status !== 'mfa_required' || !res.mfa_challenge_token) {
          this.message.set('Unexpected login response.');
          return;
        }
        this.homeMfaToken = res.mfa_challenge_token;
        this.loginStep.set('otp');
        this.message.set('Check your email for a sign-in code.');
      },
      error: (err) => this.message.set(err?.error?.error ?? 'Login failed'),
    });
  }

  public onLoginOtp(): void {
    if (this.loginOtpForm.invalid || !this.homeMfaToken) return;
    const otp = (this.loginOtpForm.getRawValue().otp ?? '').replace(/\D/g, '');
    if (otp.length !== 6) {
      this.message.set('Enter the 6-digit code.');
      return;
    }
    this.auth.completeLoginEmailOtp(this.homeMfaToken, otp).subscribe({
      next: () => {
        this.message.set('Login successful.');
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err) => this.message.set(err?.error?.error ?? 'Sign-in failed'),
    });
  }

  public onResendHomeOtp(): void {
    if (!this.homeMfaToken) return;
    this.auth.resendLoginEmailOtp(this.homeMfaToken).subscribe({
      next: () => this.message.set('A new code was sent.'),
      error: (err) => this.message.set(err?.error?.error ?? 'Resend failed'),
    });
  }

  public resetHomeLogin(): void {
    this.homeMfaToken = '';
    this.loginStep.set('password');
    this.loginOtpForm.reset();
    this.message.set('');
  }

  public onAccountRecoveryReset(): void {
    if (this.accountRecoveryForm.invalid) return;
    const { email, newPassword, confirmDataLoss } = this.accountRecoveryForm.getRawValue();
    this.auth.accountOnlyRecoveryReset(email ?? '', newPassword ?? '', Boolean(confirmDataLoss)).subscribe({
      next: (res) => this.message.set(res.message),
      error: (err) => this.message.set(err?.error?.error ?? 'Account recovery reset failed'),
    });
  }
}
