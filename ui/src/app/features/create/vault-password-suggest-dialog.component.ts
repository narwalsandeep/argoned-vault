import { Component, effect, input, output, signal } from '@angular/core';

import { AppShellModalComponent } from '../../core/ui/app-shell-modal.component';
import { generateStrongVaultItemPassword } from './generate-item-password';

/** Modal: preview a generated password; user confirms before it is written to the form field. */
@Component({
  selector: 'app-vault-password-suggest-dialog',
  standalone: true,
  imports: [AppShellModalComponent],
  template: `
    <app-shell-modal
      [open]="open()"
      titleId="vault-password-suggest-title"
      heading="Suggested password"
      subtext="Generated locally in your browser. Confirm to fill the password field — you can edit it before saving."
      headerIcon="none"
      bodyAlign="left"
      [showDoors]="false"
      closeAriaLabel="Close password suggestion"
      (dismissed)="onDismiss()"
    >
      <label class="control-field-label" for="vault-password-suggest-preview">Preview</label>
      <input
        id="vault-password-suggest-preview"
        class="control-field mt-2 w-full font-mono text-sm"
        type="text"
        readonly
        [value]="preview()"
        aria-describedby="vault-password-suggest-hint"
      />
      <p id="vault-password-suggest-hint" class="auth-info-text mt-2 text-sm">
        Shown in plain text so you can copy or verify before applying.
      </p>
      <div class="control-actions-row mt-6 border-t border-app-border/80 pt-4">
        <div class="control-actions-group">
          <button type="button" class="control-btn-secondary w-max" (click)="onRegenerate()">Regenerate</button>
          <button type="button" class="control-btn-primary w-max" (click)="onConfirm()">Use this password</button>
        </div>
      </div>
    </app-shell-modal>
  `,
})
export class VaultPasswordSuggestDialogComponent {
  public readonly open = input(false);

  public readonly dismissed = output<void>();
  public readonly confirmed = output<string>();

  public readonly preview = signal('');

  public constructor() {
    effect(() => {
      if (this.open()) {
        this.preview.set(generateStrongVaultItemPassword());
      }
    });
  }

  public onDismiss(): void {
    this.dismissed.emit();
  }

  public onRegenerate(): void {
    this.preview.set(generateStrongVaultItemPassword());
  }

  public onConfirm(): void {
    this.confirmed.emit(this.preview());
  }
}
