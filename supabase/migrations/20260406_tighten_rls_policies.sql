-- Fix: move vector extension out of public schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- Step 1: Drop all overly permissive allow_authenticated_* policies
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND policyname LIKE 'allow_authenticated_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Step 2: Create proper replacement policies (read for authenticated, write for admin only)
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'activity_log', 'addons', 'admin_delegate_links', 'admin_roles',
    'ai_messages', 'alerts', 'app_users', 'apps',
    'atlas_balance_exports', 'atlas_email_config', 'atlas_email_log', 'atlas_email_templates',
    'attribute_attestations', 'audit_findings', 'audit_log', 'best_practices',
    'cache_entries', 'collaboration_chat_messages', 'collaboration_sessions', 'consents',
    'control_objectives', 'data_requests', 'deployments', 'document_versions',
    'electronic_seals', 'feature_flags', 'features', 'identity_verification_sessions',
    'industry_benchmarks', 'integration_field_mappings', 'integration_sync_logs', 'invitations',
    'invoices', 'kb_articles', 'knowledge_chunks', 'licence_activations',
    'licence_audit_log', 'licence_seats', 'licences', 'login_history',
    'newsletter_campaigns', 'newsletter_links', 'newsletter_segments', 'newsletter_sends',
    'newsletter_templates', 'payment_history', 'payment_reconciliation', 'payment_sessions',
    'payment_transactions', 'payment_webhooks', 'payments', 'plan_features',
    'plans', 'products', 'project_timeline', 'project_workflows',
    'promo_codes', 'proph3t_agent_plans', 'proph3t_conversations', 'proph3t_knowledge',
    'proph3t_memory', 'proph3t_messages', 'proph3t_monitor_log', 'proph3t_preferences',
    'publication_results', 'qualified_archives', 'qualified_certificates', 'qualified_timestamps',
    'registered_deliveries', 'renewal_log', 'risk_treatments', 'salesforce_mappings',
    'saved_payment_methods', 'signature_certificates', 'signature_proof_files', 'site_content',
    'solutions', 'subscription_addons', 'subscription_changes', 'subscription_plans',
    'support_messages', 'task_queue', 'tenants', 'ticket_messages',
    'usage_events', 'webhook_deliveries', 'workflow_history'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Skip if table doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      CONTINUE;
    END IF;

    -- Read access for authenticated users
    EXECUTE format(
      'CREATE POLICY "authenticated_read_%s" ON public.%I FOR SELECT TO authenticated USING (true)',
      tbl, tbl
    );

    -- Full access for admins only
    EXECUTE format(
      'CREATE POLICY "admin_write_%s" ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      tbl, tbl
    );
  END LOOP;
END $$;
