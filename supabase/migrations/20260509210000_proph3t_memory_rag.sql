-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T Core v1.0 — Tables memoire + RAG + currency rates (CDC §7.1)
-- ═══════════════════════════════════════════════════════════════════════════
-- Pour les Core tools L1 :
--   - proph3t_memory_episodic + proph3t_memory_semantic (CDC §3.2 memoire)
--   - proph3t_rag_documents + proph3t_rag_chunks (CDC §3.2 RAG)
--   - proph3t_currency_rates (pour convert_currency, taux BCEAO)
-- ═══════════════════════════════════════════════════════════════════════════

-- pgvector deja installe (migration 20260501)

-- ─── 1. Memoire episodique (CDC §3.2 memoire) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.proph3t_memory_episodic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,                           -- NULL si global / admin
  user_id UUID,                             -- NULL si tenant-wide
  app_id TEXT REFERENCES public.proph3t_apps(id),
  event_type TEXT NOT NULL,                 -- ex: 'alert_triggered', 'rule_applied', 'user_correction'
  event_data JSONB NOT NULL,                -- payload structure
  embedding vector(768),                    -- nomic-embed-text ou Gemini text-embedding-004
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.proph3t_memory_episodic IS 'CDC §3.2 — Memoire episodique : evenements dates contextualises (alertes, corrections user, decisions metier).';

CREATE INDEX IF NOT EXISTS idx_proph3t_episodic_tenant ON public.proph3t_memory_episodic(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_proph3t_episodic_user ON public.proph3t_memory_episodic(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_proph3t_episodic_event_type ON public.proph3t_memory_episodic(event_type);
-- Index vectoriel (HNSW pas dispo sur Supabase free tier, on utilise ivfflat)
CREATE INDEX IF NOT EXISTS idx_proph3t_episodic_embedding ON public.proph3t_memory_episodic
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── 2. Memoire semantique (CDC §3.2 memoire) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.proph3t_memory_semantic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('global', 'app', 'tenant', 'user')),
  scope_id TEXT,                            -- app_id ou tenant_id ou user_id selon scope
  fact TEXT NOT NULL,                       -- la connaissance en langage naturel
  source TEXT NOT NULL,                     -- 'validation_user', 'inference', 'training', 'manual'
  confidence NUMERIC NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  embedding vector(768),
  validated_at TIMESTAMPTZ,                 -- NULL si non valide humainement
  validated_by UUID REFERENCES public.profiles(id),
  forgotten_at TIMESTAMPTZ,                 -- soft delete RGPD
  forgotten_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.proph3t_memory_semantic IS 'CDC §3.2 — Memoire semantique : connaissances generales, regles metier, faits valides. Avec embedding pour recherche similarite.';

CREATE INDEX IF NOT EXISTS idx_proph3t_semantic_scope ON public.proph3t_memory_semantic(scope, scope_id) WHERE forgotten_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proph3t_semantic_embedding ON public.proph3t_memory_semantic
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── 3. RAG documents (CDC §3.2 RAG) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proph3t_rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('global', 'app', 'tenant')),
  scope_id TEXT,                            -- app_id (ex 'cockpit-fa') ou tenant_id
  source_url TEXT,
  source_type TEXT,                         -- 'syscohada', 'audcif', 'cgi-ci', 'cgi-sn', 'tenant-doc', etc.
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.proph3t_rag_documents IS 'CDC §3.2 — Documents indexes pour RAG : doctrine OHADA, CGI, manuels metier, docs client.';

CREATE INDEX IF NOT EXISTS idx_proph3t_rag_doc_scope ON public.proph3t_rag_documents(scope, scope_id);
CREATE INDEX IF NOT EXISTS idx_proph3t_rag_doc_type ON public.proph3t_rag_documents(source_type);

-- ─── 4. RAG chunks (CDC §3.2 RAG) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proph3t_rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.proph3t_rag_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  token_count INT,
  metadata JSONB DEFAULT '{}'
);

COMMENT ON TABLE public.proph3t_rag_chunks IS 'CDC §3.2 — Chunks de documents RAG avec embeddings vectoriels.';

