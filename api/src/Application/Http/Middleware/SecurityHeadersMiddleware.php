<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class SecurityHeadersMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $response = $handler->handle($request);
        $path = $request->getUri()->getPath();

        $base = $response
            ->withHeader('X-Content-Type-Options', 'nosniff')
            ->withHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->withHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        // Framed HTML + CORP same-site can trigger “This content is blocked” in Chromium-based browsers; skip CORP for dev mail previews only.
        if (!self::isDevEmailTemplatesPath($path)) {
            $base = $base->withHeader('Cross-Origin-Resource-Policy', 'same-site');
        }

        if (self::isDevEmailTemplateViewPath($path)) {
            // Child documents loaded inside the preview iframe: allow embedding from the index (same or different port/host during dev).
            $csp = "default-src 'none'; "
                . "style-src 'unsafe-inline'; "
                . "img-src data: https: http:; "
                . "font-src data: https:; "
                . "base-uri 'none'; "
                . "frame-ancestors *; "
                . "form-action 'none'";

            return $base->withHeader('Content-Security-Policy', $csp);
        }

        if (self::isDevEmailTemplatesIndexPath($path)) {
            // Console page runs a tiny inline script to set iframe.src (target=frame is unreliable; CSP must allow it here only).
            // frame-src: without it, default-src 'none' blocks nested iframes (blank preview).
            $csp = "default-src 'none'; "
                . "style-src 'unsafe-inline'; "
                . "script-src 'unsafe-inline'; "
                . "frame-src 'self'; "
                . "img-src data: https: http:; "
                . "font-src data: https:; "
                . "base-uri 'none'; "
                . "frame-ancestors 'self'; "
                . "form-action 'none'";

            return $base
                ->withHeader('X-Frame-Options', 'SAMEORIGIN')
                ->withHeader('Content-Security-Policy', $csp);
        }

        return $base
            ->withHeader('X-Frame-Options', 'DENY')
            // API JSON responses: deny active content by default.
            ->withHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    }

    private static function isDevEmailTemplatesPath(string $path): bool
    {
        return str_starts_with($path, '/api/v1/dev/email-templates');
    }

    private static function isDevEmailTemplateViewPath(string $path): bool
    {
        return str_starts_with($path, '/api/v1/dev/email-templates/view/');
    }

    private static function isDevEmailTemplatesIndexPath(string $path): bool
    {
        if (!str_starts_with($path, '/api/v1/dev/email-templates')) {
            return false;
        }

        return !str_starts_with($path, '/api/v1/dev/email-templates/view/');
    }
}
