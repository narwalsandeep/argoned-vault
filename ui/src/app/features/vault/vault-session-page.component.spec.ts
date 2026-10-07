import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { ToastService } from '../../core/ui/toast.service';
import { VaultService } from '../../core/vault/vault.service';
import { VaultSessionService } from '../../core/vault/vault-session.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';

import { VaultSessionPageComponent } from './vault-session-page.component';

describe('VaultSessionPageComponent', () => {
  it('shows Unlock vault when locked and Lock vault when unlocked', async () => {
    const vaultSession = { isUnlocked: vi.fn(), lockInMemory: vi.fn() };
    vaultSession.isUnlocked.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [VaultSessionPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: VaultSessionService, useValue: vaultSession as unknown as VaultSessionService },
        { provide: ToastService, useValue: { info: vi.fn() } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        { provide: VaultService, useValue: { getProfile: vi.fn() } },
        {
          provide: WebCryptoService,
          useValue: {
            unlockVaultFromProfile: vi.fn(),
            getAutoLockTimeoutMs: vi.fn(() => 8 * 60 * 1000),
            applyIdleAutoLockPresetMinutes: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(VaultSessionPageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.vault-session-primary-actions [data-bb-session-primary="unlock"]')).not.toBeNull();
    expect(el.querySelector('.vault-session-primary-actions [data-bb-session-primary="lock"]')).toBeNull();
  });

  it('shows Lock vault when unlocked', async () => {
    const vaultSession = { isUnlocked: vi.fn(), lockInMemory: vi.fn() };
    vaultSession.isUnlocked.mockReturnValue(true);

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [VaultSessionPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: VaultSessionService, useValue: vaultSession as unknown as VaultSessionService },
        { provide: ToastService, useValue: { info: vi.fn() } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        { provide: VaultService, useValue: { getProfile: vi.fn() } },
        {
          provide: WebCryptoService,
          useValue: {
            unlockVaultFromProfile: vi.fn(),
            getAutoLockTimeoutMs: vi.fn(() => 8 * 60 * 1000),
            applyIdleAutoLockPresetMinutes: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(VaultSessionPageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.vault-session-primary-actions [data-bb-session-primary="lock"]')).not.toBeNull();
    expect(el.querySelector('.vault-session-primary-actions [data-bb-session-primary="unlock"]')).toBeNull();
  });

  it('explains idle auto-lock in minutes on the session panel', async () => {
    const vaultSession = { isUnlocked: vi.fn(), lockInMemory: vi.fn() };
    vaultSession.isUnlocked.mockReturnValue(true);

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [VaultSessionPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: VaultSessionService, useValue: vaultSession as unknown as VaultSessionService },
        { provide: ToastService, useValue: { info: vi.fn() } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        { provide: VaultService, useValue: { getProfile: vi.fn() } },
        {
          provide: WebCryptoService,
          useValue: {
            unlockVaultFromProfile: vi.fn(),
            getAutoLockTimeoutMs: vi.fn(() => 8 * 60 * 1000),
            applyIdleAutoLockPresetMinutes: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(VaultSessionPageComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Minutes of inactivity');
    expect(text).toContain('minutes without activity');
    expect(text).toContain('8 min');
  });

  it('navigates to safe returnUrl after quick unlock success', async () => {
    const navigateByUrl = vi.fn();
    const vaultSession = { isUnlocked: vi.fn(), lockInMemory: vi.fn() };
    vaultSession.isUnlocked.mockReturnValue(false);

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [VaultSessionPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/new/item/file' }) } },
        },
        { provide: VaultSessionService, useValue: vaultSession as unknown as VaultSessionService },
        { provide: ToastService, useValue: { info: vi.fn() } },
        { provide: Router, useValue: { navigateByUrl } },
        { provide: VaultService, useValue: { getProfile: vi.fn() } },
        {
          provide: WebCryptoService,
          useValue: {
            unlockVaultFromProfile: vi.fn(),
            getAutoLockTimeoutMs: vi.fn(() => 8 * 60 * 1000),
            applyIdleAutoLockPresetMinutes: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(VaultSessionPageComponent);
    fixture.detectChanges();
    fixture.componentInstance.onQuickUnlockSuccess();
    expect(navigateByUrl).toHaveBeenCalledWith('/new/item/file', { replaceUrl: true });
  });
});
