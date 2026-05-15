-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Sprint S9-S11 : Finance helpers (Facturation, Compta, Trésorerie)
-- ═══════════════════════════════════════════════════════════════════════════

-- asvc_overdue_invoices(p_limit)
-- Factures en retard ou sur le point de l'être, avec niveau de relance suggéré.
CREATE OR REPLACE FUNCTION public.asvc_overdue_invoices(p_limit INT DEFAULT 100)
RETURNS TABLE (
  invoice_id           UUID,
  invoice_number       TEXT,
  client_id            UUID,
  client_name          TEXT,
  amount_ttc_fcfa      BIGINT,
  issued_date          DATE,
  due_date             DATE,
  days_overdue         INT,
  reminder_count       INT,
  last_reminder_at     TIMESTAMPTZ,
  suggested_level      TEXT,
  status               TEXT
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
  SELECT
    i.id,
    i.invoice_number,
    i.client_id,
    i.client_name,
    i.amount_ttc_fcfa,
    i.issued_date,
    i.due_date,
    GREATEST(0, (current_date - i.due_date)::INT) AS days_overdue,
    i.reminder_count,
    i.last_reminder_at,
    CASE
      WHEN (current_date - i.due_date) < 0 THEN 'pre_due'
      WHEN (current_date - i.due_date) BETWEEN 0 AND 7 THEN 'level_1_friendly'
      WHEN (current_date - i.due_date) BETWEEN 8 AND 15 THEN 'level_2_firm'
      WHEN (current_date - i.due_date) BETWEEN 16 AND 30 THEN 'level_3_formal'
      WHEN (current_date - i.due_date) BETWEEN 31 AND 60 THEN 'level_4_final'
      ELSE 'level_5_legal'
    END AS suggested_level,
    i.status
  FROM public.asvc_invoices i
  WHERE i.status IN ('sent', 'partially_paid', 'overdue')
    AND i.due_date <= current_date + interval '3 days'
  ORDER BY
    GREATEST(0, (current_date - i.due_date)::INT) DESC,
    i.amount_ttc_fcfa DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_overdue_invoices(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_overdue_invoices(INT) TO authenticated, service_role;


-- asvc_finance_dashboard()
-- Snapshot trésorerie + KPIs financiers pour le COO et le Trésorerie Agent.
CREATE OR REPLACE FUNCTION public.asvc_finance_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT jsonb_build_object(
    'as_of', now(),

    'revenue', jsonb_build_object(
      'invoiced_mtd_fcfa', (
        SELECT coalesce(sum(amount_ttc_fcfa), 0) FROM public.asvc_invoices
        WHERE issued_date >= date_trunc('month', current_date)
          AND status != 'cancelled'
      ),
      'paid_mtd_fcfa', (
        SELECT coalesce(sum(amount_ttc_fcfa), 0) FROM public.asvc_invoices
        WHERE paid_date >= date_trunc('month', current_date)
          AND status = 'paid'
      ),
      'paid_last_30d_fcfa', (
        SELECT coalesce(sum(amount_ttc_fcfa), 0) FROM public.asvc_invoices
        WHERE paid_date >= current_date - interval '30 days'
          AND status = 'paid'
      ),
      'paid_last_90d_fcfa', (
        SELECT coalesce(sum(amount_ttc_fcfa), 0) FROM public.asvc_invoices
        WHERE paid_date >= current_date - interval '90 days'
          AND status = 'paid'
      )
    ),

    'receivables', jsonb_build_object(
      'outstanding_fcfa', (
        SELECT coalesce(sum(amount_ttc_fcfa), 0) FROM public.asvc_invoices
        WHERE status IN ('sent', 'partially_paid')
      ),
      'overdue_fcfa', (
        SELECT coalesce(sum(amount_ttc_fcfa), 0) FROM public.asvc_invoices
        WHERE status IN ('sent', 'partially_paid', 'overdue')
          AND due_date < current_date
      ),
      'overdue_count', (
        SELECT count(*) FROM public.asvc_invoices
        WHERE status IN ('sent', 'partially_paid', 'overdue')
          AND due_date < current_date
      ),
      'due_next_7d_fcfa', (
        SELECT coalesce(sum(amount_ttc_fcfa), 0) FROM public.asvc_invoices
        WHERE status IN ('sent', 'partially_paid')
          AND due_date BETWEEN current_date AND current_date + interval '7 days'
      ),
      'dso_avg_days', (
        SELECT coalesce(round(avg((paid_date - issued_date))), 0)::INT
        FROM public.asvc_invoices
        WHERE paid_date IS NOT NULL
          AND paid_date >= current_date - interval '90 days'
      )
    ),

    'pipeline_potential_fcfa', (
      SELECT coalesce(sum(contract_value_fcfa), 0) FROM public.asvc_leads
      WHERE stage IN ('proposal_sent', 'negotiation')
    ),

    'mrr_estimate_fcfa', (
      -- MRR = somme prix mensualisé des subs actives
      SELECT coalesce(sum(
        CASE
          WHEN plan ILIKE '%annual%' OR plan ILIKE '%year%' THEN price_at_subscription / 12.0
          ELSE price_at_subscription
        END
      ), 0)::BIGINT
      FROM public.subscriptions
      WHERE status = 'active'
    ),

    'recent_overdue', (
      SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT
          invoice_number, client_name, amount_ttc_fcfa, due_date,
          (current_date - due_date) AS days_overdue
        FROM public.asvc_invoices
        WHERE status IN ('sent', 'partially_paid', 'overdue')
          AND due_date < current_date
        ORDER BY due_date ASC
        LIMIT 10
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_finance_dashboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_finance_dashboard() TO authenticated, service_role;
