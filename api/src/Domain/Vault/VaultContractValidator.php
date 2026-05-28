<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

final class VaultContractValidator
{
    public const SEARCHABLE_WORDS_MAX_BYTES = 64;

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public static function validateProfile(array $payload): array
    {
        $required = [
            'kdf_algo',
            'kdf_params_json',
            'kdf_salt',
            'wrapped_vault_key',
            'wrapped_vault_key_nonce',
            'wrapped_vault_key_tag',
            'crypto_version',
        ];
        self::requireKeys($payload, $required);

        if (!is_array($payload['kdf_params_json'])) {
            throw new \InvalidArgumentException('kdf_params_json must be an object');
        }

        self::assertString($payload, 'kdf_algo');
        self::assertString($payload, 'kdf_salt');
        self::assertString($payload, 'wrapped_vault_key');
        self::assertString($payload, 'wrapped_vault_key_nonce');
        self::assertString($payload, 'wrapped_vault_key_tag');
        self::assertIntLike($payload, 'crypto_version');
        self::assertBase64($payload, 'kdf_salt');
        self::assertBase64($payload, 'wrapped_vault_key');
        self::assertBase64($payload, 'wrapped_vault_key_nonce');
        self::assertBase64($payload, 'wrapped_vault_key_tag');

        return [
            'kdf_algo' => (string) $payload['kdf_algo'],
            'kdf_params_json' => $payload['kdf_params_json'],
            'kdf_salt' => (string) $payload['kdf_salt'],
            'wrapped_vault_key' => (string) $payload['wrapped_vault_key'],
            'wrapped_vault_key_nonce' => (string) $payload['wrapped_vault_key_nonce'],
            'wrapped_vault_key_tag' => (string) $payload['wrapped_vault_key_tag'],
            'crypto_version' => (int) $payload['crypto_version'],
        ];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public static function validateItem(array $payload): array
    {
        $required = [
            'item_type',
            'wrapped_dek',
            'wrapped_dek_nonce',
            'wrapped_dek_tag',
            'payload_ciphertext',
            'payload_nonce',
            'payload_tag',
            'crypto_version',
        ];
        self::requireKeys($payload, $required);

        self::assertString($payload, 'item_type');
        self::assertItemTypeFormat((string) $payload['item_type']);
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
        if (isset($payload['label_ciphertext']) && $payload['label_ciphertext'] !== null && $payload['label_ciphertext'] !== '') {
            self::assertString($payload, 'label_ciphertext');
            self::assertBase64($payload, 'label_ciphertext');
        }

        $searchableWords = self::normalizeOptionalSearchableWords($payload);

        return [
            'item_type' => (string) $payload['item_type'],
            'label_ciphertext' => isset($payload['label_ciphertext']) ? (string) $payload['label_ciphertext'] : null,
            'searchable_words' => $searchableWords,
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
     * Plaintext metadata for server-side search (never encrypted with the item payload).
     *
     * @param array<string,mixed> $payload
     */
    private static function normalizeOptionalSearchableWords(array $payload): ?string
    {
        if (!array_key_exists('searchable_words', $payload) || $payload['searchable_words'] === null) {
            return null;
        }
        if (!is_string($payload['searchable_words'])) {
            throw new \InvalidArgumentException('searchable_words must be a string or null');
        }
        $trimmed = trim($payload['searchable_words']);
        if ($trimmed === '') {
            return null;
        }
        if (strlen($trimmed) > self::SEARCHABLE_WORDS_MAX_BYTES) {
            throw new \InvalidArgumentException('searchable_words exceeds maximum length');
        }

        return $trimmed;
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $keys
     */
    private static function requireKeys(array $payload, array $keys): void
    {
        foreach ($keys as $key) {
            if (!array_key_exists($key, $payload)) {
                throw new \InvalidArgumentException("Missing field: {$key}");
            }
        }
    }

    private static function assertItemTypeFormat(string $value): void
    {
        if (strlen($value) > 64) {
            throw new \InvalidArgumentException('item_type exceeds maximum length');
        }
        if (!preg_match('/^[a-zA-Z0-9:_-]+$/', $value)) {
            throw new \InvalidArgumentException('item_type has invalid format');
        }
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
        $value = (string) $payload[$key];
        if (base64_decode($value, true) === false) {
            throw new \InvalidArgumentException("{$key} must be valid base64");
        }
    }
}

