import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { CredentialFormComponent } from '../create/credential-form/credential-form.component';
import { SimpleVaultItemFormComponent } from '../create/simple-vault-item-form/simple-vault-item-form.component';
import { AppShellModalComponent } from '../../core/ui/app-shell-modal.component';
import { ToastService } from '../../core/ui/toast.service';
import { VaultSessionService } from '../../core/vault/vault-session.service';
import { VaultService, type VaultItemPayload, type VaultListItemsQuery } from '../../core/vault/vault.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { vaultItemListLabel } from './vault-item-display';
import { VaultItemCategoryIconComponent } from './vault-item-category-icon.component';
import { ChangeVaultItemTypeWizardComponent } from './change-vault-item-type/change-vault-item-type-wizard.component';
import type { ChangeVaultItemTypeWizardContext } from './change-vault-item-type/change-vault-item-type-targets';
import { VaultFileAttachmentsComponent } from './vault-file-attachments.component';
import {
  classifyVaultItemForEdit,
  type VaultInlineEditPayload,
} from './vault-item-edit-support';
import type { VaultItemListEntry } from './vault-list-search';
import { vaultFieldKeyLooksLikePassword } from './vault-password-weak';

export type { VaultItemListEntry, VaultListSearchOptions } from './vault-list-search';
export {
  parseVaultListSearchTokens,
  tokenizeVaultListSearchQuery,
  vaultListEntryMatchesSearchTokens,
} from './vault-list-search';

/** Ascending by `display_number`; entries without a number sort last; tie-break by `id`. Exported for tests. */
export function sortVaultItemListEntriesByDisplayNumber(entries: readonly VaultItemListEntry[]): VaultItemListEntry[] {
  return [...entries].sort((a, b) => {
    const an = a.display_number ?? Number.MAX_SAFE_INTEGER;
    const bn = b.display_number ?? Number.MAX_SAFE_INTEGER;
    if (an !== bn) {
      return an - bn;
    }
    return a.id.localeCompare(b.id);
  });
}

export type DecryptedDetailRow = { key: string; value: string };

/** Flattens decrypted JSON for display: nested objects use dotted keys; arrays and scalars as one row each. Skips empty values. */
export function flattenDecryptedPayloadForDisplay(obj: Record<string, unknown> | null): DecryptedDetailRow[] {
  if (obj === null || typeof obj !== 'object') {
    return [];
  }
  return flattenDecryptedRecursive(obj, '');
}

function flattenDecryptedRecursive(obj: Record<string, unknown>, prefix: string): DecryptedDetailRow[] {
  const rows: DecryptedDetailRow[] = [];
  for (const [k, raw] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (raw === null || raw === undefined) {
      continue;
    }
    if (typeof raw === 'string' && raw.trim() === '') {
      continue;
    }
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
      const nested = raw as Record<string, unknown>;
      if (Object.keys(nested).length === 0) {
        continue;
      }
      rows.push(...flattenDecryptedRecursive(nested, path));
      continue;
    }
    if (Array.isArray(raw) && raw.length === 0) {
      continue;
    }
    let value: string;
    if (Array.isArray(raw) || (typeof raw === 'object' && raw !== null)) {
      value = JSON.stringify(raw);
    } else {
      value = String(raw);
    }
    if (value.trim() === '') {
      continue;
    }
    rows.push({ key: path, value });
  }
  return rows;
}

/** Masks each Unicode code point with `*` for vault detail rows (default hidden state). Exported for tests. */
export function maskVaultDetailValue(value: string): string {
  if (value === '') {
    return '';
  }
  return [...value].map(() => '*').join('');
}

