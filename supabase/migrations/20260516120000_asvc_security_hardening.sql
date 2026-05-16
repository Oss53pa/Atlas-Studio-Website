-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Sprint S14 : Security hardening + bug fix customer_lifecycle
-- ═══════════════════════════════════════════════════════════════════════════
-- Corrige :
--   1. asvc_clients_lifecycle() : profiles.company_name n'existe pas — résolu
--      via JOIN organizations (organization_id → name) avec fallback societes (company_id → nom)
--   2. asvc_set_updated_at() : search_path mutable (advisor function_search_path_mutable)
--   3. asvc_audit_compute_hash() : exposé à anon/authenticated alors que c'est
--      un trigger interne — REVOKE EXECUTE
--   4. asvc_audit_log INSERT policy : WITH CHECK (true) trop permissif — restreint
--      à is_admin() ou service_role (l'insertion logique passe par asvc_log_audit
--      qui est SECURITY DEFINER côté service_role)
--
-- NON corrigé (WARN acceptés par design) :
--   - 11× authenticated_security_definer_function_executable sur les RPCs admin :
--     chaque RPC vérifie is_admin() en interne, et l'UI admin appelle directement
--     via supabase-js avec le JWT authenticated. Passer en SECURITY INVOKER
--     casserait la lecture cross-table (profiles, subscriptions) dont la RLS
--     n'autorise pas toujours les admins. Le pattern actuel est volontaire.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- Fix #1 : asvc_clients_lifecycle — bug company_name
-- ───────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.asvc_clients_lifecycle(INT);