CREATE INDEX IF NOT EXISTS idx_proph3t_rag_chunks_doc ON public.proph3t_rag_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_proph3t_rag_chunks_embedding ON public.proph3t_rag_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── 5. Currency rates (pour convert_currency) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.proph3t_currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_code TEXT NOT NULL,                  -- ISO 4217 (XOF, EUR, USD, etc.)
  to_code TEXT NOT NULL,
  rate NUMERIC NOT NULL,                    -- multiplicateur from -> to
  rate_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'BCEAO',     -- BCEAO, BEAC, ECB, manual
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_code, to_code, rate_date, source)
);

COMMENT ON TABLE public.proph3t_currency_rates IS 'Taux de change historiques pour convert_currency. Source par defaut : BCEAO.';

CREATE INDEX IF NOT EXISTS idx_currency_rates_lookup ON public.proph3t_currency_rates(from_code, to_code, rate_date DESC);

-- Seed des taux fixes XOF/XAF/EUR (parite fixe garantie BCEAO/BEAC)
INSERT INTO public.proph3t_currency_rates (from_code, to_code, rate, rate_date, source) VALUES
  ('XOF', 'EUR', 0.001524, CURRENT_DATE, 'BCEAO_FIXE'),  -- 1 XOF = 0.001524 EUR (parite 655.957)
  ('EUR', 'XOF', 655.957, CURRENT_DATE, 'BCEAO_FIXE'),
  ('XAF', 'EUR', 0.001524, CURRENT_DATE, 'BEAC_FIXE'),
  ('EUR', 'XAF', 655.957, CURRENT_DATE, 'BEAC_FIXE'),
  ('XOF', 'XAF', 1.0, CURRENT_DATE, 'PARITE_FIXE'),
  ('XAF', 'XOF', 1.0, CURRENT_DATE, 'PARITE_FIXE')
ON CONFLICT (from_code, to_code, rate_date, source) DO NOTHING;

-- ─── 6. RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.proph3t_memory_episodic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proph3t_memory_semantic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proph3t_rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proph3t_rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proph3t_currency_rates ENABLE ROW LEVEL SECURITY;

-- Memoire episodique : user voit ses propres entrees + tenant + admin tout
DROP POLICY IF EXISTS "User sees own episodic" ON public.proph3t_memory_episodic;
CREATE POLICY "User sees own episodic" ON public.proph3t_memory_episodic
  FOR SELECT USING (
    user_id = auth.uid() OR
    tenant_id = auth.uid() OR
    public.is_admin()
  );

-- Memoire semantique : scope determine la visibilite
DROP POLICY IF EXISTS "Read semantic by scope" ON public.proph3t_memory_semantic;
CREATE POLICY "Read semantic by scope" ON public.proph3t_memory_semantic
  FOR SELECT USING (
    forgotten_at IS NULL AND (
      scope = 'global' OR
      (scope = 'app') OR
      (scope = 'tenant' AND scope_id::uuid = auth.uid()) OR
      (scope = 'user' AND scope_id::uuid = auth.uid()) OR
      public.is_admin()
    )
  );

-- RAG documents : lecture publique (knowledge base) ou tenant
DROP POLICY IF EXISTS "Read RAG docs" ON public.proph3t_rag_documents;
CREATE POLICY "Read RAG docs" ON public.proph3t_rag_documents
  FOR SELECT USING (
    scope IN ('global', 'app') OR
    (scope = 'tenant' AND scope_id::uuid = auth.uid()) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Read RAG chunks" ON public.proph3t_rag_chunks;
CREATE POLICY "Read RAG chunks" ON public.proph3t_rag_chunks
  FOR SELECT USING (TRUE);  -- chunks accessibles via leur document parent

-- Currency rates : lecture publique
DROP POLICY IF EXISTS "Read currency rates" ON public.proph3t_currency_rates;
CREATE POLICY "Read currency rates" ON public.proph3t_currency_rates
  FOR SELECT USING (TRUE);
