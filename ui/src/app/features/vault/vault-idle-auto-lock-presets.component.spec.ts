import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { VaultIdleAutoLockPresetsComponent } from './vault-idle-auto-lock-presets.component';

describe('VaultIdleAutoLockPresetsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultIdleAutoLockPresetsComponent],
      providers: [
        {
          provide: WebCryptoService,
          useValue: {
            getAutoLockTimeoutMs: vi.fn().mockReturnValue(8 * 60 * 1000),
            applyIdleAutoLockPresetMinutes: vi.fn(),
          } as unknown as WebCryptoService,
        },
      ],
    }).compileComponents();
  });

  it('renders six preset minute chips', () => {
    const fixture = TestBed.createComponent(VaultIdleAutoLockPresetsComponent);
    fixture.detectChanges();
    const group = (fixture.nativeElement as HTMLElement).querySelector('[role="group"]');
    const buttons = group?.querySelectorAll('button') ?? [];
    expect(buttons.length).toBe(6);
    expect(Array.from(buttons).map((b) => (b.textContent ?? '').trim())).toEqual(['2', '4', '8', '16', '32', '64']);
  });

  it('applies preset via WebCryptoService when a chip is clicked', async () => {
    const applyIdle = vi.fn();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [VaultIdleAutoLockPresetsComponent],
      providers: [
        {
          provide: WebCryptoService,
          useValue: {
            getAutoLockTimeoutMs: vi.fn().mockReturnValue(8 * 60 * 1000),
            applyIdleAutoLockPresetMinutes: applyIdle,
          } as unknown as WebCryptoService,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(VaultIdleAutoLockPresetsComponent);
    fixture.detectChanges();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[4] as HTMLButtonElement).click();
    expect(applyIdle).toHaveBeenCalledWith(32);
  });
});
