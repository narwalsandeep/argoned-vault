import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { UiSpinnerComponent } from './ui-spinner.component';

describe('UiSpinnerComponent', () => {
  it('renders accent spinner by default', () => {
    TestBed.configureTestingModule({ imports: [UiSpinnerComponent] });
    const fixture = TestBed.createComponent(UiSpinnerComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const span = el.querySelector('span');
    expect(span?.classList.contains('border-app-main-accent')).toBe(true);
    expect(span?.classList.contains('size-5')).toBe(true);
  });

  it('applies muted variant and sm size', () => {
    TestBed.configureTestingModule({ imports: [UiSpinnerComponent] });
    const fixture = TestBed.createComponent(UiSpinnerComponent);
    fixture.componentRef.setInput('variant', 'muted');
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    const span = (fixture.nativeElement as HTMLElement).querySelector('span');
    expect(span?.classList.contains('border-app-text-muted')).toBe(true);
    expect(span?.classList.contains('size-4')).toBe(true);
  });
});
