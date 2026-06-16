<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Admin;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Billing\BillingServiceInterface;
use Blackbox\Infrastructure\Auth\UserRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Lists all registered accounts with non-sensitive metadata (platform admin only).
 */
final class ListPlatformCustomersAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly BillingServiceInterface $billing,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $customers = $this->users->listCustomersWithPlansForAdmin();
        if (!$this->billing->isEnabled()) {
            foreach (array_keys($customers) as $i) {
                $customers[$i]['plan_key'] = 'free';
            }
        }

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'customers' => $customers,
        ]);
    }
}
