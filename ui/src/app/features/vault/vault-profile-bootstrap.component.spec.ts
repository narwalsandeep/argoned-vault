import { TestBed } from '@angular/core/testing';
import { of, throwError, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VaultProfilePayload } from '../../core/vault/vault.service';
import { ToastService } from '../../core/ui/toast.service';
import { VaultReadinessService } from '../../core/vault/vault-readiness.service';
import { VaultService } from '../../core/vault/vault.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { VaultProfileBootstrapComponent } from './vault-profile-bootstrap.component';

const mockProfileResponse = {
  status: 'ok',
  profile: {
    kdf_algo: 'argon2id',
    kdf_params_json: { time_cost: 3, memory_kib: 65536, parallelism: 1 },
    kdf_salt: 'salt',
    wrapped_vault_key: 'wk',
    wrapped_vault_key_nonce: 'n',
    wrapped_vault_key_tag: 't',
    crypto_version: 1,
  } as VaultProfilePayload,
};

describe('VaultProfileBootstrapComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultProfileBootstrapComponent],
      providers: [
        {
          provide: VaultService,
          useValue: {
            upsertProfile: vi.fn(),
            listItems: vi.fn(() => of([])),
            getProfile: () => throwError(() => new Error('profile load skipped in test')),
          } as unknown as VaultService,
        },
        {
          provide: WebCryptoService,
          useValue: {
            bootstrapVaultProfile: vi.fn(),
          } as unknown as WebCryptoService,
        },
        { provide: VaultReadinessService, useValue: { markProfilePresent: vi.fn() } as unknown as VaultReadinessService },
        { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn(), info: vi.fn() } as unknown as ToastService },
      ],
    }).compileComponents();
  });

  it('renders profile form with Update action', () => {
    const fixture = TestBed.createComponent(VaultProfileBootstrapComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#settings-profile-unlock-secret')).not.toBeNull();
    expect(el.textContent).toContain('Update');
    expect(el.textContent).not.toContain('Idle auto-lock');
  });

  it('does not use full-viewport blocking overlay for profile load', () => {
    const fixture = TestBed.createComponent(VaultProfileBootstrapComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.app-blocking-overlay')).toBeNull();
  });
});

describe('VaultProfileBootstrapComponent (delayed getProfile)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [VaultProfileBootstrapComponent],
      providers: [
        {
          provide: VaultService,
          useValue: {
            upsertProfile: vi.fn(),
            listItems: vi.fn(() => of([])),
            getProfile: vi.fn(() => timer(40).pipe(switchMap(() => of(mockProfileResponse)))),
          } as unknown as VaultService,
        },
        {
          provide: WebCryptoService,
          useValue: { bootstrapVaultProfile: vi.fn() } as unknown as WebCryptoService,
        },
        { provide: VaultReadinessService, useValue: { markProfilePresent: vi.fn() } as unknown as VaultReadinessService },
        { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn(), info: vi.fn() } as unknown as ToastService },
      ],
    }).compileComponents();
  });

  it('shows inline loading until getProfile completes', () => {
    const fixture = TestBed.createComponent(VaultProfileBootstrapComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Loading vault profile from the server');
    expect(el.querySelector('#settings-profile-unlock-secret')).toBeNull();
    expect(el.querySelector('app-ui-spinner')).not.toBeNull();

    vi.advanceTimersByTime(50);
    fixture.detectChanges();
    expect(el.querySelector('#settings-profile-unlock-secret')).not.toBeNull();
    expect(el.textContent).toContain('Update');
    expect(el.textContent).not.toContain('Loading vault profile from the server');
  });
});

describe('VaultProfileBootstrapComponent saveProfile guardrails', () => {
  beforeEach(async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [VaultProfileBootstrapComponent],
      providers: [
        {
          provide: VaultService,
          useValue: {
            upsertProfile: vi.fn(() => of({ status: 'ok' })),
            listItems: vi.fn(() => of([])),
            getProfile: () => throwError(() => new Error('profile load skipped in test')),
          } as unknown as VaultService,
        },
        {
          provide: WebCryptoService,
          useValue: {
            bootstrapVaultProfile: vi.fn(async () => mockProfileResponse.profile),
          } as unknown as WebCryptoService,
        },
        { provide: VaultReadinessService, useValue: { markProfilePresent: vi.fn() } as unknown as VaultReadinessService },
        { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn(), info: vi.fn() } as unknown as ToastService },
      ],
    }).compileComponents();
  });

  it('does not save when unlock secret is empty', async () => {
    const fixture = TestBed.createComponent(VaultProfileBootstrapComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.profileForm.patchValue({ unlock_secret: '' });

    await component.saveProfile();

    const vault = TestBed.inject(VaultService) as unknown as { upsertProfile: ReturnType<typeof vi.fn> };
    const crypto = TestBed.inject(WebCryptoService) as unknown as { bootstrapVaultProfile: ReturnType<typeof vi.fn> };
    expect(crypto.bootstrapVaultProfile).not.toHaveBeenCalled();
    expect(vault.upsertProfile).not.toHaveBeenCalled();
  });

  it('blocks unlock secret update when vault has existing items', async () => {
    const fixture = TestBed.createComponent(VaultProfileBootstrapComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.profileForm.patchValue({ unlock_secret: 'new unlock secret 123' });
    const vault = TestBed.inject(VaultService) as unknown as {
      listItems: ReturnType<typeof vi.fn>;
      upsertProfile: ReturnType<typeof vi.fn>;
    };
    vault.listItems.mockReturnValue(of([{ id: '1' }]));

    await component.saveProfile();

    expect(vault.upsertProfile).not.toHaveBeenCalled();
  });
});
