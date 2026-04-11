-- ═══════════════════════════════════════════════════
-- AUTO-EMAIL NOTIFICATIONS TO ADMINS
-- Triggers on alerts, notifications, and critical activity_log
-- Uses pg_net to call the notify-admin-email edge function
-- ═══════════════════════════════════════════════════

-- Ensure pg_net is enabled (for async HTTP calls from triggers)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Store the Supabase URL and service key in Postgres settings
-- (Alternative: hardcode in the function)
DO $$
BEGIN
  -- These must be set once manually:
  -- ALTER DATABASE postgres SET app.supabase_url = 'https://vgtmljfayiysuvrcmunt.supabase.co';
  -- ALTER DATABASE postgres SET app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
  NULL;
END $$;

-- ── Helper function: call notify-admin-email ──

CREATE OR REPLACE FUNCTION notify_admins_via_email(
  p_title TEXT,
  p_message TEXT,
  p_severity TEXT,
  p_source TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
DECLARE
  supabase_url TEXT;
  payload JSONB;
BEGIN
  -- Get the Supabase URL from settings or use default
  supabase_url := COALESCE(
    current_setting('app.supabase_url', true),
    'https://vgtmljfayiysuvrcmunt.supabase.co'
  );

  payload := jsonb_build_object(
    'title', p_title,
    'message', p_message,
    'severity', p_severity,
    'source', p_source,
    'link', p_link,
    'metadata', p_metadata
  );

  -- Async HTTP POST to the edge function (fire and forget)
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/notify-admin-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        current_setting('app.service_role_key', true),
        ''
      )
    ),
    body := payload,
    timeout_milliseconds := 5000
  );
EXCEPTION WHEN OTHERS THEN
  -- Silently fail — don't block the original insert
  RAISE NOTICE 'notify_admins_via_email failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Trigger: alerts → email admins (all severities) ──

CREATE OR REPLACE FUNCTION trigger_alert_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM notify_admins_via_email(
    COALESCE(NEW.title, 'Nouvelle alerte'),
    COALESCE(NEW.message, ''),
    CASE
      WHEN NEW.severity IN ('critical', 'high') THEN 'critical'
      WHEN NEW.severity = 'medium' THEN 'warning'
      ELSE 'info'
    END,
    'alert',
    '/admin/alerts',
    COALESCE(NEW.metadata, '{}'::jsonb)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS alert_email_trigger ON alerts;
CREATE TRIGGER alert_email_trigger
AFTER INSERT ON alerts
FOR EACH ROW
EXECUTE FUNCTION trigger_alert_email();

-- ── Trigger: notifications → email admins ──

CREATE OR REPLACE FUNCTION trigger_notification_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send email for admin-directed notifications (not client notifications)
  -- Check if this notification is meant for admins
  IF NEW.type IN ('error', 'warning', 'critical') THEN
    PERFORM notify_admins_via_email(
      COALESCE(NEW.title, 'Notification'),
      COALESCE(NEW.message, ''),
      CASE
        WHEN NEW.type = 'error' OR NEW.type = 'critical' THEN 'critical'
        WHEN NEW.type = 'warning' THEN 'warning'
        WHEN NEW.type = 'success' THEN 'success'
        ELSE 'info'
      END,
      'notification',
      NEW.link,
      '{}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notification_email_trigger ON notifications;
CREATE TRIGGER notification_email_trigger
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION trigger_notification_email();

-- ── Trigger: critical activity_log events → email admins ──

CREATE OR REPLACE FUNCTION trigger_activity_email()
RETURNS TRIGGER AS $$
DECLARE
  critical_actions TEXT[] := ARRAY[
    'payment_failed',
    'subscription_cancelled',
    'admin_delete_client',
    'licence_suspended',
    'licence_revoked',
    'payment_completed',
    'subscription_created'
  ];
  meta_amount TEXT;
  title_text TEXT;
BEGIN
  -- Only email for critical actions to avoid spam
  IF NEW.action = ANY(critical_actions) THEN
    -- Format title based on action
    title_text := CASE NEW.action
      WHEN 'payment_completed' THEN 'Nouveau paiement reçu'
      WHEN 'payment_failed' THEN 'Paiement échoué'
      WHEN 'subscription_created' THEN 'Nouvel abonnement'
      WHEN 'subscription_cancelled' THEN 'Abonnement annulé'
      WHEN 'admin_delete_client' THEN 'Client supprimé par admin'
      WHEN 'licence_suspended' THEN 'Licence suspendue'
      WHEN 'licence_revoked' THEN 'Licence révoquée'
      ELSE 'Évènement critique: ' || NEW.action
    END;

    meta_amount := NEW.metadata->>'amount';

    PERFORM notify_admins_via_email(
      title_text,
      CASE
        WHEN meta_amount IS NOT NULL THEN 'Montant: ' || meta_amount || ' ' || COALESCE(NEW.metadata->>'currency', 'FCFA')
        ELSE 'Consultez la console pour plus de détails.'
      END,
      CASE
        WHEN NEW.action IN ('payment_failed', 'subscription_cancelled', 'admin_delete_client', 'licence_suspended', 'licence_revoked') THEN 'critical'
        WHEN NEW.action IN ('payment_completed', 'subscription_created') THEN 'success'
        ELSE 'info'
      END,
      'activity',
      '/admin/activity',
      COALESCE(NEW.metadata, '{}'::jsonb)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS activity_email_trigger ON activity_log;
CREATE TRIGGER activity_email_trigger
AFTER INSERT ON activity_log
FOR EACH ROW
EXECUTE FUNCTION trigger_activity_email();
