<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Actions\Admin;

use Blackbox\Application\Http\Actions\Admin\DeletePlatformCustomerAction;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Domain\Billing\BillingServiceInterface;
use Blackbox\Infrastructure\Auth\UserRepository;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Interfaces\DispatcherInterface;
use Slim\Interfaces\RouteInterface;
use Slim\Interfaces\RouteParserInterface;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Routing\RouteContext;
use Slim\Routing\RoutingResults;

final class DeletePlatformCustomerActionTest extends TestCase
{
    private const TARGET = '11111111-1111-4111-8111-111111111111';
    private const AUTH = '22222222-2222-4222-8222-222222222222';

    public function testRejectsSelfDelete(): void
    {
        $action = new DeletePlatformCustomerAction(
            $this->createMock(UserRepository::class),
            $this->createStub(BillingServiceInterface::class),
            'admin@example.com',
        );
        $request = $this->requestWithRouteArg(self::TARGET, self::TARGET);

        $response = $action->handle($request);
        $this->assertSame(403, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('cannot_delete_self', $body['error']);
    }

    public function testRejectsDeletingPlatformAdminEmail(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findById')->willReturn([
            'id' => self::TARGET,
            'email' => 'admin@example.com',
            'mfa_enabled' => true,
            'mfa_state' => 'verified',
            'first_name' => 'A',
            'last_name' => 'B',
            'display_name' => null,
            'email_verified_at' => '2026-01-01',
        ]);
        $billing = $this->createMock(BillingServiceInterface::class);
        $billing->expects($this->never())->method('purgeRemoteCustomerForUser');

        $action = new DeletePlatformCustomerAction($users, $billing, 'admin@example.com');
        $request = $this->requestWithRouteArg(self::TARGET, self::AUTH);

        $response = $action->handle($request);
        $this->assertSame(403, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('cannot_delete_platform_admin_account', $body['error']);
    }

    public function testDeletesWhenAllowed(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findById')->willReturn([
            'id' => self::TARGET,
            'email' => 'victim@example.com',
            'mfa_enabled' => true,
            'mfa_state' => 'verified',
            'first_name' => 'A',
            'last_name' => 'B',
            'display_name' => null,
            'email_verified_at' => '2026-01-01',
        ]);
        $users->expects($this->once())->method('deleteUserAndAllRelatedData')->with(self::TARGET)->willReturn(true);

        $billing = $this->createMock(BillingServiceInterface::class);
        $billing->expects($this->once())->method('purgeRemoteCustomerForUser')->with(self::TARGET);

        $action = new DeletePlatformCustomerAction($users, $billing, 'admin@example.com');
        $request = $this->requestWithRouteArg(self::TARGET, self::AUTH);

        $response = $action->handle($request);
        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('ok', $body['status']);
    }

    private function requestWithRouteArg(string $targetId, string $authUserId): ServerRequestInterface
    {
        $route = $this->createMock(RouteInterface::class);
        $route->method('getArgument')->with('id')->willReturn($targetId);

        $dispatcher = $this->createStub(DispatcherInterface::class);
        $routingResults = new RoutingResults(
            $dispatcher,
            'DELETE',
            '/api/v1/admin/customers/' . $targetId,
            RoutingResults::FOUND,
            'test-route',
            ['id' => $targetId]
        );
        $parser = $this->createStub(RouteParserInterface::class);

        return (new ServerRequestFactory())->createServerRequest('DELETE', '/api/v1/admin/customers/' . $targetId)
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, $authUserId)
            ->withAttribute(RouteContext::ROUTE, $route)
            ->withAttribute(RouteContext::ROUTE_PARSER, $parser)
            ->withAttribute(RouteContext::ROUTING_RESULTS, $routingResults);
    }
}
