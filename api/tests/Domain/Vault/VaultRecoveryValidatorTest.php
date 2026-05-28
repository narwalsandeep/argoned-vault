<?php

declare(strict_types=1);

namespace Blackbox\Tests\Domain\Vault;

use Blackbox\Domain\Vault\VaultRecoveryValidator;
use PHPUnit\Framework\TestCase;

final class VaultRecoveryValidatorTest extends TestCase
{
    public function testRejectsInvalidBase64Payload(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        VaultRecoveryValidator::validateArtifact([
            'artifact_type' => 'recovery_key_wrap',
            'wrapped_vault_key_recovery' => 'not-base64',
            'nonce' => 'bm9uY2U=',
            'tag' => 'dGFn',
        ]);
    }

    public function testAcceptsValidPayload(): void
    {
        $payload = VaultRecoveryValidator::validateArtifact([
            'artifact_type' => 'recovery_key_wrap',
            'wrapped_vault_key_recovery' => base64_encode('wrapped'),
            'nonce' => base64_encode('nonce'),
            'tag' => base64_encode('tag'),
        ]);

        $this->assertSame('recovery_key_wrap', $payload['artifact_type']);
    }
}

