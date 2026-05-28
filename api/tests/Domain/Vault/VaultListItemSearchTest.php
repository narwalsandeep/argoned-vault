<?php

declare(strict_types=1);

namespace Blackbox\Tests\Domain\Vault;

use Blackbox\Domain\Vault\VaultListItemSearch;
use PHPUnit\Framework\TestCase;

final class VaultListItemSearchTest extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    private static function row(
        string $id,
        string $itemType,
        ?string $searchable,
        ?int $displayNumber = null,
    ): array {
        $r = [
            'id' => $id,
            'item_type' => $itemType,
            'searchable_words' => $searchable,
        ];
        if ($displayNumber !== null) {
            $r['display_number'] = $displayNumber;
        }

        return $r;
    }

    public function testEmptyQueryMatches(): void
    {
        $row = self::row('a', 'password', 'x');
        $this->assertTrue(VaultListItemSearch::matches('', $row, false, false));
    }

    public function testMetadataMatchIsCaseInsensitive(): void
    {
        $row = self::row('Item-ABC', 'password', null);
        $this->assertTrue(VaultListItemSearch::matches('ITEM-abc', $row, false, false));
        $this->assertTrue(VaultListItemSearch::matches('password', $row, false, false));
    }

    public function testSearchableSubstringDefault(): void
    {
        $row = self::row('x', 'password', 'Bank login production');
        $this->assertTrue(VaultListItemSearch::matches('production', $row, false, false));
        $this->assertTrue(VaultListItemSearch::matches('missing bank', $row, false, false));
        $this->assertFalse(VaultListItemSearch::matches('missing', $row, false, false));
    }

    public function testFullWordRequiresWholePhraseInSearchable(): void
    {
        $row = self::row('x', 'password', 'alpha beta gamma');
        $this->assertTrue(VaultListItemSearch::matches('alpha beta', $row, true, false));
        $this->assertFalse(VaultListItemSearch::matches('beta alpha', $row, true, false));
    }

    public function testCaseSensitiveSearchable(): void
    {
        $row = self::row('x', 'password', 'FooBar');
        $this->assertTrue(VaultListItemSearch::matches('Foo', $row, false, true));
        $this->assertFalse(VaultListItemSearch::matches('foo', $row, false, true));
    }

    public function testDisplayNumberFilter(): void
    {
        $row = self::row('x', 'password', 'z', 12);
        $this->assertTrue(VaultListItemSearch::matches('#12', $row, false, false));
        $this->assertFalse(VaultListItemSearch::matches('#13', $row, false, false));
    }
}
