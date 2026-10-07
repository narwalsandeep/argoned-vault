<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Database;

use PDO;

final class PdoFactory
{
    /**
     * @param array{host: string, port: string, name: string, user: string, password: string} $config
     */
    public function __construct(
        private readonly array $config,
    ) {
    }

    public function create(): PDO
    {
        $dsn = sprintf(
            'pgsql:host=%s;port=%s;dbname=%s',
            $this->config['host'],
            $this->config['port'],
            $this->config['name'],
        );

        return new PDO($dsn, $this->config['user'], $this->config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 2,
        ]);
    }
}
