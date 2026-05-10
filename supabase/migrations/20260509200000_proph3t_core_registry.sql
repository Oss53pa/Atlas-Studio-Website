-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T Core v1.0 — Registry tables (CDC §7.1)
-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 0 du CDC PROPH3T Core. Pose les fondations du service IA centralise :
-- - proph3t_apps : registry des 15 apps Atlas Studio + leur domaine + mode
-- - proph3t_tools : registry des tools (3 niveaux : Core / Domaine / Specifique)
-- - proph3t_tools_tenant_config : override par tenant (activer/desactiver)
-- - proph3t_audit_trail : trail immuable (trigger anti-update/delete)
-- - proph3t_quotas : quotas + rate limits par tenant
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Apps registry ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proph3t_apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN (
    'FINANCE_COMPTA', 'FINANCE_REPORTING', 'FINANCE_TRESORERIE', 'FINANCE_AUDIT',
    'IMMOBILIER', 'RH', 'RETAIL', 'COMMERCIAL', 'DOCUMENTAIRE', 'PRODUCTIVITE'
  )),
  mode TEXT NOT NULL CHECK (mode IN ('standard', 'strict')),
  system_prompt TEXT,                       -- Override du system prompt par defaut
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.proph3t_apps IS 'CDC §3.1 — Registry des apps Atlas Studio pour Proph3t. Le domaine determine quels tools sont charges. Le mode determine le niveau de strictness.';

