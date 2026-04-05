-- ═══════════════════════════════════════════════════
-- ATLAS STUDIO — MIGRATION V2.0
-- Console complète + PROPH3T Intelligence
-- À exécuter dans le SQL Editor de Supabase
-- ═══════════════════════════════════════════════════

-- Extension vecteurs (pour PROPH3T RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════════════════
-- TABLES CORE (si elles n'existent pas encore)
-- ═══════════════════════════════════════════════════

-- Products catalog
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'live' CHECK (status IN ('live','beta','maintenance','archived')),
  color_accent TEXT DEFAULT '#EF9F27',
  app_url TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_monthly_fcfa INTEGER NOT NULL,
  price_annual_fcfa INTEGER,
  max_seats INTEGER,
  features JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tenants (organisations clientes)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  country TEXT,
  city TEXT,
  rccm TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  sector TEXT,
  size TEXT CHECK (size IN ('1-10','11-50','51-200','200+')),
  status TEXT DEFAULT 'trial' CHECK (status IN ('active','suspended','trial','cancelled')),
  health_score INTEGER DEFAULT 50 CHECK (health_score BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- App users (utilisateurs des tenants)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  supabase_user_id UUID,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','invited','blocked')),
  last_login TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID,
  amount_fcfa INTEGER NOT NULL,
  method TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('success','failed','pending','refunded')),
  gateway_ref TEXT,
  gateway_response JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- KB Articles
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('published','draft','archived')),
  views INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  enabled_global BOOLEAN DEFAULT false,
  tenant_overrides JSONB DEFAULT '{}',
  plan_overrides JSONB DEFAULT '{}',
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('percentage','fixed')),
  value INTEGER NOT NULL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Newsletter campaigns
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT,
  segment JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deployments
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID,
  version TEXT NOT NULL,
  environment TEXT CHECK (environment IN ('production','staging','dev')),
  status TEXT DEFAULT 'deployed' CHECK (status IN ('deploying','deployed','failed','rolled_back')),
  changelog_public TEXT,
  changelog_internal TEXT,
  deployed_at TIMESTAMPTZ DEFAULT now()
);

-- Admin roles
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('critical','high','medium','low')),
  title TEXT NOT NULL,
  message TEXT,
  tenant_id UUID,
  product_id UUID,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  auto_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit logs (extended)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  actor_type TEXT CHECK (actor_type IN ('admin','proph3t','system','api')),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════
-- TABLES PROPH3T AI
-- ═══════════════════════════════════════════════════

-- Mémoire persistante
CREATE TABLE IF NOT EXISTS proph3t_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'user_preference','business_context','decision',
    'alert_dismissed','learned_pattern','entity_note'
  )),
  subject TEXT,
  content TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  confidence DECIMAL DEFAULT 1.0,
  times_referenced INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations
CREATE TABLE IF NOT EXISTS proph3t_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  summary TEXT,
  context_snapshot JSONB,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS proph3t_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES proph3t_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  tool_calls JSONB DEFAULT '[]',
  tool_results JSONB DEFAULT '[]',
  model_used TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Base de connaissances vectorielle
CREATE TABLE IF NOT EXISTS proph3t_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),
  chunk_index INTEGER DEFAULT 0,
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Plans d'action agents
CREATE TABLE IF NOT EXISTS proph3t_agent_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL,
  trigger_data JSONB,
  goal TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','approved','executing','completed','failed','cancelled'
  )),
  approved_at TIMESTAMPTZ,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Monitoring log
CREATE TABLE IF NOT EXISTS proph3t_monitor_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  metric_name TEXT,
  metric_value DECIMAL,
  threshold DECIMAL,
  anomaly_detected BOOLEAN DEFAULT false,
  anomaly_description TEXT,
  action_taken TEXT,
  checked_at TIMESTAMPTZ DEFAULT now()
);

-- Préférences PROPH3T
CREATE TABLE IF NOT EXISTS proph3t_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_key TEXT UNIQUE NOT NULL,
  preference_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seeds préférences par défaut
INSERT INTO proph3t_preferences (preference_key, preference_value, description) VALUES
('response_style', '"concise"', 'Style de réponse'),
('language', '"fr"', 'Langue des réponses'),
('alert_threshold_churn', '30', 'Score santé seuil alerte churn'),
('alert_threshold_mrr_drop', '10', 'Pourcentage drop MRR seuil'),
('monitor_interval_minutes', '15', 'Fréquence surveillance')
ON CONFLICT (preference_key) DO NOTHING;

-- ═══════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'products','plans','tenants','app_users','payments',
    'kb_articles','feature_flags','promo_codes','newsletter_campaigns',
    'deployments','admin_roles','alerts','audit_logs',
    'proph3t_memory','proph3t_conversations','proph3t_messages',
    'proph3t_knowledge','proph3t_agent_plans','proph3t_monitor_log',
    'proph3t_preferences'
  ]) LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════
-- FONCTION RECHERCHE VECTORIELLE
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 5
) RETURNS TABLE (id uuid, content text, source_type text, title text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT id, content, source_type, title,
    1 - (embedding <=> query_embedding) as similarity
  FROM proph3t_knowledge
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
