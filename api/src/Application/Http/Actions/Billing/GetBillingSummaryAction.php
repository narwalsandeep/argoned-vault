<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Billing;

use Blackbox\Application\Billing\PlanCapabilityService;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Billing\BillingServiceInterface;
use Blackbox\Infrastructure\Auth\UserRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class GetBillingSummaryAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly BillingServiceInterface $billing,
        private readonly UserRepository $users,
        private readonly PlanCapabilityService $planCapabilities,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        $user = $this->users->findById($userId);
        if ($user === null) {
            return JsonResponder::write(new Response(), ['error' => 'user_not_found'], 404);
        }

        $summary = $this->billing->getSummaryForUser($userId, (string) $user['email']);
        $summary['capabilities'] = $this->planCapabilities->capabilitiesForUser($userId);

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'summary' => $summary,
        ]);
    }
}
