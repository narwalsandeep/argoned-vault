<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Api\V1;

use Blackbox\Application\Http\Support\JsonResponder;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class RootAction implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $payload = [
            'status' => 'ok',
            'api' => 'v1',
            'message' => 'Blackbox API',
        ];

        return JsonResponder::write(new Response(), $payload, 200);
    }
}
