-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Vues admin + seeds CEO preferences (Annexe B)
-- ═══════════════════════════════════════════════════════════════════════════
-- Vues read-optimisées pour le cockpit admin ASVC. Toutes en security_invoker
-- pour que la RLS du caller s'applique (admin via is_admin() → accès complet,
-- non-admin → 0 ligne).
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Vue : actions en attente d'arbitrage CEO (inbox Pame)
-- ───────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_asvc_pending_ceo_arbitrations;
CREATE VIEW public.v_asvc_pending_ceo_arbitrations
  WITH (security_invoker = true) AS
SELECT
  a.id,
  a.title,
  a.description,
  a.criticality,
  a.proposed_payload,
  a.created_at,
  ag.code        AS agent_code,
  ag.name        AS agent_name,
  ag.department  AS agent_department
FROM public.asvc_agent_actions a
JOIN public.asvc_agents ag ON ag.id = a.agent_id
WHERE a.status IN ('proposed', 'consolidated')
ORDER BY
  CASE a.criticality
    WHEN 'critical' THEN 1
    WHEN 'purple'   THEN 2
    WHEN 'high'     THEN 3
    WHEN 'orange'   THEN 4
    WHEN 'normal'   THEN 5
    WHEN 'low'      THEN 6
  END,
  a.created_at;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Vue : pipeline produit Kanban (R&D → Production)
-- ───────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_asvc_product_pipeline;
CREATE VIEW public.v_asvc_product_pipeline
  WITH (security_invoker = true) AS
SELECT
  o.id,
  o.title,
  o.status         AS opportunity_status,
  rb.id            AS research_brief_id,
  ps.id            AS spec_id,
  ps.status        AS spec_status,
  COUNT(DISTINCT pr.id)                                                   AS pr_count,
  COUNT(DISTINCT d.id) FILTER (WHERE d.environment = 'production')        AS prod_deployments,
  o.created_at,
  o.updated_at
FROM public.asvc_opportunities o
LEFT JOIN public.asvc_research_briefs    rb ON rb.opportunity_id = o.id
LEFT JOIN public.asvc_product_specs      ps ON ps.opportunity_id = o.id
LEFT JOIN public.asvc_code_pull_requests pr ON pr.spec_id        = ps.id
LEFT JOIN public.asvc_deployments        d  ON d.pr_id           = pr.id
GROUP BY o.id, o.title, o.status, rb.id, ps.id, ps.status, o.created_at, o.updated_at;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Seeds CEO preferences (Annexe B)
-- ───────────────────────────────────────────────────────────────────────────
-- Le schéma déployé exige (category, preference_key) UNIQUE.
-- Les Edge Functions pourront lire ces clés via :
--   SELECT preference_value FROM asvc_ceo_preferences
--   WHERE category = 'communication' AND preference_key = 'brief_morning_time';
INSERT INTO public.asvc_ceo_preferences (category, preference_key, preference_value, confidence_score) VALUES
  ('communication', 'brief_morning_time',           '"07:00"'::jsonb,                                              1.0),
  ('communication', 'brief_evening_time',           '"19:00"'::jsonb,                                              1.0),
  ('communication', 'weekly_brief_day',             '"monday"'::jsonb,                                             1.0),
  ('communication', 'preferred_signature',          '"Pamela Atokouna - Founder & CEO Atlas Studio"'::jsonb,       1.0),
  ('communication', 'preferred_language',           '"fr"'::jsonb,                                                 1.0),
  ('workflow',      'max_daily_arbitrations',       '5'::jsonb,                                                    1.0),
  ('workflow',      'vacation_mode',                'false'::jsonb,                                                1.0),
  ('workflow',      'critical_escalation_channels', '["app","email","whatsapp"]'::jsonb,                           1.0),
  ('auto_approve',  'auto_approve_after_pattern',   'true'::jsonb,                                                 1.0),
  ('auto_approve',  'pattern_threshold',            '5'::jsonb,                                                    1.0),
  ('auto_approve',  'rejection_threshold',          '3'::jsonb,                                                    1.0)
ON CONFLICT (category, preference_key) DO NOTHING;
