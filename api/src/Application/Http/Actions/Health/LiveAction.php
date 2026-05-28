<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Health;

use Blackbox\Application\Http\Support\JsonResponder;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class LiveAction implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $payload = [
            'status' => 'ok',
            'service' => 'api',
            'check' => 'live',
            'time' => gmdate(DATE_ATOM),
        ];

        return JsonResponder::write(new Response(), $payload, 200);
    }
}
