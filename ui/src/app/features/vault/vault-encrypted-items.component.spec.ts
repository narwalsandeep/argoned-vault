import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '../../core/ui/toast.service';
import { VaultSessionService } from '../../core/vault/vault-session.service';
import { VaultService } from '../../core/vault/vault.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import {
  flattenDecryptedPayloadForDisplay,
  parseVaultListSearchTokens,
  sortVaultItemListEntriesByDisplayNumber,
  tokenizeVaultListSearchQuery,
  type VaultItemListEntry,
  vaultListEntryMatchesSearchTokens,
  VaultEncryptedItemsComponent,
  isVaultDetailFieldAlwaysVisible,
  maskVaultDetailValue,
  sortDecryptedDetailRowsForDisplay,
} from './vault-encrypted-items.component';

describe('isVaultDetailFieldAlwaysVisible', () => {
  it('is true only for name and url keys', () => {
    expect(isVaultDetailFieldAlwaysVisible('name')).toBe(true);
    expect(isVaultDetailFieldAlwaysVisible('url')).toBe(true);
    expect(isVaultDetailFieldAlwaysVisible('username')).toBe(false);
    expect(isVaultDetailFieldAlwaysVisible('title')).toBe(false);
    expect(isVaultDetailFieldAlwaysVisible('alternative_url')).toBe(false);
  });
});

describe('sortDecryptedDetailRowsForDisplay', () => {
  it('orders name and url before other keys', () => {
    const sorted = sortDecryptedDetailRowsForDisplay([
      { key: 'password', value: 'x' },
      { key: 'url', value: 'https://a' },
      { key: 'name', value: 'Bank' },
      { key: 'username', value: 'u' },
    ]);
    expect(sorted.map((r) => r.key)).toEqual(['name', 'url', 'password', 'username']);
  });
});

describe('maskVaultDetailValue', () => {
  it('masks each code point with asterisks', () => {
    expect(maskVaultDetailValue('ab')).toBe('**');
    expect(maskVaultDetailValue('a\nb')).toBe('***');
  });

  it('returns empty string for empty input', () => {
    expect(maskVaultDetailValue('')).toBe('');
  });
});

describe('flattenDecryptedPayloadForDisplay', () => {
  it('flattens nested objects with dotted keys', () => {
    expect(flattenDecryptedPayloadForDisplay({ outer: { inner: 'secret' } })).toEqual([{ key: 'outer.inner', value: 'secret' }]);
  });

  it('omits null, empty string, empty object, and empty array', () => {
    expect(
      flattenDecryptedPayloadForDisplay({
        a: null,
        b: '',
        c: '   ',
        d: {},
        e: [],
        f: 0,
        g: false,
      }),
    ).toEqual([
      { key: 'f', value: '0' },
      { key: 'g', value: 'false' },
    ]);
  });

  it('stringifies non-plain values as one row', () => {
    expect(flattenDecryptedPayloadForDisplay({ tags: ['a', 'b'] })).toEqual([{ key: 'tags', value: '["a","b"]' }]);
  });
});

describe('tokenizeVaultListSearchQuery', () => {
  it('splits on spaces, commas, semicolons, slashes, and pipes', () => {
    expect(tokenizeVaultListSearchQuery('  alpha, beta;gamma/delta|eps  ')).toEqual(['alpha', 'beta', 'gamma', 'delta', 'eps']);
  });

  it('preserves segment casing', () => {
    expect(tokenizeVaultListSearchQuery('Foo BAR')).toEqual(['Foo', 'BAR']);
  });

  it('returns empty array for blank input', () => {
    expect(tokenizeVaultListSearchQuery('   ')).toEqual([]);
  });
});

describe('parseVaultListSearchTokens', () => {
  it('extracts #number tokens and leaves other text separate', () => {
    expect(parseVaultListSearchTokens(' bank #12 ')).toEqual({ textTokens: ['bank'], displayNumbers: [12] });
    expect(parseVaultListSearchTokens('#007')).toEqual({ textTokens: [], displayNumbers: [7] });
  });
});

