<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

final class VaultRecoveryValidator
{
    /**
     * @param array<string,mixed> $payload
     * @return array{artifact_type:string,wrapped_vault_key_recovery:string,nonce:string,tag:string}
     */
    public static function validateArtifact(array $payload): array
    {
        foreach (['artifact_type', 'wrapped_vault_key_recovery', 'nonce', 'tag'] as $key) {
            if (!isset($payload[$key]) || !is_string($payload[$key]) || $payload[$key] === '') {
                throw new \InvalidArgumentException("Missing field: {$key}");
            }
        }

        foreach (['wrapped_vault_key_recovery', 'nonce', 'tag'] as $key) {
            if (base64_decode((string) $payload[$key], true) === false) {
                throw new \InvalidArgumentException("{$key} must be valid base64");
            }
        }

        return [
            'artifact_type' => (string) $payload['artifact_type'],
            'wrapped_vault_key_recovery' => (string) $payload['wrapped_vault_key_recovery'],
            'nonce' => (string) $payload['nonce'],
            'tag' => (string) $payload['tag'],
        ];
    }
}

