<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Share;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\RouteArguments;
use Blackbox\Domain\Vault\ShareRateLimitException;
use Blackbox\Domain\Vault\VaultFieldShareService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class ConsumeVaultFieldShareAction implements RequestHandlerInterface
{
    public function __construct(private readonly VaultFieldShareService $shareService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $shareId = RouteArguments::getString($request, 'share_id');
        if ($shareId === null) {
            return JsonResponder::write(new Response(), ['error' => 'share_not_available'], 404);
        }
        $clientIp = $this->resolveClientIp($request);

        try {
            $consumed = $this->shareService->consumePublic($shareId, $clientIp);
        } catch (ShareRateLimitException $e) {
            $status = $e->storageFailed ? 503 : 429;

            return JsonResponder::write(new Response(), ['error' => 'too_many_requests'], $status)
                ->withHeader('Retry-After', (string) $e->retryAfter);
        }

        if (!$consumed) {
            return JsonResponder::write(new Response(), ['error' => 'share_not_available'], 404);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok'], 200);
    }

    private function resolveClientIp(ServerRequestInterface $request): string
    {
        $forwarded = $request->getHeaderLine('X-Forwarded-For');
        if ($forwarded !== '') {
            $first = trim(explode(',', $forwarded)[0]);
            if ($first !== '') {
                return $first;
            }
        }

        return (string) ($request->getServerParams()['REMOTE_ADDR'] ?? 'unknown');
    }
}
