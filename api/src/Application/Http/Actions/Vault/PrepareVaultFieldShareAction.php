<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Vault;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Vault\ShareRateLimitException;
use Blackbox\Domain\Vault\VaultFieldShareService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class PrepareVaultFieldShareAction implements RequestHandlerInterface
{
    public function __construct(private readonly VaultFieldShareService $shareService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        /** @var array<string,mixed> $payload */
        $payload = (array) $request->getParsedBody();

        try {
            $share = $this->shareService->prepare($userId, $payload);
        } catch (ShareRateLimitException $e) {
            $status = $e->storageFailed ? 503 : 429;

            return JsonResponder::write(new Response(), ['error' => 'too_many_requests'], $status)
                ->withHeader('Retry-After', (string) $e->retryAfter);
        } catch (\InvalidArgumentException $e) {
            $code = $e->getMessage();
            $status = match ($code) {
                'vault_item_not_found' => 404,
                'share_quota_exceeded' => 403,
                default => 400,
            };

            return JsonResponder::write(new Response(), ['error' => $code], $status);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok', 'share' => $share], 201);
    }
}
