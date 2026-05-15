-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Sprint S4 : Customer Success Agent RPCs
-- Calcul de l'étape de cycle de vie client + signaux de churn / upsell.
-- ═══════════════════════════════════════════════════════════════════════════

-- asvc_clients_lifecycle(p_limit)
-- Retourne pour chaque client (profile role='client'):
--   - stage: 'd1' | 'd7' | 'd30' | 'trial_ending' | 'churn_risk' | 'upsell' | 'steady' | 'churned'
--   - signal_payload: contexte du signal (jours depuis inscription, dernier sentiment, etc.)
--
-- Note: les seuils sont volontairement larges (J+1 = 1-2j, J+7 = 6-8j, J+30 = 28-32j)
-- pour rattraper les clients que l'on n'aurait pas adressés au jour exact.
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
      p.company_name,
      p.created_at,
      EXTRACT(EPOCH FROM (now() - p.created_at))::INT / 86400 AS days_since_signup,
      COUNT(s.id) FILTER (WHERE s.status IN ('active','trial')) AS active_subs_count,
      COUNT(s.id) FILTER (WHERE s.status = 'cancelled')         AS cancelled_subs_count,
      MIN(s.trial_ends_at) FILTER (WHERE s.status = 'trial')    AS earliest_trial_end
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.user_id = p.id
    WHERE p.role = 'client'
    GROUP BY p.id, p.full_name, p.email, p.company_name, p.created_at
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
    -- Dernier outreach customer_success (action_type) sur ce client
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
  LEFT JOIN last_ticket lt ON lt.client_id = cb.client_id
  LEFT JOIN last_outreach lo ON lo.client_id = cb.client_id
  ORDER BY
    -- Priorise les signaux actionnables : churn_risk / trial_ending / d1 / d7 / d30 / upsell / steady / churned
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
