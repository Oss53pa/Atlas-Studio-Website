-- ═══════════════════════════════════════════════════════════════════════════
-- AUDIT 360° §Uniformité — Purge des apps fantômes + réalignement L3
-- ═══════════════════════════════════════════════════════════════════════════
-- Décisions produit (tranchées) :
--   1. L3 factices Advist/AtlasBanx → vrais tools métier (code : l3_advist.ts /
--      l3_atlasbanx.ts). Ici on réaligne le registry proph3t_tools.
--   2. 9 apps fantômes (présentes au registry mais absentes du catalogue
--      commercial) → PURGE : cashpilot, duedeck, wisehr, wisefm, atlas-lease,
--      atlas-mall-suite, atlastrade, docjourney, cockpit-journey.
--   3. Collision atlasbanx/scrutix → id canonique `atlasbanx` (alias scrutix
--      géré côté code : APP_ID_ALIASES + app-token).
--
-- Sécurité : proph3t_audit_trail est IMMUABLE (trigger anti-UPDATE/DELETE) et
-- son FK app_id était en RESTRICT. On (a) refuse la purge si une ligne d'audit
-- immuable référence une app fantôme (cas attendu : 0 — ces apps n'ont jamais
-- été exploitées commercialement), (b) bascule le FK en ON DELETE SET NULL pour
-- préserver l'historique d'audit sans jamais le muter.
--
-- 100% idempotente, rejouable.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 0. Liste canonique des apps fantômes à purger ───────────────────────────
DO $purge$
DECLARE
  v_ghost TEXT[] := ARRAY[
    'cashpilot', 'duedeck', 'wisehr', 'wisefm', 'atlas-lease',
    'atlas-mall-suite', 'atlastrade', 'docjourney', 'cockpit-journey'
  ];
  v_audit_refs INT;
BEGIN
  -- (a) Garde-fou : refuser si l'audit immuable référence une app fantôme.
  SELECT count(*) INTO v_audit_refs
  FROM public.proph3t_audit_trail
  WHERE app_id = ANY(v_ghost);

  IF v_audit_refs > 0 THEN
    RAISE EXCEPTION
      'Purge refusée : % ligne(s) d''audit immuable(s) référencent une app fantôme. '
      'Detacher manuellement (ou archiver) avant purge.', v_audit_refs;
  END IF;

  -- (b) Nettoyage des dépendances NON immuables (mémoire épisodique, FK RESTRICT).
  DELETE FROM public.proph3t_memory_episodic WHERE app_id = ANY(v_ghost);

  -- (c) Purge du registry. proph3t_tools.app_id est ON DELETE CASCADE → les
  --     rows L3 des apps fantômes partent automatiquement.
  DELETE FROM public.proph3t_apps WHERE id = ANY(v_ghost);

  RAISE NOTICE '─── PURGE APPS FANTÔMES : % apps ciblées ───', array_length(v_ghost, 1);
END;
$purge$;

