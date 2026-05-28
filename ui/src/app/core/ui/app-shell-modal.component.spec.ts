import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppShellModalComponent } from './app-shell-modal.component';

describe('AppShellModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellModalComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AppShellModalComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should emit dismissed when primary footer button is clicked', () => {
    const fixture = TestBed.createComponent(AppShellModalComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('useDefaultHeader', true);
    fixture.componentRef.setInput('titleId', 't1');
    fixture.componentRef.setInput('heading', 'Hi');
    fixture.componentRef.setInput('showPrimaryFooter', true);
    fixture.componentRef.setInput('primaryButtonLabel', 'OK');
    const spy = vi.spyOn(fixture.componentInstance.dismissed, 'emit');
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement).querySelector('button.control-btn-primary');
    btn?.dispatchEvent(new Event('click'));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