describe('sortVaultItemListEntriesByDisplayNumber', () => {
  const row = (id: string, display_number: number | undefined): VaultItemListEntry => ({
    id,
    display_number,
    item_type: 'password',
    crypto_version: 1,
    searchable_words: null,
  });

  it('orders by display_number ascending; missing numbers last; tie-break by id', () => {
    const sorted = sortVaultItemListEntriesByDisplayNumber([
      row('c', 3),
      row('a', undefined),
      row('b', 1),
      row('d', 2),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(['b', 'd', 'c', 'a']);
  });
});

describe('vaultListEntryMatchesSearchTokens', () => {
  const entry = {
    id: 'item-abc',
    display_number: 12,
    item_type: 'password',
    crypto_version: 1,
    searchable_words: 'bank login production',
  } as const;

  it('matches when every text token appears in searchable words or metadata', () => {
    expect(vaultListEntryMatchesSearchTokens(entry, 'production')).toBe(true);
    expect(vaultListEntryMatchesSearchTokens(entry, 'bank production')).toBe(true);
    expect(vaultListEntryMatchesSearchTokens(entry, 'production bank')).toBe(true);
    expect(vaultListEntryMatchesSearchTokens(entry, 'missing bank')).toBe(false);
    expect(vaultListEntryMatchesSearchTokens(entry, 'missing')).toBe(false);
  });

  it('matches all tokens in any order when exact word is off', () => {
    const row = {
      id: 'x',
      display_number: 1,
      item_type: 'password',
      crypto_version: 1,
      searchable_words: 'aws rds password',
    } as const;
    expect(vaultListEntryMatchesSearchTokens(row, 'aws password rds')).toBe(true);
    expect(vaultListEntryMatchesSearchTokens(row, 'rds password aws')).toBe(true);
  });

  it('matches tokens against id and item_type', () => {
    expect(vaultListEntryMatchesSearchTokens(entry, 'item-abc')).toBe(true);
    expect(vaultListEntryMatchesSearchTokens(entry, 'password')).toBe(true);
  });

  it('exact word option requires whole phrase in searchable words', () => {
    const row = {
      id: 'x',
      display_number: 1,
      item_type: 'password',
      crypto_version: 1,
      searchable_words: 'alpha beta gamma',
    } as const;
    expect(vaultListEntryMatchesSearchTokens(row, 'alpha beta', { exactWord: true })).toBe(true);
    expect(vaultListEntryMatchesSearchTokens(row, 'beta alpha', { exactWord: true })).toBe(false);
  });

  it('exact word option requires contiguous phrase order', () => {
    const row = {
      id: 'x',
      display_number: 1,
      item_type: 'password',
      crypto_version: 1,
      searchable_words: 'prod aws password rds backup',
    } as const;
    expect(vaultListEntryMatchesSearchTokens(row, 'aws password rds', { exactWord: true })).toBe(true);
    expect(
      vaultListEntryMatchesSearchTokens(
        { ...row, searchable_words: 'aws rds password' },
        'aws password rds',
        { exactWord: true },
      ),
    ).toBe(false);
  });

  it('caseSensitive option applies to searchable words only', () => {
    const row = {
      id: 'x',
      display_number: 1,
      item_type: 'password',
      crypto_version: 1,
      searchable_words: 'FooBar',
    } as const;
    expect(vaultListEntryMatchesSearchTokens(row, 'Foo', { caseSensitive: true })).toBe(true);
    expect(vaultListEntryMatchesSearchTokens(row, 'foo', { caseSensitive: true })).toBe(false);
  });

  it('requires exact display number for # tokens', () => {
    expect(vaultListEntryMatchesSearchTokens(entry, '#12')).toBe(true);
    expect(vaultListEntryMatchesSearchTokens(entry, '#13')).toBe(false);
    expect(vaultListEntryMatchesSearchTokens(entry, 'bank #12')).toBe(true);
    expect(vaultListEntryMatchesSearchTokens(entry, 'bank #99')).toBe(false);
  });

  it('does not match # filter when entry has no display_number', () => {
    const noNum = { ...entry, display_number: undefined };
    expect(vaultListEntryMatchesSearchTokens(noNum, '#12')).toBe(false);
  });
});

describe('VaultEncryptedItemsComponent', () => {
  let vaultService: {
    listItems: ReturnType<typeof vi.fn>;
    getItem: ReturnType<typeof vi.fn>;
    deleteItem: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vaultService = {
      listItems: vi.fn().mockReturnValue(of([])),
      getItem: vi.fn(),
      deleteItem: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [VaultEncryptedItemsComponent],
      providers: [
        provideRouter([]),
        { provide: VaultService, useValue: vaultService as unknown as VaultService },
        {
          provide: WebCryptoService,
          useValue: {
            isVaultUnlocked: vi.fn().mockReturnValue(false),
            noteActivity: vi.fn(),
            decryptItemPayload: vi.fn(),
          } as unknown as WebCryptoService,
        },
        {
          provide: VaultSessionService,
          useValue: {
            isUnlocked: () => false,
            vaultKeyCleared$: EMPTY,
          } as unknown as VaultSessionService,
        },
        { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn(), info: vi.fn() } as unknown as ToastService },
      ],
    }).compileComponents();
  });

  it('does not render search when the vault list is empty', () => {
    const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#vault-items-search')).toBeNull();
  });

  it('renders search outside the encrypted items list section when items exist', () => {
    vaultService.listItems.mockReturnValue(
      of([
        {
          id: 'item-1',
          item_type: 'note',
          crypto_version: 1,
          display_number: 1,
          searchable_words: null,
        },
      ]),
    );
    const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const search = el.querySelector('#vault-items-search');
    const listSection = el.querySelector('section[aria-label="Encrypted items list"]');
    expect(search).not.toBeNull();
    expect(listSection).not.toBeNull();
    expect(listSection?.contains(search)).toBe(false);
  });

  it('shows empty vault guidance with link to create when there are no items', () => {
    const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No encrypted rows indexed');
    expect(el.textContent).toMatch(/sidebar|left rail/i);
    expect(el.textContent).toContain('Client-side ciphertext');
    expect(el.textContent).toContain('items: 0');
    const createLink = el.querySelector('a[href="/new"]');
    expect(createLink).not.toBeNull();
    expect(createLink?.textContent).toContain('Create an item');
    expect(vaultService.listItems).toHaveBeenCalledWith(undefined);
  });

  it('listItemSearchableWordsLine returns trimmed keywords or null when empty', () => {
    const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
    const c = fixture.componentInstance;
    const base = { id: 'x', item_type: 'password', crypto_version: 1 } as const;
    expect(c.listItemSearchableWordsLine({ ...base, searchable_words: null })).toBeNull();
    expect(c.listItemSearchableWordsLine({ ...base, searchable_words: '  ' })).toBeNull();
    expect(c.listItemSearchableWordsLine({ ...base, searchable_words: ' bank prod ' })).toBe('bank prod');
  });

  it('listItemPrimaryLine prefers searchable words over type label', () => {
    const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
    const c = fixture.componentInstance;
    const base = { id: 'x', item_type: 'credential:website', crypto_version: 1 } as const;
    expect(c.listItemPrimaryLine({ ...base, searchable_words: 'bank login' })).toBe('bank login');
    expect(c.listItemPrimaryLine({ ...base, searchable_words: null })).toBe('Website');
  });

  it('listItemTypeSubtitle shows type only when keywords are present', () => {
    const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
    const c = fixture.componentInstance;
    const base = { id: 'x', item_type: 'key', crypto_version: 1 } as const;
    expect(c.listItemTypeSubtitle({ ...base, searchable_words: 'prod ssh' })).toBe('Key');
    expect(c.listItemTypeSubtitle({ ...base, searchable_words: null })).toBeNull();
  });

  it('openDeleteItemConfirm opens dialog; confirmDeleteItem calls deleteItem', () => {
    const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
    const c = fixture.componentInstance;
    expect(c.deleteItemConfirmOpen()).toBe(false);
    c.openDeleteItemConfirm('item-99');
    expect(c.deleteItemConfirmOpen()).toBe(true);
    c.confirmDeleteItem();
    expect(c.deleteItemConfirmOpen()).toBe(false);
    expect(vaultService.deleteItem).toHaveBeenCalledWith('item-99');
  });

  it('closeDeleteItemConfirm clears dialog without calling deleteItem', () => {
    const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
    const c = fixture.componentInstance;
    c.openDeleteItemConfirm('item-99');
    c.closeDeleteItemConfirm();
    expect(c.deleteItemConfirmOpen()).toBe(false);
    expect(vaultService.deleteItem).not.toHaveBeenCalled();
  });

  it('defaults search exact-word and match-case toggles to Off', () => {
    const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
    const c = fixture.componentInstance;
    expect(c.searchExactWord()).toBe(false);
    expect(c.searchCaseSensitive()).toBe(false);
  });

  it('copyDetailValue sets detailCopiedKeyPath for 2s then clears', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
      const c = fixture.componentInstance;
      await c.copyDetailValue('secret', 'password.value');
      expect(writeText).toHaveBeenCalledWith('secret');
      expect(c.detailCopiedKeyPath()).toBe('password.value');
      vi.advanceTimersByTime(1999);
      expect(c.detailCopiedKeyPath()).toBe('password.value');
      vi.advanceTimersByTime(1);
      expect(c.detailCopiedKeyPath()).toBeNull();
    } finally {
      vi.useRealTimers();
      Reflect.deleteProperty(globalThis.navigator, 'clipboard');
    }
  });

  it('copyDetailValue flashes the detail row briefly', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
      const c = fixture.componentInstance;
      await c.copyDetailValue('secret', 'password.value');
      expect(c.detailRowCopyFlashingKey()).toBe('password.value');
      vi.advanceTimersByTime(649);
      expect(c.detailRowCopyFlashingKey()).toBe('password.value');
      vi.advanceTimersByTime(1);
      expect(c.detailRowCopyFlashingKey()).toBeNull();
    } finally {
      raf.mockRestore();
      vi.useRealTimers();
      Reflect.deleteProperty(globalThis.navigator, 'clipboard');
    }
  });

  it('toggleDetailFieldReveal toggles masked vs revealed display without changing copy payload', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
    const c = fixture.componentInstance;
    expect(c.detailFieldIsRevealed('k')).toBe(false);
    expect(c.detailValueDisplay({ key: 'k', value: 'hi' })).toBe('**');
    c.toggleDetailFieldReveal('k');
    expect(c.detailFieldIsRevealed('k')).toBe(true);
    expect(c.detailValueDisplay({ key: 'k', value: 'hi' })).toBe('hi');
    await c.copyDetailValue('hi', 'k');
    expect(writeText).toHaveBeenCalledWith('hi');
    Reflect.deleteProperty(globalThis.navigator, 'clipboard');
  });

  it('detailValueDisplay shows name and url without reveal', () => {
    const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
    const c = fixture.componentInstance;
    expect(c.detailValueDisplay({ key: 'name', value: 'My Bank' })).toBe('My Bank');
    expect(c.detailValueDisplay({ key: 'url', value: 'https://example.com' })).toBe('https://example.com');
    expect(c.detailValueDisplay({ key: 'username', value: 'user@x.com' })).toBe(maskVaultDetailValue('user@x.com'));
    expect(c.detailFieldAlwaysVisible('name')).toBe(true);
    c.toggleDetailFieldReveal('name');
    expect(c.detailFieldIsRevealed('name')).toBe(false);
    expect(c.detailValueDisplay({ key: 'name', value: 'My Bank' })).toBe('My Bank');
  });

  it('detailRowCopyHint reflects copied feedback state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
    const c = fixture.componentInstance;
    expect(c.detailRowCopyHint('password')).toContain('Copy');
    await c.copyDetailValue('x', 'password');
    expect(c.detailRowCopyHint('password')).toContain('Copied');
    Reflect.deleteProperty(globalThis.navigator, 'clipboard');
  });

  it('onDetailRowCopySpace prevents default and copies', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const fixture = TestBed.createComponent(VaultEncryptedItemsComponent);
    const c = fixture.componentInstance;
    const ev = new KeyboardEvent('keydown', { key: ' ' });
    const preventDefault = vi.spyOn(ev, 'preventDefault');
    await c.onDetailRowCopySpace(ev, 'secret', 'field');
    expect(preventDefault).toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith('secret');
    Reflect.deleteProperty(globalThis.navigator, 'clipboard');
  });
});
