<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

/**
 * Stripe billing: customer link, subscription cache, invoice cache, audit log (no card data).
 */
final class BillingStripe extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(<<<'SQL'
CREATE TABLE billing_customers (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,
  default_payment_method_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(64) NOT NULL,
  price_id VARCHAR(255) NOT NULL,
  plan_key VARCHAR(32) NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  raw_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billing_subscriptions_user_id ON billing_subscriptions(user_id);

CREATE TABLE billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  stripe_invoice_id VARCHAR(255) NOT NULL UNIQUE,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'gbp',
  status VARCHAR(64) NOT NULL,
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_stripe TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billing_invoices_user_id ON billing_invoices(user_id);
CREATE INDEX idx_billing_invoices_created_stripe ON billing_invoices(user_id, created_stripe DESC);

CREATE TABLE billing_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(128) NOT NULL,
  livemode BOOLEAN,
  summary_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billing_event_log_user_id ON billing_event_log(user_id);
CREATE INDEX idx_billing_event_log_created ON billing_event_log(created_at DESC);

CREATE TABLE billing_one_time_purchases (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
  plan_key VARCHAR(32) NOT NULL,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'gbp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
SQL);
    }

    public function down(): void
    {
        $this->execute(<<<'SQL'
DROP TABLE IF EXISTS billing_one_time_purchases;
DROP TABLE IF EXISTS billing_event_log;
DROP TABLE IF EXISTS billing_invoices;
DROP TABLE IF EXISTS billing_subscriptions;
DROP TABLE IF EXISTS billing_customers;
SQL);
    }
}
