-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Sprint S6-S8 : Ventes (Prospection / SDR / Closer) helpers
-- ═══════════════════════════════════════════════════════════════════════════

-- asvc_leads_pipeline(p_limit)
-- Vue agrégée du pipeline avec dernière interaction + action suggérée.
CREATE OR REPLACE FUNCTION public.asvc_leads_pipeline(p_limit INT DEFAULT 200)
RETURNS TABLE (
  lead_id              UUID,
  company_name         TEXT,
  contact_name         TEXT,
  contact_email        TEXT,
  country              TEXT,
  sector               TEXT,
  size_estimate        TEXT,
  product_interest     TEXT[],
  stage                TEXT,
  score                INT,
  contract_value_fcfa  BIGINT,
  last_touch_at        TIMESTAMPTZ,
  next_action_due_at   TIMESTAMPTZ,
  days_in_stage        INT,
  interactions_count   INT,
  last_interaction_outcome TEXT,
  suggested_next_action TEXT,
  created_at           TIMESTAMPTZ
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
  WITH last_inter AS (
    SELECT DISTINCT ON (li.lead_id)
      li.lead_id,
      li.outcome,
      li.created_at AS at
    FROM public.asvc_lead_interactions li
    ORDER BY li.lead_id, li.created_at DESC
  ),
  inter_counts AS (
    SELECT lead_id, COUNT(*)::INT AS cnt
    FROM public.asvc_lead_interactions
    GROUP BY lead_id
  )
  SELECT
    l.id,
    l.company_name,
    l.contact_name,
    l.contact_email,
    l.country,
    l.sector,
    l.size_estimate,
    l.product_interest,
    l.stage,
    l.score,
    l.contract_value_fcfa,
    l.last_touch_at,
    l.next_action_due_at,
    EXTRACT(EPOCH FROM (now() - l.updated_at))::INT / 86400 AS days_in_stage,
    COALESCE(ic.cnt, 0),
    li.outcome,
    CASE l.stage
      WHEN 'prospect'         THEN 'enrich:prospection'
      WHEN 'mql'              THEN 'outreach:sdr'
      WHEN 'sql'              THEN 'outreach:sdr'
      WHEN 'demo_scheduled'   THEN 'prep:closer'
      WHEN 'demo_done'        THEN 'proposal:closer'
      WHEN 'proposal_sent'    THEN 'followup:closer'
      WHEN 'negotiation'      THEN 'followup:closer'
      WHEN 'won'              THEN 'handoff:customer_success'
      WHEN 'lost'             THEN 'archive'
      ELSE 'review'
    END AS suggested_next_action,
    l.created_at
  FROM public.asvc_leads l
  LEFT JOIN last_inter li ON li.lead_id = l.id
  LEFT JOIN inter_counts ic ON ic.lead_id = l.id
  ORDER BY
    CASE l.stage
      WHEN 'negotiation'    THEN 1
      WHEN 'proposal_sent'  THEN 2
      WHEN 'demo_done'      THEN 3
      WHEN 'demo_scheduled' THEN 4
      WHEN 'sql'            THEN 5
      WHEN 'mql'            THEN 6
      WHEN 'prospect'       THEN 7
      WHEN 'won'            THEN 8
      WHEN 'lost'           THEN 9
      ELSE 10
    END,
    l.score DESC NULLS LAST,
    l.updated_at DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_leads_pipeline(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_leads_pipeline(INT) TO authenticated, service_role;
