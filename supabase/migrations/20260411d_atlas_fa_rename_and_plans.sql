-- ═══════════════════════════════════════════════════
-- ATLAS F&A — Rename atlas-compta → atlas-fa + création des plans/features
-- ═══════════════════════════════════════════════════
-- Le code TypeScript (PlansPage, LandingPagesPage, config/content.ts) utilise
-- déjà 'atlas-fa' partout, alors que la DB a 'atlas-compta'. Cette migration
-- réconcilie les deux en renommant apps.id → 'atlas-fa'.
--
-- Une seule FK externe référence apps.id : error_logs.app_id (créée par la
-- migration 20260410_error_monitor). On commence par ajouter ON UPDATE CASCADE
-- sur cette FK (sinon le rename échouerait dès qu'un error_log existe).
--
-- Après le rename :
--   • Le trigger sync_apps_to_products (migration 20260411c) propage automatiquement
--     le nouveau slug à products.slug (même row, même UUID, slug mis à jour)
--   • error_logs.app_id cascade automatiquement sur le nouvel id
--   • On crée ensuite les plans + features + plan_features pour atlas-fa
--
-- 100% idempotente. Rejouable.
-- ═══════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════
-- 1. Durcir la FK error_logs.app_id avec ON UPDATE CASCADE
-- ═══════════════════════════════════════════════════
ALTER TABLE public.error_logs
  DROP CONSTRAINT IF EXISTS error_logs_app_id_fkey;

ALTER TABLE public.error_logs
  ADD CONSTRAINT error_logs_app_id_fkey
  FOREIGN KEY (app_id) REFERENCES public.apps(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;


-- ═══════════════════════════════════════════════════
-- 2. Rename apps.id : 'atlas-compta' → 'atlas-fa'
-- ═══════════════════════════════════════════════════
-- Le trigger sync_apps_to_products gère le cas OLD.id != NEW.id et propage
-- le rename à products.slug. La FK error_logs cascade automatiquement.
-- error_logs.app_id cascadera automatiquement si des rows existent.
UPDATE public.apps
SET id = 'atlas-fa'
WHERE id = 'atlas-compta';


-- ═══════════════════════════════════════════════════
-- 3. Création des plans Atlas F&A
-- ═══════════════════════════════════════════════════

-- Plan STARTER — PME / TPE (populaire)
INSERT INTO plans (
  product_id, name, display_name, description, is_popular,
  price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
  max_seats, max_companies, sort_order, active
)
SELECT p.id, 'Starter', 'PME / TPE',
       'Pour les petites et moyennes entreprises : comptabilité SYSCOHADA complète',
       true,
       49000, 529200, 10,
       3, 1, 1, true
FROM products p
WHERE p.slug = 'atlas-fa'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.name = 'Starter'
  );

UPDATE plans
SET display_name        = 'PME / TPE',
    description         = 'Pour les petites et moyennes entreprises : comptabilité SYSCOHADA complète',
    is_popular          = true,
    price_monthly_fcfa  = 49000,
    price_annual_fcfa   = 529200,
    annual_discount_pct = 10,
    max_seats           = 3,
    max_companies       = 1,
    sort_order          = 1,
    active              = true
WHERE name = 'Starter'
  AND product_id = (SELECT id FROM products WHERE slug = 'atlas-fa');

-- Plan PREMIUM — Groupes & Holdings
INSERT INTO plans (
  product_id, name, display_name, description, is_popular,
  price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
  max_seats, max_companies, sort_order, active
)
SELECT p.id, 'Premium', 'Groupes & Holdings',
       'Multi-sociétés illimité, consolidation, devises, IA avancée',
       false,
       250000, 2700000, 10,
       -1, -1, 2, true
FROM products p
WHERE p.slug = 'atlas-fa'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.name = 'Premium'
  );

