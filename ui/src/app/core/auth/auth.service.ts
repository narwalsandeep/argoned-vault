import { Inject, Injectable, computed, signal } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';

import { API_BASE_URL } from '../api/api.tokens';
import { ApiClientService } from '../api/api-client.service';

export type OAuthProviderId = 'google' | 'linkedin' | 'facebook';

export interface OAuthProvidersAvailability {
  google: boolean;
  linkedin: boolean;
  facebook: boolean;
}

interface OAuthProvidersResponse {
  status: string;
  providers: OAuthProvidersAvailability;
}

export interface AuthUser {
  id: string;
  email: string;
  mfa_enabled?: boolean;
  first_name?: string;
  last_name?: string;
  /** Optional override shown in the app; when absent, UI falls back to first + last name or email local part. */
  display_name?: string | null;
  email_verified?: boolean;
  /** True when this account email matches server ADMIN_EMAIL (platform operator). */
  platform_admin?: boolean;
}

/** One-time onboarding completion email (vault secret + session/crypto settings). Never stored server-side. */
export interface OnboardingCompletionEmailPayload {
  unlock_secret: string;
  auto_lock_minutes: number;
  argon2_time_cost: number;
  argon2_memory_kib: number;
  argon2_parallelism: number;
}

interface AuthResponse {
  status: string;
  user: AuthUser;
  csrf_token: string;
}

export interface LoginMfaRequiredResponse {
  status: 'mfa_required';
  mfa_challenge_token: string;
  expires_in_seconds: number;
}

export interface SignupResponse {
  status: string;
  verification_sent: boolean;
  email: string;
  user: AuthUser;
}

interface AccountRecoveryResetResponse {
  status: string;
  account_reset: boolean;
  vault_data_recoverable: boolean;
  message: string;
}

interface MessageResponse {
  status: string;
  message?: string;
  email_verified?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly csrfTokenSignal = signal<string | null>(null);

  public readonly user = this.userSignal.asReadonly();
  public readonly csrfToken = this.csrfTokenSignal.asReadonly();
  public readonly isLoggedIn = computed(() => this.userSignal() !== null);

  constructor(
    private readonly api: ApiClientService,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string,
  ) {}

  /** Which OAuth providers the server has configured (non-empty client id + secret). */
  public getOAuthProviders() {
    return this.api.get<OAuthProvidersResponse>('/api/v1/auth/oauth/providers');
  }

  /** Full URL to begin the browser OAuth redirect (same-tab navigation). */
  public oauthStartUrl(provider: OAuthProviderId): string {
    const base = this.apiBaseUrl.replace(/\/$/, '');
    return `${base}/api/v1/auth/oauth/${provider}/start`;
  }

  public signup(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    acceptTermsPrivacy: boolean,
    legalDocsVersion: string,
  ) {
    return this.api.post<SignupResponse>('/api/v1/auth/signup', {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      accept_terms_privacy: acceptTermsPrivacy,
      legal_docs_version: legalDocsVersion,
    });
  }

  public verifyEmail(token: string) {
    return this.api.post<MessageResponse>('/api/v1/auth/verify-email', { token });
  }

  public resendVerification(email: string) {
    return this.api.post<MessageResponse>('/api/v1/auth/verify-email/resend', { email });
  }

  public forgotPassword(email: string) {
    return this.api.post<MessageResponse>('/api/v1/auth/forgot-password', { email });
  }

  public resetPassword(token: string, newPassword: string) {
    return this.api.post<MessageResponse>('/api/v1/auth/reset-password', {
      token,
      new_password: newPassword,
    });
  }

  /** Step 1: validates password and sends a 6-digit code to the account email. */
  public beginLogin(email: string, password: string) {
    return this.api.post<LoginMfaRequiredResponse>('/api/v1/auth/login', { email, password });
  }

  /** Step 2: exchanges the emailed OTP for a session (sets user + CSRF). */
  public completeLoginEmailOtp(mfaChallengeToken: string, otp: string) {
    return this.api
      .post<AuthResponse>('/api/v1/auth/login/email-otp', { mfa_challenge_token: mfaChallengeToken, otp })
      .pipe(tap((response) => this.setAuthState(response)));
  }

  public resendLoginEmailOtp(mfaChallengeToken: string) {
    return this.api.post<{ status: string; expires_in_seconds: number }>(
      '/api/v1/auth/login/email-otp/resend',
      { mfa_challenge_token: mfaChallengeToken },
    );
  }

  public accountOnlyRecoveryReset(email: string, newPassword: string, confirmDataLoss: boolean) {
    return this.api.post<AccountRecoveryResetResponse>('/api/v1/auth/recovery/account-reset', {
      email,
      new_password: newPassword,
      confirm_data_loss: confirmDataLoss,
    });
  }

  public changePassword(currentPassword: string, newPassword: string) {
    const csrf = this.csrfTokenSignal() ?? undefined;
    return this.api.post<{ status: string }>(
      '/api/v1/auth/password',
      { current_password: currentPassword, new_password: newPassword },
      csrf,
    );
  }

  /**
   * Updates account display name only (server `users.display_name`). Empty string clears the override.
   * Response matches `/auth/me` so session + CSRF state stay aligned.
   */
  public updateDisplayName(displayName: string) {
    const csrf = this.csrfTokenSignal() ?? undefined;
    return this.api.post<AuthResponse>('/api/v1/auth/display-name', { display_name: displayName }, csrf).pipe(
      tap((response) => {
        if (response.status === 'ok') {
          this.setAuthState(response);
        }
      }),
    );
  }

  public sendOnboardingCompletionEmail(payload: OnboardingCompletionEmailPayload) {
    const csrf = this.csrfTokenSignal() ?? undefined;
    return this.api.post<{ status: string }>('/api/v1/auth/onboarding/security-guide', payload, csrf);
  }

  /** Emails recovery backup guide + ciphertext JSON attachment (never the recovery passphrase). */
  public sendRecoveryBackupEmail() {
    const csrf = this.csrfTokenSignal() ?? undefined;
    return this.api.post<{ status: string }>('/api/v1/auth/recovery/backup-email', {}, csrf);
  }

  public logout() {
    const csrf = this.csrfTokenSignal() ?? undefined;
    return this.api.post<{ status: string }>('/api/v1/auth/logout', {}, csrf).pipe(
      tap(() => this.clearAuthState()),
    );
  }

  /**
   * Restores user + CSRF token from the session cookie (e.g. after full page reload).
   * Required for PUT/POST/DELETE vault calls; without CSRF the API returns csrf_token_invalid.
   */
  public tryRestoreSession() {
    return this.api.get<AuthResponse>('/api/v1/auth/me').pipe(
      tap((response) => {
        if (response.status === 'ok') {
          this.setAuthState(response);
        } else {
          this.clearAuthState();
        }
      }),
      map((response) => response.status === 'ok'),
      catchError(() => {
        this.clearAuthState();
        return of(false);
      }),
    );
  }

  public setCsrfToken(token: string | null): void {
    this.csrfTokenSignal.set(token);
  }

  private setAuthState(response: AuthResponse): void {
    this.userSignal.set(response.user);
    this.csrfTokenSignal.set(response.csrf_token);
  }

  private clearAuthState(): void {
    this.userSignal.set(null);
    this.csrfTokenSignal.set(null);
  }
}
