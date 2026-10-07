import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { BlockingOverlayComponent } from '../../core/ui/blocking-overlay.component';
import { AppShellModalComponent } from '../../core/ui/app-shell-modal.component';
import { ToastService } from '../../core/ui/toast.service';
import { VaultFieldShareApiService } from '../../core/vault/vault-field-share-api.service';
import { VaultFieldShareCryptoService } from '../../core/vault/vault-field-share-crypto.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import {
  SHARE_DEFAULT_EXPIRY_HOURS,
  SHARE_EXPIRY_PRESETS,
  type VaultFieldSharePayload,
} from '../../core/vault/vault-field-share.constants';

export interface VaultFieldShareDialogContext {
  vaultItemId: string;
  itemType: string;
  fieldKey: string;
  fieldLabel: string;
  fieldValue: string;
}

@Component({
  selector: 'app-vault-field-share-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, AppShellModalComponent, RouterLink, BlockingOverlayComponent],
  template: `
    <app-blocking-overlay
      [active]="busy()"
      [label]="busyLabel()"
      [message]="busyMessage()"
    />
    <app-shell-modal
      [open]="open()"
      heading="Share field"
      subtext="One-time encrypted link"
      [bodyAlign]="'left'"
      [backdropLocked]="busy()"
      [dismissOnBackdrop]="!busy()"
      (dismissed)="onClose()"
    >
      @if (createdLink() === null) {
        <form class="control-form-grid share-create-form" novalidate (submit)="onCreateSubmit($event)">
          <p class="text-sm text-app-text-muted">
            Sharing <strong class="text-app-text">{{ context().fieldLabel }}</strong> from this item. Do not put secrets in the label.
          </p>
          <div class="share-create-result-field">
            <label class="share-create-result-label" for="share-label">Label (optional)</label>
            <input id="share-label" class="control-field" type="text" maxlength="200" [formControl]="labelControl" placeholder="Guest WiFi" />
          </div>
          <div class="share-create-result-field">
            <label class="share-create-result-label" for="share-expiry">Expires</label>
            <select id="share-expiry" class="control-field" [formControl]="expiryPresetControl">
              @for (preset of expiryPresets; track preset.id) {
                <option [value]="preset.id">{{ preset.label }}</option>
              }
            </select>
          </div>
          <p class="text-xs leading-relaxed text-app-text-muted">
            One-time link. After creating, copy manually or send the link and access code by email.
          </p>
          @if (errorMessage()) {
            <p class="text-sm text-app-main-accent" role="alert">{{ errorMessage() }}</p>
          }
          <div class="control-actions-row">
            <button type="button" class="control-btn-secondary w-max" [disabled]="busy()" (click)="onClose()">Cancel</button>
            <button type="submit" class="control-btn-primary w-max" [disabled]="busy()">
              {{ busy() ? 'Creating…' : 'Create share' }}
            </button>
          </div>
        </form>
      } @else {
        <div class="share-create-result control-form-grid">
          <div class="share-create-result-field">
            <label class="share-create-result-label" for="share-link-out">Link</label>
            <div class="share-create-result-row">
              <input id="share-link-out" class="share-create-result-input" type="text" readonly [value]="createdLink()!" />
              <button type="button" class="share-create-result-copy control-btn-secondary" (click)="copyText(createdLink()!, 'link')">
                Copy
              </button>
            </div>
          </div>
          <div class="share-create-result-field">
            <label class="share-create-result-label" for="share-code-out">Access code</label>
            <div class="share-create-result-row">
              <input
                id="share-code-out"
                class="share-create-result-input share-create-result-input--mono"
                type="text"
                readonly
                [value]="createdCode()!"
              />
              <button type="button" class="share-create-result-copy control-btn-secondary" (click)="copyText(createdCode()!, 'code')">
                Copy
              </button>
            </div>
          </div>

          <div class="share-create-result-field">
            <label class="share-create-result-label" for="share-recipient-email">Send by email</label>
            <div class="share-create-result-row">
              <input
                id="share-recipient-email"
                class="share-create-result-input"
                type="email"
                autocomplete="email"
                inputmode="email"
                maxlength="320"
                placeholder="recipient@example.com"
                [formControl]="recipientEmailControl"
              />
              <button
                type="button"
                class="share-create-result-copy control-btn-share whitespace-nowrap"
                [disabled]="emailBusy() || emailSent()"
                (click)="onSendEmail()"
              >
                @if (emailBusy()) {
                  Sending…
                } @else if (emailSent()) {
                  Sent
                } @else {
                  Send
                }
              </button>
            </div>
            @if (emailError()) {
              <p class="mt-2 text-sm text-app-main-accent" role="alert">{{ emailError() }}</p>
            } @else if (emailSent()) {
              <p class="mt-2 text-sm text-app-share" role="status">Email sent with the link, access code, and expiry details.</p>
            } @else {
              <p class="mt-2 text-xs leading-relaxed text-app-text-muted">
                The recipient gets a secure email with the redeem link, access code, and expiry. Delete it when they are done.
              </p>
            }
          </div>

          <p class="text-xs text-app-text-muted">
            Manage active shares in
            <a routerLink="/settings" [queryParams]="{ tab: 'shares' }" class="font-medium text-app-main-accent hover:underline" (click)="onClose()">Settings → Shared links</a>.
          </p>
          <div class="control-actions-row">
            <button type="button" class="control-btn-primary w-max" (click)="onClose()">Done</button>
          </div>
        </div>
      }
    </app-shell-modal>
  `,
})
export class VaultFieldShareDialogComponent {
  public readonly open = input.required<boolean>();
  public readonly context = input.required<VaultFieldShareDialogContext>();
  public readonly closed = output<void>();

