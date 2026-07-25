<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Middleware;

use Blackbox\Application\Http\Support\JsonResponder;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class PayloadSizeMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly int $maxRequestBytes)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if (!in_array($request->getMethod(), ['POST', 'PUT', 'PATCH'], true)) {
            return $handler->handle($request);
        }

        $contentLengthHeader = $request->getHeaderLine('Content-Length');
        if ($contentLengthHeader !== '' && ctype_digit($contentLengthHeader) && (int) $contentLengthHeader > $this->maxRequestBytes) {
            return JsonResponder::write(new Response(), ['error' => 'payload_too_large'], 413);
        }

        $streamSize = $request->getBody()->getSize();
        if (is_int($streamSize) && $streamSize > $this->maxRequestBytes) {
            return JsonResponder::write(new Response(), ['error' => 'payload_too_large'], 413);
        }

        return $handler->handle($request);
    }
}
