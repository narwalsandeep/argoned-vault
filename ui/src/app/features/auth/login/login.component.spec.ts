import { TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/ui/toast.service';
import { VaultReadinessService } from '../../../core/vault/vault-readiness.service';
import { APP_POST_AUTH_LANDING_ROUTE } from '../../../core/vault/vault-app-paths';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const toastMock = { success: vi.fn(), error: vi.fn() };
  const vaultMock = { invalidate: vi.fn() };

  const authMock = {
    beginLogin: vi.fn(),
    completeLoginEmailOtp: vi.fn(),
    resendLoginEmailOtp: vi.fn(),
    tryRestoreSession: vi.fn(() => of(false)),
    getOAuthProviders: vi.fn(() =>
      of({ status: 'ok', providers: { google: false, linkedin: false, facebook: false } }),
    ),
    oauthStartUrl: vi.fn((p: string) => `http://api.test/api/v1/auth/oauth/${p}/start`),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    authMock.beginLogin.mockReset();
    authMock.tryRestoreSession.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    vaultMock.invalidate.mockReset();
    authMock.tryRestoreSession.mockReturnValue(of(false));
    TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        FormBuilder,
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: ToastService, useValue: toastMock },
        { provide: VaultReadinessService, useValue: vaultMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });
  });

  it('ngOnInit does not restore session without oauth query', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    expect(authMock.tryRestoreSession).not.toHaveBeenCalled();
  });

  it('restores session and navigates to vault items when oauth=success', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        FormBuilder,
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: ToastService, useValue: toastMock },
        { provide: VaultReadinessService, useValue: vaultMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ oauth: 'success' }) } },
        },
      ],
    });
    authMock.tryRestoreSession.mockReturnValue(of(true));
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockImplementation(() => Promise.resolve(true));

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    expect(authMock.tryRestoreSession).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith('Signed in');
    expect(vaultMock.invalidate).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(APP_POST_AUTH_LANDING_ROUTE, { replaceUrl: true });
  });

  it('shows toast and clears route when oauth_error is present', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        FormBuilder,
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: ToastService, useValue: toastMock },
        { provide: VaultReadinessService, useValue: vaultMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ oauth_error: 'oauth_user_denied' }) } },
        },
      ],
    });
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockImplementation(() => Promise.resolve(true));

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    expect(toastMock.error).toHaveBeenCalledWith('Sign-in was cancelled.');
    expect(navSpy).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });

  it('clears passwordSubmitting after beginLogin error', () => {
    authMock.beginLogin.mockReturnValue(throwError(() => ({ error: { error: 'invalid_credentials' } })));
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.form.patchValue({ email: 'a@b.com', password: 'wrong' });
    expect(c.passwordSubmitting()).toBe(false);
    c.onSubmitPassword();
    expect(c.passwordSubmitting()).toBe(false);
  });

  it('passes keep_signed_in preference to beginLogin and completeLoginEmailOtp', () => {
    authMock.beginLogin.mockReturnValue(
      of({ status: 'mfa_required' as const, mfa_challenge_token: 'tok', expires_in_seconds: 480 }),
    );
    authMock.completeLoginEmailOtp.mockReturnValue(
      of({
        status: 'ok',
        user: {
          id: 'id1',
          email: 'a@b.com',
          mfa_enabled: true,
          first_name: 'A',
          last_name: 'B',
          email_verified: true,
        },
        csrf_token: 'csrf1',
      }),
    );

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.form.patchValue({ email: 'a@b.com', password: 'secret1234', keep_signed_in: true });
    c.onSubmitPassword();
    expect(authMock.beginLogin).toHaveBeenCalledWith('a@b.com', 'secret1234', true);

    c.otpForm.patchValue({ otp: '123456' });
    c.onSubmitOtp();
    expect(authMock.completeLoginEmailOtp).toHaveBeenCalledWith('tok', '123456', true);
  });

  it('shows OTP expiry hint from API expires_in_seconds', () => {
    authMock.beginLogin.mockReturnValue(
      of({ status: 'mfa_required' as const, mfa_challenge_token: 'tok', expires_in_seconds: 480 }),
    );
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.form.patchValue({ email: 'a@b.com', password: 'secret1234' });
    c.onSubmitPassword();
    fixture.detectChanges();
    expect(c.otpExpiresHint()).toBe('Codes expire in 8 minutes. You can request a new one below.');
  });
});
