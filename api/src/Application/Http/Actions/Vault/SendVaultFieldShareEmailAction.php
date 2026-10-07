<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Vault;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\RouteArguments;
use Blackbox\Domain\Auth\AuthMailNotifier;
use Blackbox\Domain\Vault\ShareAccessCodeFormat;
use Blackbox\Domain\Vault\ShareRateLimiterInterface;
use Blackbox\Domain\Vault\VaultFieldShareService;
use Blackbox\Infrastructure\Auth\UserRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;

final class SendVaultFieldShareEmailAction implements RequestHandlerInterface
{
    private const MAX_RECIPIENT_EMAIL_LENGTH = 320;

    public function __construct(
        private readonly UserRepository $users,
        private readonly VaultFieldShareService $shareService,
        private readonly ShareRateLimiterInterface $rateLimiter,
        private readonly AuthMailNotifier $mailNotifier,
        private readonly array $mailSettings,
        private readonly LoggerInterface $logger,
        private readonly string $appEnv,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        if ($userId === '') {
            return JsonResponder::write(new Response(), ['error' => 'unauthorized'], 401);
        }

        $shareId = RouteArguments::getString($request, 'share_id');
        if ($shareId === null || trim($shareId) === '') {
            return JsonResponder::write(new Response(), ['error' => 'invalid_share_id'], 400);
        }

        $user = $this->users->findById($userId);
        if ($user === null) {
            return JsonResponder::write(new Response(), ['error' => 'user_not_found'], 404);
        }
        if ($user['email_verified_at'] === null) {
            return JsonResponder::write(new Response(), ['error' => 'email_not_verified'], 400);
        }

        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $recipientEmail = strtolower(trim((string) ($body['recipient_email'] ?? '')));
        $accessCodeRaw = (string) ($body['access_code'] ?? '');

        if ($recipientEmail === '' || strlen($recipientEmail) > self::MAX_RECIPIENT_EMAIL_LENGTH) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_recipient_email'], 400);
        }
        if (!filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_recipient_email'], 400);
        }
        if (!ShareAccessCodeFormat::isValid($accessCodeRaw)) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_access_code'], 400);
        }

        $deliveryConfigured = (bool) ($this->mailSettings['delivery_configured'] ?? false);
        if ($this->appEnv === 'production' && !$deliveryConfigured) {
            return JsonResponder::write(new Response(), ['error' => 'email_delivery_not_configured'], 503);
        }

        $notifyLimit = $this->rateLimiter->consumeNotifyEmail($userId);
        if (!$notifyLimit['allowed']) {
            return JsonResponder::write(new Response(), [
                'error' => 'share_notify_rate_limited',
                'retry_after' => $notifyLimit['retry_after'],
            ], 429);
        }

        try {
            $share = $this->shareService->resolveActiveShareForOwner($userId, $shareId);
        } catch (\InvalidArgumentException $e) {
            $code = $e->getMessage();
            $status = match ($code) {
                'share_not_available' => 409,
                default => 400,
            };

            return JsonResponder::write(new Response(), ['error' => $code], $status);
        }

        $senderName = trim((string) ($user['display_name'] ?? ''));
        if ($senderName === '') {
            $senderName = trim((string) ($user['first_name'] ?? ''));
        }
        if ($senderName === '') {
            $senderName = 'An Argoned user';
        }

        $fieldLabel = $this->fieldLabelForShare($share['field_key'], $share['label']);
        $expiresLine = $this->formatExpiresUtc((string) $share['expires_at']);
        $productName = (string) ($this->mailSettings['product_name'] ?? 'Argoned');
        $accessCode = ShareAccessCodeFormat::normalize($accessCodeRaw);
        $redeemUrl = (string) $share['redeem_url'];

        try {
            $this->mailNotifier->sendVaultFieldShareInvitation(
                $recipientEmail,
                $productName,
                $senderName,
                $fieldLabel,
                $share['label'],
                $redeemUrl,
                $accessCode,
                $expiresLine,
                (int) $share['max_views'],
            );
        } catch (\Throwable $e) {
            $this->logger->error('vault.share_invitation_email_failed', [
                'share_id' => $shareId,
                'recipient_email' => $recipientEmail,
                'message' => $e->getMessage(),
            ]);

            return JsonResponder::write(new Response(), ['error' => 'share_email_failed'], 500);
        }

        if (!$deliveryConfigured) {
            $this->logger->info('vault.share_invitation_email_dev', [
                'recipient_email' => $recipientEmail,
                'share_id' => $shareId,
                'redeem_url' => $redeemUrl,
            ]);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok'], 200);
    }

    /**
     * @param string|null $fieldKey
     * @param string|null $shareLabel
     */
    private function fieldLabelForShare(?string $fieldKey, ?string $shareLabel): string
    {
        if ($shareLabel !== null && trim($shareLabel) !== '') {
            return trim($shareLabel);
        }
        if ($fieldKey !== null && trim($fieldKey) !== '') {
            $key = str_replace('_', ' ', trim($fieldKey));

            return ucwords($key);
        }

        return 'Shared field';
    }

    private function formatExpiresUtc(string $expiresAt): string
    {
        try {
            $dt = new \DateTimeImmutable($expiresAt);

            return $dt->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i') . ' UTC';
        } catch (\Exception) {
            return $expiresAt;
        }
    }
}
