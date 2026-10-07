import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VaultSessionService } from '../vault/vault-session.service';
import { WebCryptoService } from '../vault/web-crypto.service';
import { ShellIdleLockCountdownComponent } from './shell-idle-lock-countdown.component';

describe('ShellIdleLockCountdownComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellIdleLockCountdownComponent],
      providers: [
        {
          provide: WebCryptoService,
          useValue: {
            getAutoLockDeadlineEpochMs: vi.fn(() => Date.now() + 125_000),
            getAutoLockTimeoutMs: vi.fn(() => 8 * 60 * 1000),
          } as unknown as WebCryptoService,
        },
        {
          provide: VaultSessionService,
          useValue: { isUnlocked: () => true } as unknown as VaultSessionService,
        },
      ],
    }).compileComponents();
  });

  it('shows m:ss when vault is unlocked and a deadline exists', () => {
    const fixture = TestBed.createComponent(ShellIdleLockCountdownComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.app-shell-idle-lock-countdown__time')?.textContent?.trim()).toMatch(/\d+:\d{2}/);
    expect(el.querySelector('.app-shell-idle-lock-countdown')?.getAttribute('aria-label')).toMatch(/auto-lock|inactivity/i);
  });
});
