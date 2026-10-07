import { Component, inject, input, signal } from '@angular/core';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';

import { VaultPasswordSuggestDialogComponent } from './vault-password-suggest-dialog.component';

/** Password form control with suggest-strong-password action (create + inline edit). */
@Component({
  selector: 'app-vault-form-password-field',
  standalone: true,
  imports: [ReactiveFormsModule, VaultPasswordSuggestDialogComponent],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  template: `
    <div class="control-split">
      <label class="control-split-label" [for]="resolvedDomId()">{{ label() }}</label>
      <div class="control-password-field-row">
        <input
          [id]="resolvedDomId()"
          [type]="revealed() ? 'text' : 'password'"
          [formControlName]="fieldKey()"
          [placeholder]="placeholder()"
          [attr.autocomplete]="autocomplete() ?? null"
          class="control-split-input control-password-field-row__input"
        />
        <button
          type="button"
          class="control-password-field-row__btn"
          [attr.aria-label]="'Suggest strong password for ' + label()"
          title="Suggest strong password"
          (click)="openSuggest()"
        >
          <svg class="size-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
        </button>
      </div>
    </div>

    <app-vault-password-suggest-dialog
      [open]="suggestOpen()"
      (dismissed)="closeSuggest()"
      (confirmed)="applySuggested($event)"
    />
  `,
})
export class VaultFormPasswordFieldComponent {
  public readonly fieldKey = input.required<string>();
  public readonly label = input.required<string>();
  public readonly placeholder = input('');
  public readonly autocomplete = input<string | undefined>(undefined);
  public readonly domId = input<string | undefined>(undefined);

  public readonly suggestOpen = signal(false);
  public readonly revealed = signal(false);

  private readonly controlContainer = inject(ControlContainer);

  public openSuggest(): void {
    this.suggestOpen.set(true);
  }

  public closeSuggest(): void {
    this.suggestOpen.set(false);
  }

  public applySuggested(password: string): void {
    const control = this.controlContainer.control?.get(this.fieldKey());
    control?.setValue(password);
    control?.markAsDirty();
    this.revealed.set(true);
    this.suggestOpen.set(false);
  }

  protected resolvedDomId(): string {
    return this.domId() ?? this.fieldKey();
  }
}
