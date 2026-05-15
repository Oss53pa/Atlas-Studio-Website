-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Sprint S1 : RPCs pour le COO Agent
-- Agregation rapide des KPIs pour la generation de briefs.
-- ═══════════════════════════════════════════════════════════════════════════

-- asvc_brief_stats(p_start, p_end)
-- Retourne en une seule passe : compteurs arbitrages, tickets, leads, factures
-- pour une fenetre temporelle donnee.
CREATE OR REPLACE FUNCTION public.asvc_brief_stats(
  p_start TIMESTAMPTZ,
  p_end   TIMESTAMPTZ
)
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
    'window', jsonb_build_object('start', p_start, 'end', p_end),

    'arbitrations', jsonb_build_object(
      'pending', (
        SELECT count(*) FROM public.asvc_agent_actions
        WHERE status IN ('proposed','consolidated')
      ),
      'urgent', (
        SELECT count(*) FROM public.asvc_agent_actions
        WHERE status IN ('proposed','consolidated') AND criticality = 'critical'
      ),
      'high', (
        SELECT count(*) FROM public.asvc_agent_actions
        WHERE status IN ('proposed','consolidated') AND criticality = 'high'
      )
    ),

    'actions_window', jsonb_build_object(
      'proposed', (
        SELECT count(*) FROM public.asvc_agent_actions
        WHERE created_at >= p_start AND created_at < p_end
      ),
      'approved', (
        SELECT count(*) FROM public.asvc_agent_actions
        WHERE validated_at >= p_start AND validated_at < p_end AND status = 'approved'
      ),
      'rejected', (
        SELECT count(*) FROM public.asvc_agent_actions
        WHERE validated_at >= p_start AND validated_at < p_end AND status = 'rejected'
      ),
      'executed', (
        SELECT count(*) FROM public.asvc_agent_actions
        WHERE executed_at >= p_start AND executed_at < p_end AND status = 'executed'
      )
    ),

    'tickets', jsonb_build_object(
      'open', (SELECT count(*) FROM public.asvc_tickets WHERE status = 'open'),
      'in_progress', (SELECT count(*) FROM public.asvc_tickets WHERE status = 'in_progress'),
      'resolved_window', (
        SELECT count(*) FROM public.asvc_tickets
        WHERE resolved_at >= p_start AND resolved_at < p_end
      ),
      'urgent_open', (
        SELECT count(*) FROM public.asvc_tickets
        WHERE status IN ('open','in_progress') AND priority = 'urgent'
      ),
      'avg_resolution_minutes_window', (
        SELECT coalesce(round(avg(resolution_time_minutes))::int, 0)
        FROM public.asvc_tickets
        WHERE resolved_at >= p_start AND resolved_at < p_end
      )
    ),

    'leads', jsonb_build_object(
      'total_active', (
        SELECT count(*) FROM public.asvc_leads
        WHERE stage NOT IN ('won','lost')
      ),
      'new_window', (
        SELECT count(*) FROM public.asvc_leads
        WHERE created_at >= p_start AND created_at < p_end
      ),
      'qualified_window', (
        SELECT count(*) FROM public.asvc_leads
        WHERE updated_at >= p_start AND updated_at < p_end AND stage IN ('mql','sql','demo_scheduled')
      ),
      'won_window', (
        SELECT count(*) FROM public.asvc_leads
        WHERE closed_at >= p_start AND closed_at < p_end AND stage = 'won'
      ),
      'pipeline_fcfa', (
        SELECT coalesce(sum(contract_value_fcfa), 0)
        FROM public.asvc_leads
        WHERE stage IN ('proposal_sent','negotiation')
      )
    ),

    'invoices', jsonb_build_object(
      'issued_window', (
        SELECT count(*) FROM public.asvc_invoices
        WHERE issued_date >= p_start::date AND issued_date < p_end::date
      ),
      'paid_window_fcfa', (
        SELECT coalesce(sum(amount_ttc_fcfa), 0)
        FROM public.asvc_invoices
        WHERE paid_date >= p_start::date AND paid_date < p_end::date AND status = 'paid'
      ),
      'overdue_count', (
        SELECT count(*) FROM public.asvc_invoices
        WHERE status = 'overdue' OR (status = 'sent' AND due_date < current_date)
      ),
      'overdue_fcfa', (
        SELECT coalesce(sum(amount_ttc_fcfa), 0) FROM public.asvc_invoices
        WHERE status = 'overdue' OR (status = 'sent' AND due_date < current_date)
      )
    ),

    'content', jsonb_build_object(
      'published_window', (
        SELECT count(*) FROM public.asvc_content_calendar
        WHERE published_at >= p_start AND published_at < p_end
      ),
      'pending_approval', (
        SELECT count(*) FROM public.asvc_content_calendar
        WHERE status = 'pending_approval'
      ),
      'engagements_window', (
        SELECT coalesce(sum(engagements), 0) FROM public.asvc_content_calendar
        WHERE published_at >= p_start AND published_at < p_end
      )
    ),

    'agents', jsonb_build_object(
      'total', (SELECT count(*) FROM public.asvc_agents),
      'active', (SELECT count(*) FROM public.asvc_agents WHERE is_active = TRUE),
      'kill_switches_active', (
        SELECT count(*) FROM public.asvc_kill_switch WHERE is_active = TRUE
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_brief_stats(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_brief_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_log_audit — INSERT controle dans l'audit log (utilise par edge functions)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_log_audit(
  p_actor_type    TEXT,
  p_actor_id      TEXT,
  p_event_type    TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id   UUID DEFAULT NULL,
  p_payload       JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.asvc_audit_log (
    actor_type, actor_id, event_type, resource_type, resource_id, payload
  ) VALUES (
    p_actor_type, p_actor_id, p_event_type, p_resource_type, p_resource_id, p_payload
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_log_audit(TEXT,TEXT,TEXT,TEXT,UUID,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_log_audit(TEXT,TEXT,TEXT,TEXT,UUID,JSONB) TO service_role;
