import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { AppShellModalComponent } from '../../core/ui/app-shell-modal.component';
import { ToastService } from '../../core/ui/toast.service';
import { VaultSessionService } from '../../core/vault/vault-session.service';
import { VaultService, type VaultItemPayload } from '../../core/vault/vault.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';

/** Step 0 = closed; 1 = warnings + checkboxes; 2 = account password + final delete. */
type EraseModalStep = 0 | 1 | 2;

@Component({
  selector: 'app-vault-erase-data',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppShellModalComponent],
  template: `
    <section class="settings-section-card">
      <h2 class="tab-panel-heading">
        <span class="tab-panel-heading-title">Erase all vault items</span>
        <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
        <span class="tab-panel-heading-kicker text-app-main-accent">Irreversible</span>
      </h2>
      <p class="mt-2 max-w-3xl text-sm leading-relaxed text-app-text-muted">
        This removes <strong class="font-medium text-app-text">every encrypted item</strong> stored for your account on the
        server (soft delete). You will <strong class="font-medium text-app-text">not</strong> be able to restore them from this
        product. Use your
        <strong class="font-medium text-app-text">Emergency Kit / recovery flow</strong> only if you designed recovery that
        way; routine “undo” is not available here.
      </p>
      <p class="mt-3 max-w-3xl text-sm leading-relaxed text-app-text-muted">
        Download a JSON file of <strong class="font-medium text-app-text">decrypted</strong> item payloads first (vault must be
        unlocked in this tab). That file is sensitive; store it safely. The final step asks for your
        <strong class="font-medium text-app-text">account password</strong> (the one you use to sign in), not your vault unlock
        secret.
      </p>

      <div class="mt-6 flex flex-col gap-3 border-t border-app-border/60 pt-6 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          class="control-btn-secondary w-full justify-center sm:w-max"
          (click)="downloadVaultJsonExport()"
          [disabled]="exportBusy() || deleteAllBusy()"
        >
          @if (exportBusy()) {
            <span>Preparing export…</span>
          } @else {
            <span>Download vault as JSON</span>
          }
        </button>
        <button
          type="button"
          class="control-btn-danger w-full justify-center sm:w-max"
          (click)="openEraseModalStep1()"
          [disabled]="deleteAllBusy()"
        >
          Delete all items…
        </button>
      </div>
      @if (!vaultSession.isUnlocked()) {
        <p class="mt-3 text-xs text-app-text-muted">Unlock the vault in this tab to export readable JSON.</p>
      }
    </section>

    <app-shell-modal
      [open]="eraseModalStep() !== 0"
      [useDefaultHeader]="false"
      [ariaLabelledBy]="eraseModalStep() === 1 ? 'vault-erase-step1-title' : eraseModalStep() === 2 ? 'vault-erase-step2-title' : null"
      bodyAlign="left"
      closeAriaLabel="Close dialog"
      [backdropLocked]="deleteAllBusy()"
      (dismissed)="closeEraseModals()"
    >
      @if (eraseModalStep() === 1) {
        <h2 id="vault-erase-step1-title" class="vault-unlock-modal-title text-center">Delete everything?</h2>
        <p class="vault-unlock-modal-sub mx-auto mt-2 max-w-md text-center">
          You are about to remove all vault items from the server for this account. This is meant for a full reset or when you are
          sure copies exist outside Argoned.
        </p>
        <ul class="mt-4 list-disc space-y-2 pl-5 text-sm text-app-text-muted">
          <li>There is no “restore deleted items” in the app.</li>
          <li>Wrong account password on the next step will cancel the delete.</li>
          <li>Use <strong class="text-app-text">Download vault as JSON</strong> above if you want a local backup.</li>
        </ul>
        <div class="mt-5 space-y-3 rounded-xl border border-app-border/80 bg-app-bg/50 px-4 py-3">
          <label class="flex cursor-pointer items-start gap-3 text-sm text-app-text">
            <input type="checkbox" class="mt-0.5" [checked]="riskAck()" (change)="riskAck.set($any($event.target).checked)" />
            <span>I understand these items will be gone from Argoned and I cannot undo that here.</span>
          </label>
          <label class="flex cursor-pointer items-start gap-3 text-sm text-app-text">
            <input
              type="checkbox"
              class="mt-0.5"
              [checked]="backupAck()"
              (change)="backupAck.set($any($event.target).checked)"
            />
            <span>
              I have downloaded the JSON export, or I accept continuing
              <strong class="font-medium">without</strong> a backup file.
            </span>
          </label>
        </div>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="control-btn-secondary min-h-0 px-4 py-2.5 text-sm" (click)="closeEraseModals()">
            Cancel
          </button>
          <button
            type="button"
            class="control-btn-primary min-h-0 px-4 py-2.5 text-sm"
            [disabled]="!riskAck() || !backupAck()"
            (click)="goEraseStep2()"
          >
            Continue
          </button>
        </div>
      } @else {
        <h2 id="vault-erase-step2-title" class="vault-unlock-modal-title text-center">Confirm with account password</h2>
        <p class="vault-unlock-modal-sub mx-auto mt-2 max-w-md text-center">
          Enter the password you use to <strong class="font-medium text-app-text">sign in to Argoned</strong> (not your vault
          unlock secret). The server checks it once, then deletes all items.
        </p>
        <form class="mt-5 space-y-4" [formGroup]="accountPasswordForm" (ngSubmit)="submitDeleteAll()">
          <div>
            <label class="mb-2 block text-sm font-medium text-app-text" for="vault-erase-account-password">Account password</label>
            <input
              id="vault-erase-account-password"
              type="password"
              class="control-field box-border w-full"
              formControlName="account_password"
              autocomplete="current-password"
            />
          </div>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button type="button" class="control-btn-secondary min-h-0 px-4 py-2.5 text-sm" (click)="backToEraseStep1()">
              Back
            </button>
            <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
              <button type="button" class="control-btn-secondary min-h-0 px-4 py-2.5 text-sm" (click)="closeEraseModals()">
                Cancel
              </button>
              <button
                type="submit"
                class="control-btn-danger min-h-0 px-4 py-2.5 text-sm"
                [disabled]="deleteAllBusy() || accountPasswordForm.invalid"
              >
                @if (deleteAllBusy()) {
                  <span>Deleting…</span>
                } @else {
                  <span>Delete all items now</span>
                }
              </button>
            </div>
          </div>
        </form>
      }
    </app-shell-modal>
  `,
})
export class VaultEraseDataComponent {
  public readonly vaultItemsCleared = output<void>();

