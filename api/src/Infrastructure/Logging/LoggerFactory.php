<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Logging;

use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger;

final class LoggerFactory
{
    public static function create(string $appEnv): Logger
    {
        $logger = new Logger('api');
        $level = $appEnv === 'production' ? Level::Warning : Level::Debug;
        $logger->pushHandler(new StreamHandler('php://stderr', $level));

        return $logger;
    }
}