CREATE OR REPLACE FUNCTION public.asvc_clients_lifecycle(p_limit INT DEFAULT 100)
RETURNS TABLE (
  client_id        UUID,
  full_name        TEXT,
  email            TEXT,
  company_name     TEXT,
  created_at       TIMESTAMPTZ,
  stage            TEXT,
  signal_payload   JSONB,
  active_subs      INT,
  trial_ends_at    TIMESTAMPTZ,
  last_ticket_sentiment NUMERIC,
  last_outreach_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  RETURN QUERY
  WITH client_base AS (
    SELECT
      p.id           AS client_id,
      p.full_name,
      p.email,
      COALESCE(o.name, soc.nom) AS company_name,
      p.created_at,
      EXTRACT(EPOCH FROM (now() - p.created_at))::INT / 86400 AS days_since_signup,
      COUNT(s.id) FILTER (WHERE s.status IN ('active','trial')) AS active_subs_count,
      COUNT(s.id) FILTER (WHERE s.status = 'cancelled')         AS cancelled_subs_count,
      MIN(s.trial_ends_at) FILTER (WHERE s.status = 'trial')    AS earliest_trial_end
    FROM public.profiles p
    LEFT JOIN public.organizations o ON o.id = p.organization_id
    LEFT JOIN public.societes soc    ON soc.id = p.company_id
    LEFT JOIN public.subscriptions s ON s.user_id = p.id
    WHERE p.role = 'client'
    GROUP BY p.id, p.full_name, p.email, o.name, soc.nom, p.created_at
  ),
  last_ticket AS (
    SELECT DISTINCT ON (t.client_id)
      t.client_id,
      t.sentiment_score,
      t.created_at AS ticket_at
    FROM public.asvc_tickets t
    WHERE t.client_id IS NOT NULL
    ORDER BY t.client_id, t.created_at DESC
  ),
  last_outreach AS (
    SELECT
      (a.proposed_payload ->> 'client_id')::UUID AS client_id,
      MAX(a.created_at)                          AS at
    FROM public.asvc_agent_actions a
    JOIN public.asvc_agents ag ON ag.id = a.agent_id
    WHERE ag.code = 'customer_success'
      AND a.proposed_payload ? 'client_id'
    GROUP BY (a.proposed_payload ->> 'client_id')::UUID
  )
  SELECT
    cb.client_id,
    cb.full_name,
    cb.email,
    cb.company_name,
    cb.created_at,
    CASE
      WHEN cb.active_subs_count = 0 AND cb.cancelled_subs_count > 0 THEN 'churned'
      WHEN lt.sentiment_score IS NOT NULL AND lt.sentiment_score < -0.4 THEN 'churn_risk'
      WHEN cb.earliest_trial_end IS NOT NULL
           AND cb.earliest_trial_end BETWEEN now() AND now() + interval '3 days'
        THEN 'trial_ending'
      WHEN cb.days_since_signup BETWEEN 1 AND 2  THEN 'd1'
      WHEN cb.days_since_signup BETWEEN 6 AND 8  THEN 'd7'
      WHEN cb.days_since_signup BETWEEN 28 AND 32 THEN 'd30'
      WHEN cb.active_subs_count = 1 AND cb.days_since_signup > 60 THEN 'upsell'
      ELSE 'steady'
    END AS stage,
    jsonb_build_object(
      'days_since_signup', cb.days_since_signup,
      'active_subs_count', cb.active_subs_count,
      'cancelled_subs_count', cb.cancelled_subs_count,
      'earliest_trial_end', cb.earliest_trial_end,
      'last_ticket_sentiment', lt.sentiment_score,
      'last_ticket_at', lt.ticket_at,
      'last_outreach_at', lo.at
    ) AS signal_payload,
    cb.active_subs_count::INT AS active_subs,
    cb.earliest_trial_end AS trial_ends_at,
    lt.sentiment_score AS last_ticket_sentiment,
    lo.at AS last_outreach_at
  FROM client_base cb
  LEFT JOIN last_ticket lt   ON lt.client_id = cb.client_id
  LEFT JOIN last_outreach lo ON lo.client_id = cb.client_id
  ORDER BY
    CASE
      WHEN (cb.active_subs_count = 0 AND cb.cancelled_subs_count > 0) THEN 7
      WHEN (lt.sentiment_score IS NOT NULL AND lt.sentiment_score < -0.4) THEN 1
      WHEN (cb.earliest_trial_end IS NOT NULL AND cb.earliest_trial_end BETWEEN now() AND now() + interval '3 days') THEN 2
      WHEN cb.days_since_signup BETWEEN 1 AND 2 THEN 3
      WHEN cb.days_since_signup BETWEEN 6 AND 8 THEN 4
      WHEN cb.days_since_signup BETWEEN 28 AND 32 THEN 5
      WHEN (cb.active_subs_count = 1 AND cb.days_since_signup > 60) THEN 6
      ELSE 8
    END,
    cb.created_at DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_clients_lifecycle(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_clients_lifecycle(INT) TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Fix #2 : asvc_set_updated_at — search_path mutable
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- Fix #3 : asvc_audit_compute_hash — trigger interne, ne doit pas être
-- exposé via /rest/v1/rpc à anon/authenticated
-- ───────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.asvc_audit_compute_hash() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.asvc_audit_compute_hash() FROM anon;
REVOKE EXECUTE ON FUNCTION public.asvc_audit_compute_hash() FROM authenticated;
-- Le trigger s'exécute dans le contexte du table-owner, pas besoin de GRANT explicite.
-- service_role conserve l'accès via son rôle superuser-like.

-- ───────────────────────────────────────────────────────────────────────────
-- Fix #4 : asvc_audit_log INSERT policy — restreint à admin / service_role
-- (l'insertion logique se fait via asvc_log_audit qui est SECURITY DEFINER
-- côté service_role, donc bypasse la policy de toute façon ; ce durcissement
-- empêche un utilisateur authentifié d'insérer arbitrairement dans l'audit log)
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service insert asvc_audit_log" ON public.asvc_audit_log;
CREATE POLICY "Admin or service insert asvc_audit_log"
  ON public.asvc_audit_log
  FOR INSERT
  WITH CHECK (public.is_admin() OR auth.role() = 'service_role');