@Component({
  selector: 'app-vault-encrypted-items',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    VaultItemCategoryIconComponent,
    SimpleVaultItemFormComponent,
    CredentialFormComponent,
    AppShellModalComponent,
    ChangeVaultItemTypeWizardComponent,
    VaultFileAttachmentsComponent,
  ],
  host: { class: 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col' },
  template: `
    <div class="vault-encrypted-items-page">
      @if (showVaultListChrome()) {
        <div class="vault-encrypted-items-search-shell" role="search" aria-label="Filter encrypted items">
          <div class="vault-encrypted-items-search-row">
            <label class="sr-only" for="vault-items-search">Search vault items</label>
            <input
              id="vault-items-search"
              type="search"
              class="control-field vault-items-search-input min-w-0 flex-1"
              placeholder="Search or type #ID"
              autocomplete="off"
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
            />
            <div class="vault-encrypted-items-search-filters" aria-label="Search options">
              <div class="vault-search-filter">
                <span class="vault-search-filter-label" id="vault-search-full-word-label">Full word</span>
                <div class="vault-search-filter-toggle-group" role="group" aria-labelledby="vault-search-full-word-label">
                  <button
                    type="button"
                    class="control-tab"
                    [class.control-tab--active]="!searchFullWord()"
                    [attr.aria-pressed]="!searchFullWord()"
                    (click)="setSearchFullWord(false)"
                  >
                    Off
                  </button>
                  <button
                    type="button"
                    class="control-tab"
                    [class.control-tab--active]="searchFullWord()"
                    [attr.aria-pressed]="searchFullWord()"
                    (click)="setSearchFullWord(true)"
                  >
                    On
                  </button>
                </div>
              </div>
              <div class="vault-search-filter">
                <span class="vault-search-filter-label" id="vault-search-case-label">Match case</span>
                <div class="vault-search-filter-toggle-group" role="group" aria-labelledby="vault-search-case-label">
                  <button
                    type="button"
                    class="control-tab"
                    [class.control-tab--active]="!searchCaseSensitive()"
                    [attr.aria-pressed]="!searchCaseSensitive()"
                    (click)="setSearchCaseSensitive(false)"
                  >
                    Off
                  </button>
                  <button
                    type="button"
                    class="control-tab"
                    [class.control-tab--active]="searchCaseSensitive()"
                    [attr.aria-pressed]="searchCaseSensitive()"
                    (click)="setSearchCaseSensitive(true)"
                  >
                    On
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
      <div
        class="app-vault-encrypted-items-grid"
        [class.app-vault-encrypted-items-grid--split]="showVaultListChrome()"
      >
        <div
          class="flex h-full min-h-0 min-w-0 flex-col"
          [ngClass]="{ 'lg:col-span-12': items().length === 0 && !searchIsActive(), 'lg:col-span-4': items().length > 0 || searchIsActive() }"
        >
          <section
            class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm"
            aria-label="Encrypted items list"
          >
            <div
              class="vault-encrypted-items-scroll scroll-themed flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2.5 pt-2 pb-1.5"
            >
          @if (items().length === 0 && !searchIsActive()) {
            <div class="vault-empty-state" role="status" aria-live="polite">
              <div class="vault-empty-state-panel">
                <div class="vault-empty-state-icon" aria-hidden="true">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="M9 12h6" />
                    <path d="M12 9v6" />
                  </svg>
                </div>
                <p class="vault-empty-state-kicker">Client-side ciphertext store</p>
                <h2 class="vault-empty-state-title">No encrypted rows indexed</h2>
                <p class="vault-empty-state-body">
                  With the vault unlocked in this tab, the API only ever sees opaque blobs. Add an entry from the sidebar
                  <strong class="font-medium text-app-text">+</strong> (top of the left rail): labels and payloads are wrapped with
                  per-item keys in the browser before anything hits the list you search below.
                </p>
                <div class="vault-empty-state-meta" aria-label="Vault crypto snapshot">
                  <span>items: 0</span>
                  <span>AES-256-GCM</span>
                  <span>Argon2id unlock</span>
                </div>
                <a
                  routerLink="/new"
                  class="control-btn-primary mt-8 inline-flex w-full max-w-xs justify-center shadow-md sm:w-auto"
                >
                  <svg class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create an item</span>
                </a>
              </div>
            </div>
          } @else if (items().length === 0 && searchIsActive()) {
            <div
              class="mx-1 rounded-xl border border-dashed border-app-border bg-app-bg/60 px-4 py-6 text-center text-sm text-app-text-muted"
            >
              No items match <strong class="text-app-text">“{{ searchQuery().trim() }}”</strong>. Try another search or clear the filter.
            </div>
          } @else {
            <ul class="vault-encrypted-items-list" role="list">
              @for (item of items(); track item.id) {
                <li class="min-w-0" role="listitem">
                  <button
                    type="button"
                    class="vault-encrypted-items-list-tile w-full rounded-xl border px-2 py-2 text-left shadow-sm transition duration-200 hover:border-app-border hover:shadow-md"
                    [class.border-app-main-accent]="selectedId() === item.id"
                    [class.ring-1]="selectedId() === item.id"
                    [class.ring-app-focus/35]="selectedId() === item.id"
                    [class.bg-app-bg]="selectedId() !== item.id"
                    [class.border-app-border]="selectedId() !== item.id"
                    [class.bg-app-main-accent/10]="selectedId() === item.id"
                    [attr.title]="listRowTitle(item)"
                    (click)="onSelectItem(item.id)"
                  >
                    <div class="flex w-full min-w-0 items-start gap-2">
                      <span
                        class="inline-flex shrink-0 items-center justify-center self-center"
                        [class.text-app-main-accent]="vaultSession.isUnlocked()"
                        [class.text-app-text-muted]="!vaultSession.isUnlocked()"
                        [attr.aria-label]="vaultSession.isUnlocked() ? 'Vault unlocked in this tab' : 'Vault locked'"
                      >
                        @if (vaultSession.isUnlocked()) {
                          <svg
                            class="size-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 9.9 -1" />
                          </svg>
                        } @else {
                          <svg
                            class="size-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        }
                      </span>
                      <div class="min-w-0 flex-1">
                        <div class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          @if (item.display_number !== undefined) {
                            <span class="vault-item-display-id-badge vault-item-display-id-badge--list">#{{ item.display_number }}</span>
                          }
                          <p class="min-w-0 break-words font-medium leading-snug text-app-text">{{ rowLabel(item) }}</p>
                        </div>
                      </div>
                    </div>
                    @if (listItemSearchableWordsLine(item); as kw) {
                      <p class="w-full truncate text-xs text-app-text-muted" [attr.title]="kw">{{ kw }}</p>
                    }
                  </button>
                </li>
              }
            </ul>
          }
            </div>
          </section>
        </div>

        @if (items().length > 0) {
          <section
            class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm lg:col-span-8"
            aria-label="Decrypted item detail"
          >
            <div
              class="vault-encrypted-items-scroll scroll-themed flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto p-6"
            >
            @if (!selectedId()) {
              <div class="flex flex-1 flex-col items-center justify-center">
                <div class="max-w-md rounded-2xl border border-app-border/90 bg-app-elevated/25 px-8 py-10 text-center">
                  <div
                    class="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-app-main-accent/10 text-app-main-accent"
                    aria-hidden="true"
                  >
                    <svg class="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <p class="text-lg font-semibold tracking-tight text-app-text">Your vault is ready</p>
                  <p class="mt-3 text-sm leading-relaxed text-app-text-muted">
                    Select an item in the list to decrypt it here. Use the + icon at the top of the left sidebar to add more;
                    each item keeps the category color you chose when you created it.
                  </p>
                </div>
              </div>
            } @else if (selectedItemDecrypted()) {
              @if (detailViewMode() === 'edit' && vaultInlineEditModel(); as vm) {
                @if (selectedItemEditKind(); as ek) {
                    @if (ek.category === 'simple') {
                      <app-simple-vault-item-form
                        formLayout="inline"
                        [vaultInlineEdit]="vm"
                        [vaultInlineSimpleKind]="ek.kind"
                        (vaultInlineEditCancel)="exitEditMode()"
                        (vaultInlineEditSaved)="onVaultItemInlineSaved()"
                        (vaultInlineEditDelete)="openDeleteItemConfirm(vm.itemId)"
                        (vaultInlineEditChangeType)="openChangeTypeWizard()"
                      />
                      @if (ek.kind === 'file' && selectedId(); as editFileVaultId) {
                        <app-vault-file-attachments [vaultItemId]="editFileVaultId" [allowFileRemove]="true" />
                      }
                    } @else if (ek.category === 'credential') {
                      <app-credential-form
                        formLayout="inline"
                        [vaultInlineEdit]="vm"
                        [vaultInlineCredentialSubtype]="ek.subtype"
                        (vaultInlineEditCancel)="exitEditMode()"
                        (vaultInlineEditSaved)="onVaultItemInlineSaved()"
                        (vaultInlineEditDelete)="openDeleteItemConfirm(vm.itemId)"
                        (vaultInlineEditChangeType)="openChangeTypeWizard()"
                      />
                    }
                }
              } @else {
              <div class="flex flex-col gap-5">
                @if (selectedEntry(); as row) {
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex min-w-0 flex-1 items-start gap-3">
                      <app-vault-item-category-icon [itemType]="row.item_type" />
                      <div class="min-w-0 flex-1 pt-0.5">
                        <p
                          class="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 break-words leading-snug"
                        >
                          <span class="shrink-0 text-base font-semibold text-app-text">{{ rowLabel(row) }}</span>
                          @if (row.display_number !== undefined) {
                            <span class="shrink-0 text-xs font-semibold text-app-text-muted">#{{ row.display_number }}</span>
                          }
                          <span class="shrink-0 text-app-text-muted/80" aria-hidden="true">.</span>
                          <span
                            class="min-w-0 max-w-full flex-1 truncate font-mono text-sm font-normal text-app-text-muted"
                            [attr.title]="row.id"
                            >{{ row.id }}</span
                          >
                        </p>
                      </div>
                    </div>
                    @if (selectedItemEditKind(); as editKind) {
                      @if (editKind.category !== 'unsupported') {
                        <button type="button" class="control-btn-secondary shrink-0" (click)="enterEditMode()">Edit</button>
                      }
                    }
                  </div>
                }
                @if (selectedItemSearchableWords(); as sw) {
                  <section class="vault-item-detail-body" aria-label="Searchable words from server">
                    <h3 class="vault-item-detail-heading vault-item-detail-heading--with-kicker">
                      <span class="min-w-0 shrink-0">Searchable words</span>
                      <span class="text-app-text-muted/70" aria-hidden="true">.</span>
                      <span class="min-w-0 vault-item-detail-heading-kicker">Not encrypted · server only</span>
                    </h3>
                    <p
                      class="px-3 py-3 text-sm leading-relaxed text-app-text whitespace-pre-wrap break-words sm:px-4"
                    >
                      {{ sw }}
                    </p>
                  </section>
                }
                @if (isSelectedFileVaultItem()) {
                  <section class="vault-item-detail-body" aria-label="File vault details">
                    <h3 class="vault-item-detail-heading">Title &amp; notes</h3>
                    @if (fileVaultTitleNotesRows().length === 0) {
                      <p class="px-4 py-4 text-sm text-app-text-muted">No title or notes in this item.</p>
                    } @else {
                      <ul class="m-0 list-none p-0" role="list">
                        @for (row of fileVaultTitleNotesRows(); track row.key) {
                          <li
                            class="vault-item-detail-row"
                            [class.vault-item-detail-row--copy-flash]="detailRowCopyFlashingKey() === row.key"
                            role="listitem"
                          >
                            <div
                              class="vault-item-detail-row-main vault-item-detail-row-main--copyable"
                              role="button"
                              tabindex="0"
                              [attr.title]="detailRowCopyHint(row.key)"
                              [attr.aria-label]="detailRowCopyHint(row.key)"
                              (click)="copyDetailValue(row.value, row.key)"
                              (keydown.enter)="copyDetailValue(row.value, row.key)"
                              (keydown.space)="onDetailRowCopySpace($event, row.value, row.key)"
                            >
                              <div class="vault-item-detail-key">{{ formatDetailLabel(row.key) }}</div>
                              <div class="vault-item-detail-value">{{ detailValueDisplay(row) }}</div>
                            </div>
                            <div class="vault-item-detail-actions">
                              @if (showWeakPasswordLabel(row)) {
                                <span class="vault-item-detail-weak-pw" role="status">
                                  <svg class="vault-item-detail-weak-pw-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path
                                      fill-rule="evenodd"
                                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                                      clip-rule="evenodd"
                                    />
                                  </svg>
                                  Weak
                                </span>
                              }
                              <button
                                type="button"
                                class="vault-item-detail-copy"
                                [attr.aria-label]="
                                  detailFieldIsRevealed(row.key)
                                    ? 'Hide ' + formatDetailLabel(row.key)
                                    : 'Show ' + formatDetailLabel(row.key)
                                "
                                [attr.aria-pressed]="detailFieldIsRevealed(row.key)"
                                (click)="toggleDetailFieldReveal(row.key); $event.stopPropagation()"
                              >
                                @if (detailFieldIsRevealed(row.key)) {
                                  <svg class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                                    />
                                  </svg>
                                } @else {
                                  <svg class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                    />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                }
                              </button>
                              <button
                                type="button"
                                class="vault-item-detail-copy"
                                [class.vault-item-detail-copy--copied]="detailCopiedKeyPath() === row.key"
                                [attr.aria-label]="
                                  detailCopiedKeyPath() === row.key
                                    ? 'Copied ' + formatDetailLabel(row.key)
                                    : 'Copy ' + formatDetailLabel(row.key)
                                "
                                (click)="copyDetailValue(row.value, row.key); $event.stopPropagation()"
                              >
                                @if (detailCopiedKeyPath() === row.key) {
                                  <svg class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                } @else {
                                  <svg class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                }
                              </button>
                            </div>
                          </li>
                        }
                      </ul>
                    }
                  </section>
                  @if (selectedId(); as fileVaultId) {
                    <app-vault-file-attachments [vaultItemId]="fileVaultId" />
                  }
                } @else {
                <section class="vault-item-detail-body" aria-label="Decrypted item fields">
                  <h3 class="vault-item-detail-heading">Decrypted contents</h3>
                  @if (decryptedDetailRows().length === 0) {
                    <p class="px-4 py-6 text-center text-sm text-app-text-muted">No non-empty fields in this item.</p>
                  } @else {
                    <ul class="m-0 list-none p-0" role="list">
                      @for (row of decryptedDetailRows(); track row.key) {
                        <li
                          class="vault-item-detail-row"
                          [class.vault-item-detail-row--copy-flash]="detailRowCopyFlashingKey() === row.key"
                          role="listitem"
                        >
                          <div
                            class="vault-item-detail-row-main vault-item-detail-row-main--copyable"
                            role="button"
                            tabindex="0"
                            [attr.title]="detailRowCopyHint(row.key)"
                            [attr.aria-label]="detailRowCopyHint(row.key)"
                            (click)="copyDetailValue(row.value, row.key)"
                            (keydown.enter)="copyDetailValue(row.value, row.key)"
                            (keydown.space)="onDetailRowCopySpace($event, row.value, row.key)"
                          >
                            <div class="vault-item-detail-key">{{ formatDetailLabel(row.key) }}</div>
                            <div class="vault-item-detail-value">{{ detailValueDisplay(row) }}</div>
                          </div>
                          <div class="vault-item-detail-actions">
                            @if (showWeakPasswordLabel(row)) {
                              <span class="vault-item-detail-weak-pw" role="status">
                                <svg class="vault-item-detail-weak-pw-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path
                                    fill-rule="evenodd"
                                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                                    clip-rule="evenodd"
                                  />
                                </svg>
                                Weak
                              </span>
                            }
                            <button
                              type="button"
                              class="vault-item-detail-copy"
                              [attr.aria-label]="
                                detailFieldIsRevealed(row.key)
                                  ? 'Hide ' + formatDetailLabel(row.key)
                                  : 'Show ' + formatDetailLabel(row.key)
                              "
                              [attr.aria-pressed]="detailFieldIsRevealed(row.key)"
                              (click)="toggleDetailFieldReveal(row.key); $event.stopPropagation()"
                            >
                              @if (detailFieldIsRevealed(row.key)) {
                                <svg class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                                  />
                                </svg>
                              } @else {
                                <svg class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                  />
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              }
                            </button>
                            <button
                              type="button"
                              class="vault-item-detail-copy"
                              [class.vault-item-detail-copy--copied]="detailCopiedKeyPath() === row.key"
                              [attr.aria-label]="
                                detailCopiedKeyPath() === row.key
                                  ? 'Copied ' + formatDetailLabel(row.key)
                                  : 'Copy ' + formatDetailLabel(row.key)
                              "
                              [attr.title]="
                                detailCopiedKeyPath() === row.key
                                  ? 'Copied ' + formatDetailLabel(row.key)
                                  : 'Copy ' + formatDetailLabel(row.key)
                              "
                              (click)="copyDetailValue(row.value, row.key); $event.stopPropagation()"
                            >
                              @if (detailCopiedKeyPath() === row.key) {
                                <svg class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2.5"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              } @else {
                                <svg class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                              }
                            </button>
                          </div>
                        </li>
                      }
                    </ul>
                  }
                </section>
                }
              </div>
              }
            } @else if (unlockPromptActive()) {
              <div class="flex flex-1 flex-col items-center justify-center">
                <div class="max-w-md rounded-2xl border border-app-border/90 bg-app-elevated/25 px-8 py-10 text-center">
                  <p class="text-lg font-semibold text-app-text">Unlock to reveal</p>
                  <p class="mt-3 text-sm leading-relaxed text-app-text-muted">
                    This item is encrypted. Use the unlock dialog or go to <strong class="text-app-text">Settings</strong> → Vault
                    Session, then try again.
                  </p>
                </div>
              </div>
            } @else if (detailBusy()) {
              <div class="flex flex-1 flex-col items-center justify-center text-sm text-app-text-muted">
                <p>Loading ciphertext…</p>
              </div>
            } @else {
              <div class="flex flex-1 flex-col items-center justify-center">
                <p class="max-w-sm text-center text-sm leading-relaxed text-app-text-muted">
                  Something went wrong loading this item. Select another entry or try again.
                </p>
              </div>
            }
          </div>
        </section>
      }
      </div>

      <app-change-vault-item-type-wizard
        [open]="changeTypeWizardOpen()"
        [context]="changeTypeWizardContext()"
        (dismissed)="closeChangeTypeWizard()"
        (completed)="onChangeTypeWizardCompleted()"
      />

      <app-shell-modal
        [open]="deleteItemConfirmOpen()"
        [useDefaultHeader]="false"
        ariaLabelledBy="vault-item-delete-confirm-title"
        bodyAlign="left"
        closeAriaLabel="Close"
        (dismissed)="closeDeleteItemConfirm()"
      >
        <h2 id="vault-item-delete-confirm-title" class="vault-unlock-modal-title text-left">Delete this item?</h2>
        <p class="vault-unlock-modal-sub mt-2 text-left">
          This removes the encrypted item from the server for this account. You cannot restore it from this app.
        </p>
        <div class="mt-6 flex flex-wrap justify-end gap-2 border-t border-app-border/80 pt-4">
          <button type="button" class="control-btn-secondary w-max" (click)="closeDeleteItemConfirm()">Cancel</button>
          <button type="button" class="control-btn-danger w-max" (click)="confirmDeleteItem()">Delete</button>
        </div>
      </app-shell-modal>
    </div>
  `,
})
export class VaultEncryptedItemsComponent {
  public readonly items = signal<VaultItemListEntry[]>([]);
  public readonly searchQuery = signal('');
  /** When true, searchable words must contain the whole text segment (non-`#` parts joined with spaces), not split tokens. */
  public readonly searchFullWord = signal(false);
  /** When true, matching against `searchable_words` is case-sensitive (metadata stays case-insensitive). */
  public readonly searchCaseSensitive = signal(false);
  public readonly selectedId = signal<string | null>(null);
  public readonly selectedItemDecrypted = signal<Record<string, unknown> | null>(null);
  /** Plaintext metadata from the server (not part of decrypted JSON). */
  public readonly selectedItemSearchableWords = signal<string | null>(null);
  public readonly unlockPromptActive = signal(false);
  public readonly detailBusy = signal(false);
  /** When `edit`, the right pane shows the type-specific form instead of read-only detail. */
  public readonly detailViewMode = signal<'view' | 'edit'>('view');

