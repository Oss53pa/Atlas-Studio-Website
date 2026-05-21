-- ═══════════════════════════════════════════════════════════════════════════
-- ATLAS STUDIO — Rails plateforme : DataBus inter-apps · Mobile Money · OHADA
-- ═══════════════════════════════════════════════════════════════════════════
-- Corrige 3 manques systémiques de la suite :
--   1. DataBus  — continuité des données entre apps (fin du export/réimport Excel)
--   2. MoMo     — relevés Mobile Money ingérés comme SOURCE de données
--   3. OHADA    — référentiel fiscal 17 pays (rend « 17 pays » concret)
--
-- Modèle : Atlas Studio est le hub central. Les apps satellites (Atlas F&A,
-- Cockpit F&A, TableSmart, AtlasBanx, Liass'Pilot, Advist) tournent chacune sur
-- leur propre Supabase et consomment ces rails via les Edge Functions `databus`
-- et `mobile-money-import`, authentifiées par le JWT SSO (getFederationUser).
-- Le scoping multi-tenant se fait par owner_id = compte Atlas Studio (profiles).
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1. DATABUS — objets de données échangés entre apps
-- ───────────────────────────────────────────────────────────────────────────
-- Un producteur (producer_app) publie un objet typé (object_type) destiné à un
-- consommateur (consumer_app) ou diffusé à tout abonné (consumer_app NULL).
-- Le payload est auto-suffisant : le consommateur n'a PAS besoin d'accéder à la
-- base centrale, il reçoit tout via `databus pull`.
CREATE TABLE IF NOT EXISTS public.databus_objects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id      TEXT,                          -- société / dossier (multi-tenant intra-compte)
  producer_app    TEXT NOT NULL,                 -- app source       (ex: 'tablesmart')
  consumer_app    TEXT,                          -- app cible ; NULL = diffusion à tout abonné
  object_type     TEXT NOT NULL,                 -- ex: 'accounting.entries', 'trial.balance'
  schema_version  INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','claimed','consumed','failed','archived')),
  payload         JSONB NOT NULL,
  idempotency_key TEXT,                           -- dédup côté producteur
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at      TIMESTAMPTZ,
  consumed_at     TIMESTAMPTZ,
  consumed_by     TEXT
);

