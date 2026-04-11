-- ═══════════════════════════════════════════════════
-- LIASSPILOT + ADVIST — Création complète
-- ═══════════════════════════════════════════════════
-- Cette migration crée from scratch les rows products + plans + features
-- + plan_features pour LiassPilot et ADVIST. Elle remplace fonctionnellement
-- la migration 20260411 qui présupposait à tort que les rows products existaient.
--
-- Schéma cible (vérifié sur la base réelle) :
--   products       (id uuid, slug text, name text, description text, status text,
--                   color_accent text, app_url text, logo_url text)
--   plans          (id, product_id, name, display_name, description, is_popular,
--                   price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
--                   max_seats, max_companies, sort_order, active)
--   features       (id, product_id, key, name, category, feature_type, is_core,
--                   sort_order) — UNIQUE (product_id, key)
--   plan_features  (id, plan_id, feature_id, enabled, display_value)
--                   — UNIQUE (plan_id, feature_id)
--
-- Note importante : on garde les noms internes 'Starter'/'Pro' pour LiassPilot
-- (display_name = 'Entreprise — 1 société' / 'Cabinet — illimité') car c'est
-- le pattern Atlas F&A. Pour ADVIST en revanche on utilise des noms propres
-- 'Business'/'Entreprise' pour rester lisible.
--
-- 100% idempotente : INSERT … WHERE NOT EXISTS, UPDATE pour les valeurs déjà
-- insérées par un précédent run, ON CONFLICT DO NOTHING sur features.
-- ═══════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CRÉATION DES ROWS products
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO products (id, slug, name, description, status, color_accent)
SELECT gen_random_uuid(), 'taxpilot', 'Liass''Pilot',
       'Liasse fiscale SYSCOHADA — bilan, compte de résultat, TAFIRE et 129 contrôles automatiques.',
       'live', '#EF9F27'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'taxpilot');

INSERT INTO products (id, slug, name, description, status, color_accent)
SELECT gen_random_uuid(), 'advist', 'ADVIST',
       'Workflow documentaire et signature électronique pour l''Afrique francophone.',
       'live', '#EF9F27'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'advist');


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. LIASSPILOT — Plans
-- ═══════════════════════════════════════════════════════════════════════════

-- Plan ENTREPRISE (interne 'Starter')
INSERT INTO plans (
  product_id, name, display_name, description, is_popular,
  price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
  max_seats, max_companies, sort_order, active
)
SELECT p.id, 'Starter', 'Entreprise — 1 société',
       'Pour une entreprise indépendante',
       true,
       250000, 2700000, 10,
       5, 1, 1, true
FROM products p
WHERE p.slug = 'taxpilot'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.name = 'Starter'
  );

-- Si déjà inséré (re-run), on synchronise les valeurs
UPDATE plans
SET display_name        = 'Entreprise — 1 société',
    description         = 'Pour une entreprise indépendante',
    is_popular          = true,
    price_monthly_fcfa  = 250000,
    price_annual_fcfa   = 2700000,
    annual_discount_pct = 10,
    max_seats           = 5,
    max_companies       = 1,
    sort_order          = 1,
    active              = true
WHERE name = 'Starter'
  AND product_id = (SELECT id FROM products WHERE slug = 'taxpilot');

-- Plan CABINET (interne 'Pro')
INSERT INTO plans (
  product_id, name, display_name, description, is_popular,
  price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
  max_seats, max_companies, sort_order, active
)
SELECT p.id, 'Pro', 'Cabinet — illimité',
       'Pour les cabinets comptables et fiduciaires',
       false,
       1500000, 16200000, 10,
       -1, -1, 2, true
FROM products p
WHERE p.slug = 'taxpilot'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.name = 'Pro'
  );

UPDATE plans
SET display_name        = 'Cabinet — illimité',
    description         = 'Pour les cabinets comptables et fiduciaires',
    is_popular          = false,
    price_monthly_fcfa  = 1500000,
    price_annual_fcfa   = 16200000,
    annual_discount_pct = 10,
    max_seats           = -1,
    max_companies       = -1,
    sort_order          = 2,
    active              = true