  public readonly deleteItemConfirmOpen = signal(false);
  private readonly deleteItemConfirmId = signal<string | null>(null);

  public readonly changeTypeWizardOpen = signal(false);
  public readonly changeTypeWizardContext = signal<ChangeVaultItemTypeWizardContext | null>(null);

  /** Decrypted field key path whose copy button shows the short “copied” tick (cleared after timeout). */
  public readonly detailCopiedKeyPath = signal<string | null>(null);
  /** Row that briefly plays the copy-flash animation (label+value click or copy icon). */
  public readonly detailRowCopyFlashingKey = signal<string | null>(null);
  private detailCopyFeedbackClearTimer: ReturnType<typeof setTimeout> | null = null;
  private detailRowFlashClearTimer: ReturnType<typeof setTimeout> | null = null;

  /** Key paths the user has revealed (plaintext); all others show masked `*` display. Cleared when selection or vault state resets. */
  private readonly detailFieldRevealKeys = signal<ReadonlySet<string>>(new Set<string>());

  /** Key paths scored weak by lazy-loaded zxcvbn (password-shaped fields only); cleared when selection/decrypt resets. */
  public readonly detailWeakPasswordKeys = signal<ReadonlySet<string>>(new Set<string>());
  private weakScanToken = 0;

  private listReloadDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  public readonly searchIsActive = computed(() => this.searchQuery().trim().length > 0);

