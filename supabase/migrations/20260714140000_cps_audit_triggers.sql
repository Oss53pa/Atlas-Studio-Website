-- ============================================================================
-- Cortex — audit automatique (RG-10).
-- Triggers AFTER I/U/D sur les tables métier cps_ → cps_log_audit (chaîne
-- SHA-256 immuable). Côté serveur = inviolable (le client ne peut pas sauter
-- l'audit). L'acteur = email JWT (UI admin) ou 'system' (edge/cron/service_role).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cps_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_actor_type TEXT;
  v_actor TEXT;
  v_id UUID;
BEGIN
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NULL THEN
    v_actor_type := 'system'; v_actor := current_user;
  ELSE
    v_actor_type := 'owner'; v_actor := v_email;
  END IF;

  IF TG_OP = 'DELETE' THEN v_id := OLD.id; ELSE v_id := NEW.id; END IF;

  PERFORM public.cps_log_audit(
    v_actor_type, v_actor,
    lower(TG_OP) || '.' || TG_TABLE_NAME,
    TG_TABLE_NAME, v_id,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'cps_apps','cps_costs','cps_deals','cps_milestones','cps_assumptions'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.cps_audit_trigger();', t, t);
  END LOOP;
END $$;
