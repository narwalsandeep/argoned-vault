import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { AuthOAuthButtonsComponent } from './auth-oauth-buttons.component';

describe('AuthOAuthButtonsComponent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a Google button when providers.google is true', () => {
    const auth = {
      getOAuthProviders: vi.fn(() =>
        of({ status: 'ok', providers: { google: true, linkedin: false, facebook: false } }),
      ),
      oauthStartUrl: vi.fn((p: string) => `http://api.test/api/v1/auth/oauth/${p}/start`),
    };
    TestBed.configureTestingModule({
      imports: [AuthOAuthButtonsComponent],
      providers: [{ provide: AuthService, useValue: auth }],
    });
    const fixture = TestBed.createComponent(AuthOAuthButtonsComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button[aria-label="Continue with Google"]')).not.toBeNull();
    expect(el.textContent).toContain('Google');
    expect(el.querySelector('button[aria-label="Continue with LinkedIn"]')).toBeNull();
  });

  it('renders nothing when no provider is enabled', () => {
    const auth = {
      getOAuthProviders: vi.fn(() =>
        of({ status: 'ok', providers: { google: false, linkedin: false, facebook: false } }),
      ),
      oauthStartUrl: vi.fn(),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AuthOAuthButtonsComponent],
      providers: [{ provide: AuthService, useValue: auth }],
    });
    const fixture = TestBed.createComponent(AuthOAuthButtonsComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.auth-oauth-stack')).toBeNull();
  });
});
