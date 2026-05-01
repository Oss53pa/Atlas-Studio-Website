-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T v2 — Schéma complet (Sprint 0)
-- Conforme au CDC PROPH3T v2 (Pamela Atokouna, mai 2026)
-- ═══════════════════════════════════════════════════════════════════════════
-- HARD RESET: drop des tables v1, recréation des 15 tables v2 alignées CDC.
-- Embedding dim = 768 (nomic-embed-text), HNSW index, RLS service_role only.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── EXTENSIONS ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── HARD RESET v1 ──────────────────────────────────────────────────────────
DROP TABLE IF EXISTS proph3t_messages CASCADE;
DROP TABLE IF EXISTS proph3t_conversations CASCADE;
DROP TABLE IF EXISTS proph3t_memory CASCADE;
DROP TABLE IF EXISTS proph3t_knowledge CASCADE;
DROP TABLE IF EXISTS proph3t_agent_plans CASCADE;
DROP TABLE IF EXISTS proph3t_monitor_log CASCADE;
DROP TABLE IF EXISTS proph3t_preferences CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- GROUPE 1 — MÉMOIRE & APPRENTISSAGE (6 tables)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Conversations: sessions de chat utilisateur ↔ PROPH3T
CREATE TABLE proph3t_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product TEXT NOT NULL,                     -- 'cockpit-fna', 'liasspilot', etc.
  society_id UUID,                           -- contexte société courant si applicable
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  summary TEXT,                              -- résumé auto-généré en fin de session
  context_snapshot JSONB DEFAULT '{}',       -- snapshot KPIs/contexte au démarrage
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_proph3t_conv_user ON proph3t_conversations(user_id, started_at DESC);
CREATE INDEX idx_proph3t_conv_product ON proph3t_conversations(product, started_at DESC);

-- 2. Messages: tour-par-tour de chaque conversation
CREATE TABLE proph3t_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES proph3t_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  tool_calls JSONB DEFAULT '[]',             -- function calling Ollama
  tool_results JSONB DEFAULT '[]',
  citations JSONB DEFAULT '[]',              -- chunks/tables référencés (garde-fou)
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  model_used TEXT,                           -- 'llama-3.1-8b-instruct-q4_k_m'
  tokens_input INTEGER,
  tokens_output INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_proph3t_msg_conv ON proph3t_messages(conversation_id, created_at);

-- 3. Feedback: 👍/👎/✏️ utilisateur sur chaque réponse assistant
CREATE TABLE proph3t_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES proph3t_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('up','down','correction')),
  correction_text TEXT,                      -- bonne réponse fournie par user (cas ✏️)
  reason TEXT,                               -- explication courte du 👎 si fournie
  applied_at TIMESTAMPTZ,                    -- date d'intégration RAG / business_rule
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_proph3t_fb_message ON proph3t_feedback(message_id);
CREATE INDEX idx_proph3t_fb_rating ON proph3t_feedback(rating, created_at DESC);

-- 4. Observations: KPIs, ratios, anomalies datées par société
CREATE TABLE proph3t_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL,
  product TEXT NOT NULL,
  observation_type TEXT NOT NULL CHECK (observation_type IN (
    'kpi','ratio','anomaly','alert','prediction','benchmark','manual_note'
  )),
  payload JSONB NOT NULL,                    -- valeur, période, formule, etc.
  severity TEXT CHECK (severity IN ('info','warn','critical')),
  source TEXT,                               -- 'auto','user','agent','rule'
  observed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_proph3t_obs_society ON proph3t_observations(society_id, observed_at DESC);
CREATE INDEX idx_proph3t_obs_type ON proph3t_observations(observation_type, observed_at DESC);

