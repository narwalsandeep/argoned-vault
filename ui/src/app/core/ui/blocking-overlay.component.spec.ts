import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { BlockingOverlayComponent } from './blocking-overlay.component';

describe('BlockingOverlayComponent', () => {
  it('does not render the overlay when inactive', () => {
    TestBed.configureTestingModule({ imports: [BlockingOverlayComponent] });
    const fixture = TestBed.createComponent(BlockingOverlayComponent);
    fixture.componentRef.setInput('active', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.app-blocking-overlay')).toBeNull();
  });

  it('renders overlay and locks body scroll when active and lockBodyScroll is true', () => {
    TestBed.configureTestingModule({ imports: [BlockingOverlayComponent] });
    const doc = TestBed.inject(DOCUMENT);
    const fixture = TestBed.createComponent(BlockingOverlayComponent);
    fixture.componentRef.setInput('active', true);
    fixture.componentRef.setInput('label', 'Working');
    fixture.componentRef.setInput('message', 'Please wait.');
    fixture.componentRef.setInput('lockBodyScroll', true);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.app-blocking-overlay') as HTMLElement | null;
    expect(overlay).not.toBeNull();
    expect(overlay?.querySelector('.app-blocking-overlay__icon-spin')?.classList.contains('animate-spin')).toBe(true);
    expect(overlay?.getAttribute('aria-busy')).toBe('true');
    expect(overlay?.textContent).toContain('Working');
    expect(overlay?.textContent).toContain('Please wait.');
    expect(doc.body.style.overflow).toBe('hidden');

    fixture.componentRef.setInput('active', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app-blocking-overlay')).toBeNull();
    expect(doc.body.style.overflow).toBe('');
  });
});
