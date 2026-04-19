-- ═══════════════════════════════════════════════════
-- COCKPIT F&A — Création complète (apps + plans + features + plan_features)
-- ═══════════════════════════════════════════════════
-- Cockpit F&A est une application distincte d'Atlas F&A :
--   • Atlas F&A   : ERP comptabilité quotidienne (saisie écritures, lettrage, immo,
--                   stocks, fiscalité, clôture)
--   • Cockpit F&A : couche pilotage / reporting / dashboards / IA Proph3t. Importe
--                   une balance ou un GL et fournit états financiers, 45+ dashboards,
--                   ratios + benchmark sectoriel, audit GL, alertes, plan d'action,
--                   reporting personnalisable, Proph3t IA (commentaires + prédictions).
--                   Pour DAF / dirigeants qui veulent piloter sans tenir la compta.
--
-- Schéma identique à atlas-fa / taxpilot / advist :
--   1. INSERT apps  → trigger sync_apps_to_products crée la row products
--   2. INSERT plans (Solo 49 000 / Group 100 000)
--   3. INSERT features (24 features)
--   4. INSERT plan_features (Solo : 14 incluses + 10 locked / Group : tout)
--
-- 100% idempotente, rejouable.
-- ═══════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════
-- 1. INSERT apps (trigger sync créera la row products)
-- ═══════════════════════════════════════════════════
INSERT INTO public.apps (
  id, name, type, tagline, description,
  features, categories, pricing, pricing_period,
  color, icon, highlights, external_url, status, sort_order
)
SELECT
  'cockpit-fa',
  'Cockpit F&A',
  'App',
  'Pilotage financier & reporting SYSCOHADA',
  'Importez votre balance ou grand livre — Cockpit F&A produit instantanément vos états financiers (Bilan, CR, TFT, SIG), 45+ dashboards interactifs, ratios financiers comparés aux normes sectorielles, audit GL automatique en 16 points, et un assistant IA Proph3t qui rédige les commentaires d''analyse et les prévisions. Conçu pour les DAF, dirigeants et contrôleurs de gestion qui veulent piloter sans tenir la comptabilité au quotidien.',
  ARRAY[
    'Import balance & GL (Excel, CSV, JSON)',
    'Plan comptable SYSCOHADA révisé 2017',
    'Bilan, Compte de résultat, TFT, SIG',
    '45+ dashboards (Pareto, Waterfall, BFR, Cash forecast, Du Pont, Executive)',
    'Ratios financiers + benchmark sectoriel',
    'Audit GL (16 contrôles automatiques)',
    'Reporting personnalisable (23 sections, PDF WYSIWYG)',
    'Proph3t IA — commentaires & prédictions',
    'Proph3t mémoire persistante',
    'Alertes & plan d''action (suivi statut, owner)',
    'Comptabilité analytique multi-axes',
    'Budget vs réalisé (multi-versions)',
    'Mode démo intégré',
    'Données locales (IndexedDB) — RGPD by design',
    '1 société (Solo)',
    'Multi-sociétés illimité (Group)',
    'Consolidation groupe (Group)',
    'Vue groupe + benchmarks inter-sociétés (Group)',
    'Multi-utilisateurs avec rôles (Group)',
    'Workflow de validation (Group)',
    'Export Excel & PDF',
    'API REST (Group)',
    'Support email',
    'Support prioritaire (Group)'
  ],
  ARRAY['Finance', 'Reporting', 'Analytics']::text[],
  '{"Solo": 49000, "Group": 100000}'::jsonb,
  'mois',
  '#B8954A',
  'gauge-circle',
  ARRAY['SYSCOHADA natif', 'Proph3t IA', '45+ dashboards']::text[],
  'https://cockpit-fna.atlas-studio.org',
  'available',
  3
WHERE NOT EXISTS (SELECT 1 FROM public.apps WHERE id = 'cockpit-fa');

-- Re-sync si déjà inséré (re-run)
UPDATE public.apps SET
  name        = 'Cockpit F&A',
  type        = 'App',
  tagline     = 'Pilotage financier & reporting SYSCOHADA',
  color       = '#B8954A',
  icon        = 'gauge-circle',
  external_url = 'https://cockpit-fna.atlas-studio.org',
  status      = 'available',
  pricing     = '{"Solo": 49000, "Group": 100000}'::jsonb,
  pricing_period = 'mois',
  updated_at  = now()
WHERE id = 'cockpit-fa';


-- ═══════════════════════════════════════════════════
-- 2. PLANS (le row products a été créée par le trigger sync_apps_to_products)
-- ═══════════════════════════════════════════════════