-- 5. User profile: préférences (verbosity, langue, niveau d'expertise)
CREATE TABLE proph3t_user_profile (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  verbosity TEXT DEFAULT 'normal' CHECK (verbosity IN ('concise','normal','detailed')),
  role_hint TEXT,                            -- 'CEO','DAF','comptable','gerant'
  language TEXT DEFAULT 'fr',
  expertise_level TEXT DEFAULT 'intermediate' CHECK (expertise_level IN ('novice','intermediate','expert')),
  preferred_tone TEXT DEFAULT 'professional' CHECK (preferred_tone IN ('technical','direction','conseil','pedagogique','professional')),
  notification_channels JSONB DEFAULT '["in_app"]',
  custom_instructions TEXT,                  -- prompt système additionnel par user
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Business rules: règles métier auto-générées par accumulation de corrections
CREATE TABLE proph3t_business_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID,                           -- NULL = règle globale, sinon scopée société
  product TEXT,                              -- NULL = transverse, sinon scopée produit
  rule_text TEXT NOT NULL,                   -- ex: "TVA 18% pour cette société"
  rule_payload JSONB,                        -- structure machine-readable optionnelle
  source_feedback_ids UUID[] DEFAULT '{}',   -- corrections qui ont généré la règle
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_proph3t_rules_scope ON proph3t_business_rules(society_id, product, active);

-- ═══════════════════════════════════════════════════════════════════════════
-- GROUPE 2 — RAG & CONNAISSANCE (4 tables)
-- ═══════════════════════════════════════════════════════════════════════════

-- 7. Documents: source documents (PDF, DOCX, XLSX, CSV, etc.)
CREATE TABLE proph3t_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'pdf','docx','xlsx','csv','txt','manual','conversation','report'
  )),
  storage_path TEXT,                         -- chemin Supabase Storage si applicable
  product TEXT,
  society_id UUID,
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  page_count INTEGER,
  total_chunks INTEGER DEFAULT 0,
  ingestion_status TEXT DEFAULT 'pending' CHECK (ingestion_status IN (
    'pending','processing','done','failed'
  )),
  ingestion_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_proph3t_doc_society ON proph3t_documents(society_id, created_at DESC);
CREATE INDEX idx_proph3t_doc_status ON proph3t_documents(ingestion_status);

-- 8. Chunks: fragments vectorisés (cœur du RAG)
-- Embedding dim = 768 pour nomic-embed-text (CDC §3.3)
CREATE TABLE proph3t_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES proph3t_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),                     -- nomic-embed-text 768d
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',               -- page, section, source_offset, tags
  created_at TIMESTAMPTZ DEFAULT now()
);
-- HNSW index pour recherche cosinus rapide (CDC §4.2)
CREATE INDEX idx_proph3t_chunks_hnsw
  ON proph3t_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_proph3t_chunks_doc ON proph3t_chunks(document_id, chunk_index);
CREATE INDEX idx_proph3t_chunks_meta ON proph3t_chunks USING GIN (metadata);

-- 9. Knowledge base: SYSCOHADA / OHADA / fiscal pré-indexé livré avec le produit
CREATE TABLE proph3t_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'syscohada','ohada','fiscal','rh','immobilier','retail','sectoriel','autre'
  )),
  reference TEXT,                            -- ex: 'AUDCIF-Art.13', 'CGI-237'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  version TEXT DEFAULT '1.0',                -- versioning du référentiel
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_proph3t_kb_hnsw
  ON proph3t_knowledge_base
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_proph3t_kb_category ON proph3t_knowledge_base(category);

-- 10. Validated Q/R: paires question-réponse validées par utilisateurs (👍)
-- Devient corpus d'apprentissage progressif (CDC §6.1 niveau 2)
CREATE TABLE proph3t_validated_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  question_embedding vector(768),
  product TEXT,
  society_id UUID,                           -- scopée à la société (privé) ou NULL = transverse anonymisé
  source_message_id UUID REFERENCES proph3t_messages(id) ON DELETE SET NULL,
  validation_count INTEGER DEFAULT 1,        -- combien de fois validée
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_proph3t_qa_hnsw
  ON proph3t_validated_qa
  USING hnsw (question_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_proph3t_qa_society ON proph3t_validated_qa(society_id, last_used_at DESC NULLS LAST);

-- ═══════════════════════════════════════════════════════════════════════════
-- GROUPE 3 — MONITORING & QUALITÉ (5 tables)
-- ═══════════════════════════════════════════════════════════════════════════

-- 11. Eval runs: résultats des évaluations OHADA automatiques (CDC §5.2 module eval)
CREATE TABLE proph3t_eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_set_version TEXT NOT NULL,            -- ex: 'ohada-v1.0'
  model_version TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  per_category_scores JSONB DEFAULT '{}',
  details JSONB DEFAULT '[]',                -- liste des questions + réponses + verdict
  triggered_by TEXT DEFAULT 'auto',          -- 'auto','manual','ci'
  triggered_by_user UUID REFERENCES profiles(id),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_proph3t_eval_recent ON proph3t_eval_runs(created_at DESC);

-- 12. Alerts: alertes proactives générées par monitoring continu (cron 4h)
CREATE TABLE proph3t_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL,
  product TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('P0','P1','P2')),
  alert_type TEXT NOT NULL,                  -- 'anomaly','drift_bfr','threshold_exceeded',...
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  related_observations UUID[] DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  notification_sent JSONB DEFAULT '{}',      -- {email:..., push:..., in_app:...}
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_proph3t_alerts_open ON proph3t_alerts(society_id, severity, acknowledged) WHERE NOT resolved;
CREATE INDEX idx_proph3t_alerts_recent ON proph3t_alerts(created_at DESC);

