-- ═══════════════════════════════════════════════════
-- ATLASBANX — Création complète (apps + plans + features + plan_features)
-- ═══════════════════════════════════════════════════
-- AtlasBanx (codename Scrutix) est l'outil d'audit bancaire intelligent
-- pour la zone CEMAC / UEMOA :
--   • Détection automatique d'anomalies bancaires (frais dupliqués,
--     ghost fees, surfacturations, erreurs d'intérêts, etc.)
--   • 18 algorithmes statistiques (Z-Score, Benford, Isolation Forest,
--     Frequency Patterns) + IA (Claude / Ollama)
--   • Rapports SYSCOHADA prêts à signer avec branding cabinet
--   • Module facturation OHADA intégré (plan Cabinet)
--   • Sécurité bancaire : MFA TOTP, allowlist IP, audit trail SHA-256
--
-- Schéma identique aux autres apps Atlas (atlas-fa / cockpit-fa / advist) :
--   1. INSERT apps  → trigger sync_apps_to_products crée la row products
--   2. INSERT plans (Entreprise 89 000 / Cabinet 249 000)
--   3. INSERT features
--   4. INSERT plan_features
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
  'atlasbanx',
  'AtlasBanx',
  'App',
  'Audit bancaire intelligent CEMAC / UEMOA',
  'AtlasBanx détecte automatiquement les anomalies dans vos relevés bancaires : frais dupliqués, ghost fees, surfacturations, erreurs d''intérêts, agios abusifs. 18 algorithmes statistiques (Z-Score, Benford, Isolation Forest, Frequency Patterns) couplés à un moteur IA (Claude / Ollama local) classifient et expliquent chaque anomalie avec un score de confiance. Génération de rapports SYSCOHADA prêts à signer, branding cabinet complet, module facturation OHADA. Sécurité banking-grade : MFA TOTP, allowlist IP, audit trail SHA-256 chaîné. Conçu pour les experts-comptables et directions financières en zone CEMAC / UEMOA.',
  ARRAY[
    '18 détecteurs d''anomalies (statistiques + IA)',
    'Z-Score, Benford Law, Isolation Forest, Frequency Patterns',
    'IA Claude + Ollama local (zéro fuite de données)',
    'Score de risque global 0-100 par client',
    'Score de confiance par anomalie',
    'Multi-banques CEMAC / UEMOA (47 banques pré-paramétrées)',
    'Import CSV, Excel, PDF, OFX',
    'Mapping intelligent des colonnes',
    'Conditions tarifaires versionnées par banque',
    'Rapports SYSCOHADA prêts à signer',
    'Branding cabinet (logo, couleurs, footer, page de garde)',
    'Export PDF, Excel, Word avec watermark',
    'Certificat d''intégrité SHA-256',
    'Audit trail immuable (hash chaîné)',
    'MFA TOTP (Google Authenticator, 1Password, Authy)',
    'Allowlist d''adresses IP',
    'Throttling de connexion',
    'Suppression de données RGPD-compliant',
    'Multi-utilisateurs avec rôles (Cabinet)',
    'Module facturation OHADA intégré (Cabinet)',
    'Account Manager dédié (Cabinet)',
    'Support email 24h (Entreprise)',
    'Support prioritaire 4h (Cabinet)',
    '14 jours d''essai gratuit'
  ],
  ARRAY['Finance', 'Audit', 'Banque', 'Compliance']::text[],
  '{"Entreprise": 89000, "Cabinet": 249000}'::jsonb,
  'mois',
  '#C9954A',
  'landmark',
  ARRAY['18 détecteurs ML+IA', '47 banques CEMAC/UEMOA', 'Audit trail SHA-256']::text[],
  'https://atlasbanx.atlas-studio.org',
  'available',
  4
WHERE NOT EXISTS (SELECT 1 FROM public.apps WHERE id = 'atlasbanx');

-- Re-sync si déjà inséré (re-run idempotent)
UPDATE public.apps SET
  name           = 'AtlasBanx',
  type           = 'App',
  tagline        = 'Audit bancaire intelligent CEMAC / UEMOA',
  color          = '#C9954A',
  icon           = 'landmark',
  external_url   = 'https://atlasbanx.atlas-studio.org',
  status         = 'available',
  pricing        = '{"Entreprise": 89000, "Cabinet": 249000}'::jsonb,
  pricing_period = 'mois',
  updated_at     = now()
WHERE id = 'atlasbanx';


-- ═══════════════════════════════════════════════════
-- 2. PLANS (le row products a été créée par le trigger sync_apps_to_products)
-- ═══════════════════════════════════════════════════