-- ─── 1. FK audit_trail → ON DELETE SET NULL (préserve l'historique immuable) ──
ALTER TABLE public.proph3t_audit_trail
  DROP CONSTRAINT IF EXISTS proph3t_audit_trail_app_id_fkey;
ALTER TABLE public.proph3t_audit_trail
  ADD CONSTRAINT proph3t_audit_trail_app_id_fkey
  FOREIGN KEY (app_id) REFERENCES public.proph3t_apps(id) ON DELETE SET NULL;

-- ─── 2. Réalignement L3 Advist / AtlasBanx (vrais tools métier) ──────────────
-- On retire les anciens tools hors-métier (conseil / opérations crédit) puis on
-- réinjecte les vrais tools, en miroir du code (tools_l3_dispatcher.ts).
DELETE FROM public.proph3t_tools
WHERE level = 3 AND app_id IN ('advist', 'atlasbanx');

INSERT INTO public.proph3t_tools
  (id, level, domain, app_id, name, description, schema, is_deterministic, requires_embeddings)
VALUES
  -- Advist — signature électronique (Loi 2013-546), domaine DOCUMENTAIRE
  ('verify_signature_validity', 3, 'DOCUMENTAIRE', 'advist', 'verify_signature_validity',
   'Validité juridique d''une signature électronique (simple/avancée/qualifiée) au sens de la Loi 2013-546.',
   '{"type":"object","additionalProperties":true}'::jsonb, TRUE, FALSE),
  ('generate_otp_challenge', 3, 'DOCUMENTAIRE', 'advist', 'generate_otp_challenge',
   'Génère un défi OTP (canal, TTL, tentatives) pour authentifier un signataire.',
   '{"type":"object","additionalProperties":true}'::jsonb, TRUE, FALSE),
  ('define_signature_circuit', 3, 'DOCUMENTAIRE', 'advist', 'define_signature_circuit',
   'Définit un circuit de validation (parapheur) et détecte les incohérences.',
   '{"type":"object","additionalProperties":true}'::jsonb, TRUE, FALSE),
  ('track_signature_status', 3, 'DOCUMENTAIRE', 'advist', 'track_signature_status',
   'Suit l''avancement d''un dossier de signature (complétion, retards, relances).',
   '{"type":"object","additionalProperties":true}'::jsonb, TRUE, FALSE),
  ('compute_signature_legal_value', 3, 'DOCUMENTAIRE', 'advist', 'compute_signature_legal_value',
   'Score de valeur probante d''un dossier de signature (0-100).',
   '{"type":"object","additionalProperties":true}'::jsonb, TRUE, FALSE),
  -- AtlasBanx — audit d'anomalies bancaires, domaine FINANCE_AUDIT
  ('apply_benford_analysis', 3, 'FINANCE_AUDIT', 'atlasbanx', 'apply_benford_analysis',
   'Loi de Benford sur les montants (MAD, conformité) — détection de distributions anormales.',
   '{"type":"object","additionalProperties":true}'::jsonb, TRUE, FALSE),
  ('compute_zscore_anomalies', 3, 'FINANCE_AUDIT', 'atlasbanx', 'compute_zscore_anomalies',
   'Z-score : isole les montants statistiquement aberrants (|z| > seuil).',
   '{"type":"object","additionalProperties":true}'::jsonb, TRUE, FALSE),
  ('detect_ghost_fees', 3, 'FINANCE_AUDIT', 'atlasbanx', 'detect_ghost_fees',
   'Ghost fees : frais dupliqués, surfacturations (hors grille), récurrences anormales.',
   '{"type":"object","additionalProperties":true}'::jsonb, TRUE, FALSE),
  ('score_bank_risk_global', 3, 'FINANCE_AUDIT', 'atlasbanx', 'score_bank_risk_global',
   'Agrège les détecteurs en un score de risque global 0-100 par compte/client.',
   '{"type":"object","additionalProperties":true}'::jsonb, TRUE, FALSE),
  ('generate_audit_report_anomalies', 3, 'FINANCE_AUDIT', 'atlasbanx', 'generate_audit_report_anomalies',
   'Génère un rapport d''audit des anomalies bancaires (format SYSCOHADA).',
   '{"type":"object","additionalProperties":true}'::jsonb, TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET
  level = EXCLUDED.level, domain = EXCLUDED.domain, app_id = EXCLUDED.app_id,
  name = EXCLUDED.name, description = EXCLUDED.description, schema = EXCLUDED.schema,
  is_deterministic = EXCLUDED.is_deterministic, requires_embeddings = EXCLUDED.requires_embeddings;

-- ─── 3. Vérifications finales ────────────────────────────────────────────────
DO $check$
DECLARE
  v_ghost TEXT[] := ARRAY[
    'cashpilot', 'duedeck', 'wisehr', 'wisefm', 'atlas-lease',
    'atlas-mall-suite', 'atlastrade', 'docjourney', 'cockpit-journey'
  ];
  v_ghost_left   INT;
  v_advist_tools INT;
  v_banx_tools   INT;
  v_old_tools    INT;
BEGIN
  SELECT count(*) INTO v_ghost_left FROM public.proph3t_apps WHERE id = ANY(v_ghost);
  SELECT count(*) INTO v_advist_tools FROM public.proph3t_tools WHERE app_id = 'advist' AND level = 3;
  SELECT count(*) INTO v_banx_tools   FROM public.proph3t_tools WHERE app_id = 'atlasbanx' AND level = 3;
  SELECT count(*) INTO v_old_tools FROM public.proph3t_tools
    WHERE name IN ('compute_honoraires_conseil', 'compute_echeancier_credit', 'execute_batch_virements');

  RAISE NOTICE '─── RÉALIGNEMENT PROPH3T ───';
  RAISE NOTICE '  apps fantômes restantes : % (attendu 0)', v_ghost_left;
  RAISE NOTICE '  tools L3 advist         : % (attendu 5)', v_advist_tools;
  RAISE NOTICE '  tools L3 atlasbanx      : % (attendu 5)', v_banx_tools;
  RAISE NOTICE '  anciens tools hors-métier: % (attendu 0)', v_old_tools;

  IF v_ghost_left <> 0 THEN
    RAISE EXCEPTION 'Purge incomplète : % app(s) fantôme(s) restante(s)', v_ghost_left;
  END IF;
  IF v_advist_tools <> 5 OR v_banx_tools <> 5 THEN
    RAISE EXCEPTION 'Réalignement L3 incomplet (advist=%, atlasbanx=%)', v_advist_tools, v_banx_tools;
  END IF;
END;
$check$;

COMMIT;