  public readonly showVaultListChrome = computed(() => this.items().length > 0 || this.searchIsActive());

  public readonly selectedEntry = computed(() => {
    const id = this.selectedId();
    if (id === null) {
      return null;
    }
    return this.items().find((i) => i.id === id) ?? null;
  });

  public readonly selectedItemEditKind = computed(() => {
    const row = this.selectedEntry();
    if (row === null) {
      return null;
    }
    return classifyVaultItemForEdit(row.item_type);
  });

  public readonly vaultInlineEditModel = computed((): VaultInlineEditPayload | null => {
    if (this.detailViewMode() !== 'edit') {
      return null;
    }
    const id = this.selectedId();
    const dec = this.selectedItemDecrypted();
    if (id === null || dec === null) {
      return null;
    }
    return {
      itemId: id,
      decrypted: dec,
      searchableWords: this.selectedItemSearchableWords(),
    };
  });

  public readonly decryptedDetailRows = computed(() => flattenDecryptedPayloadForDisplay(this.selectedItemDecrypted()));

  public readonly isSelectedFileVaultItem = computed(() => this.selectedEntry()?.item_type === 'file');

  public readonly fileVaultTitleNotesRows = computed((): DecryptedDetailRow[] => {
    const dec = this.selectedItemDecrypted();
    if (dec === null) {
      return [];
    }
    const rows: DecryptedDetailRow[] = [];
    for (const k of ['title', 'notes'] as const) {
      const v = dec[k];
      if (typeof v === 'string' && v.trim() !== '') {
        rows.push({ key: k, value: v });
      }
    }
    return rows;
  });

