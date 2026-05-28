import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/ui/toast.service';
import { LEGAL_SIGNUP_DOCS_VERSION } from '../../legal/legal.constants';
import { SignupComponent } from './signup.component';

@Component({ standalone: true, template: '' })
class LegalStubComponent {}

describe('SignupComponent', () => {
  const authMock = {
    signup: vi.fn(() =>
      of({
        status: 'ok',
        verification_sent: true,
        email: 'a@b.com',
        user: { id: 'u1', email: 'a@b.com' },
      }),
    ),
    getOAuthProviders: vi.fn(() =>
      of({ status: 'ok', providers: { google: false, linkedin: false, facebook: false } }),
    ),
    oauthStartUrl: vi.fn((p: string) => `http://localhost/api/v1/auth/oauth/${p}/start`),
  };
  const toastMock = { success: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    authMock.signup.mockReset();
    authMock.getOAuthProviders.mockReset();
    authMock.oauthStartUrl.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    TestBed.configureTestingModule({
      imports: [SignupComponent, ReactiveFormsModule, LegalStubComponent],
      providers: [
        provideRouter([
          { path: 'terms', component: LegalStubComponent },
          { path: 'privacy', component: LegalStubComponent },
        ]),
        { provide: AuthService, useValue: authMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });
  });

  it('does not call signup until Terms and Privacy are accepted', () => {
    const fixture = TestBed.createComponent(SignupComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.form.patchValue({
      first_name: 'A',
      last_name: 'B',
      email: 'a@b.com',
      password: 'password12',
      accept_terms_privacy: false,
    });
    c.onSubmit();
    expect(authMock.signup).not.toHaveBeenCalled();

    c.form.patchValue({ accept_terms_privacy: true });
    c.onSubmit();
    expect(authMock.signup).toHaveBeenCalledWith(
      'A',
      'B',
      'a@b.com',
      'password12',
      true,
      LEGAL_SIGNUP_DOCS_VERSION,
    );
  });

  it('shows toast when password is too short and does not call signup', () => {
    const fixture = TestBed.createComponent(SignupComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.form.patchValue({
      first_name: 'A',
      last_name: 'B',
      email: 'a@b.com',
      password: 'short',
      accept_terms_privacy: true,
    });
    c.onSubmit();
    expect(toastMock.error).toHaveBeenCalledWith('Password must be at least 8 characters.');
    expect(authMock.signup).not.toHaveBeenCalled();
  });

  it('clears submitting after signup error so the button can be used again', () => {
    authMock.signup.mockReturnValue(throwError(() => ({ error: { error: 'email_taken' } })));
    const fixture = TestBed.createComponent(SignupComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.form.patchValue({
      first_name: 'A',
      last_name: 'B',
      email: 'a@b.com',
      password: 'password12',
      accept_terms_privacy: true,
    });
    expect(c.submitting()).toBe(false);
    c.onSubmit();
    expect(c.submitting()).toBe(false);
  });
});
