<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Health;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Infrastructure\Health\DatabaseHealthChecker;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class ReadyAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly DatabaseHealthChecker $databaseHealthChecker,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $ok = $this->databaseHealthChecker->check();
        $payload = [
            'status' => $ok ? 'ok' : 'degraded',
            'service' => 'api',
            'check' => 'ready',
            'db' => $ok ? 'ok' : 'down',
            'error' => $ok ? null : 'database connectivity check failed',
            'time' => gmdate(DATE_ATOM),
        ];

        return JsonResponder::write(new Response(), $payload, $ok ? 200 : 503);
    }
}
