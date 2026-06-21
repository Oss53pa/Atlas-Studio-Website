-- Fix: set search_path on all public functions flagged by Supabase linter
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = ANY(ARRAY[
      'validate_entry_balance',
      'get_user_organization_id',
      'protect_posted_entries',
      'generate_slug',
      'block_closed_period',
      'protect_audit_log',
      'generate_sequential_entry_number',
      'get_user_company_id',
      'admin_revenue_summary',
      'admin_dashboard_stats',
      'validate_journal_entry',
      'post_journal_entry',
      'apply_lettrage',
      'search_knowledge',
      'update_updated_at',
      'check_seat_quota',
      'update_seat_count',
      'get_account_balance',
      'check_feature_access',
      'calculate_prorata',
      'get_trial_balance',
      'is_admin',
      'is_org_admin',
      'handle_new_user',
      'get_user_org_id',
      'check_org_document_quota',
      'update_org_storage_usage',
      'get_user_profile',
      'chain_audit_log',
      'auto_audit_log',
      'get_user_permissions',
      'clean_expired_cache',
      'process_task_queue',
      'update_signer_verifications_updated_at',
      'prevent_document_deletion',
      'prevent_signature_deletion',
      'check_retention_before_delete',
      'update_document_retention_updated_at',
      'compute_audit_hash',
      'get_general_ledger',
      'get_dashboard_kpis',
      'check_entry_balanced',
      'prevent_file_path_change_after_signature',
      'prevent_write_on_closed_period',
      'increment_liasse_count',
      'handle_new_subscription',
      'prevent_hard_delete_posted',
      'prevent_exercice_reopen',
      'import_balance_atomic',
      'update_dossier_with_lock',
      'prevent_locked_liasse_update',
      'lock_liasse',
      'prevent_audit_modification',
      'execute_annual_closure',
      'increment_campaign_opens',
      'increment_campaign_clicks'
    ])
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn.func_signature);
  END LOOP;
END $$;