-- 13. Audit log: trace SHA-256 chaînée de toutes les actions critiques
CREATE TABLE proph3t_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prev_hash TEXT,                            -- hash de l'entrée précédente (chaînage)
  action TEXT NOT NULL,                      -- 'message_sent','feedback_given','rule_applied',...
  actor_user_id UUID REFERENCES profiles(id),
  subject_type TEXT,
  subject_id UUID,
  content JSONB NOT NULL,                    -- payload complet de l'action
  hash TEXT NOT NULL,                        -- SHA-256(prev_hash || JSONB content || timestamp)
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_proph3t_audit_recent ON proph3t_audit_log(created_at DESC);
CREATE INDEX idx_proph3t_audit_actor ON proph3t_audit_log(actor_user_id, created_at DESC);

-- 14. Usage metrics: compteurs d'utilisation par utilisateur/produit (CDC §9.4)
CREATE TABLE proph3t_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 0,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  total_latency_ms BIGINT DEFAULT 0,
  feedback_up INTEGER DEFAULT 0,
  feedback_down INTEGER DEFAULT 0,
  feedback_corrections INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX idx_proph3t_usage_unique
  ON proph3t_usage_metrics(user_id, product, period_start);
CREATE INDEX idx_proph3t_usage_period ON proph3t_usage_metrics(period_start DESC);

-- 15. Model versions: historique des modèles déployés et leurs métriques
CREATE TABLE proph3t_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_tag TEXT UNIQUE NOT NULL,          -- ex: 'llama-3.1-8b-instruct-q4_k_m-2026.05.01'
  base_model TEXT NOT NULL,                  -- 'llama-3.1-8b-instruct'
  quantization TEXT,                         -- 'Q4_K_M'
  embedding_model TEXT,                      -- 'nomic-embed-text'
  vps_endpoint TEXT,                         -- ex: 'http://10.0.0.5:11434'
  deployed_at TIMESTAMPTZ DEFAULT now(),
  retired_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  eval_score INTEGER CHECK (eval_score BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX idx_proph3t_model_active
  ON proph3t_model_versions(is_active)
  WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — service_role only via Edge Functions
-- ═══════════════════════════════════════════════════════════════════════════
-- Pas de policy publique : seul service_role bypass RLS, donc seules les
-- edge functions (auth Bearer service_role_key) peuvent lire/écrire.
-- Le frontend ne tape JAMAIS ces tables directement.

ALTER TABLE proph3t_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_feedback       ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_observations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_user_profile   ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_chunks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_validated_qa   ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_eval_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_alerts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_audit_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_usage_metrics  ENABLE ROW LEVEL SECURITY;
ALTER TABLE proph3t_model_versions ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Recherche sémantique générique sur proph3t_chunks
CREATE OR REPLACE FUNCTION proph3t_search_chunks(
  query_embedding vector(768),
  filter_society UUID DEFAULT NULL,
  filter_product TEXT DEFAULT NULL,
  match_count INTEGER DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT c.id, c.document_id, c.content,
         1 - (c.embedding <=> query_embedding) AS similarity,
         c.metadata
  FROM proph3t_chunks c
  JOIN proph3t_documents d ON d.id = c.document_id
  WHERE (filter_society IS NULL OR d.society_id = filter_society)
    AND (filter_product IS NULL OR d.product = filter_product)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Recherche sémantique sur la base de connaissance (SYSCOHADA, OHADA…)
CREATE OR REPLACE FUNCTION proph3t_search_knowledge(
  query_embedding vector(768),
  filter_category TEXT DEFAULT NULL,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  reference TEXT,
  title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT k.id, k.category, k.reference, k.title, k.content,
         1 - (k.embedding <=> query_embedding) AS similarity
  FROM proph3t_knowledge_base k
  WHERE (filter_category IS NULL OR k.category = filter_category)
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;