-- Dédup : un producteur ne publie pas deux fois le même objet logique.
CREATE UNIQUE INDEX IF NOT EXISTS uq_databus_idem
  ON public.databus_objects(producer_app, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- File d'attente par consommateur (pull rapide).
CREATE INDEX IF NOT EXISTS idx_databus_consumer_pending
  ON public.databus_objects(consumer_app, status, created_at)
  WHERE status IN ('pending','claimed');

-- Vue par compte/type (visibilité portail + audit).
CREATE INDEX IF NOT EXISTS idx_databus_owner_type
  ON public.databus_objects(owner_id, object_type, created_at DESC);

ALTER TABLE public.databus_objects ENABLE ROW LEVEL SECURITY;
-- Le propriétaire voit ses propres flux dans le portail ; l'admin voit tout.
-- Les apps satellites passent par les Edge Functions (service_role) → bypass RLS.
CREATE POLICY "databus_owner_read" ON public.databus_objects
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "databus_admin_all" ON public.databus_objects
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT ON public.databus_objects TO authenticated;
GRANT ALL ON public.databus_objects TO service_role;

-- databus_claim — réclame atomiquement des objets en attente pour un consommateur.
-- FOR UPDATE SKIP LOCKED garantit qu'un même objet n'est jamais traité deux fois
-- par des pulls concurrents.
CREATE OR REPLACE FUNCTION public.databus_claim(
  p_consumer_app TEXT,
  p_owner_id     UUID DEFAULT NULL,
  p_object_type  TEXT DEFAULT NULL,
  p_limit        INTEGER DEFAULT 50
)
RETURNS SETOF public.databus_objects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.databus_objects d
     SET status = 'claimed', claimed_at = now()
   WHERE d.id IN (
     SELECT id FROM public.databus_objects
      WHERE status = 'pending'
        AND (consumer_app = p_consumer_app OR consumer_app IS NULL)
        AND (p_owner_id IS NULL OR owner_id = p_owner_id)
        AND (p_object_type IS NULL OR object_type = p_object_type)
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT GREATEST(COALESCE(p_limit, 50), 1)
   )
  RETURNING d.*;
END;
$$;
REVOKE ALL ON FUNCTION public.databus_claim(TEXT,UUID,TEXT,INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.databus_claim(TEXT,UUID,TEXT,INTEGER) TO service_role;

-- databus_ack — accuse réception (consumed) ou signale un échec (failed).
CREATE OR REPLACE FUNCTION public.databus_ack(
  p_ids      UUID[],
  p_consumer TEXT,
  p_status   TEXT DEFAULT 'consumed',
  p_error    TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  IF p_status NOT IN ('consumed','failed','archived') THEN
    RAISE EXCEPTION 'statut ack invalide: %', p_status;
  END IF;
  UPDATE public.databus_objects
     SET status      = p_status,
         consumed_at = CASE WHEN p_status = 'consumed' THEN now() ELSE consumed_at END,
         consumed_by = p_consumer,
         error       = p_error
   WHERE id = ANY(p_ids)
     AND (consumer_app = p_consumer OR consumer_app IS NULL);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.databus_ack(UUID[],TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.databus_ack(UUID[],TEXT,TEXT,TEXT) TO service_role;


-- ───────────────────────────────────────────────────────────────────────────
-- 2. MOBILE MONEY — relevés normalisés (source de données, pas juste paiement)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mobile_money_statements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id      TEXT,
  provider        TEXT NOT NULL
                    CHECK (provider IN ('orange_money','wave','mtn_momo','moov_money',
                                        'free_money','mpesa','airtel_money','other')),
  account_label   TEXT,
  account_msisdn  TEXT,
  currency        TEXT NOT NULL DEFAULT 'XOF',
  period_start    DATE,
  period_end      DATE,
  opening_balance NUMERIC(18,2),
  closing_balance NUMERIC(18,2),
  source          TEXT NOT NULL DEFAULT 'file'
                    CHECK (source IN ('file','cinetpay','api','manual')),
  external_ref    TEXT,
  tx_count        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mobile_money_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id        UUID NOT NULL REFERENCES public.mobile_money_statements(id) ON DELETE CASCADE,
  owner_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occurred_at         TIMESTAMPTZ NOT NULL,
  direction           TEXT NOT NULL CHECK (direction IN ('debit','credit')),
  amount              NUMERIC(18,2) NOT NULL,
  fee                 NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance_after       NUMERIC(18,2),
  counterparty        TEXT,
  counterparty_msisdn TEXT,
  reference           TEXT,
  raw_label           TEXT,
  category            TEXT,                 -- 'cash_in','cash_out','transfer','merchant','fee','bill'...
  reconciled          BOOLEAN NOT NULL DEFAULT false,
  raw                 JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mm_tx_statement  ON public.mobile_money_transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_mm_tx_owner_date ON public.mobile_money_transactions(owner_id, occurred_at DESC);
-- Idempotence d'import : une référence opérateur n'est ingérée qu'une fois par relevé.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mm_tx_ref
  ON public.mobile_money_transactions(statement_id, reference)
  WHERE reference IS NOT NULL;

ALTER TABLE public.mobile_money_statements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_money_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mm_stmt_owner"  ON public.mobile_money_statements
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "mm_stmt_admin"  ON public.mobile_money_statements
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "mm_tx_owner"    ON public.mobile_money_transactions
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "mm_tx_admin"    ON public.mobile_money_transactions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.mobile_money_statements, public.mobile_money_transactions TO authenticated;
GRANT ALL    ON public.mobile_money_statements, public.mobile_money_transactions TO service_role;


-- ───────────────────────────────────────────────────────────────────────────
-- 3. OHADA — référentiel fiscal des 17 États membres
-- ───────────────────────────────────────────────────────────────────────────
-- Rend « 17 pays OHADA » concret : zone, devise, TVA, IS, IMF, autorité fiscale.
-- rates_verified = false → les taux sont INDICATIFS et doivent être validés par
-- un expert local avant usage fiscal. La devise et la zone sont des faits stables.
CREATE TABLE IF NOT EXISTS public.ohada_country_tax (
  country_code       TEXT PRIMARY KEY,                  -- ISO 3166-1 alpha-2
  country_name       TEXT NOT NULL,
  zone               TEXT NOT NULL,                     -- 'UEMOA' | 'CEMAC' | 'other'
  currency           TEXT NOT NULL,                     -- XOF | XAF | KMF | CDF | GNF
  vat_standard_rate  NUMERIC(5,2),                      -- TVA standard (%) — NULL si pas de TVA
  vat_rates          JSONB NOT NULL DEFAULT '[]',       -- taux réduits / spéciaux
  corporate_tax_rate NUMERIC(5,2),                      -- IS standard (%)
  min_tax            JSONB NOT NULL DEFAULT '{}',       -- IMF/IMC : {rate, floor, ceiling}
  tax_authority      TEXT,
  efiling_url        TEXT,                              -- à compléter par pays
  syscohada_variant  TEXT NOT NULL DEFAULT 'révisé',
  rates_verified     BOOLEAN NOT NULL DEFAULT false,
  notes              TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ohada_country_tax ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ohada_public_read" ON public.ohada_country_tax FOR SELECT USING (true);
CREATE POLICY "ohada_admin_write" ON public.ohada_country_tax
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT ON public.ohada_country_tax TO anon, authenticated;
GRANT ALL    ON public.ohada_country_tax TO service_role;

-- Seed des 17 États membres OHADA. Zone + devise = faits stables.
-- TVA/IS recoupés sur PwC Worldwide Tax Summaries : rates_verified = true.
-- Sources divergentes ou taux récents : rates_verified = false (à confirmer).
INSERT INTO public.ohada_country_tax
  (country_code, country_name, zone, currency, vat_standard_rate, corporate_tax_rate, tax_authority, rates_verified, notes)
VALUES
  -- UEMOA (XOF)
  ('BJ', 'Bénin',                    'UEMOA', 'XOF', 18.00, 30.00, 'DGI',  true,  NULL),
  ('BF', 'Burkina Faso',             'UEMOA', 'XOF', 18.00, 27.50, 'DGI',  true,  NULL),
  ('CI', 'Côte d''Ivoire',           'UEMOA', 'XOF', 18.00, 25.00, 'DGI',  true,  'IS 30% pour télécoms/TIC ; IMF 0,5% du CA'),
  ('GW', 'Guinée-Bissau',            'UEMOA', 'XOF', 19.00, 25.00, 'DGCI', false, 'TVA introduite 2023 (Loi 4/2022) — taux à confirmer'),
  ('ML', 'Mali',                     'UEMOA', 'XOF', 18.00, 30.00, 'DGI',  true,  NULL),
  ('NE', 'Niger',                    'UEMOA', 'XOF', 19.00, 30.00, 'DGI',  true,  NULL),
  ('SN', 'Sénégal',                  'UEMOA', 'XOF', 18.00, 30.00, 'DGID', true,  NULL),
  ('TG', 'Togo',                     'UEMOA', 'XOF', 18.00, 27.00, 'OTR',  true,  NULL),
  -- CEMAC (XAF)
  ('CM', 'Cameroun',                 'CEMAC', 'XAF', 19.25, 33.00, 'DGI',  true,  'TVA 19,25% (CAC inclus) ; IS 33% (CAC inclus)'),
  ('CF', 'Centrafrique',             'CEMAC', 'XAF', 19.00, 30.00, 'DGID', false, 'À confirmer'),
  ('TD', 'Tchad',                    'CEMAC', 'XAF', 18.00, 35.00, 'DGI',  false, 'IS 35% (certaines sources indiquent 40% / secteur pétrolier)'),
  ('CG', 'Congo (Brazzaville)',      'CEMAC', 'XAF', 18.90, 28.00, 'DGID', false, 'TVA 18,9% (surtaxe incluse) ; IS 28% — sources divergentes (30%)'),
  ('GQ', 'Guinée équatoriale',       'CEMAC', 'XAF', 15.00, 35.00, 'DGI',  false, 'IS 35% (PwC) — une source indique 25%'),
  ('GA', 'Gabon',                    'CEMAC', 'XAF', 18.00, 30.00, 'DGI',  true,  'IS 35% pour pétrole/mines'),
  -- Hors UEMOA/CEMAC
  ('KM', 'Comores',                  'other', 'KMF', NULL,  35.00, 'AGID', true,  'Pas de TVA standard ; IS 50% pour entreprises publiques > 500M KMF'),
  ('GN', 'Guinée (Conakry)',         'other', 'GNF', 18.00, 25.00, 'DGI',  true,  'IS 30/35% pour mines & hydrocarbures'),
  ('CD', 'RD Congo',                 'other', 'CDF', 16.00, 30.00, 'DGI',  true,  NULL)
ON CONFLICT (country_code) DO UPDATE SET
  country_name       = EXCLUDED.country_name,
  zone               = EXCLUDED.zone,
  currency           = EXCLUDED.currency,
  vat_standard_rate  = EXCLUDED.vat_standard_rate,
  corporate_tax_rate = EXCLUDED.corporate_tax_rate,
  tax_authority      = EXCLUDED.tax_authority,
  rates_verified     = EXCLUDED.rates_verified,
  notes              = EXCLUDED.notes,
  updated_at         = now();
