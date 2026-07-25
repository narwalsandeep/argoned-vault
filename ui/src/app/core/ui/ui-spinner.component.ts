import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Inline loading indicator (accent / muted / current border). For full-viewport blocking jobs use
 * {@link BlockingOverlayComponent} instead.
 */
@Component({
  selector: 'app-ui-spinner',
  standalone: true,
  template: `
    <span
      class="inline-block shrink-0 animate-spin rounded-full border-2 border-t-transparent"
      [class.size-4]="size() === 'sm'"
      [class.size-5]="size() === 'md'"
      [class.size-6]="size() === 'lg'"
      [class.border-app-main-accent]="variant() === 'accent'"
      [class.border-app-text-muted]="variant() === 'muted'"
      [class.border-current]="variant() === 'current'"
      role="status"
      aria-live="polite"
      [attr.aria-label]="decorative() ? null : label()"
      [attr.aria-hidden]="decorative() ? true : null"
    ></span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiSpinnerComponent {
  /** Brand accent ring (default); use for primary loading feedback. */
  public readonly variant = input<'accent' | 'muted' | 'current'>('accent');
  public readonly size = input<'sm' | 'md' | 'lg'>('md');
  public readonly label = input('Loading');
  /** When true, hide from assistive tech (parent provides text). */
  public readonly decorative = input(false);
}
