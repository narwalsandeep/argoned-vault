<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class RequestIdMiddleware implements MiddlewareInterface
{
    public const ATTRIBUTE = 'request_id';

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $id = $request->getHeaderLine('X-Request-Id');
        if ($id === '' || strlen($id) > 128) {
            $id = bin2hex(random_bytes(16));
        }

        $request = $request->withAttribute(self::ATTRIBUTE, $id);
        $response = $handler->handle($request);

        if ($response instanceof Response) {
            return $response->withHeader('X-Request-Id', $id);
        }

        return $response->withHeader('X-Request-Id', $id);
    }
}
