<?php

declare(strict_types=1);

namespace Blackbox\Tests\Domain\Vault;

use Blackbox\Domain\Vault\VaultFilePolicy;
use PHPUnit\Framework\TestCase;

final class VaultFilePolicyTest extends TestCase
{
    public function testMaxFilesPerVaultItem(): void
    {
        $this->assertSame(32, VaultFilePolicy::MAX_FILES_PER_VAULT_ITEM);
    }
}