WHERE name = 'Pro'
  AND product_id = (SELECT id FROM products WHERE slug = 'taxpilot');


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. LIASSPILOT — Features
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO features (product_id, key, name, category, feature_type, is_core, sort_order)
SELECT p.id, v.key, v.name, v.category, 'boolean', v.is_core, v.sort
FROM products p, (VALUES
  -- Features incluses dans Entreprise (is_core = true)
  ('import_balance_csv_excel',     'Import balance CSV & Excel',         'Import',        true,  1),
  ('plan_comptable_syscohada',     'Plan comptable SYSCOHADA révisé',    'Comptabilité',  true,  2),
  ('bilan_actif_passif',           'Bilan Actif & Passif complet',       'États',         true,  3),
  ('compte_resultat_9sig',         'Compte de résultat & 9 SIG',         'États',         true,  4),
  ('tafire_tft',                   'TAFIRE / TFT',                       'États',         true,  5),
  ('proph3t_129_controles',        '129 contrôles Proph3t',              'IA',            true,  6),
  ('export_excel',                 'Export Excel 84 onglets',            'Export',        true,  7),
  ('multi_pays_ohada_17',          'Multi-pays OHADA (17 pays)',         'Configuration', true,  8),
  ('support_email',                'Support email',                      'Support',       true,  9),
  -- Features locked (Cabinet uniquement)
  ('multi_societes_illimite',      'Multi-sociétés illimité',                 'Configuration', false, 20),
  ('tableau_de_bord_portefeuille', 'Tableau de bord portefeuille clients',    'Reporting',     false, 21),
  ('export_groupe_multi_clients',  'Export groupé multi-clients',             'Export',        false, 22),
  ('branding_cabinet',             'Branding cabinet personnalisé',           'Configuration', false, 23),
  ('comparaison_inter_societes',   'Comparaison inter-sociétés',              'Reporting',     false, 24),
  ('rapport_synthetique_cabinet',  'Rapport synthétique cabinet',             'Reporting',     false, 25),
  ('gestion_equipe_cabinet',       'Gestion d''équipe cabinet',               'Configuration', false, 26),
  ('support_dedie',                'Support dédié & account manager',         'Support',       false, 27)
) AS v(key, name, category, is_core, sort)
WHERE p.slug = 'taxpilot'
ON CONFLICT (product_id, key) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. LIASSPILOT — plan_features (reset puis rebuild)
-- ═══════════════════════════════════════════════════════════════════════════

-- Reset propre
DELETE FROM plan_features
WHERE plan_id IN (
  SELECT pl.id FROM plans pl
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'taxpilot'
);

-- Plan ENTREPRISE — features explicites
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, v.enabled,
       CASE WHEN v.enabled THEN '✓' ELSE NULL END
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id,
(VALUES
  -- Incluses
  ('import_balance_csv_excel',     true),
  ('plan_comptable_syscohada',     true),
  ('bilan_actif_passif',           true),
  ('compte_resultat_9sig',         true),
  ('tafire_tft',                   true),
  ('proph3t_129_controles',        true),
  ('export_excel',                 true),
  ('multi_pays_ohada_17',          true),
  ('support_email',                true),
  -- Locked
  ('multi_societes_illimite',      false),
  ('tableau_de_bord_portefeuille', false),
  ('export_groupe_multi_clients',  false),
  ('branding_cabinet',             false),
  ('comparaison_inter_societes',   false),
  ('rapport_synthetique_cabinet',  false),
  ('gestion_equipe_cabinet',       false),
  ('support_dedie',                false)
) AS v(fkey, enabled)
WHERE p.slug = 'taxpilot' AND pl.name = 'Starter' AND f.key = v.fkey;

-- Plan CABINET — toutes les features activées (pattern Atlas F&A Premium)
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, true, '✓'
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id
WHERE p.slug = 'taxpilot' AND pl.name = 'Pro';


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ADVIST — Plans
-- ═══════════════════════════════════════════════════════════════════════════

-- Plan BUSINESS
INSERT INTO plans (
  product_id, name, display_name, description, is_popular,
  price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
  max_seats, sort_order, active
)
SELECT p.id, 'Business', 'Business — Essentiel',
       'Pour les PME : workflow documentaire et signature simple',
       false,
       25000, 270000, 10,
       5, 1, true
