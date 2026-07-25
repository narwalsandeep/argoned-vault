<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

/**
 * Enforced where noted in {@see \Blackbox\Application\Billing\PlanCapabilityService} and upload APIs.
 * UI may upload up to {@see self::SUGGESTED_CLIENT_BATCH} files per input for convenience.
 */
final class VaultFilePolicy
{
    /** Maximum attached encrypted files per `item_type = file` vault item. */
    public const MAX_FILES_PER_VAULT_ITEM = 32;

    /** Optional UX cap per file-picker batch (not a separate server hard limit; server enforces per-item + quota). */
    public const SUGGESTED_CLIENT_BATCH = 8;
}