  public readonly unlockRequired = output<void>();

  private itemAwaitingDecrypt: VaultItemPayload | null = null;

  private readonly destroyRef = inject(DestroyRef);

  public constructor(
    private readonly vault: VaultService,
    private readonly crypto: WebCryptoService,
    public readonly vaultSession: VaultSessionService,
    private readonly toast: ToastService,
  ) {
    this.vaultSession.vaultKeyCleared$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.clearSensitiveState();
    });
    this.destroyRef.onDestroy(() => {
      if (this.detailCopyFeedbackClearTimer !== null) {
        clearTimeout(this.detailCopyFeedbackClearTimer);
        this.detailCopyFeedbackClearTimer = null;
      }
      if (this.detailRowFlashClearTimer !== null) {
        clearTimeout(this.detailRowFlashClearTimer);
        this.detailRowFlashClearTimer = null;
      }
      if (this.listReloadDebounceTimer !== null) {
        clearTimeout(this.listReloadDebounceTimer);
        this.listReloadDebounceTimer = null;
      }
    });

    effect(() => {
      const dec = this.selectedItemDecrypted();
      const token = ++this.weakScanToken;
      if (dec === null) {
        this.detailWeakPasswordKeys.set(new Set());
        return;
      }
      const rows = flattenDecryptedPayloadForDisplay(dec);
      const pwdRows = rows.filter((r) => vaultFieldKeyLooksLikePassword(r.key));
      this.detailWeakPasswordKeys.set(new Set());
      if (pwdRows.length === 0) {
        return;
      }
      void import('./vault-password-zxcvbn').then((mod) => {
        if (token !== this.weakScanToken) {
          return;
        }
        const weak = new Set<string>();
        for (const r of pwdRows) {
          if (mod.isWeakVaultPassword(r.value)) {
            weak.add(r.key);
          }
        }
        if (token !== this.weakScanToken) {
          return;
        }
        this.detailWeakPasswordKeys.set(weak);
      });
    });

    this.loadItems();
  }

  public onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.scheduleReloadItemList();
  }

  public setSearchFullWord(on: boolean): void {
    if (this.searchFullWord() === on) {
      return;
    }
    this.searchFullWord.set(on);
    if (this.searchIsActive()) {
      this.scheduleReloadItemList();
    }
  }

  public setSearchCaseSensitive(on: boolean): void {
    if (this.searchCaseSensitive() === on) {
      return;
    }
    this.searchCaseSensitive.set(on);
    if (this.searchIsActive()) {
      this.scheduleReloadItemList();
    }
  }

  public rowLabel(item: VaultItemListEntry): string {
    return vaultItemListLabel(item.item_type);
  }

  /** Third line in the list: server `searchable_words` when non-empty; otherwise no extra line. */
  public listItemSearchableWordsLine(item: VaultItemListEntry): string | null {
    const sw = item.searchable_words;
    if (sw === null || sw === undefined) {
      return null;
    }
    const t = sw.trim();
    return t !== '' ? t : null;
  }

  /** Row `title`: id and crypto version (removed from visible copy) remain discoverable on hover. */
  public listRowTitle(item: VaultItemListEntry): string {
    const num = item.display_number !== undefined ? `#${item.display_number} · ` : '';
    return `${num}${this.rowLabel(item)} · ${item.item_type} · ID ${item.id} · v${item.crypto_version}`;
  }

  public formatDetailLabel(keyPath: string): string {
    return keyPath
      .split('.')
      .map((segment) => segment.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      .join(' › ');
  }

  /** Tooltip / aria hint for the clickable label+value column (matches copy icon wording). */
  public detailRowCopyHint(keyPath: string): string {
    const label = this.formatDetailLabel(keyPath);
    return this.detailCopiedKeyPath() === keyPath ? `Copied ${label}` : `Copy ${label}`;
  }

  public onDetailRowCopySpace(event: Event, value: string, keyPath: string): Promise<void> {
    event.preventDefault();
    return this.copyDetailValue(value, keyPath);
  }

  public detailValueDisplay(row: DecryptedDetailRow): string {
    return this.detailFieldIsRevealed(row.key) ? row.value : maskVaultDetailValue(row.value);
  }

  public detailFieldIsRevealed(keyPath: string): boolean {
    return this.detailFieldRevealKeys().has(keyPath);
  }

  public toggleDetailFieldReveal(keyPath: string): void {
    this.detailFieldRevealKeys.update((prev) => {
      const next = new Set(prev);
      if (next.has(keyPath)) {
        next.delete(keyPath);
      } else {
        next.add(keyPath);
      }
      return next;
    });
  }

  /** Weak badge only after lazy zxcvbn scan; password-shaped keys only. */
  public showWeakPasswordLabel(row: DecryptedDetailRow): boolean {
    return this.detailWeakPasswordKeys().has(row.key);
  }

  public async copyDetailValue(value: string, keyPath: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.toast.success(`Copied ${this.formatDetailLabel(keyPath)}`);
      if (this.detailCopyFeedbackClearTimer !== null) {
        clearTimeout(this.detailCopyFeedbackClearTimer);
      }
      this.detailCopiedKeyPath.set(keyPath);
      this.triggerDetailRowCopyFlash(keyPath);
      this.detailCopyFeedbackClearTimer = setTimeout(() => {
        this.detailCopiedKeyPath.set(null);
        this.detailCopyFeedbackClearTimer = null;
      }, 2000);
    } catch {
      this.toast.error('Could not copy to clipboard');
    }
  }

  private triggerDetailRowCopyFlash(keyPath: string): void {
    if (this.detailRowFlashClearTimer !== null) {
      clearTimeout(this.detailRowFlashClearTimer);
      this.detailRowFlashClearTimer = null;
    }
    this.detailRowCopyFlashingKey.set(null);
    requestAnimationFrame(() => {
      this.detailRowCopyFlashingKey.set(keyPath);
      this.detailRowFlashClearTimer = setTimeout(() => {
        if (this.detailRowCopyFlashingKey() === keyPath) {
          this.detailRowCopyFlashingKey.set(null);
        }
        this.detailRowFlashClearTimer = null;
      }, 650);
    });
  }

  public enterEditMode(): void {
    const k = this.selectedItemEditKind();
    if (k === null || k.category === 'unsupported') {
      return;
    }
    this.detailViewMode.set('edit');
  }

  public exitEditMode(): void {
    this.detailViewMode.set('view');
  }

  public onVaultItemInlineSaved(): void {
    this.detailViewMode.set('view');
    const id = this.selectedId();
    this.refreshItemsMetadata();
    if (id !== null) {
      this.onSelectItem(id);
    }
  }

  public loadItems(): void {
    this.detailViewMode.set('view');
    this.selectedItemDecrypted.set(null);
    this.unlockPromptActive.set(false);
    this.runVaultItemListRequest(true);
  }

  private resetSearchFilterTogglesToDefault(): void {
    this.searchFullWord.set(false);
    this.searchCaseSensitive.set(false);
  }

  private buildListQuery(): VaultListItemsQuery | undefined {
    const s = this.searchQuery().trim();
    if (s === '') {
      return undefined;
    }
    return {
      search: s,
      searchFullWord: this.searchFullWord(),
      searchCaseSensitive: this.searchCaseSensitive(),
    };
  }

  private scheduleReloadItemList(): void {
    if (this.listReloadDebounceTimer !== null) {
      clearTimeout(this.listReloadDebounceTimer);
    }
    this.listReloadDebounceTimer = setTimeout(() => {
      this.listReloadDebounceTimer = null;
      this.runVaultItemListRequest(false);
    }, 300);
  }

  private runVaultItemListRequest(isFullInitialLoad: boolean): void {
    this.vault.listItems(this.buildListQuery()).subscribe({
      next: (list) => {
        const mapped = this.mapAndSortVaultListFromApi(list);
        this.items.set(mapped);
        const sid = this.selectedId();
        if (sid !== null && !mapped.some((i) => i.id === sid)) {
          this.selectedId.set(null);
          this.clearSensitiveState();
        }
        if (mapped.length === 0 && this.searchQuery().trim() === '') {
          this.resetSearchFilterTogglesToDefault();
          this.selectedId.set(null);
          this.clearSensitiveState();
        }
      },
      error: () => {
        this.items.set([]);
        this.searchQuery.set('');
        this.resetSearchFilterTogglesToDefault();
        this.selectedId.set(null);
        this.clearSensitiveState();
        this.toast.error(isFullInitialLoad ? 'Unable to load encrypted items' : 'Unable to refresh list');
      },
    });
  }

  public onSelectItem(id: string): void {
    this.clearDetailFieldReveals();
    this.detailViewMode.set('view');
    this.selectedId.set(id);
    this.selectedItemDecrypted.set(null);
    this.selectedItemSearchableWords.set(null);
    this.unlockPromptActive.set(false);
    this.itemAwaitingDecrypt = null;
    this.detailBusy.set(true);

    this.vault.getItem(id).subscribe({
      next: async (response) => {
        const item = response.item as unknown as VaultItemPayload;
        const sw = response.item.searchable_words;
        this.selectedItemSearchableWords.set(typeof sw === 'string' && sw.trim() !== '' ? sw : null);
        if (this.vaultSession.isUnlocked()) {
          await this.runDecrypt(item);
          return;
        }
        this.itemAwaitingDecrypt = item;
        this.unlockPromptActive.set(true);
        this.detailBusy.set(false);
        this.unlockRequired.emit();
      },
      error: () => {
        this.detailBusy.set(false);
        this.toast.error('Unable to load item');
      },
    });
  }

  /** Parent opens modal; after successful unlock, call this. */
  public notifyVaultUnlocked(): void {
    const item = this.itemAwaitingDecrypt;
    if (item === null) {
      return;
    }
    this.unlockPromptActive.set(false);
    void this.runDecrypt(item);
  }

  /** User dismissed unlock modal without unlocking. */
  public clearPendingUnlock(): void {
    this.itemAwaitingDecrypt = null;
    this.unlockPromptActive.set(false);
  }

  public openDeleteItemConfirm(id: string): void {
    this.deleteItemConfirmId.set(id);
    this.deleteItemConfirmOpen.set(true);
  }

  public closeDeleteItemConfirm(): void {
    this.deleteItemConfirmOpen.set(false);
    this.deleteItemConfirmId.set(null);
  }

  public openChangeTypeWizard(): void {
    const vm = this.vaultInlineEditModel();
    const row = this.selectedEntry();
    if (vm === null || row === null) {
      return;
    }
    this.changeTypeWizardContext.set({
      itemId: vm.itemId,
      sourceItemType: row.item_type,
      decrypted: { ...vm.decrypted },
      searchableWords: vm.searchableWords,
    });
    this.changeTypeWizardOpen.set(true);
  }

  public closeChangeTypeWizard(): void {
    this.changeTypeWizardOpen.set(false);
    this.changeTypeWizardContext.set(null);
  }

  public onChangeTypeWizardCompleted(): void {
    this.closeChangeTypeWizard();
    this.onVaultItemInlineSaved();
  }

  public confirmDeleteItem(): void {
    const id = this.deleteItemConfirmId();
    this.closeDeleteItemConfirm();
    if (id !== null) {
      this.deleteItem(id);
    }
  }

  public deleteItem(id: string): void {
    this.vault.deleteItem(id).subscribe({
      next: () => {
        this.toast.success('Item deleted');
        if (this.selectedId() === id) {
          this.selectedId.set(null);
          this.clearSensitiveState();
        }
        this.loadItems();
      },
      error: () => this.toast.error('Delete failed'),
    });
  }

  private refreshItemsMetadata(): void {
    this.runVaultItemListRequest(false);
  }

  private mapAndSortVaultListFromApi(
    list: ReadonlyArray<{
      id: string;
      display_number?: number | null;
      item_type: string;
      crypto_version: number;
      searchable_words?: string | null;
    }>,
  ): VaultItemListEntry[] {
    const mapped: VaultItemListEntry[] = list.map((i) => ({
      id: i.id,
      display_number:
        i.display_number !== undefined && i.display_number !== null ? Number(i.display_number) : undefined,
      item_type: i.item_type,
      crypto_version: i.crypto_version,
      searchable_words: i.searchable_words ?? null,
    }));
    return sortVaultItemListEntriesByDisplayNumber(mapped);
  }

  private clearSensitiveState(): void {
    this.itemAwaitingDecrypt = null;
    this.detailViewMode.set('view');
    this.selectedItemDecrypted.set(null);
    this.selectedItemSearchableWords.set(null);
    this.changeTypeWizardOpen.set(false);
    this.changeTypeWizardContext.set(null);
    this.unlockPromptActive.set(false);
    this.detailBusy.set(false);
    if (this.detailCopyFeedbackClearTimer !== null) {
      clearTimeout(this.detailCopyFeedbackClearTimer);
      this.detailCopyFeedbackClearTimer = null;
    }
    if (this.detailRowFlashClearTimer !== null) {
      clearTimeout(this.detailRowFlashClearTimer);
      this.detailRowFlashClearTimer = null;
    }
    this.detailCopiedKeyPath.set(null);
    this.detailRowCopyFlashingKey.set(null);
    this.clearDetailFieldReveals();
  }

  private clearDetailFieldReveals(): void {
    this.detailFieldRevealKeys.set(new Set<string>());
  }

  private async runDecrypt(item: VaultItemPayload): Promise<void> {
    this.detailBusy.set(true);
    try {
      this.crypto.noteActivity();
      const decrypted = await this.crypto.decryptItemPayload(item);
      this.selectedItemDecrypted.set(decrypted);
    } catch (error: unknown) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to decrypt item');
    } finally {
      this.detailBusy.set(false);
    }
  }
}
