-- ═══════════════════════════════════════════════════
-- ATLAS STUDIO — PAYMENTS + PLANS + FEATURES MIGRATION
-- ═══════════════════════════════════════════════════

-- ── PAYMENT TRANSACTIONS ──

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  invoice_id UUID,
  subscription_id UUID,
  amount_fcfa INTEGER NOT NULL,
  amount_currency TEXT DEFAULT 'XOF',
  fees_fcfa INTEGER DEFAULT 0,
  net_amount_fcfa INTEGER,
  method TEXT NOT NULL CHECK (method IN ('orange_money','mtn_momo','wave','moov_money','card_visa','card_mastercard','wire_transfer','manual')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','success','failed','cancelled','refunded','partial_refund')),
  provider TEXT,
  provider_transaction_id TEXT,
  provider_reference TEXT,
  provider_raw_response JSONB,
  phone_number TEXT,
  phone_operator TEXT,
  card_last4 TEXT,
  card_brand TEXT,
  card_country TEXT,
  wire_reference TEXT,
  wire_bank TEXT,
  wire_confirmed_by UUID,
  wire_confirmed_at TIMESTAMPTZ,
  customer_ip TEXT,
  customer_country TEXT,
  payment_page_url TEXT,
  refund_amount_fcfa INTEGER,
  refund_reason TEXT,
  refunded_at TIMESTAMPTZ,
  refunded_by UUID,
  initiated_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── PAYMENT SESSIONS ──

CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  invoice_id UUID,
  amount_fcfa INTEGER NOT NULL,
  description TEXT,
  items JSONB DEFAULT '[]',
  session_token TEXT UNIQUE NOT NULL,
  session_token_hash TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','paid','expired','cancelled')),
  transaction_id UUID,
  selected_method TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── PAYMENT WEBHOOKS LOG ──

CREATE TABLE IF NOT EXISTS payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT,
  raw_payload JSONB NOT NULL,
  headers JSONB,
  signature_valid BOOLEAN,
  processed BOOLEAN DEFAULT false,
  transaction_id UUID,
  error_message TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- ── SAVED PAYMENT METHODS ──

CREATE TABLE IF NOT EXISTS saved_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  type TEXT NOT NULL CHECK (type IN ('orange_money','mtn_momo','wave','moov_money','card_visa','card_mastercard','wire_transfer')),
  phone_number TEXT,
  phone_label TEXT,
  operator TEXT,
  card_token TEXT,
  card_last4 TEXT,
  card_brand TEXT,
  card_expiry TEXT,
  card_holder_name TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── PAYMENT RECONCILIATION ──

CREATE TABLE IF NOT EXISTS payment_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month TEXT NOT NULL,
  provider TEXT NOT NULL,
  total_transactions INTEGER DEFAULT 0,
  total_amount_fcfa INTEGER DEFAULT 0,
  total_fees_fcfa INTEGER DEFAULT 0,
  total_net_fcfa INTEGER DEFAULT 0,
  discrepancies JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','validated','flagged')),
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── FEATURES CATALOG ──

CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  feature_type TEXT DEFAULT 'boolean' CHECK (feature_type IN ('boolean','limit','unlimited')),
  limit_unit TEXT,
  is_core BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_features_product_key ON features(product_id, key);

-- ── PLAN FEATURES MATRIX ──

CREATE TABLE IF NOT EXISTS plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID,
  feature_id UUID,
  enabled BOOLEAN DEFAULT false,
  limit_value INTEGER,
  limit_unit TEXT,
  display_value TEXT,
  tooltip TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_features_unique ON plan_features(plan_id, feature_id);

-- ── SUBSCRIPTION CHANGES HISTORY ──

CREATE TABLE IF NOT EXISTS subscription_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID,
  tenant_id UUID,
  change_type TEXT NOT NULL CHECK (change_type IN ('upgrade','downgrade','cycle_change','reactivation','cancellation','trial_conversion')),
  from_plan_id UUID,
  to_plan_id UUID,
  from_cycle TEXT,
  to_cycle TEXT,
  effective_immediately BOOLEAN DEFAULT false,
  effective_date DATE,
  prorata_credit_fcfa INTEGER DEFAULT 0,
  prorata_charge_fcfa INTEGER DEFAULT 0,
  invoice_id UUID,
  initiated_by UUID,
  actor_type TEXT CHECK (actor_type IN ('client','pamela','system')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── USAGE EVENTS ──

CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  subscription_id UUID,
  product_id UUID,
  feature_key TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit TEXT,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- ── RENEWAL LOG ──

CREATE TABLE IF NOT EXISTS renewal_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID,
  tenant_id UUID,
  renewal_type TEXT CHECK (renewal_type IN ('auto_payment','manual_payment','grace_period','degraded_mode','suspension','reminder_sent','payment_attempt','payment_failed')),
  status TEXT,
  details JSONB DEFAULT '{}',
  invoice_id UUID,
  transaction_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── ALTER EXISTING TABLES ──

-- Add columns to plans if missing
ALTER TABLE plans ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS annual_discount_pct INTEGER DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS storage_gb INTEGER DEFAULT 1;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS api_calls_monthly INTEGER DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add columns to subscriptions if missing
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_anchor_day INTEGER DEFAULT 1;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_renewal_date DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pending_plan_id UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pending_billing_cycle TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pending_change_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS usage_documents INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS usage_api_calls INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS usage_storage_mb INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS mrr_fcfa INTEGER DEFAULT 0;

-- ── RLS ──

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_log ENABLE ROW LEVEL SECURITY;

-- ── INDEXES ──

CREATE INDEX IF NOT EXISTS idx_payment_txn_tenant ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_txn_provider ON payment_transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_token ON payment_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_saved_methods_tenant ON saved_payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant ON usage_events(tenant_id, product_id, feature_key);
CREATE INDEX IF NOT EXISTS idx_renewal_log_sub ON renewal_log(subscription_id);

-- ── FUNCTION: Check feature access ──

CREATE OR REPLACE FUNCTION check_feature_access(
  p_tenant_id UUID,
  p_product_id UUID,
  p_feature_key TEXT
) RETURNS JSONB AS $$
DECLARE
  sub record;
  pf record;
  f record;
  usage_count INTEGER;
BEGIN
  SELECT s.*, p.name as plan_name INTO sub FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.tenant_id = p_tenant_id AND s.product_id = p_product_id
    AND s.status IN ('active','trial','past_due','degraded')
  ORDER BY s.created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_active_subscription');
  END IF;

  IF sub.status = 'degraded' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'degraded_mode', 'message', 'Abonnement expiré — renouvelez pour continuer');
  END IF;

  SELECT * INTO f FROM features WHERE product_id = p_product_id AND key = p_feature_key;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed', false, 'reason', 'feature_not_found'); END IF;
  IF f.is_core THEN RETURN jsonb_build_object('allowed', true, 'reason', 'core_feature'); END IF;

  SELECT * INTO pf FROM plan_features WHERE plan_id = sub.plan_id AND feature_id = f.id;
  IF NOT FOUND OR NOT pf.enabled THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_in_plan', 'upgrade_required', true, 'message', 'Non inclus dans votre plan');
  END IF;

  IF pf.limit_value IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0) INTO usage_count FROM usage_events
    WHERE tenant_id = p_tenant_id AND product_id = p_product_id AND feature_key = p_feature_key
      AND recorded_at >= sub.current_period_start AND recorded_at < sub.current_period_end + INTERVAL '1 day';

    IF usage_count >= pf.limit_value THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'limit_reached', 'used', usage_count, 'limit', pf.limit_value, 'unit', pf.limit_unit, 'upgrade_required', true);
    END IF;
    RETURN jsonb_build_object('allowed', true, 'reason', 'within_limit', 'used', usage_count, 'limit', pf.limit_value, 'remaining', pf.limit_value - usage_count);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', 'plan_includes_feature');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── FUNCTION: Calculate prorata ──

