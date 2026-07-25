import { CommonModule } from '@angular/common';
import { afterNextRender, Component, effect, ElementRef, inject, Injector, input, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { BlockingOverlayComponent } from '../../core/ui/blocking-overlay.component';
import { AppShellModalComponent } from '../../core/ui/app-shell-modal.component';
import { ToastService } from '../../core/ui/toast.service';
import { VaultService } from '../../core/vault/vault.service';
import { VAULT_UNLOCK_SECRET_MIN_LENGTH } from '../../core/vault/vault-unlock-policy';
import { WebCryptoService } from '../../core/vault/web-crypto.service';

/**
 * Tab-local vault unlock (fetch profile + derive key in browser). Used from the vault workspace and from the shell **Add**
 * entry when the vault is locked. Optional `heading` / `subtext` inputs tailor copy; defaults match decrypt-on-vault-page.
 *
 * Chrome: shared {@link AppShellModalComponent} + `.vault-unlock-*` in layout.css (doors + secure modal).
 *
 * The unlock secret field is reset whenever `open` changes so each open starts empty (no leftover from a prior session).
 * After a failed unlock attempt the field is cleared and refocused so the user can retry without re-opening the modal.
 */
@Component({
  selector: 'app-vault-quick-unlock-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppShellModalComponent, BlockingOverlayComponent],
  template: `
    <app-blocking-overlay
      [active]="unlockBusy()"
      label="Unlocking vault"
      message="Deriving keys with Argon2… This may take up to a minute. Please keep this tab open."
    />
    <app-shell-modal
      [open]="open()"
      titleId="vault-unlock-dialog-title"
      [heading]="heading()"
      [subtext]="subtext()"
      headerIcon="vault-lock"
      [showDoors]="true"
      closeAriaLabel="Close unlock dialog"
      (dismissed)="cancel()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" class="control-form-grid gap-4">
        <div>
          <label class="sr-only" for="vault-quick-unlock-secret">Vault unlock secret</label>
          <input
            #secretInput
            id="vault-quick-unlock-secret"
            class="vault-unlock-secret-input text-center"
            type="password"
            formControlName="unlock_secret"
            autocomplete="off"
            [disabled]="unlockBusy()"
          />
        </div>
        <div class="flex w-full items-center justify-center border-t border-app-border/80 pt-4">
          <button
            type="submit"
            class="control-btn-primary h-12 w-12 justify-center rounded-full p-0 shadow-lg"
            aria-label="Unlock vault"
            [disabled]="unlockBusy()"
          >
            <svg class="size-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 11V8a5 5 0 00-9.9-1M7 11h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z"
              />
            </svg>
            <span class="sr-only">Unlock vault</span>
          </button>
        </div>
      </form>
    </app-shell-modal>
  `,
})
export class VaultQuickUnlockDialogComponent {
  private readonly injector = inject(Injector);
  private readonly secretInput = viewChild<ElementRef<HTMLInputElement>>('secretInput');

  public readonly open = input(false);
  /** Modal title (e.g. decrypt workspace vs. continue to Add). */
  public readonly heading = input('Vault access');
  /** Supporting line under the title. */
  public readonly subtext = input(
    'Authenticate to decrypt items in this tab only. Your unlock secret never leaves the browser as plaintext.',
  );
  public readonly cancelled = output<void>();
  public readonly unlocked = output<void>();

  /** True while fetching profile or running Argon2 (full-screen overlay with accent spinner). */
  public readonly unlockBusy = signal(false);

  public readonly form;

  public constructor(
    private readonly fb: FormBuilder,
    private readonly vault: VaultService,
    private readonly crypto: WebCryptoService,
    private readonly toast: ToastService,
  ) {
    this.form = this.fb.group({
      unlock_secret: ['', [Validators.required, Validators.minLength(VAULT_UNLOCK_SECRET_MIN_LENGTH)]],
    });

    effect(() => {
      const isOpen = this.open();
      this.unlockBusy.set(false);
      this.form.reset({ unlock_secret: '' }, { emitEvent: false });
      this.form.markAsPristine();
      this.form.markAsUntouched();
      if (!isOpen) {
        return;
      }
      afterNextRender(
        () => {
          this.secretInput()?.nativeElement?.focus();
        },
        { injector: this.injector },
      );
    });
  }

  public cancel(): void {
    this.cancelled.emit();
  }

  public submit(): void {
    if (this.unlockBusy()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.unlockBusy.set(true);
    this.vault.getProfile().subscribe({
      next: async (response) => {
        let unlockFailed = false;
        try {
          await this.crypto.unlockVaultFromProfile(value.unlock_secret ?? '', response.profile);
          this.toast.success('Vault unlocked');
          this.unlocked.emit();
        } catch (error) {
          unlockFailed = true;
          const text = error instanceof Error ? error.message.trim() : '';
          this.toast.error(text !== '' ? text : 'Unlock failed. Check your vault unlock secret.');
        } finally {
          this.unlockBusy.set(false);
          if (unlockFailed) {
            this.clearUnlockSecretAndFocus();
          }
        }
      },
      error: () => {
        this.unlockBusy.set(false);
        this.toast.error('Unable to load vault profile');
        this.clearUnlockSecretAndFocus();
      },
    });
  }

  private clearUnlockSecretAndFocus(): void {
    const control = this.form.get('unlock_secret');
    control?.setValue('', { emitEvent: false });
    control?.markAsPristine();
    control?.markAsUntouched();
    afterNextRender(
      () => {
        this.secretInput()?.nativeElement?.focus();
      },
      { injector: this.injector },
    );
  }
}