UPDATE plans
SET display_name        = 'Groupes & Holdings',
    description         = 'Multi-sociétés illimité, consolidation, devises, IA avancée',
    is_popular          = false,
    price_monthly_fcfa  = 250000,
    price_annual_fcfa   = 2700000,
    annual_discount_pct = 10,
    max_seats           = -1,
    max_companies       = -1,
    sort_order          = 2,
    active              = true
WHERE name = 'Premium'
  AND product_id = (SELECT id FROM products WHERE slug = 'atlas-fa');


-- ═══════════════════════════════════════════════════
-- 4. Features Atlas F&A
-- ═══════════════════════════════════════════════════

INSERT INTO features (product_id, key, name, category, feature_type, is_core, sort_order)
SELECT p.id, v.key, v.name, v.category, 'boolean', v.is_core, v.sort
FROM products p, (VALUES
  -- ── Features incluses dans Starter (is_core = true) ──
  ('saisie_journaux_ecritures',     'Saisie des écritures & journaux',          'Comptabilité',   true,  1),
  ('grand_livre_balance',           'Grand livre & balance générale',           'Comptabilité',   true,  2),
  ('lettrage_automatique',          'Lettrage automatique (4 algorithmes)',     'Comptabilité',   true,  3),
  ('rapprochement_bancaire',        'Rapprochement bancaire (CSV, scoring)',    'Trésorerie',     true,  4),
  ('immobilisations_amortissements','Immobilisations & amortissements',         'Immobilisations',true,  5),
  ('stocks_cump_fifo',              'Gestion des stocks (CUMP / FIFO)',         'Stocks',         true,  6),
  ('position_tresorerie',           'Position de trésorerie',                   'Trésorerie',     true,  7),
  ('fiscalite_tva_is_imf',          'Fiscalité (TVA, IS, IMF, patente)',        'Fiscalité',      true,  8),
  ('cloture_etats_financiers',      'Clôture & états financiers',               'Comptabilité',   true,  9),
  ('bilan_resultat_sig',            'Bilan, Compte de résultat, SIG',           'États',          true, 10),
  ('proph3t_ia_basique',            'Proph3t IA (contrôles & corrections)',     'IA',             true, 11),
  ('support_email',                 'Support email',                            'Support',        true, 12),
  -- ── Features locked (Premium uniquement) ──
  ('multi_societes_illimite',       'Multi-sociétés illimité',                  'Configuration',  false, 20),
  ('multi_pays_ohada_17',           'Multi-pays OHADA (17 pays)',               'Configuration',  false, 21),
  ('operations_devises',            'Opérations en devises (EUR/XOF)',          'Comptabilité',   false, 22),
  ('budget_analytique_avance',      'Budget & comptabilité analytique avancée', 'Analytique',     false, 23),
  ('recouvrement_balance_agee',     'Recouvrement & balance âgée',              'Trésorerie',     false, 24),
  ('consolidation_groupe',          'Consolidation groupe',                     'Consolidation',  false, 25),
  ('tableaux_bord_groupe',          'Tableaux de bord groupe',                  'Reporting',      false, 26),
  ('proph3t_ia_avance',             'Proph3t IA avancé (LLM + prédictif)',      'IA',             false, 27),
  ('workflow_validation_rbac',      'Workflow de validation & RBAC',            'Workflow',       false, 28),
  ('audit_trail_ohada_certifie',    'Audit trail certifié OHADA',               'Sécurité',       false, 29),
  ('api_rest_integrations',         'API REST & intégrations',                  'API',            false, 30),
  ('support_dedie_account_manager', 'Support dédié & account manager',          'Support',        false, 31)
) AS v(key, name, category, is_core, sort)
WHERE p.slug = 'atlas-fa'
ON CONFLICT (product_id, key) DO NOTHING;


-- ═══════════════════════════════════════════════════
-- 5. plan_features Atlas F&A (reset + rebuild)
-- ═══════════════════════════════════════════════════

DELETE FROM plan_features
WHERE plan_id IN (
  SELECT pl.id FROM plans pl
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'atlas-fa'
);

