-- ============================================================================
-- Cortex — VAGUE 5 : Business Model Canvas + rôles de lecture.
-- 1 canvas par app + 1 canvas global (app_id NULL), 9 blocs, items versionnés.
-- Chaque item peut être relié à une hypothèse du registre (confiance).
-- Rôles : helpers cps_is_advisor()/cps_is_investor() + policies de lecture
-- (prêtes pour un futur associé/investisseur — v1 reste mono-owner).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cps_canvas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      UUID REFERENCES public.cps_apps(id) ON DELETE CASCADE,   -- NULL = canvas global
  version     INT NOT NULL DEFAULT 1,
  label       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cps_canvas_app_version
  ON public.cps_canvas (coalesce(app_id, '00000000-0000-0000-0000-000000000000'::uuid), version);

CREATE TABLE IF NOT EXISTS public.cps_canvas_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id   UUID NOT NULL REFERENCES public.cps_canvas(id) ON DELETE CASCADE,
  block_type  TEXT NOT NULL CHECK (block_type IN
                ('segments','value_prop','channels','relations','revenues','resources','activities','partners','costs')),
  items       JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{label, detail, confidence, linked_assumption_id}]
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (canvas_id, block_type)
);

-- Crée (si besoin) un canvas + ses 9 blocs vides, et le renvoie.
CREATE OR REPLACE FUNCTION public.cps_canvas_ensure(p_app UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id UUID; b TEXT;
BEGIN
  SELECT id INTO v_id FROM public.cps_canvas
   WHERE (p_app IS NULL AND app_id IS NULL) OR app_id = p_app
   ORDER BY version DESC LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.cps_canvas (app_id) VALUES (p_app) RETURNING id INTO v_id;
  END IF;

  FOREACH b IN ARRAY ARRAY['segments','value_prop','channels','relations','revenues','resources','activities','partners','costs'] LOOP
    INSERT INTO public.cps_canvas_blocks (canvas_id, block_type)
    VALUES (v_id, b) ON CONFLICT (canvas_id, block_type) DO NOTHING;
  END LOOP;

  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.cps_canvas_ensure(UUID) TO authenticated;

-- ── Rôles de lecture (préparés, v1 mono-owner) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.cps_is_advisor()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p
                  WHERE p.id = auth.uid() AND p.role IN ('advisor','investor_view'));
$$;
CREATE OR REPLACE FUNCTION public.cps_is_investor()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p
                  WHERE p.id = auth.uid() AND p.role = 'investor_view');
$$;
GRANT EXECUTE ON FUNCTION public.cps_is_advisor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cps_is_investor() TO authenticated;

-- ── updated_at + audit + RLS ────────────────────────────────────────────────
DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['cps_canvas','cps_canvas_blocks']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
      CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.cps_set_updated_at();', t, t, t, t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Admins manage %I" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());', t, t);
    -- lecture seule pour advisor / investor
    EXECUTE format('DROP POLICY IF EXISTS "Advisors read %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Advisors read %I" ON public.%I FOR SELECT USING (public.cps_is_advisor());', t, t);
  END LOOP;
END $$;

-- Advisor : lecture des tables de pilotage (jamais les coûts « owner_only »)
DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['cps_apps','cps_deals','cps_milestones','cps_assumptions','cps_scenarios','cps_projections','cps_metrics_snapshot']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Advisors read %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Advisors read %I" ON public.%I FOR SELECT USING (public.cps_is_advisor());', t, t);
  END LOOP;
END $$;
DROP POLICY IF EXISTS "Advisors read cps_costs" ON public.cps_costs;
CREATE POLICY "Advisors read cps_costs" ON public.cps_costs
  FOR SELECT USING (public.cps_is_advisor() AND owner_only = FALSE);