  private readonly shareApi = inject(VaultFieldShareApiService);
  private readonly shareCrypto = inject(VaultFieldShareCryptoService);
  private readonly crypto = inject(WebCryptoService);
  private readonly toast = inject(ToastService);

  public readonly expiryPresets = SHARE_EXPIRY_PRESETS;
  public readonly labelControl = new FormControl('', { nonNullable: true });
  public readonly expiryPresetControl = new FormControl('48h', { nonNullable: true });
  public readonly recipientEmailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email, Validators.maxLength(320)],
  });

  public readonly busy = signal(false);
  public readonly busyLabel = signal('Creating share link');
  public readonly busyMessage = signal('Encrypting this field for a one-time link. This is not a vault unlock step.');
  public readonly errorMessage = signal<string | null>(null);
  public readonly createdLink = signal<string | null>(null);
  public readonly createdCode = signal<string | null>(null);
  public readonly createdShareId = signal<string | null>(null);
  public readonly emailBusy = signal(false);
  public readonly emailSent = signal(false);
  public readonly emailError = signal<string | null>(null);

  /** Field value captured when the dialog opens; create uses this snapshot only (no re-decrypt / unlock). */
  private readonly snapshottedFieldValue = signal('');
  private dialogOpenSession = false;

  public constructor() {
    effect(() => {
      const isOpen = this.open();
      if (isOpen && !this.dialogOpenSession) {
        this.dialogOpenSession = true;
        this.snapshottedFieldValue.set(this.context().fieldValue);
        this.labelControl.reset('');
        this.expiryPresetControl.setValue('48h');
        this.recipientEmailControl.reset('');
        this.errorMessage.set(null);
        this.createdLink.set(null);
        this.createdCode.set(null);
        this.createdShareId.set(null);
        this.emailBusy.set(false);
        this.emailSent.set(false);
        this.emailError.set(null);
      }
      if (!isOpen) {
        this.dialogOpenSession = false;
      }
    });
  }

  public onClose(): void {
    if (this.busy() || this.emailBusy()) {
      return;
    }
    this.resetState();
    this.closed.emit();
  }

  public onCreateSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.onCreate();
  }

  public async onCreate(): Promise<void> {
    if (this.busy()) {
      return;
    }

    const ctx = this.context();
    const fieldValue = this.snapshottedFieldValue().trim();
    if (fieldValue === '') {
      this.errorMessage.set('Nothing to share for this field.');
      return;
    }

    const preset = SHARE_EXPIRY_PRESETS.find((p) => p.id === this.expiryPresetControl.value)
      ?? SHARE_EXPIRY_PRESETS.find((p) => p.hours === SHARE_DEFAULT_EXPIRY_HOURS)!;
    const expiresAt = new Date(Date.now() + preset.hours * 60 * 60 * 1000).toISOString();
    const accessCode = this.shareCrypto.generateAccessCode();

    this.crypto.noteActivity();
    this.busyLabel.set('Creating share link');
    this.busyMessage.set('Encrypting this field for a one-time link. This is not a vault unlock step.');
    this.busy.set(true);
    this.errorMessage.set(null);

    try {
      const prepared = await firstValueFrom(
        this.shareApi.prepare({
          vault_item_id: ctx.vaultItemId,
          field_key: ctx.fieldKey,
          label: this.labelControl.value.trim() || null,
          expires_at: expiresAt,
          max_views: 1,
        }),
      );

      const payload: VaultFieldSharePayload = {
        v: 1,
        field_key: ctx.fieldKey,
        field_label: ctx.fieldLabel,
        item_type: ctx.itemType,
        value: fieldValue,
      };

      const blob = await this.shareCrypto.encryptFieldShare(
        accessCode,
        prepared.share_id,
        prepared.expires_at,
        payload,
      );

      const finalized = await firstValueFrom(this.shareApi.finalize(prepared.share_id, blob));
      this.createdShareId.set(finalized.share_id);
      this.createdLink.set(finalized.redeem_url);
      this.createdCode.set(accessCode);
    } catch {
      this.errorMessage.set('Unable to create share. Check your connection and try again.');
    } finally {
      this.busy.set(false);
    }
  }

  public async onSendEmail(): Promise<void> {
    if (this.emailBusy() || this.emailSent()) {
      return;
    }

    this.recipientEmailControl.markAsTouched();
    if (this.recipientEmailControl.invalid) {
      this.emailError.set('Enter a valid recipient email address.');
      return;
    }

    const shareId = this.createdShareId();
    const accessCode = this.createdCode();
    if (shareId === null || accessCode === null) {
      this.emailError.set('Create the share link first.');
      return;
    }

    this.emailBusy.set(true);
    this.emailError.set(null);

    try {
      await firstValueFrom(
        this.shareApi.notifyEmail(shareId, {
          recipient_email: this.recipientEmailControl.value.trim(),
          access_code: accessCode,
        }),
      );
      this.emailSent.set(true);
      this.toast.success('Share email sent');
    } catch (err: unknown) {
      this.emailError.set(this.emailErrorMessage(err));
    } finally {
      this.emailBusy.set(false);
    }
  }

  public async copyText(text: string, kind: 'link' | 'code'): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success(kind === 'link' ? 'Link copied' : 'Access code copied');
    } catch {
      this.toast.error('Unable to copy');
    }
  }

  private emailErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const code =
        typeof err.error === 'object' && err.error !== null && 'error' in err.error
          ? String((err.error as { error: unknown }).error)
          : null;
      switch (code) {
        case 'invalid_recipient_email':
          return 'Enter a valid recipient email address.';
        case 'invalid_access_code':
          return 'Access code is invalid. Copy it again from above.';
        case 'share_not_available':
          return 'This share is no longer active.';
        case 'email_not_verified':
          return 'Verify your account email before sending share invitations.';
        case 'share_notify_rate_limited':
          return 'Too many share emails sent. Wait a few minutes and try again.';
        case 'share_email_failed':
          return 'Could not send email. Try again later.';
        case 'email_delivery_not_configured':
          return 'Email delivery is not configured on this server.';
        default:
          break;
      }
    }
    return 'Could not send email. Check your connection and try again.';
  }

  private resetState(): void {
    this.snapshottedFieldValue.set('');
    this.labelControl.reset('');
    this.expiryPresetControl.setValue('48h');
    this.recipientEmailControl.reset('');
    this.busy.set(false);
    this.busyLabel.set('Creating share link');
    this.busyMessage.set('Encrypting this field for a one-time link. This is not a vault unlock step.');
    this.errorMessage.set(null);
    this.createdLink.set(null);
    this.createdCode.set(null);
    this.createdShareId.set(null);
    this.emailBusy.set(false);
    this.emailSent.set(false);
    this.emailError.set(null);
  }
}
