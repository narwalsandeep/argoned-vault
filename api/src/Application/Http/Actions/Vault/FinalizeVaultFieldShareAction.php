<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Vault;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\RouteArguments;
use Blackbox\Domain\Vault\VaultFieldShareService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class FinalizeVaultFieldShareAction implements RequestHandlerInterface
{
    public function __construct(private readonly VaultFieldShareService $shareService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        $shareId = RouteArguments::getString($request, 'share_id');
        if ($shareId === null) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_share_id'], 400);
        }
        /** @var array<string,mixed> $payload */
        $payload = (array) $request->getParsedBody();

        try {
            $share = $this->shareService->finalize($userId, $shareId, $payload);
        } catch (\InvalidArgumentException $e) {
            $code = $e->getMessage();
            $status = match ($code) {
                'share_not_pending' => 409,
                'payload_too_large' => 413,
                default => 400,
            };

            return JsonResponder::write(new Response(), ['error' => $code], $status);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok', 'share' => $share], 200);
    }
}