-- Plan SOLO (interne 'Starter') — populaire
INSERT INTO plans (
  product_id, name, display_name, description, is_popular,
  price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
  max_seats, max_companies, sort_order, active
)
SELECT p.id, 'Starter', 'Solo — 1 société',
       'Pour une PME / TPE qui pilote une seule entité juridique',
       true,
       49000, 529200, 10,
       -1, 1, 1, true
FROM products p
WHERE p.slug = 'cockpit-fa'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.name = 'Starter'
  );

UPDATE plans
SET display_name        = 'Solo — 1 société',
    description         = 'Pour une PME / TPE qui pilote une seule entité juridique',
    is_popular          = true,
    price_monthly_fcfa  = 49000,
    price_annual_fcfa   = 529200,
    annual_discount_pct = 10,
    max_seats           = -1,
    max_companies       = 1,
    sort_order          = 1,
    active              = true
WHERE name = 'Starter'
  AND product_id = (SELECT id FROM products WHERE slug = 'cockpit-fa');

-- Plan GROUP (interne 'Premium')
INSERT INTO plans (
  product_id, name, display_name, description, is_popular,
  price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
  max_seats, max_companies, sort_order, active
)
SELECT p.id, 'Premium', 'Group — multi-sociétés',
       'Pour les groupes, holdings et cabinets — sociétés illimitées + consolidation',
       false,
       100000, 1080000, 10,
       -1, -1, 2, true
FROM products p
WHERE p.slug = 'cockpit-fa'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.name = 'Premium'
  );

UPDATE plans
SET display_name        = 'Group — multi-sociétés',
    description         = 'Pour les groupes, holdings et cabinets — sociétés illimitées + consolidation',
    is_popular          = false,
    price_monthly_fcfa  = 100000,
    price_annual_fcfa   = 1080000,
    annual_discount_pct = 10,
    max_seats           = -1,
    max_companies       = -1,
    sort_order          = 2,
    active              = true
WHERE name = 'Premium'
  AND product_id = (SELECT id FROM products WHERE slug = 'cockpit-fa');


-- ═══════════════════════════════════════════════════
-- 3. FEATURES Cockpit F&A
-- ═══════════════════════════════════════════════════

INSERT INTO features (product_id, key, name, category, feature_type, is_core, sort_order)
SELECT p.id, v.key, v.name, v.category, 'boolean', v.is_core, v.sort
FROM products p, (VALUES
  -- ── Features incluses dans Solo (is_core = true) ──
  ('import_balance_gl',           'Import balance & grand livre (Excel, CSV)',         'Import',         true,  1),
  ('plan_comptable_syscohada',    'Plan comptable SYSCOHADA révisé 2017',              'Comptabilité',   true,  2),
  ('etats_financiers',            'États financiers (Bilan, CR, TFT, SIG)',            'États',          true,  3),
  ('dashboards_45',               '45+ dashboards (Pareto, Waterfall, BFR, Du Pont…)', 'Dashboards',     true,  4),
  ('ratios_benchmark',            'Ratios financiers + benchmark sectoriel',           'Analyse',        true,  5),
  ('audit_gl_16',                 'Audit GL (16 contrôles automatiques)',              'Contrôle',       true,  6),
  ('reporting_personnalisable',   'Reporting personnalisable (23 sections, PDF)',      'Reporting',      true,  7),
  ('proph3t_ia_basique',          'Proph3t IA — commentaires & prédictions',           'IA',             true,  8),
  ('proph3t_memoire',             'Proph3t mémoire persistante',                       'IA',             true,  9),
  ('alertes_plan_action',         'Alertes & plan d''action (statut, owner)',          'Pilotage',       true, 10),
  ('budget_realise',              'Budget vs réalisé (multi-versions)',                'Budget',         true, 11),
  ('mode_demo',                   'Mode démo intégré',                                 'Démo',           true, 12),
  ('export_excel_pdf',            'Export Excel & PDF',                                'Export',         true, 13),
  ('support_email',               'Support email',                                     'Support',        true, 14),
  -- ── Features locked (Group uniquement) ──
  ('multi_societes_illimite',     'Multi-sociétés illimité',                           'Configuration',  false, 20),
  ('consolidation_groupe',        'Consolidation groupe',                              'Consolidation',  false, 21),
  ('vue_groupe_benchmarks',       'Vue groupe + benchmarks inter-sociétés',            'Reporting',      false, 22),
  ('comptabilite_analytique',     'Comptabilité analytique multi-axes',                'Analytique',     false, 23),
  ('multi_utilisateurs_rbac',     'Multi-utilisateurs avec rôles (RBAC)',              'Workflow',       false, 24),
  ('workflow_validation',         'Workflow de validation',                            'Workflow',       false, 25),
  ('audit_trail',                 'Audit trail (journal des modifications)',           'Sécurité',       false, 26),
  ('api_rest',                    'API REST',                                          'API',            false, 27),
  ('proph3t_avance',              'Proph3t IA avancé (LLM + prédictif)',               'IA',             false, 28),
  ('support_prioritaire',         'Support prioritaire (réponse < 24 h)',              'Support',        false, 29)
) AS v(key, name, category, is_core, sort)
WHERE p.slug = 'cockpit-fa'
ON CONFLICT (product_id, key) DO NOTHING;


