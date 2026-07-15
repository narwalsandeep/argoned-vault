import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VaultFieldShareApiService } from '../../core/vault/vault-field-share-api.service';
import { ShareRedeemComponent } from './share-redeem.component';

describe('ShareRedeemComponent', () => {
  let fixture: ComponentFixture<ShareRedeemComponent>;
  let fetchPublic: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fetchPublic = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ShareRedeemComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ shareId: 'abc123' })),
          },
        },
        {
          provide: VaultFieldShareApiService,
          useValue: { fetchPublic },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareRedeemComponent);
  });

  it('does not call fetch on init', () => {
    fixture.detectChanges();
    expect(fetchPublic).not.toHaveBeenCalled();
  });
});
