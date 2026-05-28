import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

/** One row after import: per-field table + outcome for that preview item. */
export interface ImportResultItemRow {
  index: number;
  title: string;
  itemType: string;
  outcome: 'skipped_prep' | 'pending_server' | 'uploaded' | 'server_rejected';
  detail?: string;
  vaultItemId?: string;
  tableRows: readonly { sourceKey: string; value: string; mapsTo: string }[];
}

import { BlockingOverlayComponent } from '../../../core/ui/blocking-overlay.component';
import { ToastService } from '../../../core/ui/toast.service';
import { VAULT_ENCRYPTED_ITEMS_ROUTE } from '../../../core/vault/vault-app-paths';
import { VaultSessionService } from '../../../core/vault/vault-session.service';
import type { VaultBulkCreateResponse, VaultBulkItemRow } from '../../../core/vault/vault.service';
import { VaultService, VAULT_BULK_CREATE_MAX_ITEMS } from '../../../core/vault/vault.service';
import { WebCryptoService } from '../../../core/vault/web-crypto.service';
import { classifyImportRow, IMPORT_CATEGORY_OPTIONS } from './import-classifier';
import {
  coerceImportMapSelectValue,
  getImportFieldSelectOptions,
  getImportFieldTargetCount,
  sanitizeImportKeyMapValues,
} from './import-field-catalog';
import { VAULT_SEARCHABLE_WORDS_MAX_LENGTH } from '../../../core/vault/vault-searchable-words';
import { encryptImportRow } from './import-encrypt';
import { formatMappingConfidenceLabel, formatVaultTypeLabel } from './import-preview-labels';
import {
  buildImportMappingGroups,
  buildRowIndexToGroupId,
  buildSuggestedKeyMap,
  extractImportSourceKeys,
  findDuplicateImportMapTargets,
  importMappingGroupId,
  mergeImportSampleRawsForSuggestion,
  suggestImportTargetForSourceKey,
  type ImportMappingGroup,
} from './import-key-map';
import { normalizeImportRow } from './import-normalize';
import { buildImportPastePreview } from './import-vault-paste';
import { type ImportPreviewItem } from './import-vault-json';
import {
  buildImportBlockingIssuesFromValidation,
  collectImportRowValidationMessages,
  type ImportBlockingIssue,
} from './import-validation-messages';

