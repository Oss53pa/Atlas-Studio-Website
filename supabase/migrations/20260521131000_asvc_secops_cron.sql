-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Cron de la passe CTEM (SecOps) — passe hebdomadaire automatique
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ PRÉREQUIS avant d'appliquer ce fichier :
--   1. La fonction edge `asvc-secops` doit être déployée :
--        supabase functions deploy asvc-secops --project-ref vgtmljfayiysuvrcmunt
--   2. Le secret `CRON_SHARED_SECRET` doit être :
--        - défini comme secret de la fonction (supabase secrets set CRON_SHARED_SECRET=...),
--        - ET stocké dans vault.secrets sous le nom 'asvc_cron_shared_secret' pour que
--          pg_cron puisse l'injecter dans l'en-tête Authorization. Exemple :
--            select vault.create_secret('<la_meme_valeur>', 'asvc_cron_shared_secret');
--   3. Extensions pg_cron + pg_net actives (déjà le cas sur ce projet).
--
-- Tant que ces prérequis ne sont pas remplis, NE PAS planifier (le job échouerait).
-- ═══════════════════════════════════════════════════════════════════════════

-- Passe CTEM tous les lundis à 07:00 UTC (ajuste le cron selon ton besoin).
select cron.schedule(
  'asvc-secops-ctem-weekly',
  '0 7 * * 1',
  $cron$
  select net.http_post(
    url := 'https://vgtmljfayiysuvrcmunt.supabase.co/functions/v1/asvc-secops',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'asvc_cron_shared_secret')
    ),
    body := jsonb_build_object('scope', 'Passe CTEM hebdomadaire automatique')
  );
  $cron$
);

-- Pour désactiver :  select cron.unschedule('asvc-secops-ctem-weekly');
