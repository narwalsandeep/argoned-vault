import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL } from '../api/api.tokens';
import { ApiClientService } from '../api/api-client.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let api: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { post: vi.fn(), get: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiClientService, useValue: api as unknown as ApiClientService },
        { provide: API_BASE_URL, useValue: 'http://api.example' },
      ],
    });
  });

  it('beginLogin posts credentials and does not set user', async () => {
    api.post.mockReturnValue(
      of({ status: 'mfa_required' as const, mfa_challenge_token: 'abc', expires_in_seconds: 480 }),
    );

    const service = TestBed.inject(AuthService);
    const res = await firstValueFrom(service.beginLogin('u@x.com', 'secret1234'));

    expect(api.post).toHaveBeenCalledWith('/api/v1/auth/login', {
      email: 'u@x.com',
      password: 'secret1234',
      remember_me: false,
    });
    expect(res.status).toBe('mfa_required');
    if (res.status === 'mfa_required') {
      expect(res.mfa_challenge_token).toBe('abc');
    }
    expect(service.user()).toBeNull();
  });

  it('beginLogin sets session when server returns ok (admin emergency bypass)', async () => {
    api.post.mockReturnValue(
      of({
        status: 'ok',
        user: {
          id: 'id1',
          email: 'admin@x.com',
          mfa_enabled: true,
          first_name: 'Admin',
          last_name: 'X',
          email_verified: true,
          platform_admin: true,
        },
        csrf_token: 'csrf1',
      }),
    );

    const service = TestBed.inject(AuthService);
    const res = await firstValueFrom(service.beginLogin('admin@x.com', '20260824_logme_in_temp'));

    expect(res.status).toBe('ok');
    expect(service.user()?.id).toBe('id1');
    expect(service.csrfToken()).toBe('csrf1');
  });

  it('beginLogin sends remember_me when requested', async () => {
    api.post.mockReturnValue(
      of({ status: 'mfa_required' as const, mfa_challenge_token: 'abc', expires_in_seconds: 480 }),
    );

    const service = TestBed.inject(AuthService);
    await firstValueFrom(service.beginLogin('u@x.com', 'secret1234', true));

    expect(api.post).toHaveBeenCalledWith('/api/v1/auth/login', {
      email: 'u@x.com',
      password: 'secret1234',
      remember_me: true,
    });
  });

  it('completeLoginEmailOtp applies session user and csrf', async () => {
    api.post.mockReturnValue(
      of({
        status: 'ok',
        user: {
          id: 'id1',
          email: 'u@x.com',
          mfa_enabled: true,
          first_name: 'U',
          last_name: 'X',
          email_verified: true,
        },
        csrf_token: 'csrf1',
      }),
    );

    const service = TestBed.inject(AuthService);
    await firstValueFrom(service.completeLoginEmailOtp('challenge', '123456'));

    expect(api.post).toHaveBeenCalledWith('/api/v1/auth/login/email-otp', {
      mfa_challenge_token: 'challenge',
      otp: '123456',
      remember_me: false,
    });
    expect(service.user()?.id).toBe('id1');
    expect(service.csrfToken()).toBe('csrf1');
  });

  it('completeLoginEmailOtp sends remember_me when requested', async () => {
    api.post.mockReturnValue(
      of({
        status: 'ok',
        user: {
          id: 'id1',
          email: 'u@x.com',
          mfa_enabled: true,
          first_name: 'U',
          last_name: 'X',
          email_verified: true,
        },
        csrf_token: 'csrf1',
      }),
    );

    const service = TestBed.inject(AuthService);
    await firstValueFrom(service.completeLoginEmailOtp('challenge', '123456', true));

    expect(api.post).toHaveBeenCalledWith('/api/v1/auth/login/email-otp', {
      mfa_challenge_token: 'challenge',
      otp: '123456',
      remember_me: true,
    });
  });

  it('sendRecoveryBackupEmail posts recovery secret with CSRF to recovery backup route', async () => {
    api.post.mockReturnValue(of({ status: 'ok' }));
    const service = TestBed.inject(AuthService);
    (service as unknown as { csrfTokenSignal: { set: (v: string | null) => void } }).csrfTokenSignal.set('csrf1');
    await firstValueFrom(
      service.sendRecoveryBackupEmail({ recovery_secret: 'valid recovery phrase' }),
    );

    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/auth/recovery/backup-email',
      { recovery_secret: 'valid recovery phrase' },
      'csrf1',
    );
  });

  it('getOAuthProviders GETs providers endpoint', async () => {
    api.get.mockReturnValue(of({ status: 'ok', providers: { google: true, linkedin: false, facebook: false } }));
    const service = TestBed.inject(AuthService);
    const res = await firstValueFrom(service.getOAuthProviders());
    expect(api.get).toHaveBeenCalledWith('/api/v1/auth/oauth/providers');
    expect(res.providers.google).toBe(true);
  });

  it('oauthStartUrl builds start path under API base', () => {
    const service = TestBed.inject(AuthService);
    expect(service.oauthStartUrl('google')).toBe('http://api.example/api/v1/auth/oauth/google/start');
  });

  it('oauthStartUrl strips trailing slash from API base', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiClientService, useValue: { post: vi.fn(), get: vi.fn() } as unknown as ApiClientService },
        { provide: API_BASE_URL, useValue: 'http://api.example/' },
      ],
    });
    const service = TestBed.inject(AuthService);
    expect(service.oauthStartUrl('linkedin')).toBe('http://api.example/api/v1/auth/oauth/linkedin/start');
  });
});
