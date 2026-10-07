import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { BillingApiService } from '../../../core/billing/billing-api.service';
import { VaultService } from '../../../core/vault/vault.service';
import { ChooseCredentialTypeComponent } from './choose-credential-type.component';

const defaultDowngrade = {
  from_plan: 'free',
  allowed: false,
  reason: 'no_active_pro_subscription',
  free_item_limit: 8,
  active_item_count: 0,
  file_vault_item_count: 0,
};

describe('ChooseCredentialTypeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChooseCredentialTypeComponent],
      providers: [
        provideRouter([]),
        { provide: VaultService, useValue: { listItems: () => of([]) } },
        {
          provide: BillingApiService,
          useValue: {
            getDowngradeReadiness: () => of({ status: 'ok', downgrade: { ...defaultDowngrade } }),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ChooseCredentialTypeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show credentials step title', () => {
    const fixture = TestBed.createComponent(ChooseCredentialTypeComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Credentials');
    expect(text).toContain('pick a shape');
  });

  it('should render all credential type options', () => {
    const fixture = TestBed.createComponent(ChooseCredentialTypeComponent);
    const expected = fixture.componentInstance.options.length;
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('button.create-choice-card');
    const links = el.querySelectorAll('a.create-choice-card');
    expect(buttons.length + links.length).toBe(expected);
  });

  it('should show plan-limit upgrade cards when user cannot add another item', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ChooseCredentialTypeComponent],
      providers: [
        provideRouter([]),
        { provide: VaultService, useValue: { listItems: () => of([]) } },
        {
          provide: BillingApiService,
          useValue: {
            getDowngradeReadiness: () =>
              of({
                status: 'ok',
                downgrade: { ...defaultDowngrade, active_item_count: 12 },
              }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ChooseCredentialTypeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.vaultItemCreateBlocked()).toBe(true);
    expect(el.textContent).toContain('Plan limit');
    expect(el.textContent).toContain('12 of 8 vault items');

    const formLinks = Array.from(el.querySelectorAll('a.create-choice-card')).filter((a) =>
      (a.getAttribute('href') ?? '').includes('/new/credentials/'),
    );
    expect(formLinks.length).toBe(0);
  });
});
