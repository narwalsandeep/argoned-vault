<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Health;

use Blackbox\Infrastructure\Database\PdoFactory;
use Throwable;

final class DatabaseHealthChecker
{
    public function __construct(
        private readonly PdoFactory $pdoFactory,
    ) {
    }

    public function check(): bool
    {
        try {
            $pdo = $this->pdoFactory->create();
            $pdo->query('SELECT 1');

            return true;
        } catch (Throwable) {
            return false;
        }
    }
}