FROM products p
WHERE p.slug = 'advist'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.name = 'Business'
  );

UPDATE plans
SET display_name        = 'Business — Essentiel',
    description         = 'Pour les PME : workflow documentaire et signature simple',
    is_popular          = false,
    price_monthly_fcfa  = 25000,
    price_annual_fcfa   = 270000,
    annual_discount_pct = 10,
    max_seats           = 5,
    sort_order          = 1,
    active              = true
WHERE name = 'Business'
  AND product_id = (SELECT id FROM products WHERE slug = 'advist');

-- Plan ENTREPRISE
INSERT INTO plans (
  product_id, name, display_name, description, is_popular,
  price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
  max_seats, sort_order, active
)
SELECT p.id, 'Entreprise', 'Entreprise — Sur mesure',
       'Pour les grandes équipes : signature avancée, audit certifié, intégrations',
       true,
       150000, 1620000, 10,
       -1, 2, true
FROM products p
WHERE p.slug = 'advist'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.name = 'Entreprise'
  );

UPDATE plans
SET display_name        = 'Entreprise — Sur mesure',
    description         = 'Pour les grandes équipes : signature avancée, audit certifié, intégrations',
    is_popular          = true,
    price_monthly_fcfa  = 150000,
    price_annual_fcfa   = 1620000,
    annual_discount_pct = 10,
    max_seats           = -1,
    sort_order          = 2,
    active              = true
WHERE name = 'Entreprise'
  AND product_id = (SELECT id FROM products WHERE slug = 'advist');


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ADVIST — Features
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO features (product_id, key, name, category, feature_type, is_core, sort_order)
SELECT p.id, v.key, v.name, v.category, 'boolean', v.is_core, v.sort
FROM products p, (VALUES
  -- Features incluses dans Business (is_core = true)
  ('import_documents_pdf_images',    'Import documents PDF & images',    'Documents',     true,  1),
  ('circuits_validation_simple',     'Circuits de validation simples',   'Workflow',      true,  2),
  ('signature_electronique_simple',  'Signature électronique simple',    'Signature',     true,  3),
  ('notification_email',             'Notifications par email',          'Notifications', true,  4),
  ('suivi_temps_reel',               'Suivi en temps réel',              'Workflow',      true,  5),
  ('hash_sha256',                    'Empreinte SHA-256 des documents',  'Sécurité',      true,  6),
  ('export_dossier_complet',         'Export dossier complet (ZIP)',     'Export',        true,  7),
  ('support_email',                  'Support email',                    'Support',       true,  8),
  -- Features locked (Entreprise uniquement)
  ('signature_electronique_avancee', 'Signature électronique avancée',         'Signature',     false, 20),
  ('signature_biometrique',          'Signature biométrique',                  'Signature',     false, 21),
  ('circuits_validation_paralleles', 'Circuits de validation parallèles',      'Workflow',      false, 22),
  ('circuits_conditionnels',         'Circuits conditionnels',                 'Workflow',      false, 23),
  ('notifications_whatsapp_sms',     'Notifications WhatsApp & SMS',           'Notifications', false, 24),
  ('api_rest',                       'API REST',                               'API',           false, 25),
  ('webhooks',                       'Webhooks',                               'API',           false, 26),
  ('audit_trail_certifie_ohada',     'Audit trail certifié OHADA',             'Sécurité',      false, 27),
  ('archivage_legale_probante',      'Archivage à valeur légale probante',     'Sécurité',      false, 28),
  ('multi_equipes',                  'Multi-équipes',                          'Configuration', false, 29),
  ('branding_personnalise',          'Branding personnalisé (white-label)',    'Configuration', false, 30),
  ('integrations_erp_crm',           'Intégrations ERP & CRM',                 'Intégrations',  false, 31),
  ('rapports_analytiques',           'Rapports analytiques avancés',           'Reporting',     false, 32),
  ('support_dedie',                  'Support dédié & account manager',        'Support',       false, 33)
) AS v(key, name, category, is_core, sort)
WHERE p.slug = 'advist'
ON CONFLICT (product_id, key) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. ADVIST — plan_features (reset puis rebuild)
-- ═══════════════════════════════════════════════════════════════════════════