type ImportStep = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-import-vault-items',
  standalone: true,
  imports: [RouterLink, BlockingOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-content page-pad--settings settings-page-fill import-vault-page-root text-left">
      <div class="settings-layout">
        <div class="settings-main import-vault-page-main">
          <div class="import-vault-toolbar">
            <a routerLink="/new" class="link-back inline-flex items-center gap-2" aria-label="Back to create">
              <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>All types</span>
            </a>
            <div class="import-vault-toolbar-actions">
              <a routerLink="/new" class="control-btn-secondary w-max">Cancel</a>
              @if (step() === 4) {
                <button type="button" class="control-btn-secondary w-max" (click)="goImportAnother()">Import another</button>
                <a
                  [routerLink]="encryptedVaultRoute"
                  class="control-btn-primary inline-flex w-max items-center justify-center gap-2"
                >
                  <span>Open encrypted vault</span>
                </a>
              } @else if (step() === 1) {
                <button type="button" class="control-btn-primary w-max" (click)="goPreview()">
                  <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <span>Preview</span>
                </button>
              } @else if (step() === 2) {
                <button type="button" class="control-btn-secondary w-max" (click)="backToPaste()" [disabled]="importBusy()">
                  Edit paste
                </button>
                <button
                  type="button"
                  class="control-btn-secondary w-max"
                  (click)="goFieldMapping()"
                  [disabled]="importBusy()"
                >
                  Map fields
                </button>
                <button
                  type="button"
                  class="control-btn-primary w-max"
                  [disabled]="importBusy() || importFieldMapBlocked()"
                  (click)="runImport()"
                >
                  @if (importBusy()) {
                    <span>Importing…</span>
                  } @else {
                    <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L6 8m4-4v12"
                      />
                    </svg>
                    <span>Import</span>
                  }
                </button>
              } @else {
                <button type="button" class="control-btn-secondary w-max" (click)="backToReview()" [disabled]="importBusy()">
                  Back to review
                </button>
                <button
                  type="button"
                  class="control-btn-primary w-max"
                  [disabled]="importBusy() || importFieldMapBlocked()"
                  (click)="runImport()"
                >
                  @if (importBusy()) {
                    <span>Importing…</span>
                  } @else {
                    <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L6 8m4-4v12"
                      />
                    </svg>
                    <span>Import</span>
                  }
                </button>
              }
            </div>
          </div>

          <header class="settings-page-header mb-4 shrink-0">
            <h1 class="settings-page-heading">
              <span class="settings-page-title">Import vault items</span>
              <span class="settings-page-heading-dot" aria-hidden="true">.</span>
              <span class="settings-page-kicker">{{ stepHeading() }}</span>
            </h1>
          </header>

          @if (step() === 4) {
            @if (importBlockingIssues().length > 0) {
              <div class="import-vault-map-dup-warn mb-4" role="alert">
                <p class="import-vault-map-dup-warn-title">Issues that stopped import</p>
                <p class="import-vault-map-dup-warn-body mb-3">
                  Imports are <strong class="font-medium text-app-text">all-or-nothing</strong>: if any row fails validation or
                  encryption, nothing is uploaded. Use <strong class="font-medium text-app-text">Previous</strong> /
                  <strong class="font-medium text-app-text">Next</strong> to review one issue at a time.
                </p>
                @if (activeBlockingIssue(); as iss) {
                  <p class="text-xs font-medium text-app-text-muted">
                    Issue {{ importBlockingIssueIdx() + 1 }} of {{ importBlockingIssues().length }}
                    <span class="text-app-text-muted"> · </span>
                    Row {{ iss.rowNumber }}
                    <span class="text-app-text-muted"> · </span>
                    {{ iss.kind === 'encrypt' ? 'Encryption' : 'Validation' }}
                  </p>
                  <p class="mt-2 text-base font-semibold text-app-text">{{ iss.title }}</p>
                  <ul class="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-app-text-muted">
                    @for (line of iss.messages; track $index) {
                      <li>{{ line }}</li>
                    }
                  </ul>
                  <div class="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      class="control-btn-secondary w-max"
                      (click)="prevBlockingIssue()"
                      [disabled]="importBlockingIssueIdx() === 0"
                    >
                      Previous issue
                    </button>
                    <button
                      type="button"
                      class="control-btn-secondary w-max"
                      (click)="nextBlockingIssue()"
                      [disabled]="importBlockingIssueIdx() >= importBlockingIssues().length - 1"
                    >
                      Next issue
                    </button>
                  </div>
                }
              </div>
            }

            @if (importSummary()) {
              <div
                class="mb-4 rounded-xl border border-app-border bg-app-elevated/40 px-4 py-3 text-sm text-app-text-muted"
                role="status"
              >
                {{ importSummary() }}
              </div>
            }

            <section class="settings-section-card min-h-0 flex-1" aria-label="Import result by item">
              <h2 class="tab-panel-heading tab-panel-heading--compact">
                <span class="tab-panel-heading-title">Items</span>
                <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
                <span class="tab-panel-heading-kicker">Field tables and status</span>
              </h2>
              <ul class="import-vault-preview-list list-none p-0" role="list">
                @for (item of importResultRows(); track item.index) {
                  <li class="import-vault-preview-card" role="listitem">
                    <div class="import-vault-row-head flex flex-wrap items-start justify-between gap-2">
                      <div class="min-w-0">
                        <span class="text-base font-semibold text-app-text">{{ item.title }}</span>
                        <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-app-text-muted">
                          <span class="rounded border border-app-border/80 px-1.5 py-0.5 font-mono">{{ item.itemType }}</span>
                          @switch (item.outcome) {
                            @case ('uploaded') {
                              <span class="import-vault-result-badge import-vault-result-badge--ok">Saved</span>
                              @if (item.vaultItemId) {
                                <span class="font-mono text-[0.7rem] text-app-text-muted">id {{ item.vaultItemId }}</span>
                              }
                            }
                            @case ('pending_server') {
                              <span class="import-vault-result-badge import-vault-result-badge--pending">Uploaded (confirming…)</span>
                            }
                            @case ('server_rejected') {
                              <span class="import-vault-result-badge import-vault-result-badge--err">Server rejected</span>
                            }
                            @default {
                              <span class="import-vault-result-badge import-vault-result-badge--skip">Not uploaded</span>
                            }
                          }
                        </div>
                      </div>
                    </div>
                    @if (item.detail) {
                      <p class="mt-2 text-xs text-amber-300">{{ item.detail }}</p>
                    }
                    <div class="import-vault-result-table-wrap scroll-themed mt-3 overflow-x-auto">
                      <table class="import-vault-result-table">
                        <thead>
                          <tr>
                            <th scope="col">Source key</th>
                            <th scope="col">Value</th>
                            <th scope="col">Maps to</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (r of item.tableRows; track r.sourceKey) {
                            <tr>
                              <td class="import-vault-result-td-key font-mono text-xs">{{ r.sourceKey }}</td>
                              <td class="import-vault-result-td-val font-mono text-xs">{{ r.value }}</td>
                              <td class="import-vault-result-td-map text-xs font-medium text-app-main-accent">{{ r.mapsTo }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </li>
                }
              </ul>
            </section>
          } @else if (step() === 1) {
            @if (parseMessage()) {
              <div
                class="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {{ parseMessage() }}
              </div>
            }

            <div class="import-vault-paste-shell">
              <textarea
                id="import-vault-paste"
                class="create-import-paste scroll-themed"
                rows="20"
                spellcheck="false"
                autocomplete="off"
                placeholder='JSON: [{"title":"One"}] or CSV: Title,Url,Username,Password …'
                [value]="raw()"
                (input)="onPasteInput($event)"
              ></textarea>
            </div>
          } @else if (step() === 2) {
            @if (importSummary()) {
              <div
                class="mb-4 rounded-xl border border-app-border bg-app-elevated/40 px-4 py-3 text-sm text-app-text-muted"
                role="status"
              >
                {{ importSummary() }}
              </div>
            }

            <section class="settings-section-card min-h-0 flex-1" aria-label="Import preview">
              <h2 class="tab-panel-heading tab-panel-heading--compact">
                <span class="tab-panel-heading-title">Items to import</span>
                <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
                <span class="tab-panel-heading-kicker">Classify, normalize, encrypt</span>
              </h2>
              <ul class="import-vault-preview-list list-none p-0" role="list">
                @for (row of previewItems(); track row.index) {
                  <li class="import-vault-preview-card" role="listitem">
                    <div class="import-vault-row-head flex flex-wrap items-start justify-between gap-2">
                      <div class="min-w-0">
                        <span class="text-base font-semibold text-app-text">{{ row.title }}</span>
                        <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-app-text-muted">
                          <span
                            class="rounded border px-1.5 py-0.5"
                            [class.border-emerald-500/50]="classifications()[row.index].confidence === 'high'"
                            [class.border-amber-500/50]="classifications()[row.index].confidence === 'medium'"
                            [class.border-app-border/80]="classifications()[row.index].confidence === 'low'"
                          >
                            <span class="font-medium text-app-text">Mapping confidence:</span>
                            {{ formatMappingConfidenceLabel(classifications()[row.index].confidence) }}
                          </span>
                          <span class="rounded border border-app-border/80 px-1.5 py-0.5">
                            <span class="font-medium text-app-text">Vault type:</span>
                            {{ formatVaultTypeLabel(effectiveItemType(row.index)) }}
                          </span>
                        </div>
                      </div>
                      <div class="import-vault-row-type w-full min-w-[12rem] sm:w-56">
                        <label class="mb-1 block text-xs font-medium text-app-text-muted" [attr.for]="'import-row-type-' + row.index"
                          >Override</label
                        >
                        <select
                          class="control-field box-border text-sm"
                          [id]="'import-row-type-' + row.index"
                          [value]="rowSelectValue(row.index)"
                          (change)="onRowCategoryChange(row.index, $event)"
                          [disabled]="importBusy()"
                        >
                          <option value="">Use suggestion</option>
                          @for (opt of categoryOptions; track opt.value) {
                            <option [value]="opt.value">{{ opt.label }}</option>
                          }
                        </select>
                      </div>
                    </div>
                    @if (rowValidationMessage(row.index); as rowErr) {
                      <p class="mt-2 text-xs text-amber-300">{{ rowErr }}</p>
                    }
                    <div
                      class="import-vault-result-table-wrap scroll-themed mt-3 max-h-[min(40dvh,18rem)] overflow-x-auto overflow-y-auto pr-0.5"
                    >
                      <table class="import-vault-result-table">
                        <thead>
                          <tr>
                            <th scope="col">Source key</th>
                            <th scope="col">Value</th>
                            <th scope="col">Maps to</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (field of row.fields; track $index) {
                            <tr>
                              <td class="import-vault-result-td-key font-mono text-xs">{{ field.key }}</td>
                              <td class="import-vault-result-td-val font-mono text-xs">{{ field.value }}</td>
                              <td class="import-vault-result-td-map text-xs font-medium text-app-main-accent">
                                {{ previewMappedVaultLabel(row.index, field.key) }}
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </li>
                }
              </ul>
            </section>
          } @else {
            <div class="import-vault-map-step flex min-h-0 flex-1 flex-col">
            @if (importFieldMapBlockedReason(); as blockMsg) {
              <div class="import-vault-map-dup-warn mb-4" role="alert">
                <p class="import-vault-map-dup-warn-title">Fix field mapping to import</p>
                <p class="import-vault-map-dup-warn-body">{{ blockMsg }}</p>
              </div>
            }

            @if (importSummary()) {
              <div
                class="mb-4 rounded-xl border border-app-border bg-app-elevated/40 px-4 py-3 text-sm text-app-text-muted"
                role="status"
              >
                {{ importSummary() }}
              </div>
            }

            <div class="import-vault-map-list scroll-themed min-h-0 flex-1 space-y-4 overflow-y-auto pr-1" role="region" aria-label="Field mapping">
              @for (g of mappingGroups(); track g.id; let gi = $index) {
                <section class="import-vault-map-card" [attr.aria-labelledby]="'import-map-h-' + gi">
                  <div class="import-vault-map-card-head">
                    <div class="min-w-0">
                      <h2 class="import-vault-map-card-title" [id]="'import-map-h-' + gi">
                        {{ g.rowCount }} item{{ g.rowCount === 1 ? '' : 's' }}
                        <span class="text-app-text-muted"> · </span>
                        <span class="font-mono text-sm text-app-text-muted">{{ g.itemType }}</span>
                      </h2>
                      <p class="import-vault-map-card-sub">
                        {{ g.sourceKeys.length }} source key{{ g.sourceKeys.length === 1 ? '' : 's' }} → vault fields
                      </p>
                    </div>
                    <button
                      type="button"
                      class="control-btn-secondary import-vault-map-reset w-max shrink-0 text-xs"
                      (click)="resetGroupMap(g)"
                      [disabled]="importBusy()"
                    >
                      Reset suggestions
                    </button>
                  </div>
                  <div class="import-vault-map-table-wrap scroll-themed overflow-x-auto">
                    <table class="import-vault-map-table">
                      <thead>
                        <tr>
                          <th scope="col">Source key</th>
                          <th scope="col" class="import-vault-map-arrow-col" aria-hidden="true"></th>
                          <th scope="col">Vault field</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (src of g.sourceKeys; track src; let si = $index) {
                          @let sel = fieldMapSelectValue(g, src);
                          <tr>
                            <td class="import-vault-map-src font-mono text-xs">{{ src }}</td>
                            <td class="import-vault-map-arrow text-center text-app-text-muted" aria-hidden="true">→</td>
                            <td>
                              <label class="sr-only" [attr.for]="'import-map-sel-' + gi + '-' + si">Map {{ src }}</label>
                              <select
                                class="control-field import-vault-map-select box-border w-full min-w-[12rem] text-sm"
                                [id]="'import-map-sel-' + gi + '-' + si"
                                (change)="onGroupMapChange(g.id, src, $event)"
                                [disabled]="importBusy()"
                              >
                                @for (opt of selectOptionsForType(g.itemType); track opt.value) {
                                  <option [value]="opt.value" [selected]="opt.value === sel">{{ opt.label }}</option>
                                }
                              </select>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                  @if (duplicateMapTargetsForGroup(g).length > 0) {
                    <div class="import-vault-map-dup-warn" role="status">
                      <p class="import-vault-map-dup-warn-title">Duplicate vault field targets</p>
                      <p class="import-vault-map-dup-warn-body">
                        Import is blocked until each vault field is chosen by at most one source key. Change one of the dropdowns above
                        to a field that is not already used in this table (or use <strong class="font-medium text-app-text">Reset suggestions</strong>).
                      </p>
                      <ul class="import-vault-map-dup-warn-list">
                        @for (d of duplicateMapTargetsForGroup(g); track d.target) {
                          <li>
                            <span class="font-mono text-sm text-app-text">{{ d.target }}</span>
                            <span class="text-app-text-muted"> · sources: </span>
                            <span class="font-mono text-xs text-app-text-muted">{{ d.sources.join(', ') }}</span>
                          </li>
                        }
                      </ul>
                    </div>
                  }
                </section>
              }
            </div>
            </div>
          }
        </div>

        <aside class="settings-aside" aria-label="Import notes">
          <div class="settings-help-panel">
            <h2 class="settings-help-heading">How it works</h2>
            <p class="text-sm leading-relaxed text-app-text-muted">
              JSON or CSV is parsed only in this browser. CSV rows become one object per line (header keys, same order); nothing is
              dropped; short rows are padded with empty values, long rows are trimmed to the header width. Each row gets a suggested
              vault type; you can override. Optional <strong class="font-medium text-app-text">Map fields</strong> ties each source
              key to a vault field for groups that share the same keys and type. On Import, rows are normalized, encrypted here, then
              sent in bulk (max {{ vaultBulkCreateMaxItems }} items per request). The server never sees plaintext.
            </p>
          </div>
        </aside>
      </div>

      <app-blocking-overlay
        [active]="importBusy()"
        label="Import in progress"
        message="Encrypting items in this browser, then uploading. Please keep this tab open."
      />
    </div>
  `,
})
export class ImportVaultItemsComponent {
  /** Matches API `VaultService::BULK_CREATE_MAX_ITEMS` / {@link VAULT_BULK_CREATE_MAX_ITEMS}. */
  public readonly vaultBulkCreateMaxItems = VAULT_BULK_CREATE_MAX_ITEMS;

  public readonly categoryOptions = IMPORT_CATEGORY_OPTIONS;

  public readonly formatMappingConfidenceLabel = formatMappingConfidenceLabel;

  public readonly formatVaultTypeLabel = formatVaultTypeLabel;

  public readonly step = signal<ImportStep>(1);

  public readonly raw = signal('');

  public readonly parseMessage = signal<string | null>(null);

  public readonly previewItems = signal<ImportPreviewItem[]>([]);

  public readonly rowOverrides = signal<Record<number, string>>({});

  public readonly importBusy = signal(false);

  public readonly importSummary = signal<string | null>(null);

  public readonly classifications = computed(() => this.previewItems().map((p) => classifyImportRow(p.raw)));

  public readonly stepHeading = computed(() => {
    const max = VAULT_BULK_CREATE_MAX_ITEMS;
    switch (this.step()) {
      case 1:
        return `Paste data — JSON or CSV; encrypt here, up to ${String(max)} items per batch`;
      case 2:
        return 'Review — adjust types per row, unlock vault before import';
      case 3:
        return 'Map fields — one table per key shape; each vault field used once';
      default:
        return 'Import results — per-row tables and status; open vault when done';
    }
  });

  /** Non-null when step-3 maps are unusable (duplicate targets or more source keys than vault fields). */
  public readonly importFieldMapBlockedReason = computed(() => {
    const groups = this.mappingGroups();
    const maps = this.fieldMapsByGroup();
    if (!maps || groups.length === 0) {
      return null;
    }
    for (const g of groups) {
      const maxFields = getImportFieldTargetCount(g.itemType);
      if (g.sourceKeys.length > maxFields) {
        return `This import shape has ${String(g.sourceKeys.length)} source keys but vault type “${g.itemType}” only has ${String(maxFields)} fields. Each key needs its own field; pick another type or split the data.`;
      }
      const km = maps[g.id];
      if (!km) {
        continue;
      }
      if (findDuplicateImportMapTargets(sanitizeImportKeyMapValues(g.itemType, km)).length > 0) {
        return 'Two or more source keys are mapped to the same vault field. Change the dropdowns so each vault field is used at most once per table.';
      }
    }
    return null;
  });

  public readonly importFieldMapBlocked = computed(() => this.importFieldMapBlockedReason() !== null);

  public readonly mappingGroups = signal<ImportMappingGroup[]>([]);

  /** When non-null, import + validation use these per-group key maps. */
  public readonly fieldMapsByGroup = signal<Record<string, Record<string, string>> | null>(null);

  public readonly rowIndexToGroupId = signal<Record<number, string>>({});

  /** Step 4: per-item tables and upload outcome (set after Import). */
  public readonly importResultRows = signal<ImportResultItemRow[]>([]);

  /** When an all-or-nothing import stops, each blocking row (pager in step 4). */
  public readonly importBlockingIssues = signal<ImportBlockingIssue[]>([]);

  public readonly importBlockingIssueIdx = signal(0);

  public readonly activeBlockingIssue = computed(() => {
    const list = this.importBlockingIssues();
    if (list.length === 0) {
      return null;
    }
    const i = Math.min(Math.max(0, this.importBlockingIssueIdx()), list.length - 1);
    return list[i] ?? null;
  });

  public readonly encryptedVaultRoute = VAULT_ENCRYPTED_ITEMS_ROUTE;

  public constructor(
    private readonly vault: VaultService,
    private readonly crypto: WebCryptoService,
    private readonly vaultSession: VaultSessionService,
    private readonly toast: ToastService,
    private readonly router: Router,
  ) {}

  public onPasteInput(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    this.raw.set(el.value);
    this.parseMessage.set(null);
  }

  public goPreview(): void {
    const result = buildImportPastePreview(this.raw());
    if (!result.ok) {
      this.parseMessage.set(result.message);
      return;
    }
    this.parseMessage.set(null);
    this.previewItems.set(result.items);
    this.rowOverrides.set({});
    this.importSummary.set(null);
    this.importResultRows.set([]);
    this.importBlockingIssues.set([]);
    this.importBlockingIssueIdx.set(0);
    this.clearMappingState();
    this.step.set(2);
  }

  public backToPaste(): void {
    this.clearMappingState();
    this.importResultRows.set([]);
    this.importBlockingIssues.set([]);
    this.importBlockingIssueIdx.set(0);
    this.importSummary.set(null);
    this.step.set(1);
  }

  public goImportAnother(): void {
    this.importResultRows.set([]);
    this.importSummary.set(null);
    this.importBlockingIssues.set([]);
    this.importBlockingIssueIdx.set(0);
    this.raw.set('');
    this.previewItems.set([]);
    this.rowOverrides.set({});
    this.clearMappingState();
    this.step.set(1);
  }

  public goFieldMapping(): void {
    const items = this.previewItems();
    const eff = (i: number) => this.effectiveItemType(i);
    const groups = buildImportMappingGroups(items, eff);
    const maps: Record<string, Record<string, string>> = {};
    for (const g of groups) {
      maps[g.id] = sanitizeImportKeyMapValues(
        g.itemType,
        buildSuggestedKeyMap(g.itemType, g.sourceKeys, this.sampleRawForGroup(g.id)),
      );
    }
    this.mappingGroups.set(groups);
    this.fieldMapsByGroup.set(maps);
    this.rowIndexToGroupId.set(buildRowIndexToGroupId(items, eff));
    this.step.set(3);
  }

  public backToReview(): void {
    this.step.set(2);
  }

  public selectOptionsForType(itemType: string) {
    return getImportFieldSelectOptions(itemType);
  }

  /**
   * Step-2 review: human-readable vault field for this source key (suggestions until step 3 overrides exist).
   */
  public previewMappedVaultLabel(rowIndex: number, sourceKey: string): string {
    if (sourceKey === '…' || sourceKey === '(array)' || sourceKey === '(object)') {
      return '—';
    }
    const itemType = this.effectiveItemType(rowIndex);
    const map = this.resolvedKeyMapForRow(rowIndex);
    const rawTarget = map[sourceKey] ?? suggestImportTargetForSourceKey(sourceKey, itemType);
    const targetKey = coerceImportMapSelectValue(itemType, rawTarget);
    const opts = getImportFieldSelectOptions(itemType);
    return opts.find((o) => o.value === targetKey)?.label ?? targetKey;
  }

  private resolvedKeyMapForRow(rowIndex: number): Record<string, string> {
    const items = this.previewItems();
    const itemType = this.effectiveItemType(rowIndex);
    const maps = this.fieldMapsByGroup();
    const gid = this.rowIndexToGroupId()[rowIndex];
    if (maps && gid && maps[gid]) {
      return sanitizeImportKeyMapValues(itemType, maps[gid]);
    }
    const row = items[rowIndex];
    if (!row) {
      return {};
    }
    return buildSuggestedKeyMap(itemType, extractImportSourceKeys(row.raw), row.raw);
  }

  /** Source keys that share the same vault target in this group’s map (step 3). */
  public duplicateMapTargetsForGroup(g: ImportMappingGroup): ReadonlyArray<{ target: string; sources: string[] }> {
    const km = this.fieldMapsByGroup()?.[g.id];
    if (!km) {
      return [];
    }
    return findDuplicateImportMapTargets(sanitizeImportKeyMapValues(g.itemType, km));
  }

  public fieldMapSelectValue(g: ImportMappingGroup, src: string): string {
    const raw =
      this.fieldMapsByGroup()?.[g.id]?.[src] ??
      buildSuggestedKeyMap(g.itemType, g.sourceKeys, this.sampleRawForGroup(g.id))[src];
    return coerceImportMapSelectValue(g.itemType, raw);
  }

  public onGroupMapChange(groupId: string, sourceKey: string, event: Event): void {
    const el = event.target as HTMLSelectElement;
    const v = el.value;
    const g = this.mappingGroups().find((x) => x.id === groupId);
    if (!g) {
      return;
    }
    const itemType = g.itemType;
    this.fieldMapsByGroup.update((maps) => {
      if (!maps) {
        return maps;
      }
      const cur = maps[groupId];
      if (!cur) {
        return maps;
      }
      const next = sanitizeImportKeyMapValues(itemType, { ...cur, [sourceKey]: v });
      if (findDuplicateImportMapTargets(next).length > 0) {
        queueMicrotask(() => {
          el.value = coerceImportMapSelectValue(
            itemType,
            cur[sourceKey] ??
              buildSuggestedKeyMap(itemType, g.sourceKeys, this.sampleRawForGroup(g.id))[sourceKey],
          );
        });
        this.toast.info('That vault field is already mapped from another source key. Choose a different field.');
        return maps;
      }
      return { ...maps, [groupId]: next };
    });
  }

  public resetGroupMap(g: ImportMappingGroup): void {
    this.fieldMapsByGroup.update((maps) => {
      if (!maps) {
        return maps;
      }
      return {
        ...maps,
        [g.id]: sanitizeImportKeyMapValues(
          g.itemType,
          buildSuggestedKeyMap(g.itemType, g.sourceKeys, this.sampleRawForGroup(g.id)),
        ),
      };
    });
  }

  private sampleRawForGroup(groupId: string): unknown {
    const items = this.previewItems();
    const groupRows = items.filter(
      (row) => importMappingGroupId(row.raw, this.effectiveItemType(row.index)) === groupId,
    );
    return mergeImportSampleRawsForSuggestion(groupRows.map((r) => r.raw));
  }

  public effectiveItemType(index: number): string {
    const o = this.rowOverrides()[index];
    if (o) {
      return o;
    }
    return this.classifications()[index]?.suggestedItemType ?? 'credential:generic';
  }

  public rowSelectValue(index: number): string {
    return this.rowOverrides()[index] ?? '';
  }

  public onRowCategoryChange(index: number, event: Event): void {
    const v = (event.target as HTMLSelectElement).value;
    const suggested = this.classifications()[index]?.suggestedItemType ?? '';
    this.rowOverrides.update((m) => {
      const next = { ...m };
      if (v === '' || v === suggested) {
        delete next[index];
      } else {
        next[index] = v;
      }
      return next;
    });
    this.clearMappingState();
  }

  private clearMappingState(): void {
    this.mappingGroups.set([]);
    this.fieldMapsByGroup.set(null);
    this.rowIndexToGroupId.set({});
  }

  private normalizeOptionsForRow(index: number, titleFallback: string): { titleFallback: string; keyMap?: Record<string, string> } {
    const maps = this.fieldMapsByGroup();
    if (!maps) {
      return { titleFallback };
    }
    const gid = this.rowIndexToGroupId()[index];
    const km = gid ? maps[gid] : undefined;
    if (!km || Object.keys(km).length === 0) {
      return { titleFallback };
    }
    const itemType = this.effectiveItemType(index);
    return { titleFallback, keyMap: sanitizeImportKeyMapValues(itemType, km) };
  }

  public rowValidationMessage(index: number): string | null {
    const row = this.previewItems()[index];
    if (!row) {
      return null;
    }
    const itemType = this.effectiveItemType(index);
    const msgs = collectImportRowValidationMessages(row.raw, itemType, this.normalizeOptionsForRow(index, row.title));
    return msgs.length ? msgs.join(' · ') : null;
  }

  public prevBlockingIssue(): void {
    this.importBlockingIssueIdx.update((i) => Math.max(0, i - 1));
  }

  public nextBlockingIssue(): void {
    const max = this.importBlockingIssues().length - 1;
    this.importBlockingIssueIdx.update((i) => Math.min(max, i + 1));
  }

  public async runImport(): Promise<void> {
    if (this.importFieldMapBlocked()) {
      this.toast.error(this.importFieldMapBlockedReason() ?? 'Fix field mapping before import.');
      return;
    }
    if (!this.vaultSession.isUnlocked()) {
      this.toast.error(
        'Vault is locked. Use the unlock dialog when prompted, or open Encrypted vault; idle timeout presets are on Vault → Session.',
      );
      return;
    }

    this.importBusy.set(true);
    this.importSummary.set(null);
    this.importBlockingIssues.set([]);
    this.importBlockingIssueIdx.set(0);

    const rows = this.previewItems();
    const buildTableRows = (rowIndex: number, row: ImportPreviewItem): ImportResultItemRow['tableRows'] =>
      row.fields.map((f) => ({
        sourceKey: f.key,
        value: f.value,
        mapsTo: this.previewMappedVaultLabel(rowIndex, f.key),
      }));

    const baseResultRows: ImportResultItemRow[] = rows.map((row) => ({
      index: row.index,
      title: row.title,
      itemType: this.effectiveItemType(row.index),
      outcome: 'skipped_prep',
      detail: 'Not processed.',
      tableRows: buildTableRows(row.index, row),
    }));

    const validationIssues = buildImportBlockingIssuesFromValidation(
      rows,
      (i) => this.effectiveItemType(i),
      (i, t) => this.normalizeOptionsForRow(i, t),
    );

    if (validationIssues.length > 0) {
      const cancelledDetail =
        'Not imported: import runs only when every row passes checks (all-or-nothing).';
      const resultRows = baseResultRows.map((r) => {
        const hit = validationIssues.find((x) => x.rowIndex === r.index);
        if (hit) {
          return {
            ...r,
            outcome: 'skipped_prep' as const,
            detail: hit.messages.join(' · '),
          };
        }
        return { ...r, detail: cancelledDetail };
      });
      this.importBlockingIssues.set([...validationIssues]);
      this.importBlockingIssueIdx.set(0);
      this.importSummary.set(
        `Import did not run. Nothing was saved. ${String(validationIssues.length)} row(s) failed validation.`,
      );
      this.importResultRows.set(resultRows);
      this.importBusy.set(false);
      this.step.set(4);
      this.toast.error('Import did not run. Review each issue below, fix the data or field map, then try again.');
      return;
    }

    const encryptIssues: ImportBlockingIssue[] = [];
    const encryptPayloadByRow = new Map<number, VaultBulkItemRow>();

    for (const row of rows) {
      const itemType = this.effectiveItemType(row.index);
      const { record } = normalizeImportRow(row.raw, itemType, this.normalizeOptionsForRow(row.index, row.title));
      try {
        const payload = await encryptImportRow(this.crypto, record, itemType);
        const titleSw = row.title.trim();
        const searchable_words =
          titleSw.length > 0 ? titleSw.slice(0, VAULT_SEARCHABLE_WORDS_MAX_LENGTH) : undefined;
        const rowPayload: VaultBulkItemRow = {
          ...payload,
          client_index: row.index,
          ...(searchable_words !== undefined ? { searchable_words } : {}),
        };
        encryptPayloadByRow.set(row.index, rowPayload);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Encrypt failed';
        encryptIssues.push({
          rowIndex: row.index,
          rowNumber: row.index + 1,
          title: row.title,
          messages: [msg],
          kind: 'encrypt',
        });
      }
    }

    if (encryptIssues.length > 0) {
      encryptIssues.sort((a, b) => a.rowIndex - b.rowIndex);
      const bad = new Set(encryptIssues.map((x) => x.rowIndex));
      const cancelledDetail =
        'Not imported: encryption failed on at least one row (all-or-nothing).';
      const resultRows = baseResultRows.map((r) => {
        if (bad.has(r.index)) {
          const hit = encryptIssues.find((x) => x.rowIndex === r.index);
          const detail = hit ? hit.messages.join(' · ') : cancelledDetail;
          return { ...r, outcome: 'skipped_prep' as const, detail };
        }
        if (encryptPayloadByRow.has(r.index)) {
          return { ...r, outcome: 'skipped_prep' as const, detail: cancelledDetail };
        }
        return { ...r, detail: cancelledDetail };
      });
      this.importBlockingIssues.set([...encryptIssues]);
      this.importBlockingIssueIdx.set(0);
      this.importSummary.set(
        `Import did not run. Nothing was saved. ${String(encryptIssues.length)} row(s) failed encryption.`,
      );
      this.importResultRows.set(resultRows);
      this.importBusy.set(false);
      this.step.set(4);
      this.toast.error('Import did not run. Review each issue below, then try again.');
      return;
    }

    const batch: VaultBulkItemRow[] = [];
    for (const row of rows) {
      const p = encryptPayloadByRow.get(row.index);
      if (p) {
        batch.push(p);
      }
    }

    if (batch.length === 0) {
      this.importBusy.set(false);
      this.importSummary.set('Nothing to import.');
      this.importResultRows.set([...baseResultRows]);
      this.step.set(4);
      this.toast.error('No rows to import.');
      return;
    }

    const resultRowsEncryptOk = baseResultRows.map((r) => ({
      ...r,
      outcome: 'pending_server' as const,
      detail: undefined,
    }));

    const importBatchId = globalThis.crypto.randomUUID();
    const maxBulk = VAULT_BULK_CREATE_MAX_ITEMS;
    const mergedResults: VaultBulkCreateResponse['results'] = [];

    try {
      for (let offset = 0; offset < batch.length; offset += maxBulk) {
        const slice = batch.slice(offset, offset + maxBulk);
        const res = await firstValueFrom(this.vault.createItemsBulk(importBatchId, slice));
        mergedResults.push(...res.results);
      }
    } catch (err: unknown) {
      this.importBusy.set(false);
      let msg = 'Import failed';
      if (err instanceof HttpErrorResponse && err.error !== null && typeof err.error === 'object') {
        const body = err.error as { message?: string; error?: string };
        if (typeof body.message === 'string' && body.message !== '') {
          msg = body.message;
        } else if (body.error === 'vault_import_requires_upgrade') {
          msg = 'Vault import requires a paid plan. Open Subscription to upgrade.';
        } else if (body.error === 'vault_item_limit_reached') {
          msg = 'Plan item limit reached. Upgrade or delete items, then try import again.';
        }
      } else if (err && typeof err === 'object' && 'error' in err) {
        const nested = (err as { error?: { error?: string } }).error?.error;
        if (typeof nested === 'string' && nested !== '') {
          msg = nested;
        }
      }
      this.toast.error(msg);
      return;
    }

    const nextRows: ImportResultItemRow[] = resultRowsEncryptOk.map((r) => ({
      ...r,
      tableRows: [...r.tableRows],
    }));
    for (const br of mergedResults) {
      const row = nextRows[br.client_index];
      if (!row) {
        continue;
      }
      if (br.status === 'ok') {
        row.outcome = 'uploaded';
        row.vaultItemId = br.id;
        row.detail = undefined;
      } else {
        row.outcome = 'server_rejected';
        row.detail = br.error ?? 'Server rejected this item.';
      }
    }
    const ok = mergedResults.filter((r) => r.status === 'ok').length;
    const fail = mergedResults.filter((r) => r.status !== 'ok').length;
    const batchCount = Math.ceil(batch.length / maxBulk);
    const toastMsg =
      batchCount > 1 ? `Imported ${String(ok)} item(s) in ${String(batchCount)} batches.` : `Imported ${String(ok)} item(s).`;

    const allImportedOk =
      mergedResults.length === batch.length && mergedResults.every((r) => r.status === 'ok');

    this.importBusy.set(false);

    if (allImportedOk) {
      this.toast.success(toastMsg);
      void this.router.navigateByUrl(this.encryptedVaultRoute);
      return;
    }

    const parts: string[] = [`Imported ${ok} item(s).`];
    if (batchCount > 1) {
      parts.push(`Sent in ${String(batchCount)} bulk request(s) of up to ${String(maxBulk)} items.`);
    }
    if (fail) {
      parts.push(`${fail} rejected by server.`);
    }
    this.importBlockingIssues.set([]);
    this.importBlockingIssueIdx.set(0);
    this.importSummary.set(parts.join(' '));
    this.importResultRows.set(nextRows);
    this.toast.success(toastMsg);
    this.step.set(4);
  }
}