-- Plan ENTREPRISE (interne 'Starter') — entrée premium accessible
INSERT INTO plans (
  product_id, name, display_name, description, is_popular,
  price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
  max_seats, max_companies, sort_order, active
)
SELECT p.id, 'Starter', 'Entreprise — 1 société',
       'Pour les directions financières qui auditent leurs propres relevés bancaires',
       false,
       89000, 907800, 15,
       5, 1, 1, true
FROM products p
WHERE p.slug = 'atlasbanx'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.name = 'Starter'
  );

UPDATE plans
SET display_name        = 'Entreprise — 1 société',
    description         = 'Pour les directions financières qui auditent leurs propres relevés bancaires',
    is_popular          = false,
    price_monthly_fcfa  = 89000,
    price_annual_fcfa   = 907800,
    annual_discount_pct = 15,
    max_seats           = 5,
    max_companies       = 1,
    sort_order          = 1,
    active              = true
WHERE name = 'Starter'
  AND product_id = (SELECT id FROM products WHERE slug = 'atlasbanx');

-- Plan CABINET (interne 'Premium') — populaire, le plus choisi
INSERT INTO plans (
  product_id, name, display_name, description, is_popular,
  price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
  max_seats, max_companies, sort_order, active
)
SELECT p.id, 'Premium', 'Cabinet — clients illimités',
       'Pour les cabinets d''expertise comptable qui industrialisent l''audit bancaire',
       true,
       249000, 2540000, 15,
       -1, -1, 2, true
FROM products p
WHERE p.slug = 'atlasbanx'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.name = 'Premium'
  );

UPDATE plans
SET display_name        = 'Cabinet — clients illimités',
    description         = 'Pour les cabinets d''expertise comptable qui industrialisent l''audit bancaire',
    is_popular          = true,
    price_monthly_fcfa  = 249000,
    price_annual_fcfa   = 2540000,
    annual_discount_pct = 15,
    max_seats           = -1,
    max_companies       = -1,
    sort_order          = 2,
    active              = true
WHERE name = 'Premium'
  AND product_id = (SELECT id FROM products WHERE slug = 'atlasbanx');


-- ═══════════════════════════════════════════════════
-- 3. FEATURES AtlasBanx (28 features)
-- ═══════════════════════════════════════════════════

INSERT INTO features (product_id, key, name, category, feature_type, is_core, sort_order)
SELECT p.id, v.key, v.name, v.category, 'boolean', v.is_core, v.sort
FROM products p, (VALUES
  -- ── Features incluses dans Entreprise (is_core = true) ──
  ('detecteurs_18',              '18 détecteurs d''anomalies (statistiques + IA)',   'Détection',    true,  1),
  ('z_score_benford',            'Z-Score + Benford Law',                            'Détection',    true,  2),
  ('isolation_forest',           'Isolation Forest + Frequency Patterns',            'Détection',    true,  3),
  ('ia_local_ollama',            'IA Ollama local (zéro fuite)',                     'IA',           true,  4),
  ('score_risque_client',        'Score de risque global 0-100 par client',          'Scoring',      true,  5),
  ('score_confiance_anomalie',   'Score de confiance par anomalie',                  'Scoring',      true,  6),
  ('banques_47',                 '47 banques CEMAC / UEMOA pré-paramétrées',         'Banques',      true,  7),
  ('import_multi_format',        'Import CSV, Excel, PDF, OFX',                      'Import',       true,  8),
  ('mapping_intelligent',        'Mapping intelligent des colonnes',                 'Import',       true,  9),
  ('conditions_versionnees',     'Conditions tarifaires versionnées',                'Banques',      true, 10),
  ('rapports_syscohada',         'Rapports SYSCOHADA prêts à signer',                'Reporting',    true, 11),
  ('export_pdf_excel_word',      'Export PDF, Excel, Word',                          'Export',       true, 12),
  ('certificat_integrite',       'Certificat d''intégrité SHA-256',                  'Sécurité',     true, 13),
  ('audit_trail',                'Audit trail immuable (hash chaîné)',               'Sécurité',     true, 14),
  ('mfa_totp',                   'MFA TOTP (Google Auth, 1Password, Authy)',         'Sécurité',     true, 15),
  ('allowlist_ip',                'Allowlist d''adresses IP',                         'Sécurité',     true, 16),
  ('throttling_connexion',       'Throttling de connexion',                          'Sécurité',     true, 17),
  ('rgpd_compliant',             'Suppression de données RGPD-compliant',            'Conformité',   true, 18),
  ('multi_users_5',              'Multi-utilisateurs (5 sièges max)',                'Workflow',     true, 19),
  ('support_email_24h',          'Support email sous 24h',                           'Support',      true, 20),
  -- ── Features locked (Cabinet uniquement) ──
  ('clients_illimites',          'Clients illimités',                                'Configuration', false, 30),
  ('multi_users_illimite',       'Multi-utilisateurs illimités (RBAC)',              'Workflow',      false, 31),
  ('branding_cabinet',           'Branding cabinet (logo, couleurs, footer)',        'Reporting',     false, 32),
  ('ia_claude_avance',           'IA Claude Sonnet avancée',                         'IA',            false, 33),
  ('module_facturation',         'Module facturation OHADA intégré',                 'Facturation',   false, 34),
  ('account_manager',            'Account Manager dédié',                            'Support',       false, 35),
  ('support_prioritaire_4h',     'Support prioritaire (réponse < 4h)',               'Support',       false, 36),
  ('formation_onboarding',       'Formation et onboarding cabinet',                  'Support',       false, 37)
) AS v(key, name, category, is_core, sort)
WHERE p.slug = 'atlasbanx'
ON CONFLICT (product_id, key) DO NOTHING;


