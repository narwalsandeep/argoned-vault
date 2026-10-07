<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Support;

use Psr\Http\Message\ServerRequestInterface;
use Slim\Routing\RouteContext;

/**
 * Slim 4 binds `{name}` path segments to the matched Route, not as plain request attributes.
 * Using {@see ServerRequestInterface::getAttribute}('id') is always null, which becomes "" and breaks UUID columns.
 */
final class RouteArguments
{
    public static function getString(ServerRequestInterface $request, string $name): ?string
    {
        try {
            $route = RouteContext::fromRequest($request)->getRoute();
        } catch (\RuntimeException) {
            return null;
        }
        if ($route === null) {
            return null;
        }
        $value = $route->getArgument($name);
        if ($value === null) {
            return null;
        }
        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }
}
