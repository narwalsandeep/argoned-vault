<?php

declare(strict_types=1);

namespace Blackbox\Tests\Domain\Vault;

use Blackbox\Domain\Vault\VaultContractValidator;
use PHPUnit\Framework\TestCase;

final class VaultContractValidatorTest extends TestCase
{
    public function testRejectsMissingEncryptedItemFields(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        VaultContractValidator::validateItem(['item_type' => 'credential']);
    }

    public function testAcceptsValidEncryptedItemContract(): void
    {
        $payload = [
            'item_type' => 'credential',
            'wrapped_dek' => base64_encode('dek'),
            'wrapped_dek_nonce' => base64_encode('nonce1'),
            'wrapped_dek_tag' => base64_encode('tag1'),
            'payload_ciphertext' => base64_encode('cipher'),
            'payload_nonce' => base64_encode('nonce2'),
            'payload_tag' => base64_encode('tag2'),
            'crypto_version' => 1,
        ];

        $validated = VaultContractValidator::validateItem($payload);
        $this->assertSame('credential', $validated['item_type']);
        $this->assertSame(1, $validated['crypto_version']);
    }

    public function testAcceptsCredentialSubtypeItemType(): void
    {
        $payload = [
            'item_type' => 'credential:website',
            'wrapped_dek' => base64_encode('dek'),
            'wrapped_dek_nonce' => base64_encode('nonce1'),
            'wrapped_dek_tag' => base64_encode('tag1'),
            'payload_ciphertext' => base64_encode('cipher'),
            'payload_nonce' => base64_encode('nonce2'),
            'payload_tag' => base64_encode('tag2'),
            'crypto_version' => 1,
        ];

        $validated = VaultContractValidator::validateItem($payload);
        $this->assertSame('credential:website', $validated['item_type']);
    }

    public function testAcceptsOptionalSearchableWords(): void
    {
        $payload = [
            'item_type' => 'password',
            'searchable_words' => '  bank prod login  ',
            'wrapped_dek' => base64_encode('dek'),
            'wrapped_dek_nonce' => base64_encode('nonce1'),
            'wrapped_dek_tag' => base64_encode('tag1'),
            'payload_ciphertext' => base64_encode('cipher'),
            'payload_nonce' => base64_encode('nonce2'),
            'payload_tag' => base64_encode('tag2'),
            'crypto_version' => 1,
        ];

        $validated = VaultContractValidator::validateItem($payload);
        $this->assertSame('bank prod login', $validated['searchable_words']);
    }

    public function testRejectsSearchableWordsTooLong(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $payload = [
            'item_type' => 'password',
            'searchable_words' => str_repeat('a', VaultContractValidator::SEARCHABLE_WORDS_MAX_BYTES + 1),
            'wrapped_dek' => base64_encode('dek'),
            'wrapped_dek_nonce' => base64_encode('nonce1'),
            'wrapped_dek_tag' => base64_encode('tag1'),
            'payload_ciphertext' => base64_encode('cipher'),
            'payload_nonce' => base64_encode('nonce2'),
            'payload_tag' => base64_encode('tag2'),
            'crypto_version' => 1,
        ];
        VaultContractValidator::validateItem($payload);
    }

    public function testRejectsItemTypeWithInvalidCharacters(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $payload = [
            'item_type' => 'bad type',
            'wrapped_dek' => base64_encode('dek'),
            'wrapped_dek_nonce' => base64_encode('nonce1'),
            'wrapped_dek_tag' => base64_encode('tag1'),
            'payload_ciphertext' => base64_encode('cipher'),
            'payload_nonce' => base64_encode('nonce2'),
            'payload_tag' => base64_encode('tag2'),
            'crypto_version' => 1,
        ];
        VaultContractValidator::validateItem($payload);
    }

    public function testRejectsItemTypeLongerThan64(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $payload = [
            'item_type' => str_repeat('a', 65),
            'wrapped_dek' => base64_encode('dek'),
            'wrapped_dek_nonce' => base64_encode('nonce1'),
            'wrapped_dek_tag' => base64_encode('tag1'),
            'payload_ciphertext' => base64_encode('cipher'),
            'payload_nonce' => base64_encode('nonce2'),
            'payload_tag' => base64_encode('tag2'),
            'crypto_version' => 1,
        ];
        VaultContractValidator::validateItem($payload);
    }
}

