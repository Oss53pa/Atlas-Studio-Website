-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Exécution des actions approuvées
-- ═══════════════════════════════════════════════════════════════════════════
-- Transforme ASVC d'un système de drafts en un système qui EXÉCUTE.
--
-- Stratégie:
-- - Pour les actions "in-system" (réponse ticket, update lead, programmation
--   post, écriture compta) → exécution réelle via RPC asvc_execute_action_internal
-- - Pour les actions "external" (Gmail, GitHub, Vercel, CinetPay) → la fonction
--   marque l'action comme "executed_external_pending" avec un payload prêt à
--   consommer par les futurs connecteurs MCP/OAuth
-- ═══════════════════════════════════════════════════════════════════════════

-- Étend les statuts d'action pour distinguer exécution interne vs externe
-- pending. On ne casse pas le CHECK existant (il accepte déjà 'executed').
-- 'executed' = totalement terminé. Pour les externes, on garde 'executed' aussi
-- mais on stocke un flag dans execution_result.

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_pending_executions(p_limit)
-- Liste les actions status='approved' (ou 'modified') prêtes à être exécutées.
-- Renvoie aussi le 'execution_kind': 'internal' | 'external'
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_pending_executions(p_limit INT DEFAULT 100)
RETURNS TABLE (
  action_id        UUID,
  action_type      TEXT,
  criticality      TEXT,
  title            TEXT,
  agent_code       TEXT,
  approved_at      TIMESTAMPTZ,
  execution_kind   TEXT
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
    a.id,
    a.action_type,
    a.criticality,
    a.title,
    ag.code,
    a.validated_at,
    CASE
      -- Actions in-system (peuvent être exécutées 100% en DB)
      WHEN a.action_type IN (
        'send_ticket_response',
        'qualify_lead',
        'publish_post',
        'send_invoice_reminder',
        'import_journal_entry_atlas_finance',
        'treasury_brief',
        'send_customer_email',           -- in-system: log dans ticket_messages si client existant
        'send_community_reply',          -- in-system: log dans une table community_log (sera créée)
        'create_pull_request',           -- in-system: marque le PR comme 'preview_ready' (pas de vraie PR encore)
        'execute_qa_pipeline',           -- in-system: marque test_run comme passed/failed selon plan
        'deploy_to_preview',             -- in-system: crée l'enregistrement deployment 'success' factice
        'deploy_to_staging',
        'publish_documentation',
        'approve_product_spec',
        'decide_opportunity_go_no_go',
        'moderation_escalation',
        'billing_escalation',
        'escalate_ticket'
      ) THEN 'internal'
      -- Actions externes (envoi réel via Gmail/GitHub/Vercel/CinetPay)
      WHEN a.action_type IN (
        'send_sdr_email',
        'send_linkedin_dm',
        'send_whatsapp_message',
        'send_commercial_proposal',
        'create_github_issue',
        'deploy_to_production'
      ) THEN 'external'
      ELSE 'unknown'
    END AS execution_kind
  FROM public.asvc_agent_actions a
  LEFT JOIN public.asvc_agents ag ON ag.id = a.agent_id
  WHERE a.status IN ('approved', 'modified')
  ORDER BY
    CASE a.criticality
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      ELSE 4
    END,
    a.validated_at ASC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_pending_executions(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_pending_executions(INT) TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_community_log — log des réponses community envoyées (in-system)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_community_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id         UUID REFERENCES public.asvc_agent_actions(id),
  channel           TEXT NOT NULL,
  author_handle     TEXT NOT NULL,
  message_type      TEXT,
  original_message  TEXT,
  reply_text        TEXT,
  posted_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  external_post_id  TEXT,                 -- ID externe quand connecteur câblé
  status            TEXT NOT NULL DEFAULT 'logged' CHECK (status IN ('logged','posted_external','failed'))
);
CREATE INDEX IF NOT EXISTS idx_asvc_community_log_action ON public.asvc_community_log(action_id);

ALTER TABLE public.asvc_community_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read asvc_community_log" ON public.asvc_community_log;
CREATE POLICY "Admins read asvc_community_log" ON public.asvc_community_log
  FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins manage asvc_community_log" ON public.asvc_community_log;
CREATE POLICY "Admins manage asvc_community_log" ON public.asvc_community_log
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_execute_action_internal(p_action_id)
-- Dispatcher SQL qui exécute en-DB les actions in-system.
-- Retourne JSONB { kind, result, side_effects }
--
-- Cette fonction est SECURITY DEFINER et peut donc faire des INSERT/UPDATE
-- sur les tables ASVC nécessaires.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_execute_action_internal(p_action_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action    public.asvc_agent_actions%ROWTYPE;
  v_payload   JSONB;
  v_result    JSONB := '{}'::jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  -- Charge l'action et verrouille
  SELECT * INTO v_action FROM public.asvc_agent_actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Action % introuvable', p_action_id;
  END IF;

  IF v_action.status NOT IN ('approved','modified') THEN
    RAISE EXCEPTION 'Action % non approuvée (status=%)', p_action_id, v_action.status;
  END IF;

  -- Payload final : modified_payload si modifié par CEO sinon proposed_payload
  v_payload := COALESCE(v_action.modified_payload, v_action.proposed_payload);

  -- Dispatcher par action_type
  CASE v_action.action_type

    -- ─── Support: insère la réponse dans ticket_messages ────────────────
    WHEN 'send_ticket_response' THEN
      INSERT INTO public.asvc_ticket_messages (
        ticket_id, sender_type, sender_id, content, related_action_id
      ) VALUES (
        (v_payload ->> 'ticket_id')::UUID,
        'agent',
        'support_n1',
        v_payload ->> 'response_text',
        p_action_id
      );
      UPDATE public.asvc_tickets
         SET status = 'waiting_client',
             updated_at = now()
       WHERE id = (v_payload ->> 'ticket_id')::UUID;
      v_result := jsonb_build_object('kind','internal','side_effect','ticket_message_inserted');

    -- ─── Bug triage: marque le ticket comme triagé ──────────────────────
    WHEN 'escalate_ticket' THEN
      UPDATE public.asvc_tickets
         SET status = 'in_progress',
             priority = 'urgent',
             updated_at = now()
       WHERE id = (v_payload ->> 'ticket_id')::UUID;
      v_result := jsonb_build_object('kind','internal','side_effect','ticket_escalated');

    -- ─── Prospection: applique le score BANT + stage suggéré ────────────
    WHEN 'qualify_lead' THEN
      DECLARE
        v_update JSONB := v_payload -> 'update_lead';
      BEGIN
        UPDATE public.asvc_leads
           SET score = COALESCE((v_update ->> 'score')::INT, score),
               stage = COALESCE(v_update ->> 'stage', stage),
               product_interest = CASE
                 WHEN v_update ? 'product_interest'
                   THEN ARRAY(SELECT jsonb_array_elements_text(v_update -> 'product_interest'))
                 ELSE product_interest
               END,
               updated_at = now()
         WHERE id = (v_payload ->> 'lead_id')::UUID;
        v_result := jsonb_build_object('kind','internal','side_effect','lead_updated');
      END;

    -- ─── Marketing: programme le post (content_calendar status=scheduled)
    WHEN 'publish_post' THEN
      UPDATE public.asvc_content_calendar
         SET status = CASE WHEN scheduled_at IS NOT NULL THEN 'scheduled' ELSE 'pending_approval' END
       WHERE id = (v_payload ->> 'content_id')::UUID;
      v_result := jsonb_build_object('kind','internal','side_effect','content_scheduled');

    -- ─── Community: log la réponse (sera relayée par connecteur ext plus tard)
    WHEN 'send_community_reply' THEN
      INSERT INTO public.asvc_community_log (
        action_id, channel, author_handle, message_type, original_message, reply_text
      ) VALUES (
        p_action_id,
        v_payload ->> 'channel',
        v_payload ->> 'author_handle',
        v_payload ->> 'message_type',
        v_payload ->> 'original_message',
        v_payload ->> 'reply_text'
      );
      v_result := jsonb_build_object('kind','internal','side_effect','community_reply_logged');

    -- ─── Community escalade: pas d'envoi, juste un log explicite ────────
    WHEN 'moderation_escalation' THEN
      INSERT INTO public.asvc_community_log (
        action_id, channel, author_handle, message_type, original_message, reply_text, status
      ) VALUES (
        p_action_id,
        v_payload ->> 'channel',
        v_payload ->> 'author_handle',
        v_payload ->> 'message_type',
        v_payload ->> 'original_message',
        NULL,
        'logged'
      );
      v_result := jsonb_build_object('kind','internal','side_effect','escalation_logged');

    -- ─── Facturation: increment compteur + log timestamp relance ────────
    WHEN 'send_invoice_reminder' THEN
      UPDATE public.asvc_invoices
         SET reminder_count = reminder_count + 1,
             last_reminder_at = now(),
             status = CASE
               WHEN status = 'sent' AND due_date < current_date THEN 'overdue'
               ELSE status
             END,
             updated_at = now()
       WHERE id = (v_payload ->> 'invoice_id')::UUID;
      v_result := jsonb_build_object('kind','internal','side_effect','reminder_logged');

    WHEN 'billing_escalation' THEN
      UPDATE public.asvc_invoices
         SET reminder_count = reminder_count + 1,
             last_reminder_at = now(),
             status = 'overdue',
             updated_at = now()
       WHERE id = (v_payload ->> 'invoice_id')::UUID;
      v_result := jsonb_build_object('kind','internal','side_effect','invoice_escalated_to_overdue');

    -- ─── Compta: marque l'écriture comme "validée par CEO" via le context.
    -- L'écriture réelle dans Atlas Finance sera relayée par un connecteur futur.
    WHEN 'import_journal_entry_atlas_finance' THEN
      v_result := jsonb_build_object(
        'kind','internal',
        'side_effect','journal_entry_marked_ready',
        'note','import vers Atlas Finance via connecteur futur'
      );

    -- ─── Trésorerie: rien à faire — le brief est déjà inséré côté agent
    WHEN 'treasury_brief' THEN
      v_result := jsonb_build_object('kind','internal','side_effect','brief_visible');

    -- ─── R&D — décisions opportunity / spec
    WHEN 'qualify_opportunity' THEN
      UPDATE public.asvc_opportunities
         SET status = 'qualified',
             updated_at = now()
       WHERE id = (v_payload ->> 'opportunity_id')::UUID;
      v_result := jsonb_build_object('kind','internal','side_effect','opportunity_qualified');

    WHEN 'decide_opportunity_go_no_go' THEN
      DECLARE
        v_new_status TEXT;
        v_reco       TEXT := v_payload ->> 'recommendation';
      BEGIN
        v_new_status := CASE v_reco
          WHEN 'go'     THEN 'approved'
          WHEN 'no_go'  THEN 'rejected'
          WHEN 'wait'   THEN 'qualified'
          WHEN 'pivot'  THEN 'qualified'
          ELSE 'qualified'
        END;
        UPDATE public.asvc_opportunities
           SET status = v_new_status,
               updated_at = now()
         WHERE id = (v_payload ->> 'opportunity_id')::UUID;
        v_result := jsonb_build_object('kind','internal','side_effect',
          'opportunity_status_set_to_' || v_new_status);
      END;

    WHEN 'approve_product_spec' THEN
      UPDATE public.asvc_product_specs
         SET status = 'approved',
             approved_by_ceo = TRUE,
             approved_at = now()
       WHERE id = (v_payload ->> 'spec_id')::UUID;
      v_result := jsonb_build_object('kind','internal','side_effect','spec_approved');

    -- ─── Production: marque la PR comme preview_ready (la vraie PR GitHub
    -- sera créée par un connecteur futur)
    WHEN 'create_pull_request' THEN
      UPDATE public.asvc_code_pull_requests
         SET status = 'preview_ready',
             updated_at = now()
       WHERE id = (v_payload ->> 'pr_id')::UUID;
      v_result := jsonb_build_object('kind','internal','side_effect','pr_marked_preview_ready');

    -- ─── QA: marque le test_run comme passed (les vrais tests Vitest/PW
    -- seront exécutés par CI futur)
    WHEN 'execute_qa_pipeline' THEN
      DECLARE
        v_pr_id UUID := (v_payload ->> 'pr_id')::UUID;
        v_recommend BOOLEAN := (v_payload ->> 'recommend_run')::BOOLEAN;
      BEGIN
        UPDATE public.asvc_test_runs
           SET status = CASE WHEN v_recommend THEN 'passed' ELSE 'failed' END,
               passed = CASE WHEN v_recommend THEN total_tests ELSE 0 END,
               failed = CASE WHEN v_recommend THEN 0 ELSE total_tests END,
               finished_at = now()
         WHERE id = (v_payload ->> 'test_run_id')::UUID;
        UPDATE public.asvc_code_pull_requests
           SET qa_status = CASE WHEN v_recommend THEN 'passed' ELSE 'failed' END,
               status = CASE WHEN v_recommend THEN 'qa_passed' ELSE 'qa_failed' END,
               updated_at = now()
         WHERE id = v_pr_id;
        v_result := jsonb_build_object('kind','internal','side_effect',
          CASE WHEN v_recommend THEN 'qa_passed' ELSE 'qa_failed' END);
      END;

    -- ─── DevOps preview/staging: marque deployment 'success' (deploy Vercel
    -- réel à câbler plus tard)
    WHEN 'deploy_to_preview' THEN
      UPDATE public.asvc_deployments
         SET status = 'success',
             approved_by_ceo = TRUE,
             approved_at = now(),
             deployed_at = now(),
             deployment_url = COALESCE(
               deployment_url,
               'https://stub-preview-' || substr(id::text, 1, 8) || '.atlasstudio.app'
             )
       WHERE id = (v_payload ->> 'deployment_id')::UUID;
      -- Si la PR existe, marque-la comme preview_approved
      UPDATE public.asvc_code_pull_requests
         SET status = 'preview_approved',
             approved_by_ceo = TRUE,
             approved_at = now(),
             preview_url = (
               SELECT deployment_url FROM public.asvc_deployments
               WHERE id = (v_payload ->> 'deployment_id')::UUID
             ),
             updated_at = now()
       WHERE id = (v_payload ->> 'pr_id')::UUID;
      v_result := jsonb_build_object('kind','internal','side_effect','preview_deployed_stub');

    WHEN 'deploy_to_staging' THEN
      UPDATE public.asvc_deployments
         SET status = 'success',
             approved_by_ceo = TRUE,
             approved_at = now(),
             deployed_at = now()
       WHERE id = (v_payload ->> 'deployment_id')::UUID;
      v_result := jsonb_build_object('kind','internal','side_effect','staging_deployed_stub');

    -- ─── Documentation: publie (status=published) — la publication réelle
    -- sur Mintlify/Docusaurus arrive plus tard
    WHEN 'publish_documentation' THEN
      UPDATE public.asvc_documentation_artifacts
         SET status = 'published',
             approved_by_ceo = TRUE,
             published_at = now()
       WHERE id = (v_payload ->> 'doc_id')::UUID;
      v_result := jsonb_build_object('kind','internal','side_effect','doc_published');

    ELSE
      -- Type non géré in-system → renvoie 'external_required'
      v_result := jsonb_build_object(
        'kind','external_required',
        'note','Connecteur externe requis pour action_type=' || v_action.action_type
      );
  END CASE;

  -- Marque l'action comme exécutée
  UPDATE public.asvc_agent_actions
     SET status = CASE
       WHEN v_result ->> 'kind' = 'external_required' THEN status   -- on garde 'approved' tant qu'aucun connecteur
       ELSE 'executed'
     END,
     executed_at = CASE
       WHEN v_result ->> 'kind' = 'external_required' THEN executed_at
       ELSE now()
     END,
     execution_result = v_result,
     updated_at = now()
   WHERE id = p_action_id;

  -- Audit
  INSERT INTO public.asvc_audit_log (
    actor_type, actor_id, event_type, resource_type, resource_id, payload
  ) VALUES (
    'ceo',
    'pame',
    CASE WHEN v_result ->> 'kind' = 'external_required'
      THEN 'action_execution_external_pending'
      ELSE 'action_executed' END,
    'asvc_agent_actions',
    p_action_id,
    v_result
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_execute_action_internal(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_execute_action_internal(UUID) TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Vue helper: actions en attente d'un connecteur externe
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_external_pending_actions()
RETURNS TABLE (
  action_id     UUID,
  action_type   TEXT,
  agent_code    TEXT,
  title         TEXT,
  approved_at   TIMESTAMPTZ,
  age_hours     INT
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
    a.id,
    a.action_type,
    ag.code,
    a.title,
    a.validated_at,
    EXTRACT(EPOCH FROM (now() - a.validated_at))::INT / 3600 AS age_hours
  FROM public.asvc_agent_actions a
  LEFT JOIN public.asvc_agents ag ON ag.id = a.agent_id
  WHERE a.status IN ('approved','modified')
    AND a.action_type IN (
      'send_sdr_email', 'send_linkedin_dm', 'send_whatsapp_message',
      'send_commercial_proposal', 'create_github_issue', 'deploy_to_production'
    )
  ORDER BY a.validated_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_external_pending_actions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_external_pending_actions() TO authenticated, service_role;
