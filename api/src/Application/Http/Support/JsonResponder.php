<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Support;

use Psr\Http\Message\ResponseInterface;

final class JsonResponder
{
    /**
     * @param array<string, mixed> $payload
     */
    public static function write(ResponseInterface $response, array $payload, int $status = 200): ResponseInterface
    {
        $response->getBody()->write(json_encode($payload, JSON_THROW_ON_ERROR));

        return $response
            ->withHeader('Content-Type', 'application/json; charset=utf-8')
            ->withStatus($status);
    }
}