DELETE FROM plan_features
WHERE plan_id IN (
  SELECT pl.id FROM plans pl
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'advist'
);

-- Plan BUSINESS — features explicites
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, v.enabled,
       CASE WHEN v.enabled THEN '✓' ELSE NULL END
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id,
(VALUES
  -- Incluses
  ('import_documents_pdf_images',    true),
  ('circuits_validation_simple',     true),
  ('signature_electronique_simple',  true),
  ('notification_email',             true),
  ('suivi_temps_reel',               true),
  ('hash_sha256',                    true),
  ('export_dossier_complet',         true),
  ('support_email',                  true),
  -- Locked
  ('signature_electronique_avancee', false),
  ('signature_biometrique',          false),
  ('circuits_validation_paralleles', false),
  ('circuits_conditionnels',         false),
  ('notifications_whatsapp_sms',     false),
  ('api_rest',                       false),
  ('webhooks',                       false),
  ('audit_trail_certifie_ohada',     false),
  ('archivage_legale_probante',      false),
  ('multi_equipes',                  false),
  ('branding_personnalise',          false),
  ('integrations_erp_crm',           false),
  ('rapports_analytiques',           false),
  ('support_dedie',                  false)
) AS v(fkey, enabled)
WHERE p.slug = 'advist' AND pl.name = 'Business' AND f.key = v.fkey;

-- Plan ENTREPRISE — toutes les features activées
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, true, '✓'
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id
WHERE p.slug = 'advist' AND pl.name = 'Entreprise';


-- ═══════════════════════════════════════════════════
-- 8. Vérifications finales
-- ═══════════════════════════════════════════════════
DO $check$
DECLARE
  v_lp_products INT;
  v_ad_products INT;
  v_lp_plans INT;
  v_ad_plans INT;
  v_lp_features INT;
  v_ad_features INT;
  v_lp_pf INT;
  v_ad_pf INT;
BEGIN
  SELECT COUNT(*) INTO v_lp_products FROM products WHERE slug = 'taxpilot';
  SELECT COUNT(*) INTO v_ad_products FROM products WHERE slug = 'advist';

  SELECT COUNT(*) INTO v_lp_plans
  FROM plans pl JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'taxpilot' AND pl.active = true;

  SELECT COUNT(*) INTO v_ad_plans
  FROM plans pl JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'advist' AND pl.active = true;

  SELECT COUNT(*) INTO v_lp_features
  FROM features WHERE product_id = (SELECT id FROM products WHERE slug = 'taxpilot');

  SELECT COUNT(*) INTO v_ad_features
  FROM features WHERE product_id = (SELECT id FROM products WHERE slug = 'advist');

  SELECT COUNT(*) INTO v_lp_pf
  FROM plan_features pf
  JOIN plans pl ON pf.plan_id = pl.id
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'taxpilot';

  SELECT COUNT(*) INTO v_ad_pf
  FROM plan_features pf
  JOIN plans pl ON pf.plan_id = pl.id
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'advist';

  RAISE NOTICE '─── LIASSPILOT ───';
  RAISE NOTICE '  product rows         : % (expected 1)', v_lp_products;
  RAISE NOTICE '  active plans         : % (expected 2)', v_lp_plans;
  RAISE NOTICE '  features             : % (expected 17)', v_lp_features;
  RAISE NOTICE '  plan_features rows   : % (expected 34 = 17+17)', v_lp_pf;
  RAISE NOTICE '─── ADVIST ───';
  RAISE NOTICE '  product rows         : % (expected 1)', v_ad_products;
  RAISE NOTICE '  active plans         : % (expected 2)', v_ad_plans;
  RAISE NOTICE '  features             : % (expected 22)', v_ad_features;
  RAISE NOTICE '  plan_features rows   : % (expected 44 = 22+22)', v_ad_pf;

  IF v_lp_products = 0 OR v_ad_products = 0 THEN
    RAISE EXCEPTION 'Migration failed: products were not created';
  END IF;
  IF v_lp_plans <> 2 OR v_ad_plans <> 2 THEN
    RAISE EXCEPTION 'Migration failed: expected 2 active plans per product, got LP=% AD=%', v_lp_plans, v_ad_plans;
  END IF;
END;
$check$;

COMMIT;
