import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VaultFieldShareApiService } from '../../core/vault/vault-field-share-api.service';
import { VaultFieldShareCryptoService } from '../../core/vault/vault-field-share-crypto.service';
import { ShareRedeemComponent } from './share-redeem.component';

describe('ShareRedeemComponent', () => {
  let fixture: ComponentFixture<ShareRedeemComponent>;
  let fetchPublic: ReturnType<typeof vi.fn>;
  let consumePublic: ReturnType<typeof vi.fn>;
  let decryptFieldShare: ReturnType<typeof vi.fn>;

  const blob = {
    crypto_version: 1,
    kdf_algo: 'argon2id',
    kdf_params: { timeCost: 3, memoryKiB: 65536, parallelism: 1 },
    kdf_salt: 'c2FsdA==',
    ciphertext: 'Y2lwaGVy',
    payload_nonce: 'bm9uY2U=',
    payload_tag: 'dGFn',
    expires_at: '2026-06-18T21:35:00.000Z',
  };

  beforeEach(async () => {
    fetchPublic = vi.fn();
    consumePublic = vi.fn().mockReturnValue(of(undefined));
    decryptFieldShare = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ShareRedeemComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ shareId: 'abc123def4567890abc123def4567890' })),
          },
        },
        {
          provide: VaultFieldShareApiService,
          useValue: { fetchPublic, consumePublic },
        },
        {
          provide: VaultFieldShareCryptoService,
          useValue: {
            normalizeAccessCodeInput: (raw: string) => raw.trim(),
            isValidAccessCodeFormat: () => true,
            decryptFieldShare,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareRedeemComponent);
  });

  it('does not call fetch on init', () => {
    fixture.detectChanges();
    expect(fetchPublic).not.toHaveBeenCalled();
  });

  it('prevents native form submit', () => {
    fixture.detectChanges();
    const event = new Event('submit', { cancelable: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    fixture.componentInstance.onRevealSubmit(event);
    expect(preventDefault).toHaveBeenCalled();
  });

  it('reveals value and consumes share after successful decrypt', async () => {
    fetchPublic.mockReturnValue(of(blob));
    decryptFieldShare.mockResolvedValue({
      field_key: 'password',
      field_label: 'Password',
      value: 'hunter2',
    });

    fixture.detectChanges();
    fixture.componentInstance.accessCodeControl.setValue('AbCd-EfGh-IjKl-MnOp');
    await fixture.componentInstance.onReveal();

    expect(fetchPublic).toHaveBeenCalledWith('abc123def4567890abc123def4567890');
    expect(consumePublic).toHaveBeenCalledWith('abc123def4567890abc123def4567890');
    expect(fixture.componentInstance.phase()).toBe('revealed');
    expect(fixture.componentInstance.revealedValue()).toBe('hunter2');
  });

  it('does not consume share when decrypt fails', async () => {
    fetchPublic.mockReturnValue(of(blob));
    decryptFieldShare.mockRejectedValue(new Error('bad code'));

    fixture.detectChanges();
    fixture.componentInstance.accessCodeControl.setValue('AbCd-EfGh-IjKl-MnOp');
    await fixture.componentInstance.onReveal();

    expect(consumePublic).not.toHaveBeenCalled();
    expect(fixture.componentInstance.phase()).toBe('input');
    expect(fixture.componentInstance.errorMessage()).toMatch(/Incorrect access code/);
  });

  it('shows unavailable when fetch returns 404', async () => {
    fetchPublic.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    fixture.detectChanges();
    fixture.componentInstance.accessCodeControl.setValue('AbCd-EfGh-IjKl-MnOp');
    await fixture.componentInstance.onReveal();

    expect(fixture.componentInstance.phase()).toBe('unavailable');
  });
});