  public readonly vaultSession = inject(VaultSessionService);
  private readonly vault = inject(VaultService);
  private readonly crypto = inject(WebCryptoService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  public readonly eraseModalStep = signal<EraseModalStep>(0);
  public readonly riskAck = signal(false);
  public readonly backupAck = signal(false);
  public readonly exportBusy = signal(false);
  public readonly deleteAllBusy = signal(false);

  public readonly accountPasswordForm = this.fb.nonNullable.group({
    account_password: ['', [Validators.required, Validators.minLength(1)]],
  });

  public openEraseModalStep1(): void {
    this.riskAck.set(false);
    this.backupAck.set(false);
    this.accountPasswordForm.reset({ account_password: '' });
    this.eraseModalStep.set(1);
  }

  public closeEraseModals(): void {
    if (this.deleteAllBusy()) {
      return;
    }
    this.eraseModalStep.set(0);
    this.riskAck.set(false);
    this.backupAck.set(false);
    this.accountPasswordForm.reset({ account_password: '' });
  }

  public goEraseStep2(): void {
    if (!this.riskAck() || !this.backupAck()) {
      return;
    }
    this.eraseModalStep.set(2);
  }

  public backToEraseStep1(): void {
    if (this.deleteAllBusy()) {
      return;
    }
    this.eraseModalStep.set(1);
  }

  public async downloadVaultJsonExport(): Promise<void> {
    if (!this.vaultSession.isUnlocked()) {
      this.toast.error('Unlock your vault in this tab to export decrypted JSON.');
      return;
    }
    this.exportBusy.set(true);
    try {
      const list = await firstValueFrom(this.vault.listItems());
      const items: unknown[] = [];
      for (const meta of list) {
        const res = await firstValueFrom(this.vault.getItem(meta.id));
        const payload = res.item as unknown as VaultItemPayload;
        this.crypto.noteActivity();
        const plaintext = await this.crypto.decryptItemPayload(payload);
        items.push({
          id: meta.id,
          item_type: meta.item_type,
          crypto_version: meta.crypto_version,
          searchable_words: meta.searchable_words ?? null,
          plaintext,
        });
      }
      const bundle = {
        export_version: 1,
        exported_at: new Date().toISOString(),
        item_count: items.length,
        items,
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.toast.success(items.length ? `Downloaded ${String(items.length)} item(s).` : 'Downloaded empty export.');
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      this.exportBusy.set(false);
    }
  }

  public async submitDeleteAll(): Promise<void> {
    if (this.deleteAllBusy() || this.accountPasswordForm.invalid) {
      this.accountPasswordForm.markAllAsTouched();
      return;
    }
    const pwd = this.accountPasswordForm.getRawValue().account_password;
    this.deleteAllBusy.set(true);
    try {
      const res = await firstValueFrom(this.vault.deleteAllVaultItems(pwd));
      const n = typeof res.deleted_count === 'number' ? res.deleted_count : 0;
      this.toast.success(n > 0 ? `Deleted ${String(n)} item(s).` : 'No items to delete.');
      this.closeEraseModals();
      this.vaultItemsCleared.emit();
    } catch (e: unknown) {
      const msg = this.apiErrorMessage(e);
      this.toast.error(msg ?? 'Could not delete all items');
    } finally {
      this.deleteAllBusy.set(false);
    }
  }

  private apiErrorMessage(err: unknown): string | null {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { error?: string } | null;
      if (body?.error === 'invalid_account_password') {
        return 'Account password was not accepted. Try again.';
      }
      if (body?.error === 'account_password_required') {
        return 'Account password is required.';
      }
      if (typeof body?.error === 'string') {
        return body.error;
      }
    }
    return null;
  }
}
