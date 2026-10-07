<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Dev;

use Blackbox\Application\Http\Support\RouteArguments;
use Blackbox\Infrastructure\Mail\AuthEmailPreviewFactory;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Renders one preview HTML document. Disabled when {@see settings} `app_env` is `production`.
 */
final class DevEmailTemplatesViewAction implements RequestHandlerInterface
{
    /**
     * @param array<string,mixed> $settings Application settings (uses app_env, ui_app_base_url, mail.product_name).
     */
    public function __construct(
        private readonly array $settings,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        if (($this->settings['app_env'] ?? '') === 'production') {
            return (new Response(404))->withHeader('Content-Type', 'text/plain; charset=utf-8');
        }

        $slug = RouteArguments::getString($request, 'slug') ?? '';
        if ($slug === '' || !AuthEmailPreviewFactory::isKnown($slug)) {
            return (new Response(404))->withHeader('Content-Type', 'text/plain; charset=utf-8');
        }

        /** @var array<string,mixed> $mail */
        $mail = $this->settings['mail'] ?? [];
        $baseUrl = (string) ($this->settings['ui_app_base_url'] ?? 'http://localhost:4200');
        $product = (string) ($mail['product_name'] ?? 'Argoned');

        try {
            $pack = AuthEmailPreviewFactory::render($slug, $baseUrl, $product);
        } catch (\InvalidArgumentException) {
            return (new Response(404))->withHeader('Content-Type', 'text/plain; charset=utf-8');
        }

        $response = new Response();
        $response->getBody()->write($pack['html']);

        return $response->withHeader('Content-Type', 'text/html; charset=utf-8');
    }
}
