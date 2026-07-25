import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/ui/toast.service';
import { VaultReadinessService } from '../../core/vault/vault-readiness.service';
import { VaultService } from '../../core/vault/vault.service';
import {
  SUGGESTED_VAULT_PASSPHRASE_MIN_CHARS,
  SUGGESTED_VAULT_PASSPHRASE_MIN_WORDS,
  VAULT_SESSION_AUTO_LOCK_IDLE_MINUTES_OPTIONS,
  VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP,
} from '../../core/vault/vault-unlock-policy';
import { WebCryptoService } from '../../core/vault/web-crypto.service';

import { OnboardingWizardComponent } from './onboarding-wizard.component';

@Component({ standalone: true, template: '' })
class DashboardStub {}

describe('OnboardingWizardComponent', () => {
  describe('safeReturnUrl', () => {
    it('defaults invalid or external-like URLs to dashboard', () => {
      expect(OnboardingWizardComponent.safeReturnUrl(undefined)).toBe('/dashboard');
      expect(OnboardingWizardComponent.safeReturnUrl('')).toBe('/dashboard');
      expect(OnboardingWizardComponent.safeReturnUrl('//evil.com')).toBe('/dashboard');
      expect(OnboardingWizardComponent.safeReturnUrl('https://evil.com')).toBe('/dashboard');
    });

    it('allows internal app paths', () => {
      expect(OnboardingWizardComponent.safeReturnUrl('/vault/items')).toBe('/vault/items');
      expect(OnboardingWizardComponent.safeReturnUrl('/settings?tab=vault')).toBe('/settings?tab=vault');
    });

    it('blocks auth and onboarding loop targets', () => {
      expect(OnboardingWizardComponent.safeReturnUrl('/login')).toBe('/dashboard');
      expect(OnboardingWizardComponent.safeReturnUrl('/onboarding')).toBe('/dashboard');
      expect(OnboardingWizardComponent.safeReturnUrl('/onboarding?x=1')).toBe('/dashboard');
    });
  });

  describe('Vault secret step (1)', () => {
    it('Suggest random words fills unlock_secret with hyphenated readable passphrase', async () => {
      await TestBed.configureTestingModule({
        imports: [OnboardingWizardComponent],
        providers: [
          provideRouter([]),
          { provide: ToastService, useValue: { success: () => {}, error: vi.fn(), info: () => {} } },
          { provide: AuthService, useValue: { sendOnboardingCompletionEmail: () => of({ status: 'ok' }) } },
          { provide: VaultService, useValue: { upsertProfile: () => of({ status: 'ok' }) } },
          { provide: VaultReadinessService, useValue: { markProfilePresent: () => {} } },
          { provide: WebCryptoService, useValue: { bootstrapVaultProfile: async () => ({}) } },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(OnboardingWizardComponent);
      const comp = fixture.componentInstance;
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const btn = Array.from(el.querySelectorAll('button')).find((b) =>
        (b.textContent ?? '').includes('Suggest random words'),
      );
      expect(btn).toBeTruthy();
      btn!.click();
      fixture.detectChanges();

      const secret = String(comp.onboardingForm.get('unlock_secret')?.value ?? '');
      expect(secret.length).toBeGreaterThanOrEqual(SUGGESTED_VAULT_PASSPHRASE_MIN_CHARS);
      const parts = secret.split('-');
      expect(parts.length).toBeGreaterThanOrEqual(SUGGESTED_VAULT_PASSPHRASE_MIN_WORDS);
      expect(parts.every((p) => /^[a-z]+$/.test(p))).toBe(true);
      expect(comp.onboardingForm.get('secret_confirmed')?.value).toBe(false);
    });
  });

  describe('Keys step (Argon2)', () => {
    it('shows Set Defaults on the left of the footer row with Back', async () => {
      await TestBed.configureTestingModule({
        imports: [OnboardingWizardComponent],
        providers: [
          provideRouter([]),
          { provide: ToastService, useValue: { success: () => {}, error: () => {}, info: () => {} } },
          { provide: AuthService, useValue: { sendOnboardingCompletionEmail: () => of({ status: 'ok' }) } },
          { provide: VaultService, useValue: { upsertProfile: () => of({ status: 'ok' }) } },
          { provide: VaultReadinessService, useValue: { markProfilePresent: () => {} } },
          { provide: WebCryptoService, useValue: { bootstrapVaultProfile: async () => ({}) } },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(OnboardingWizardComponent);
      const comp = fixture.componentInstance;
      comp.onboardingForm.patchValue({
        unlock_secret: 'a'.repeat(VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP),
        secret_confirmed: true,
      });
      comp.goToStep(2);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Set Defaults');
      expect(el.textContent).not.toContain('Recommended defaults');

      const split = el.querySelector('.control-actions-row-split');
      expect(split).toBeTruthy();
      const buttons = Array.from(split!.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');
      expect(buttons).toContain('Set Defaults');
      expect(buttons).toContain('Back');
    });

    it('sends onboarding completion email with vault secret and settings on completion', async () => {
      const sendCompletion = vi.fn(() => of({ status: 'ok' }));
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [OnboardingWizardComponent],
        providers: [
          provideRouter([{ path: 'dashboard', component: DashboardStub }]),
          { provide: ToastService, useValue: { success: () => {}, error: () => {}, info: () => {} } },
          { provide: AuthService, useValue: { sendOnboardingCompletionEmail: sendCompletion } },
          { provide: VaultService, useValue: { upsertProfile: () => of({ status: 'ok' }) } },
          { provide: VaultReadinessService, useValue: { markProfilePresent: () => {} } },
          {
            provide: WebCryptoService,
            useValue: {
              bootstrapVaultProfile: async () => ({}),
              applyIdleAutoLockPresetMinutes: vi.fn(),
            },
          },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(OnboardingWizardComponent);
      const comp = fixture.componentInstance;
      comp.onboardingForm.patchValue({
        unlock_secret: 'a'.repeat(VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP),
        secret_confirmed: true,
        argon2_time_cost: 3,
        argon2_memory_kib: 131072,
        argon2_parallelism: 1,
        auto_lock_minutes: 8,
      });
      comp.completeOnboarding();

      expect(sendCompletion).toHaveBeenCalledTimes(1);
      expect(sendCompletion).toHaveBeenCalledWith({
        unlock_secret: 'a'.repeat(VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP),
        auto_lock_minutes: 8,
        argon2_time_cost: 3,
        argon2_memory_kib: 131072,
        argon2_parallelism: 1,
      });
    });

    it('Lock step uses same idle presets as Vault Session (2, 4, 8, …)', async () => {
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [OnboardingWizardComponent],
        providers: [
          provideRouter([]),
          { provide: ToastService, useValue: { success: () => {}, error: () => {}, info: () => {} } },
          { provide: AuthService, useValue: { sendOnboardingCompletionEmail: () => of({ status: 'ok' }) } },
          { provide: VaultService, useValue: { upsertProfile: () => of({ status: 'ok' }) } },
          { provide: VaultReadinessService, useValue: { markProfilePresent: () => {} } },
          {
            provide: WebCryptoService,
            useValue: {
              bootstrapVaultProfile: async () => ({}),
              applyIdleAutoLockPresetMinutes: vi.fn(),
            },
          },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(OnboardingWizardComponent);
      const comp = fixture.componentInstance;
      comp.onboardingForm.patchValue({
        unlock_secret: 'a'.repeat(VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP),
        secret_confirmed: true,
      });
      comp.step.set(3);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const group = el.querySelector('[role="group"][aria-label="Auto-lock after idle"]');
      expect(group).toBeTruthy();
      const labels = Array.from(group!.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');
      expect(labels).toEqual(VAULT_SESSION_AUTO_LOCK_IDLE_MINUTES_OPTIONS.map(String));
    });
  });
});