-- ═══════════════════════════════════════════════════
-- 4. plan_features Cockpit F&A (reset + rebuild)
-- ═══════════════════════════════════════════════════

DELETE FROM plan_features
WHERE plan_id IN (
  SELECT pl.id FROM plans pl
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'cockpit-fa'
);

-- Plan SOLO — features explicites (14 incluses, 10 locked)
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, v.enabled,
       CASE WHEN v.enabled THEN '✓' ELSE NULL END
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id,
(VALUES
  -- Incluses
  ('import_balance_gl',           true),
  ('plan_comptable_syscohada',    true),
  ('etats_financiers',            true),
  ('dashboards_45',               true),
  ('ratios_benchmark',            true),
  ('audit_gl_16',                 true),
  ('reporting_personnalisable',   true),
  ('proph3t_ia_basique',          true),
  ('proph3t_memoire',             true),
  ('alertes_plan_action',         true),
  ('budget_realise',              true),
  ('mode_demo',                   true),
  ('export_excel_pdf',            true),
  ('support_email',               true),
  -- Locked
  ('multi_societes_illimite',     false),
  ('consolidation_groupe',        false),
  ('vue_groupe_benchmarks',       false),
  ('comptabilite_analytique',     false),
  ('multi_utilisateurs_rbac',     false),
  ('workflow_validation',         false),
  ('audit_trail',                 false),
  ('api_rest',                    false),
  ('proph3t_avance',              false),
  ('support_prioritaire',         false)
) AS v(fkey, enabled)
WHERE p.slug = 'cockpit-fa' AND pl.name = 'Starter' AND f.key = v.fkey;

-- Plan GROUP — toutes les features activées
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, true, '✓'
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id
WHERE p.slug = 'cockpit-fa' AND pl.name = 'Premium';


-- ═══════════════════════════════════════════════════
-- 5. Vérifications finales
-- ═══════════════════════════════════════════════════
DO $check$
DECLARE
  v_apps_count      INT;
  v_products_count  INT;
  v_plans_count     INT;
  v_features_count  INT;
  v_pf_count        INT;
BEGIN
  SELECT COUNT(*) INTO v_apps_count
  FROM apps WHERE id = 'cockpit-fa';

  SELECT COUNT(*) INTO v_products_count
  FROM products WHERE slug = 'cockpit-fa';

  SELECT COUNT(*) INTO v_plans_count
  FROM plans pl JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'cockpit-fa' AND pl.active = true;

  SELECT COUNT(*) INTO v_features_count
  FROM features WHERE product_id = (SELECT id FROM products WHERE slug = 'cockpit-fa');

  SELECT COUNT(*) INTO v_pf_count
  FROM plan_features pf
  JOIN plans pl ON pf.plan_id = pl.id
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'cockpit-fa';

  RAISE NOTICE '─── COCKPIT F&A ───';
  RAISE NOTICE '  apps ''cockpit-fa''      : % (expected 1)',  v_apps_count;
  RAISE NOTICE '  products ''cockpit-fa''  : % (expected 1)',  v_products_count;
  RAISE NOTICE '  active plans            : % (expected 2)',  v_plans_count;
  RAISE NOTICE '  features                : % (expected 24)', v_features_count;
  RAISE NOTICE '  plan_features rows      : % (expected 48 = 24+24)', v_pf_count;

  IF v_apps_count = 0 THEN
    RAISE EXCEPTION 'apps creation failed: cockpit-fa not found';
  END IF;
  IF v_products_count = 0 THEN
    RAISE EXCEPTION 'sync trigger failed: cockpit-fa not found in products';
  END IF;
  IF v_plans_count <> 2 THEN
    RAISE EXCEPTION 'plans creation failed: expected 2, got %', v_plans_count;
  END IF;
  IF v_features_count <> 24 THEN
    RAISE EXCEPTION 'features creation failed: expected 24, got %', v_features_count;
  END IF;
END;
$check$;

COMMIT;
