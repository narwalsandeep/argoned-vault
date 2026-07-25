import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL } from '../../core/api/api.tokens';
import { ApiClientService } from '../../core/api/api-client.service';
import { AuthService } from '../../core/auth/auth.service';
import { AdminCustomersComponent } from './admin-customers.component';

describe('AdminCustomersComponent', () => {
  let http: HttpTestingController;
  const csrfToken = signal('test-csrf');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCustomersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClientService,
        { provide: API_BASE_URL, useValue: '' },
        {
          provide: AuthService,
          useValue: {
            csrfToken: csrfToken.asReadonly(),
          },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should load customers from admin API', () => {
    const fixture = TestBed.createComponent(AdminCustomersComponent);
    fixture.detectChanges();

    const req = http.expectOne('/api/v1/admin/customers');
    expect(req.request.method).toBe('GET');
    req.flush({
      status: 'ok',
      customers: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'a@b.com',
          display_name: null,
          first_name: 'Ann',
          last_name: 'Bee',
          email_verified: true,
          created_at: '2026-01-01T00:00:00Z',
          last_login_at: null,
          plan_key: 'free',
          mfa_state: 'verified',
        },
      ],
    });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('a@b.com');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ann');
  });

  it('should DELETE a customer after confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(AdminCustomersComponent);
    fixture.detectChanges();
    http.expectOne('/api/v1/admin/customers').flush({
      status: 'ok',
      customers: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'gone@example.com',
          display_name: null,
          first_name: '',
          last_name: '',
          email_verified: true,
          created_at: '2026-01-01T00:00:00Z',
          last_login_at: null,
          plan_key: 'free',
          mfa_state: 'verified',
        },
      ],
    });
    fixture.detectChanges();

    const delBtn = (fixture.nativeElement as HTMLElement).querySelector('button.control-btn-danger');
    delBtn?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    const delReq = http.expectOne('/api/v1/admin/customers/11111111-1111-4111-8111-111111111111');
    expect(delReq.request.method).toBe('DELETE');
    expect(delReq.request.headers.get('X-CSRF-Token')).toBe('test-csrf');
    delReq.flush({ status: 'ok' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('gone@example.com');
    vi.restoreAllMocks();
  });
});
