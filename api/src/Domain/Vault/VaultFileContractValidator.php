<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

final class VaultFileContractValidator
{
    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public static function validate(array $payload): array
    {
        $required = [
            'vault_item_id',
            'original_filename',
            'mime_type',
            'plaintext_size_bytes',
            'wrapped_dek',
            'wrapped_dek_nonce',
            'wrapped_dek_tag',
            'payload_ciphertext',
            'payload_nonce',
            'payload_tag',
            'crypto_version',
        ];
        foreach ($required as $key) {
            if (!array_key_exists($key, $payload)) {
                throw new \InvalidArgumentException("Missing field: {$key}");
            }
        }

        self::assertUuidString($payload, 'vault_item_id');
        self::assertString($payload, 'original_filename');
        self::assertString($payload, 'mime_type');
        self::assertIntLike($payload, 'plaintext_size_bytes');
        self::assertString($payload, 'wrapped_dek');
        self::assertString($payload, 'wrapped_dek_nonce');
        self::assertString($payload, 'wrapped_dek_tag');
        self::assertString($payload, 'payload_ciphertext');
        self::assertString($payload, 'payload_nonce');
        self::assertString($payload, 'payload_tag');
        self::assertIntLike($payload, 'crypto_version');

        self::assertBase64($payload, 'wrapped_dek');
        self::assertBase64($payload, 'wrapped_dek_nonce');
        self::assertBase64($payload, 'wrapped_dek_tag');
        self::assertBase64($payload, 'payload_ciphertext');
        self::assertBase64($payload, 'payload_nonce');
        self::assertBase64($payload, 'payload_tag');

        $vaultItemId = self::normalizeUuidString((string) $payload['vault_item_id']);
        if ($vaultItemId === null) {
            throw new \InvalidArgumentException('vault_item_id must be a valid UUID');
        }

        $filename = trim((string) $payload['original_filename']);
        $mime = strtolower(trim((string) $payload['mime_type']));
        if ($filename === '') {
            throw new \InvalidArgumentException('original_filename must be non-empty');
        }
        if (strlen($filename) > 255) {
            throw new \InvalidArgumentException('original_filename exceeds maximum length');
        }
        if ($mime === '' || strlen($mime) > 128) {
            throw new \InvalidArgumentException('mime_type invalid');
        }

        $size = (int) $payload['plaintext_size_bytes'];
        if ($size <= 0) {
            throw new \InvalidArgumentException('plaintext_size_bytes must be > 0');
        }

        return [
            'vault_item_id' => $vaultItemId,
            'original_filename' => $filename,
            'mime_type' => $mime,
            'plaintext_size_bytes' => $size,
            'wrapped_dek' => (string) $payload['wrapped_dek'],
            'wrapped_dek_nonce' => (string) $payload['wrapped_dek_nonce'],
            'wrapped_dek_tag' => (string) $payload['wrapped_dek_tag'],
            'payload_ciphertext' => (string) $payload['payload_ciphertext'],
            'payload_nonce' => (string) $payload['payload_nonce'],
            'payload_tag' => (string) $payload['payload_tag'],
            'crypto_version' => (int) $payload['crypto_version'],
        ];
    }

    /**
     * @param array<string,mixed> $payload
     */
    private static function assertUuidString(array $payload, string $key): void
    {
        if (!is_string($payload[$key]) || trim($payload[$key]) === '') {
            throw new \InvalidArgumentException("{$key} must be a non-empty string");
        }
        if (self::normalizeUuidString($payload[$key]) === null) {
            throw new \InvalidArgumentException("{$key} must be a valid UUID");
        }
    }

    private static function normalizeUuidString(string $value): ?string
    {
        $raw = trim($value, "\"'{} \t");
        if (preg_match('/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i', $raw, $m) !== 1) {
            return null;
        }

        return strtolower($m[1]);
    }

    /**
     * @param array<string,mixed> $payload
     */
    private static function assertString(array $payload, string $key): void
    {
        if (!is_string($payload[$key]) || $payload[$key] === '') {
            throw new \InvalidArgumentException("{$key} must be a non-empty string");
        }
    }

    /**
     * @param array<string,mixed> $payload
     */
    private static function assertIntLike(array $payload, string $key): void
    {
        if (!is_int($payload[$key]) && !ctype_digit((string) $payload[$key])) {
            throw new \InvalidArgumentException("{$key} must be an integer");
        }
    }

    /**
     * @param array<string,mixed> $payload
     */
    private static function assertBase64(array $payload, string $key): void
    {
        if (base64_decode((string) $payload[$key], true) === false) {
            throw new \InvalidArgumentException("{$key} must be valid base64");
        }
    }
}