-- ─── 2. Tools registry ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proph3t_tools (
  id TEXT PRIMARY KEY,
  level INT NOT NULL CHECK (level IN (1, 2, 3)),
  domain TEXT,                              -- NULL pour level 1 (universel)
  app_id TEXT REFERENCES public.proph3t_apps(id) ON DELETE CASCADE,  -- NULL pour level 1 et 2
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  schema JSONB NOT NULL,                    -- JSON Schema (parameters)
  is_deterministic BOOLEAN NOT NULL DEFAULT TRUE,  -- TS pur, pas de LLM ?
  requires_embeddings BOOLEAN NOT NULL DEFAULT FALSE,  -- Necessite embeddings (Ollama ou autre) ?
  enabled_globally BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_roles TEXT[] DEFAULT ARRAY['client','admin','super_admin'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.proph3t_tools IS 'CDC §3 — Registry des tools en 3 niveaux : 1=Core (universel), 2=Domaine, 3=Specifique a une app.';

CREATE INDEX IF NOT EXISTS idx_proph3t_tools_level ON public.proph3t_tools(level);
CREATE INDEX IF NOT EXISTS idx_proph3t_tools_domain ON public.proph3t_tools(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proph3t_tools_app ON public.proph3t_tools(app_id) WHERE app_id IS NOT NULL;

-- ─── 3. Tool overrides per tenant ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proph3t_tools_tenant_config (
  tenant_id UUID NOT NULL,
  tool_id TEXT NOT NULL REFERENCES public.proph3t_tools(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  configured_by UUID REFERENCES public.profiles(id),
  configured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, tool_id)
);

COMMENT ON TABLE public.proph3t_tools_tenant_config IS 'CDC §5.3 — Permet d''activer/desactiver un tool pour un tenant specifique (override du registry global).';

-- ─── 4. Audit trail (immuable) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proph3t_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,                           -- NULL pour invocations admin Atlas Studio
  user_id UUID NOT NULL,
  app_id TEXT REFERENCES public.proph3t_apps(id),  -- NULL si appel direct admin
  invocation_id UUID NOT NULL,              -- Permet de regrouper les iterations ReAct
  conversation_id UUID,
  query TEXT NOT NULL,
  context JSONB,
  tools_called JSONB NOT NULL DEFAULT '[]', -- [{tool, input, output, duration_ms, error?}]
  output TEXT,
  model_used TEXT NOT NULL,
  provider TEXT,                            -- 'anthropic', 'gemini', 'groq', 'ollama'
  tokens_input INT,
  tokens_output INT,
  duration_ms INT,
  iteration INT NOT NULL DEFAULT 1,         -- Numero d'iteration ReAct
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout', 'hallucination_detected')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.proph3t_audit_trail IS 'CDC §1.2 #5 + §5.6 — Trail immuable de toutes les invocations Proph3t. Trigger anti-UPDATE/DELETE.';

CREATE INDEX IF NOT EXISTS idx_proph3t_audit_user ON public.proph3t_audit_trail(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proph3t_audit_tenant ON public.proph3t_audit_trail(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proph3t_audit_app ON public.proph3t_audit_trail(app_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proph3t_audit_invocation ON public.proph3t_audit_trail(invocation_id);

-- Trigger : empeche tout UPDATE/DELETE (immuabilite cf CDC §1.2 #5)
CREATE OR REPLACE FUNCTION public.proph3t_audit_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'proph3t_audit_trail est immuable. UPDATE/DELETE refuse.';
END;
$$;

DROP TRIGGER IF EXISTS proph3t_audit_no_update ON public.proph3t_audit_trail;
CREATE TRIGGER proph3t_audit_no_update
  BEFORE UPDATE OR DELETE ON public.proph3t_audit_trail
  FOR EACH ROW EXECUTE FUNCTION public.proph3t_audit_immutable();

-- ─── 5. Quotas et rate limits ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proph3t_quotas (
  tenant_id UUID PRIMARY KEY,
  monthly_invocations_limit INT NOT NULL DEFAULT 10000,
  monthly_invocations_used INT NOT NULL DEFAULT 0,
  per_minute_rate_limit INT NOT NULL DEFAULT 60,
  per_day_rate_limit INT NOT NULL DEFAULT 5000,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + INTERVAL '1 month'),
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'premium', 'sovereign')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.proph3t_quotas IS 'CDC §5.7 — Quotas et rate limits par tenant. Tier standard / premium / sovereign.';

-- ─── 6. RLS strict (CDC §1.2 #6) ─────────────────────────────────────────
ALTER TABLE public.proph3t_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proph3t_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proph3t_tools_tenant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proph3t_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proph3t_quotas ENABLE ROW LEVEL SECURITY;

-- Apps : lisibles par tous les users authentifies, ecriture admin uniquement
DROP POLICY IF EXISTS "Anyone can read apps registry" ON public.proph3t_apps;
CREATE POLICY "Anyone can read apps registry" ON public.proph3t_apps
  FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins manage apps registry" ON public.proph3t_apps;
CREATE POLICY "Admins manage apps registry" ON public.proph3t_apps
  FOR ALL USING (public.is_admin());

-- Tools : lisibles par tous, ecriture admin
DROP POLICY IF EXISTS "Anyone can read tools registry" ON public.proph3t_tools;
CREATE POLICY "Anyone can read tools registry" ON public.proph3t_tools
  FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins manage tools registry" ON public.proph3t_tools;
CREATE POLICY "Admins manage tools registry" ON public.proph3t_tools
  FOR ALL USING (public.is_admin());

-- Tools tenant config : RLS par tenant
DROP POLICY IF EXISTS "Tenant manages own tools config" ON public.proph3t_tools_tenant_config;
CREATE POLICY "Tenant manages own tools config" ON public.proph3t_tools_tenant_config
  FOR ALL USING (tenant_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid()
  ) OR public.is_admin());

-- Audit trail : user voit ses propres logs, admin voit tout
DROP POLICY IF EXISTS "Users see own audit" ON public.proph3t_audit_trail;
CREATE POLICY "Users see own audit" ON public.proph3t_audit_trail
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Service role inserts audit" ON public.proph3t_audit_trail;
CREATE POLICY "Service role inserts audit" ON public.proph3t_audit_trail
  FOR INSERT WITH CHECK (TRUE);  -- service_role bypasse, users normaux ne devraient pas

-- Quotas : user voit ses propres quotas, admin gere tout
DROP POLICY IF EXISTS "Users see own quotas" ON public.proph3t_quotas;
CREATE POLICY "Users see own quotas" ON public.proph3t_quotas
  FOR SELECT USING (tenant_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage quotas" ON public.proph3t_quotas;
CREATE POLICY "Admins manage quotas" ON public.proph3t_quotas
  FOR ALL USING (public.is_admin());

-- ─── 7. Seed des 15 apps Atlas Studio (CDC §1.3) ─────────────────────────
INSERT INTO public.proph3t_apps (id, name, domain, mode, system_prompt) VALUES
  ('atlas-fa', 'Atlas Finance', 'FINANCE_COMPTA', 'strict',
   'Tu es Proph3t en mode strict pour Atlas Finance (ERP comptabilite SYSCOHADA). Tu n''inventes JAMAIS de chiffre — tu utilises compute_ratio. Tu cites SYSCOHADA precisement.'),
  ('liasspilot', 'LiassPilot', 'FINANCE_COMPTA', 'strict',
   'Tu es Proph3t en mode strict pour LiassPilot (liasse fiscale). Tu connais le CGI ivoirien, senegalais, OHADA. Tu refuses toute approximation.'),
  ('cashpilot', 'CashPilot', 'FINANCE_TRESORERIE', 'strict',
   'Tu es Proph3t en mode strict pour CashPilot (tresorerie). Toute prevision est basee sur des donnees reelles, pas d''hallucination.'),
  ('atlasbanx', 'AtlasBanx', 'FINANCE_AUDIT', 'strict',
   'Tu es Proph3t en mode strict pour AtlasBanx (audit bancaire CEMAC/UEMOA). Tu detectes fraudes (Benford, Beneish, Altman). Zero tolerance.'),
  ('duedeck', 'DueDeck', 'FINANCE_AUDIT', 'strict',
   'Tu es Proph3t en mode strict pour DueDeck (due diligence). Tu identifies red flags. Toute affirmation cite sa source.'),
  ('cockpit-fa', 'Cockpit F&A', 'FINANCE_REPORTING', 'strict',
   'Tu es Proph3t en mode strict pour Cockpit F&A (reporting financier). Tous les chiffres viennent de tools deterministes.'),
  ('wisehr', 'WiseHR', 'RH', 'standard',
   'Tu es Proph3t pour WiseHR (RH). Tu connais Code du Travail ivoirien, ISO 30414, paie CNPS/IGR.'),
  ('wisefm', 'WiseFM', 'IMMOBILIER', 'standard',
   'Tu es Proph3t pour WiseFM (facility management). Tu aides la maintenance preventive et CAPEX.'),
  ('atlas-lease', 'Atlas Lease', 'IMMOBILIER', 'strict',
   'Tu es Proph3t en mode strict pour Atlas Lease (gestion baux). Tu calcules prorata, escalations, WALE precisement.'),
  ('atlas-mall-suite', 'Atlas Mall Suite', 'IMMOBILIER', 'standard',
   'Tu es Proph3t pour Atlas Mall Suite (gestion centres commerciaux). Tu optimises tenant mix et NOI.'),
  ('tablesmart', 'TableSmart', 'RETAIL', 'standard',
   'Tu es Proph3t pour TableSmart (restauration). Tu analyses turnover et recommandes menu.'),
  ('atlastrade', 'AtlasTrade', 'COMMERCIAL', 'standard',
   'Tu es Proph3t pour AtlasTrade (commercial B2B). Tu scores deals (18 signaux), forecastes demande.'),
  ('advist', 'Advist', 'DOCUMENTAIRE', 'strict',
   'Tu es Proph3t en mode strict pour Advist (signature electronique CI). Tu verifies validite signatures Loi 2013-546.'),
  ('docjourney', 'DocJourney', 'DOCUMENTAIRE', 'standard',
   'Tu es Proph3t pour DocJourney (gestion documentaire). Tu generes synthetises et extrais clauses.'),
  ('cockpit-journey', 'CockpitJourney', 'PRODUCTIVITE', 'standard',
   'Tu es Proph3t pour CockpitJourney (productivite + hub Atlas). Tu priorises taches Eisenhower, detectes surcharge.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  mode = EXCLUDED.mode,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = now();

-- ─── 8. Seed des Core tools de Phase 0 ───────────────────────────────────
INSERT INTO public.proph3t_tools (id, level, name, description, schema, is_deterministic, requires_embeddings) VALUES
  ('compute_ratio', 1, 'compute_ratio',
   'Calcule un ratio financier SYSCOHADA (BFR, FR, Z-Score Altman, autonomie, liquidite, CAF, EBE, DSO, DPO).',
   '{"type":"object","properties":{"ratio_type":{"type":"string","enum":["fr","bfr","tresorerie_nette","autonomie_financiere","liquidite_generale","caf","ebe","altman_z_score","dso","dpo"]},"inputs":{"type":"object"}},"required":["ratio_type","inputs"]}'::jsonb,
   TRUE, FALSE),
  ('compute_tva', 1, 'compute_tva',
   'Calcule la TVA UEMOA/CEMAC. Retourne base + taux + montant + total TTC.',
   '{"type":"object","properties":{"base_ht_centimes":{"type":"string"},"country":{"type":"string","enum":["CI","SN","BF","ML","BJ","TG","NE","GW","CM","CG","GA","TD","CF"]},"rate_type":{"type":"string","enum":["standard","reduit","zero","exonere"]}},"required":["base_ht_centimes","country"]}'::jsonb,
   TRUE, FALSE),
  ('apply_prorata_360', 1, 'apply_prorata_360',
   'Applique la regle de prorata 360 jours SYSCOHADA (interets, cotisations).',
   '{"type":"object","properties":{"amount_centimes":{"type":"string"},"days":{"type":"integer","minimum":0,"maximum":360}},"required":["amount_centimes","days"]}'::jsonb,
   TRUE, FALSE),
  ('format_money_fcfa', 1, 'format_money_fcfa',
   'Formate centimes en string lisible FCFA avec separateurs.',
   '{"type":"object","properties":{"centimes":{"type":"string"}},"required":["centimes"]}'::jsonb,
   TRUE, FALSE),
  ('search_knowledge', 1, 'search_knowledge',
   'Recherche semantique dans la base SYSCOHADA / OHADA / fiscal pre-indexee.',
   '{"type":"object","properties":{"query":{"type":"string"},"category":{"type":"string"},"k":{"type":"integer"}},"required":["query"]}'::jsonb,
   TRUE, TRUE),
  ('search_documents', 1, 'search_documents',
   'Recherche semantique dans les documents propres a la societe.',
   '{"type":"object","properties":{"query":{"type":"string"},"society_id":{"type":"string"},"k":{"type":"integer"}},"required":["query"]}'::jsonb,
   TRUE, TRUE),
  ('get_memory', 1, 'get_memory',
   'Recupere observations, regles metier ou Q/R validees pour une societe.',
   '{"type":"object","properties":{"society_id":{"type":"string"},"memory_type":{"type":"string","enum":["observations","rules","validated_qa"]},"limit":{"type":"integer"}},"required":["society_id","memory_type"]}'::jsonb,
   TRUE, FALSE),
  ('generate_alert', 1, 'generate_alert',
   'Emet une alerte proactive (P0/P1/P2) a destination des utilisateurs concernes.',
   '{"type":"object","properties":{"society_id":{"type":"string"},"product":{"type":"string"},"severity":{"type":"string","enum":["P0","P1","P2"]},"alert_type":{"type":"string"},"title":{"type":"string"},"message":{"type":"string"}},"required":["society_id","product","severity","alert_type","title","message"]}'::jsonb,
   TRUE, FALSE),
  ('save_business_rule', 1, 'save_business_rule',
   'Enregistre une regle metier validee par l''utilisateur (admin).',
   '{"type":"object","properties":{"society_id":{"type":"string"},"product":{"type":"string"},"rule_text":{"type":"string"}},"required":["rule_text"]}'::jsonb,
   TRUE, FALSE),
  ('get_financial_data', 1, 'get_financial_data',
   'Recupere KPI/donnees financieres d''une societe sur une periode.',
   '{"type":"object","properties":{"society_id":{"type":"string"},"period":{"type":"string"},"indicator":{"type":"string"}},"required":["society_id","indicator"]}'::jsonb,
   TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  schema = EXCLUDED.schema,
  is_deterministic = EXCLUDED.is_deterministic,
  requires_embeddings = EXCLUDED.requires_embeddings;