-- Plan STARTER — features explicites
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, v.enabled,
       CASE WHEN v.enabled THEN '✓' ELSE NULL END
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id,
(VALUES
  -- Incluses
  ('saisie_journaux_ecritures',     true),
  ('grand_livre_balance',           true),
  ('lettrage_automatique',          true),
  ('rapprochement_bancaire',        true),
  ('immobilisations_amortissements',true),
  ('stocks_cump_fifo',              true),
  ('position_tresorerie',           true),
  ('fiscalite_tva_is_imf',          true),
  ('cloture_etats_financiers',      true),
  ('bilan_resultat_sig',            true),
  ('proph3t_ia_basique',            true),
  ('support_email',                 true),
  -- Locked
  ('multi_societes_illimite',       false),
  ('multi_pays_ohada_17',           false),
  ('operations_devises',            false),
  ('budget_analytique_avance',      false),
  ('recouvrement_balance_agee',     false),
  ('consolidation_groupe',          false),
  ('tableaux_bord_groupe',          false),
  ('proph3t_ia_avance',             false),
  ('workflow_validation_rbac',      false),
  ('audit_trail_ohada_certifie',    false),
  ('api_rest_integrations',         false),
  ('support_dedie_account_manager', false)
) AS v(fkey, enabled)
WHERE p.slug = 'atlas-fa' AND pl.name = 'Starter' AND f.key = v.fkey;

-- Plan PREMIUM — toutes les features activées
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, true, '✓'
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id
WHERE p.slug = 'atlas-fa' AND pl.name = 'Premium';


-- ═══════════════════════════════════════════════════
-- 6. Vérifications finales
-- ═══════════════════════════════════════════════════
DO $check$
DECLARE
  v_apps_count      INT;
  v_products_count  INT;
  v_plans_count     INT;
  v_features_count  INT;
  v_pf_count        INT;
  v_legacy_count    INT;
BEGIN
  -- Plus aucune row legacy avec 'atlas-compta'
  SELECT COUNT(*) INTO v_legacy_count
  FROM apps WHERE id = 'atlas-compta';

  SELECT COUNT(*) INTO v_apps_count
  FROM apps WHERE id = 'atlas-fa';

  SELECT COUNT(*) INTO v_products_count
  FROM products WHERE slug = 'atlas-fa';

  SELECT COUNT(*) INTO v_plans_count
  FROM plans pl JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'atlas-fa' AND pl.active = true;

  SELECT COUNT(*) INTO v_features_count
  FROM features WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa');

  SELECT COUNT(*) INTO v_pf_count
  FROM plan_features pf
  JOIN plans pl ON pf.plan_id = pl.id
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'atlas-fa';

  RAISE NOTICE '─── ATLAS F&A ───';
  RAISE NOTICE '  apps ''atlas-compta'' legacy : % (expected 0)',  v_legacy_count;
  RAISE NOTICE '  apps ''atlas-fa''           : % (expected 1)',  v_apps_count;
  RAISE NOTICE '  products ''atlas-fa''       : % (expected 1)',  v_products_count;
  RAISE NOTICE '  active plans               : % (expected 2)',  v_plans_count;
  RAISE NOTICE '  features                   : % (expected 24)', v_features_count;
  RAISE NOTICE '  plan_features rows         : % (expected 48 = 24+24)', v_pf_count;

  IF v_legacy_count > 0 THEN
    RAISE EXCEPTION 'Rename failed: atlas-compta still exists in apps';
  END IF;
  IF v_apps_count = 0 THEN
    RAISE EXCEPTION 'Rename failed: atlas-fa not found in apps';
  END IF;
  IF v_products_count = 0 THEN
    RAISE EXCEPTION 'Sync trigger failed: atlas-fa not found in products';
  END IF;
  IF v_plans_count <> 2 THEN
    RAISE EXCEPTION 'Plans creation failed: expected 2, got %', v_plans_count;
  END IF;
  IF v_features_count <> 24 THEN
    RAISE EXCEPTION 'Features creation failed: expected 24, got %', v_features_count;
  END IF;
END;
$check$;

COMMIT;