CREATE OR REPLACE FUNCTION calculate_prorata(
  p_subscription_id UUID,
  p_new_plan_id UUID,
  p_new_cycle TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  sub record;
  current_plan record;
  new_plan record;
  days_remaining INTEGER;
  days_in_period INTEGER;
  current_daily DECIMAL;
  new_daily DECIMAL;
  credit INTEGER;
  charge INTEGER;
  net INTEGER;
BEGIN
  SELECT * INTO sub FROM subscriptions WHERE id = p_subscription_id;
  SELECT * INTO current_plan FROM plans WHERE id = sub.plan_id;
  SELECT * INTO new_plan FROM plans WHERE id = p_new_plan_id;

  days_remaining := (sub.current_period_end - CURRENT_DATE);
  days_in_period := GREATEST((sub.current_period_end - sub.current_period_start), 1);

  IF sub.billing_cycle = 'monthly' THEN
    current_daily := COALESCE(current_plan.price_monthly_fcfa, 0)::DECIMAL / days_in_period;
    new_daily := COALESCE(new_plan.price_monthly_fcfa, 0)::DECIMAL / days_in_period;
  ELSE
    current_daily := COALESCE(current_plan.price_annual_fcfa, 0)::DECIMAL / 365;
    new_daily := COALESCE(new_plan.price_annual_fcfa, 0)::DECIMAL / 365;
  END IF;

  credit := ROUND(current_daily * days_remaining);
  charge := ROUND(new_daily * days_remaining);
  net := charge - credit;

  RETURN jsonb_build_object(
    'days_remaining', days_remaining,
    'credit_fcfa', credit,
    'charge_fcfa', charge,
    'net_fcfa', net,
    'is_upgrade', COALESCE(new_plan.price_monthly_fcfa, 0) > COALESCE(current_plan.price_monthly_fcfa, 0),
    'supplement_fcfa', GREATEST(net, 0),
    'avoir_fcfa', ABS(LEAST(net, 0))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
