<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Actions\Vault;

use Blackbox\Application\Http\Actions\Vault\SendVaultFieldShareEmailAction;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Domain\Auth\AuthMailNotifier;
use Blackbox\Domain\Vault\ShareRateLimiterInterface;
use Blackbox\Domain\Vault\VaultFieldShareRepositoryInterface;
use Blackbox\Domain\Vault\VaultFieldShareService;
use Blackbox\Infrastructure\Auth\UserRepository;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Log\NullLogger;
use Slim\Interfaces\DispatcherInterface;
use Slim\Interfaces\RouteInterface;
use Slim\Interfaces\RouteParserInterface;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Routing\RouteContext;
use Slim\Routing\RoutingResults;

final class SendVaultFieldShareEmailActionTest extends TestCase
{
    public function testReturns400WhenRecipientEmailInvalid(): void
    {
        $action = $this->makeAction();

        $request = $this->requestWithRouteArg('u1', [
            'recipient_email' => 'not-an-email',
            'access_code' => 'ABCD-EFGH-IJKL-MNOP',
        ]);
        $response = $action->handle($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testSendsInvitationWhenShareIsActive(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findById')->willReturn([
            'id' => 'u1',
            'email' => 'owner@example.com',
            'first_name' => 'Alex',
            'last_name' => 'Owner',
            'display_name' => 'Alex O',
            'email_verified_at' => '2020-01-01',
        ]);

        $repo = $this->createMock(VaultFieldShareRepositoryInterface::class);
        $repo->method('findActiveForOwner')->willReturn([
            'share_id' => 'share123',
            'label' => 'Guest WiFi',
            'field_key' => 'password',
            'expires_at' => '2026-06-18T21:35:00+00:00',
            'max_views' => 1,
        ]);

        $mail = $this->createMock(AuthMailNotifier::class);
        $mail->expects($this->once())->method('sendVaultFieldShareInvitation')->with(
            'friend@example.com',
            'Argoned Test',
            'Alex O',
            'Guest WiFi',
            'Guest WiFi',
            'https://vault.test/share/share123',
            'ABCD-EFGH-IJKL-MNOP',
            $this->isType('string'),
            1,
        );

        $action = $this->makeAction($users, $repo, $mail);
        $request = $this->requestWithRouteArg('u1', [
            'recipient_email' => 'friend@example.com',
            'access_code' => 'ABCD-EFGH-IJKL-MNOP',
        ]);

        $response = $action->handle($request);
        $this->assertSame(200, $response->getStatusCode());
    }

    public function testReturns503WhenMailDeliveryNotConfiguredInProduction(): void
    {
        $action = $this->makeAction(
            mailSettings: ['product_name' => 'Argoned Test', 'delivery_configured' => false],
            appEnv: 'production',
        );
        $request = $this->requestWithRouteArg('u1', [
            'recipient_email' => 'friend@example.com',
            'access_code' => 'ABCD-EFGH-IJKL-MNOP',
        ]);

        $response = $action->handle($request);

        $this->assertSame(503, $response->getStatusCode());
    }

    private function makeAction(
        ?UserRepository $users = null,
        ?VaultFieldShareRepositoryInterface $shareRepo = null,
        ?AuthMailNotifier $mail = null,
        ?array $mailSettings = null,
        string $appEnv = 'local',
    ): SendVaultFieldShareEmailAction {
        $users ??= $this->createConfiguredMock(UserRepository::class, [
            'findById' => [
                'id' => 'u1',
                'email' => 'owner@example.com',
                'first_name' => 'Alex',
                'last_name' => 'Owner',
                'display_name' => null,
                'email_verified_at' => '2020-01-01',
            ],
        ]);
        $shareRepo ??= $this->createMock(VaultFieldShareRepositoryInterface::class);
        $mail ??= $this->createMock(AuthMailNotifier::class);
        $limiter = $this->createMock(ShareRateLimiterInterface::class);
        $limiter->method('consumeNotifyEmail')->willReturn(['allowed' => true, 'retry_after' => 0, 'storage_failed' => false]);

        $shareService = new VaultFieldShareService(
            $shareRepo,
            $limiter,
            ['max_active_per_user' => 20],
            'https://vault.test',
        );

        return new SendVaultFieldShareEmailAction(
            $users,
            $shareService,
            $limiter,
            $mail,
            $mailSettings ?? ['product_name' => 'Argoned Test', 'delivery_configured' => true],
            new NullLogger(),
            $appEnv,
        );
    }

    /**
     * @param array<string,mixed> $body
     */
    private function requestWithRouteArg(string $authUserId, array $body = []): ServerRequestInterface
    {
        $shareId = 'share123';
        $route = $this->createMock(RouteInterface::class);
        $route->method('getArgument')->with('share_id')->willReturn($shareId);

        $dispatcher = $this->createStub(DispatcherInterface::class);
        $routingResults = new RoutingResults(
            $dispatcher,
            'POST',
            '/api/v1/vault/shares/' . $shareId . '/notify-email',
            RoutingResults::FOUND,
            'test-route',
            ['share_id' => $shareId],
        );
        $parser = $this->createStub(RouteParserInterface::class);

        return (new ServerRequestFactory())->createServerRequest('POST', '/api/v1/vault/shares/' . $shareId . '/notify-email')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, $authUserId)
            ->withAttribute(RouteContext::ROUTE, $route)
            ->withAttribute(RouteContext::ROUTE_PARSER, $parser)
            ->withAttribute(RouteContext::ROUTING_RESULTS, $routingResults)
            ->withParsedBody($body);
    }
}
