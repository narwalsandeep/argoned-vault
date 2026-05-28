import { TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '../../core/ui/toast.service';
import { VaultSessionService } from '../../core/vault/vault-session.service';
import { VaultService } from '../../core/vault/vault.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { VaultEraseDataComponent } from './vault-erase-data.component';

describe('VaultEraseDataComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultEraseDataComponent],
      providers: [
        {
          provide: VaultSessionService,
          useValue: { isUnlocked: () => false, vaultKeyCleared$: EMPTY } as unknown as VaultSessionService,
        },
        { provide: VaultService, useValue: { listItems: vi.fn(), getItem: vi.fn(), deleteAllVaultItems: vi.fn() } },
        { provide: WebCryptoService, useValue: { noteActivity: vi.fn(), decryptItemPayload: vi.fn() } },
        { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn(), info: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(VaultEraseDataComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should mention account password and JSON export', () => {
    const fixture = TestBed.createComponent(VaultEraseDataComponent);
    fixture.detectChanges();
    const t = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(t.toLowerCase()).toContain('account password');
    expect(t).toContain('JSON');
  });
});