-- ═══════════════════════════════════════════════════
-- 4. plan_features AtlasBanx (reset + rebuild)
-- ═══════════════════════════════════════════════════

DELETE FROM plan_features
WHERE plan_id IN (
  SELECT pl.id FROM plans pl
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'atlasbanx'
);

-- Plan ENTREPRISE — features explicites (20 incluses, 8 locked)
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, v.enabled,
       CASE WHEN v.enabled THEN '✓' ELSE NULL END
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id,
(VALUES
  -- Incluses
  ('detecteurs_18',              true),
  ('z_score_benford',            true),
  ('isolation_forest',           true),
  ('ia_local_ollama',            true),
  ('score_risque_client',        true),
  ('score_confiance_anomalie',   true),
  ('banques_47',                 true),
  ('import_multi_format',        true),
  ('mapping_intelligent',        true),
  ('conditions_versionnees',     true),
  ('rapports_syscohada',         true),
  ('export_pdf_excel_word',      true),
  ('certificat_integrite',       true),
  ('audit_trail',                true),
  ('mfa_totp',                   true),
  ('allowlist_ip',               true),
  ('throttling_connexion',       true),
  ('rgpd_compliant',             true),
  ('multi_users_5',              true),
  ('support_email_24h',          true),
  -- Locked
  ('clients_illimites',          false),
  ('multi_users_illimite',       false),
  ('branding_cabinet',           false),
  ('ia_claude_avance',           false),
  ('module_facturation',         false),
  ('account_manager',            false),
  ('support_prioritaire_4h',     false),
  ('formation_onboarding',       false)
) AS v(fkey, enabled)
WHERE p.slug = 'atlasbanx' AND pl.name = 'Starter' AND f.key = v.fkey;

-- Plan CABINET — toutes les features activées
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, true, '✓'
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id
WHERE p.slug = 'atlasbanx' AND pl.name = 'Premium';


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
  FROM apps WHERE id = 'atlasbanx';

  SELECT COUNT(*) INTO v_products_count
  FROM products WHERE slug = 'atlasbanx';

  SELECT COUNT(*) INTO v_plans_count
  FROM plans pl JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'atlasbanx' AND pl.active = true;

  SELECT COUNT(*) INTO v_features_count
  FROM features WHERE product_id = (SELECT id FROM products WHERE slug = 'atlasbanx');

  SELECT COUNT(*) INTO v_pf_count
  FROM plan_features pf
  JOIN plans pl ON pf.plan_id = pl.id
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'atlasbanx';

  RAISE NOTICE '─── ATLASBANX ───';
  RAISE NOTICE '  apps ''atlasbanx''       : % (expected 1)',  v_apps_count;
  RAISE NOTICE '  products ''atlasbanx''   : % (expected 1)',  v_products_count;
  RAISE NOTICE '  active plans            : % (expected 2)',  v_plans_count;
  RAISE NOTICE '  features                : % (expected 28)', v_features_count;
  RAISE NOTICE '  plan_features rows      : % (expected 56 = 28+28)', v_pf_count;

  IF v_apps_count = 0 THEN
    RAISE EXCEPTION 'apps creation failed: atlasbanx not found';
  END IF;
  IF v_products_count = 0 THEN
    RAISE EXCEPTION 'sync trigger failed: atlasbanx not found in products';
  END IF;
  IF v_plans_count <> 2 THEN
    RAISE EXCEPTION 'plans creation failed: expected 2, got %', v_plans_count;
  END IF;
  IF v_features_count <> 28 THEN
    RAISE EXCEPTION 'features creation failed: expected 28, got %', v_features_count;
  END IF;
END;
$check$;

COMMIT;
