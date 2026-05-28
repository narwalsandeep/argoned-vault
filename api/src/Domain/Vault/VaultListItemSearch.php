<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

/**
 * Vault item list search: metadata (id, item_type, label) plus `searchable_words` with optional full-phrase and case-sensitive matching on searchable text only.
 */
final class VaultListItemSearch
{
    /** @var array<string, string> */
    private const CREDENTIAL_SUBTYPE_LABELS = [
        'website' => 'Website',
        'app' => 'App',
        'email' => 'Email',
        'database' => 'Database',
        'ssh' => 'SSH',
        'api-key' => 'API key',
        'license' => 'Software license',
        'generic' => 'Generic',
    ];

    /**
     * @param array<string, mixed> $row Metadata row (id, display_number, item_type, searchable_words, …)
     */
    public static function matches(string $rawQuery, array $row, bool $fullWord, bool $caseSensitive): bool
    {
        $trimmed = trim($rawQuery);
        if ($trimmed === '') {
            return true;
        }

        $parsed = self::parseSearchTokens($trimmed);
        /** @var list<string> $textTokens */
        $textTokens = $parsed['textTokens'];
        /** @var list<int> $displayNumbers */
        $displayNumbers = $parsed['displayNumbers'];

        if ($displayNumbers !== []) {
            $num = isset($row['display_number']) ? (int) $row['display_number'] : null;
            if ($num === null || !in_array($num, $displayNumbers, true)) {
                return false;
            }
        }

        if ($textTokens === []) {
            return true;
        }

        $id = strtolower((string) ($row['id'] ?? ''));
        $itemType = strtolower((string) ($row['item_type'] ?? ''));
        $label = strtolower(self::itemTypeLabel((string) ($row['item_type'] ?? '')));
        $metaHaystack = "{$itemType} {$id} {$label}";

        $swRaw = $row['searchable_words'] ?? null;
        $sw = is_string($swRaw) ? $swRaw : '';

        foreach ($textTokens as $token) {
            if (str_contains($metaHaystack, strtolower($token))) {
                return true;
            }
        }

        return self::searchableWordsMatch($sw, $textTokens, $fullWord, $caseSensitive);
    }

    public static function itemTypeLabel(string $itemType): string
    {
        if (str_starts_with($itemType, 'credential:')) {
            $sub = substr($itemType, strlen('credential:'));
            return self::CREDENTIAL_SUBTYPE_LABELS[$sub] ?? $sub;
        }
        if ($itemType === 'credential') {
            return 'Credential';
        }

        return match ($itemType) {
            'id' => 'ID',
            'password' => 'Password',
            'key' => 'Key',
            'secure_note' => 'Secure note',
            default => $itemType,
        };
    }

    /**
     * @return array{textTokens: list<string>, displayNumbers: list<int>}
     */
    public static function parseSearchTokens(string $trimmedRawQuery): array
    {
        $parts = self::tokenizeSearchQuery($trimmedRawQuery);
        $textTokens = [];
        $displayNumbers = [];
        foreach ($parts as $t) {
            if (preg_match('/^#(\d+)$/', $t, $m) === 1) {
                $displayNumbers[] = (int) $m[1];
            } else {
                $textTokens[] = $t;
            }
        }

        return ['textTokens' => $textTokens, 'displayNumbers' => $displayNumbers];
    }

    /**
     * @return list<string>
     */
    public static function tokenizeSearchQuery(string $trimmedRawQuery): array
    {
        if ($trimmedRawQuery === '') {
            return [];
        }
        $chunks = preg_split('/[\s,;\/|]+/u', $trimmedRawQuery) ?: [];
        $out = [];
        foreach ($chunks as $c) {
            $c = trim($c);
            if ($c !== '') {
                $out[] = $c;
            }
        }

        return $out;
    }

    /**
     * @param list<string> $textTokens segments from the query (original case)
     */
    private static function searchableWordsMatch(
        string $sw,
        array $textTokens,
        bool $fullWord,
        bool $caseSensitive,
    ): bool {
        if ($sw === '') {
            return false;
        }

        if ($fullWord) {
            $phrase = implode(' ', $textTokens);
            if ($phrase === '') {
                return false;
            }
            if ($caseSensitive) {
                return str_contains($sw, $phrase);
            }

            return mb_stripos($sw, $phrase, 0, 'UTF-8') !== false;
        }

        foreach ($textTokens as $token) {
            if ($caseSensitive) {
                if (str_contains($sw, $token)) {
                    return true;
                }
            } elseif (mb_stripos($sw, $token, 0, 'UTF-8') !== false) {
                return true;
            }
        }

        return false;
    }
}
