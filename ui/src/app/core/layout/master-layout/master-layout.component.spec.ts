import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../auth/auth.service';
import { VaultSessionService } from '../../vault/vault-session.service';
import { WebCryptoService } from '../../vault/web-crypto.service';
import { MasterLayoutComponent } from './master-layout.component';

describe('MasterLayoutComponent', () => {
  let vaultSession: {
    isUnlocked: ReturnType<typeof vi.fn>;
    lockInMemory: ReturnType<typeof vi.fn>;
  };
  const authUser = signal<{ id: string; email: string; platform_admin?: boolean } | null>(null);

  beforeEach(async () => {
    vaultSession = {
      isUnlocked: vi.fn(),
      lockInMemory: vi.fn(),
    };
    vaultSession.isUnlocked.mockReturnValue(false);
    authUser.set(null);

    await TestBed.configureTestingModule({
      imports: [MasterLayoutComponent, RouterTestingModule],
      providers: [
        { provide: VaultSessionService, useValue: vaultSession as unknown as VaultSessionService },
        {
          provide: AuthService,
          useValue: {
            user: authUser.asReadonly(),
          },
        },
        {
          provide: WebCryptoService,
          useValue: {
            getAutoLockDeadlineEpochMs: vi.fn(() => null),
            getAutoLockTimeoutMs: vi.fn(() => 8 * 60 * 1000),
          } as unknown as WebCryptoService,
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render seven left nav targets (Create and Vault as gated buttons, five router links)', () => {
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    fixture.detectChanges();
    const leftAside = (fixture.nativeElement as HTMLElement).querySelector('aside[aria-label="Main navigation"]');
    const navStack = leftAside?.querySelector('.app-rail-nav-stack');
    const links = navStack?.querySelectorAll('a') ?? [];
    expect(links.length).toBe(5);
    expect(leftAside?.querySelector('button[aria-label="Create"]')).not.toBeNull();
    expect(leftAside?.querySelector('button[aria-label="Vault"]')).not.toBeNull();
  });

  it('should render Customers link above brand when user is platform admin', () => {
    authUser.set({ id: '1', email: 'admin@test.com', platform_admin: true });
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    fixture.detectChanges();
    const leftAside = (fixture.nativeElement as HTMLElement).querySelector('aside[aria-label="Main navigation"]');
    const customers = leftAside?.querySelector('.app-shell-rail-foot a[aria-label="Customers"]');
    expect(customers?.getAttribute('href') ?? '').toContain('admin/customers');
  });

  it('should render three right nav links (Account, Docs, Logout)', () => {
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    fixture.detectChanges();
    const rightAside = (fixture.nativeElement as HTMLElement).querySelector('aside[aria-label="Secondary navigation"]');
    const links = rightAside?.querySelectorAll('a') ?? [];
    expect(links.length).toBe(3);
    expect(rightAside?.querySelector('button')).toBeNull();
  });

  it('should have left nav routes new, vault, session, pricing, subscription, alert, settings', () => {
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    const routes = fixture.componentInstance.navItems.map((item) => item.route);
    expect(routes).toEqual(['/new', '/vault/items', '/vault/session', '/pricing', '/subscription', '/alert', '/settings']);
  });

  it('should have right nav routes profile, docs, logout', () => {
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    const routes = fixture.componentInstance.rightNavItems.map((item) => item.route);
    expect(routes).toEqual(['/profile', '/docs', '/logout']);
  });

  it('should show brand mark at bottom of left bar linking to argoned.com', () => {
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    fixture.detectChanges();
    const leftAside = (fixture.nativeElement as HTMLElement).querySelector('aside[aria-label="Main navigation"]');
    const brandLink = leftAside?.querySelector('.app-shell-brand-link');
    expect(brandLink?.getAttribute('href')).toBe('https://argoned.com');
    expect(brandLink?.getAttribute('target')).toBe('_blank');
    expect(brandLink?.querySelector('.app-shell-brand-mark')?.textContent?.trim()).toBe('a.');
  });

  it('should hide vault-unlocked status control when vault is locked', () => {
    vaultSession.isUnlocked.mockReturnValue(false);
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Lock vault now"]')).toBeNull();
  });

  it('should show vault-unlocked status control in left rail when vault is unlocked', () => {
    vaultSession.isUnlocked.mockReturnValue(true);
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    fixture.detectChanges();
    const lockBtn = (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Lock vault now"]');
    expect(lockBtn).toBeTruthy();
    expect(lockBtn?.querySelector('.app-shell-vault-status-pip')).toBeTruthy();
  });

  it('should render shell idle countdown under the vault-unlocked control when unlocked', () => {
    vaultSession.isUnlocked.mockReturnValue(true);
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-shell-idle-lock-countdown')).not.toBeNull();
  });

  it('should lock vault and open vault locked notice when left-rail unlocked status control is clicked', () => {
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    vaultSession.isUnlocked.mockReturnValue(true);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Lock vault now"]');
    button?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(vaultSession.lockInMemory).toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Vault locked');
  });

  it('should close vault locked notice when Got it is clicked', () => {
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    vaultSession.isUnlocked.mockReturnValue(true);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Lock vault now"]')?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    const gotIt = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('Got it'),
    );
    gotIt?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('The vault encryption key was cleared');
  });

  it('should navigate to Create when Create is clicked and vault is unlocked', () => {
    vaultSession.isUnlocked.mockReturnValue(true);
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    const router = TestBed.inject(Router);
    const spy = vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();

    const create = (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Create"]');
    create?.dispatchEvent(new Event('click'));

    expect(spy).toHaveBeenCalledWith('/new');
  });

  it('should show unlock modal when Create is clicked while vault is locked', () => {
    vaultSession.isUnlocked.mockReturnValue(false);
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    fixture.detectChanges();

    const create = (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Create"]');
    create?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Unlock to create');
  });

  it('should show unlock modal when Vault is clicked while vault is locked', () => {
    vaultSession.isUnlocked.mockReturnValue(false);
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    fixture.detectChanges();

    const vault = (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Vault"]');
    vault?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Unlock to open Vault');
  });

  it('should navigate to Vault when Vault is clicked while unlocked', () => {
    vaultSession.isUnlocked.mockReturnValue(true);
    const fixture = TestBed.createComponent(MasterLayoutComponent);
    const router = TestBed.inject(Router);
    const spy = vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();

    const vault = (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Vault"]');
    vault?.dispatchEvent(new Event('click'));

    expect(spy).toHaveBeenCalledWith('/vault/items');
  });

});
