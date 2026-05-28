<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Billing;

use Blackbox\Application\Http\Middleware\StripeWebhookRawPayloadMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Billing\BillingServiceInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;
use Stripe\Exception\SignatureVerificationException;

final class StripeBillingWebhookAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly BillingServiceInterface $billing,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $raw = $request->getAttribute(StripeWebhookRawPayloadMiddleware::ATTRIBUTE_RAW_BODY);
        if (!is_string($raw) || $raw === '') {
            $this->logger->notice('Stripe webhook rejected: empty body');

            return JsonResponder::write(new Response(), ['error' => 'empty_payload'], 400);
        }

        $signature = $request->getHeaderLine('Stripe-Signature');
        if ($signature === '') {
            $this->logger->notice('Stripe webhook rejected: missing Stripe-Signature header', [
                'payload_bytes' => strlen($raw),
            ]);

            return JsonResponder::write(new Response(), ['error' => 'missing_signature'], 400);
        }

        if (!$this->billing->isEnabled()) {
            $this->logger->notice('Stripe webhook ignored: billing disabled (no STRIPE_SECRET_KEY)', [
                'payload_bytes' => strlen($raw),
            ]);

            return JsonResponder::write(new Response(), ['received' => false, 'reason' => 'billing_disabled']);
        }

        $this->logger->info('Stripe webhook HTTP accepted', [
            'payload_bytes' => strlen($raw),
            'signature_header_present' => true,
        ]);

        try {
            $this->billing->handleWebhook($raw, $signature);
        } catch (SignatureVerificationException $e) {
            $this->logger->notice('Stripe webhook signature invalid', [
                'exception' => $e->getMessage(),
                'payload_bytes' => strlen($raw),
            ]);

            return JsonResponder::write(new Response(), ['error' => 'invalid_signature'], 400);
        } catch (\Throwable $e) {
            $this->logger->error('Stripe webhook failed', [
                'exception' => $e->getMessage(),
                'exception_class' => $e::class,
                'payload_bytes' => strlen($raw),
            ]);

            return JsonResponder::write(new Response(), ['error' => 'webhook_error'], 500);
        }

        $this->logger->info('Stripe webhook HTTP completed');

        return JsonResponder::write(new Response(), ['received' => true]);
    }
}
