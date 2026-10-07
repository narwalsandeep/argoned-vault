<?php

declare(strict_types=1);

namespace Blackbox\Tests\Domain\Vault;

use Blackbox\Domain\Vault\ShareAccessCodeFormat;
use PHPUnit\Framework\TestCase;

final class ShareAccessCodeFormatTest extends TestCase
{
    public function testAcceptsValidAccessCode(): void
    {
        $this->assertTrue(ShareAccessCodeFormat::isValid('ABCD-EFGH-IJKL-MNOP'));
        $this->assertSame('ABCD-EFGH-IJKL-MNOP', ShareAccessCodeFormat::normalize("  ABCD-EFGH-IJKL-MNOP  "));
    }

    public function testRejectsInvalidAccessCode(): void
    {
        $this->assertFalse(ShareAccessCodeFormat::isValid(''));
        $this->assertFalse(ShareAccessCodeFormat::isValid('ABCD-EFGH'));
        $this->assertFalse(ShareAccessCodeFormat::isValid('ABCD-EFGH-IJKL-MNOP-EXTRA'));
    }
}
