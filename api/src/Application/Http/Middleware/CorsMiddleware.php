<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class CorsMiddleware implements MiddlewareInterface
{
    public function __construct(
        /** @var list<string> */
        private readonly array $allowedOrigins,
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if ($request->getMethod() === 'OPTIONS') {
            $response = new Response(204);
            return $this->withCors($request, $response);
        }

        $response = $handler->handle($request);

        return $this->withCors($request, $response);
    }

    private function withCors(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $origin = $request->getHeaderLine('Origin');
        if ($origin !== '' && $this->originAllowed($origin)) {
            $response = $response->withHeader('Access-Control-Allow-Origin', $origin);
        }

        return $response
            ->withHeader('Vary', 'Origin')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, X-CSRF-Token')
            ->withHeader('Access-Control-Allow-Credentials', 'true')
            ->withHeader('Access-Control-Max-Age', '86400');
    }

    private function originAllowed(string $origin): bool
    {
        return in_array($origin, $this->allowedOrigins, true);
    }
}
