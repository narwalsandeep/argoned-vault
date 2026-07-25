<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Vault;

use Blackbox\Application\Billing\PlanCapabilityService;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\RouteArguments;
use Blackbox\Domain\Vault\VaultService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class DeleteFileAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly VaultService $vaultService,
        private readonly PlanCapabilityService $planCapabilities,
    )
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        if (!$this->planCapabilities->userMayUseVaultFilesWhenAvailable($userId)) {
            return JsonResponder::write(
                new Response(),
                ['error' => 'vault_files_requires_upgrade', 'message' => 'Encrypted files require a paid plan.'],
                403,
            );
        }
        $id = RouteArguments::getString($request, 'id');
        if ($id === null) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_file_id'], 400);
        }
        $deleted = $this->vaultService->deleteFile($userId, $id);
        if (!$deleted) {
            return JsonResponder::write(new Response(), ['error' => 'not_found'], 404);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok']);
    }
}
