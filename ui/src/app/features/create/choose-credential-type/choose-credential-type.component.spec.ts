import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { VaultService } from '../../../core/vault/vault.service';
import { ChooseCredentialTypeComponent } from './choose-credential-type.component';

describe('ChooseCredentialTypeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChooseCredentialTypeComponent],
      providers: [
        provideRouter([]),
        { provide: VaultService, useValue: { listItems: () => of([]) } },
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
});
