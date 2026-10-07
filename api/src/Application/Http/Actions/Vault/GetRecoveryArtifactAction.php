<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Vault;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Vault\VaultService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class GetRecoveryArtifactAction implements RequestHandlerInterface
{
    public function __construct(private readonly VaultService $vaultService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        $artifact = $this->vaultService->getRecoveryArtifact($userId);
        if ($artifact === null) {
            return JsonResponder::write(new Response(), ['error' => 'recovery_artifact_not_found'], 404);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok', 'artifact' => $artifact], 200);
    }
}

