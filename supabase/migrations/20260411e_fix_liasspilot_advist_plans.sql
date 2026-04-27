-- ═══════════════════════════════════════════════════
-- LIASSPILOT + ADVIST — Refonte plans / features
-- ═══════════════════════════════════════════════════
-- Cohérent avec le pattern Atlas F&A (cf. supabase_migration_atlas_fa_plans.sql)
--
-- LIASSPILOT (slug = 'taxpilot') :
--   - Plan Entreprise (interne 'Starter') : 250k FCFA/mois, 1 société, 5 users, POPULAIRE
--   - Plan Cabinet    (interne 'Pro')     : 1.5M FCFA/mois, illimité
--   - Bug corrigé : prix mensuels étaient à 0 (les valeurs étaient dans price_annual_fcfa)
--   - is_popular bascule de Pro → Starter (Entreprise est le plus populaire)
--   - Ajout de 8 nouvelles features cabinet (multi_societes, dashboard_portefeuille, …)
--   - plan_features reset et reconstruit selon le brief
--
-- ADVIST (slug = 'advist') :
--   - Passe de 3 plans à 2 (le plan 'Pro' est désactivé, pas supprimé)
--   - 'Starter' → renommé 'Business' (25k FCFA/mois, 5 users, 50 docs/mois)
--   - 'Enterprise' → renommé 'Entreprise' (150k FCFA/mois, illimité, POPULAIRE)
--   - Refonte complète des features pour matcher le brief (signature simple/avancée/biométrique,
--     circuits parallèles/conditionnels, hash sha256, archivage légal probant, etc.)
--   - plan_features reset et reconstruit
--
-- Idempotent : peut être rejoué sans effet de bord. Wrappé en transaction.
-- ═══════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════
-- 1. S'assurer que la colonne max_companies existe (déjà ajoutée par atlas-fa,
--    mais on est défensif)
-- ═══════════════════════════════════════════════════
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_companies INTEGER DEFAULT -1;
COMMENT ON COLUMN plans.max_companies IS 'Nombre max de sociétés par tenant. -1 = illimité.';

-- ═══════════════════════════════════════════════════════════════════════════
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ PARTIE 1 — LIASSPILOT (slug 'taxpilot')                                 │
-- └─────────────────────────────────────────────────────────────────────────┘
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- 1.1 Fix prix + limites + popularité des 2 plans
-- ─────────────────────────────────────────
-- Plan Entreprise (interne 'Starter')
UPDATE plans
SET
  display_name        = 'Entreprise — 1 société',
  description         = 'Pour une entreprise indépendante',
  is_popular          = true,
  price_monthly_fcfa  = 250000,
  price_annual_fcfa   = 2700000,   -- 10% de remise sur 12 mois
  annual_discount_pct = 10,
  max_seats           = 5,
  max_companies       = 1,
  sort_order          = 1,
  active              = true
WHERE product_id = (SELECT id FROM products WHERE slug = 'taxpilot')
  AND name = 'Starter';

-- Plan Cabinet (interne 'Pro')
UPDATE plans
SET
  display_name        = 'Cabinet — illimité',
  description         = 'Pour les cabinets comptables et fiduciaires',
  is_popular          = false,
  price_monthly_fcfa  = 1500000,
  price_annual_fcfa   = 16200000,  -- 10% de remise
  annual_discount_pct = 10,
  max_seats           = -1,
  max_companies       = -1,
  sort_order          = 2,
  active              = true
WHERE product_id = (SELECT id FROM products WHERE slug = 'taxpilot')
  AND name = 'Pro';

-- ─────────────────────────────────────────
-- 1.2 S'assurer que les features existantes ont les bons flags is_core
-- ─────────────────────────────────────────
-- multi_pays était locked (false) — il devient core (Entreprise inclut le multi-pays OHADA)
UPDATE features
SET is_core = true
WHERE product_id = (SELECT id FROM products WHERE slug = 'taxpilot')
  AND key = 'multi_pays';

-- ─────────────────────────────────────────
-- 1.3 Ajouter les nouvelles features Cabinet (locked pour Entreprise)
-- ─────────────────────────────────────────
INSERT INTO features (product_id, key, name, category, feature_type, is_core, sort_order)
SELECT p.id, v.key, v.name, v.category, 'boolean', false, v.sort
FROM products p, (VALUES
  ('support_email',          'Support email',                              'Support',       10),
  ('multi_societes',         'Multi-sociétés illimité',                    'Configuration', 30),
  ('dashboard_portefeuille', 'Tableau de bord portefeuille clients',       'Reporting',     31),
  ('export_groupe',          'Export groupé multi-clients',                'Export',        32),
  ('branding_cabinet',       'Branding cabinet personnalisé',              'Configuration', 33),
  ('comparaison_societes',   'Comparaison inter-sociétés',                 'Reporting',     34),
  ('rapport_synthetique',    'Rapport synthétique cabinet',                'Reporting',     35),
  ('gestion_equipe',         'Gestion d''équipe cabinet',                  'Configuration', 36),
  ('support_dedie',          'Support dédié & account manager',            'Support',       37)
) AS v(key, name, category, sort)
WHERE p.slug = 'taxpilot'
ON CONFLICT (product_id, key) DO NOTHING;

-- support_email est en réalité is_core=true (inclus dans Entreprise)
UPDATE features
SET is_core = true
WHERE product_id = (SELECT id FROM products WHERE slug = 'taxpilot')
  AND key = 'support_email';

-- ─────────────────────────────────────────
-- 1.4 Reset des plan_features et reconstruction
-- ─────────────────────────────────────────
DELETE FROM plan_features
WHERE plan_id IN (
  SELECT pl.id FROM plans pl
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'taxpilot'
);

-- Plan ENTREPRISE (Starter) — features explicites du brief
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, v.enabled,
       CASE WHEN v.enabled THEN '✓' ELSE NULL END
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id,
(VALUES
  -- Incluses
  ('import_balance',         true),
  ('plan_comptable',         true),
  ('bilan',                  true),
  ('compte_resultat',        true),
  ('tafire',                 true),
  ('controles',              true),
  ('export_excel',           true),
  ('multi_pays',             true),
  ('support_email',          true),
  -- Locked (Cabinet uniquement)
  ('multi_societes',         false),
  ('dashboard_portefeuille', false),
  ('export_groupe',          false),
  ('branding_cabinet',       false),
  ('comparaison_societes',   false),
  ('rapport_synthetique',    false),
  ('gestion_equipe',         false),
  ('support_dedie',          false)
) AS v(fkey, enabled)
WHERE p.slug = 'taxpilot' AND pl.name = 'Starter' AND f.key = v.fkey
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- Plan CABINET (Pro) — TOUTES les features activées (pattern Atlas F&A Premium)
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, true, '✓'
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id
WHERE p.slug = 'taxpilot' AND pl.name = 'Pro'
ON CONFLICT (plan_id, feature_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ PARTIE 2 — ADVIST (slug 'advist')                                       │
-- └─────────────────────────────────────────────────────────────────────────┘
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- 2.1 Désactiver le plan 'Pro' (préserve l'historique des éventuels abonnements)
-- ─────────────────────────────────────────
UPDATE plans
SET active = false
WHERE product_id = (SELECT id FROM products WHERE slug = 'advist')
  AND name = 'Pro';

-- ─────────────────────────────────────────
-- 2.2 Renommer Starter → Business (25k, 5 users, 50 docs/mois)
-- ─────────────────────────────────────────
UPDATE plans
SET
  name                = 'Business',
  display_name        = 'Business — Essentiel',
  description         = 'Pour les PME : workflow documentaire et signature simple',
  is_popular          = false,
  price_monthly_fcfa  = 25000,
  price_annual_fcfa   = 270000,    -- 10% de remise
  annual_discount_pct = 10,
  max_seats           = 5,
  sort_order          = 1,
  active              = true
WHERE product_id = (SELECT id FROM products WHERE slug = 'advist')
  AND name = 'Starter';

-- ─────────────────────────────────────────
-- 2.3 Renommer Enterprise → Entreprise (150k, illimité, POPULAIRE)
-- ─────────────────────────────────────────
UPDATE plans
SET
  name                = 'Entreprise',
  display_name        = 'Entreprise — Sur mesure',
  description         = 'Pour les grandes équipes : signature avancée, audit certifié, intégrations',
  is_popular          = true,
  price_monthly_fcfa  = 150000,
  price_annual_fcfa   = 1620000,   -- 10% de remise
  annual_discount_pct = 10,
  max_seats           = -1,
  sort_order          = 2,
  active              = true
WHERE product_id = (SELECT id FROM products WHERE slug = 'advist')
  AND name = 'Enterprise';

-- ─────────────────────────────────────────
-- 2.4 Refonte complète des features ADVIST
-- ─────────────────────────────────────────
-- Supprime d'abord les anciennes features qui ne sont pas dans le brief.
-- Les plan_features liées seront purgées en cascade par DELETE FROM plan_features
-- juste après. Note : on supprime tout sauf les keys qu'on va recréer/garder.
--
-- Stratégie : supprimer toutes les features ADVIST existantes puis recréer.
-- C'est plus simple qu'un mapping rename qui multiplierait les UPDATE.

DELETE FROM plan_features
WHERE plan_id IN (
  SELECT pl.id FROM plans pl
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'advist'
);

DELETE FROM features
WHERE product_id = (SELECT id FROM products WHERE slug = 'advist');

-- Recréation des features ADVIST conformément au brief
INSERT INTO features (product_id, key, name, category, feature_type, is_core, sort_order)
SELECT p.id, v.key, v.name, v.category, 'boolean', v.is_core, v.sort
FROM products p, (VALUES
  -- ── Features incluses dans Business (is_core = true) ──
  ('import_documents_pdf_images',   'Import documents PDF & images',         'Documents',     true,  1),
  ('circuits_validation_simple',    'Circuits de validation simples',        'Workflow',      true,  2),
  ('signature_electronique_simple', 'Signature électronique simple',         'Signature',     true,  3),
  ('notification_email',            'Notifications par email',               'Notifications', true,  4),
  ('suivi_temps_reel',              'Suivi en temps réel',                   'Workflow',      true,  5),
  ('hash_sha256',                   'Empreinte SHA-256 des documents',       'Sécurité',      true,  6),
  ('export_dossier_complet',        'Export dossier complet (ZIP)',          'Export',        true,  7),
  ('support_email',                 'Support email',                         'Support',       true,  8),
  -- ── Features locked (Entreprise uniquement) ──
  ('signature_electronique_avancee', 'Signature électronique avancée',       'Signature',     false, 20),
  ('signature_biometrique',          'Signature biométrique',                'Signature',     false, 21),
  ('circuits_validation_paralleles', 'Circuits de validation parallèles',    'Workflow',      false, 22),
  ('circuits_conditionnels',         'Circuits conditionnels',               'Workflow',      false, 23),
  ('notifications_whatsapp_sms',     'Notifications WhatsApp & SMS',         'Notifications', false, 24),
  ('api_rest',                       'API REST',                             'API',           false, 25),
  ('webhooks',                       'Webhooks',                             'API',           false, 26),
  ('audit_trail_certifie_ohada',     'Audit trail certifié OHADA',           'Sécurité',      false, 27),
  ('archivage_legale_probante',      'Archivage à valeur légale probante',   'Sécurité',      false, 28),
  ('multi_equipes',                  'Multi-équipes',                        'Configuration', false, 29),
  ('branding_personnalise',          'Branding personnalisé (white-label)',  'Configuration', false, 30),
  ('integrations_erp_crm',           'Intégrations ERP & CRM',               'Intégrations',  false, 31),
  ('rapports_analytiques',           'Rapports analytiques avancés',         'Reporting',     false, 32),
  ('support_dedie',                  'Support dédié & account manager',      'Support',       false, 33)
) AS v(key, name, category, is_core, sort)
WHERE p.slug = 'advist'
ON CONFLICT (product_id, key) DO NOTHING;

-- ─────────────────────────────────────────
-- 2.5 plan_features pour BUSINESS (features explicites)
-- ─────────────────────────────────────────
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, v.enabled,
       CASE WHEN v.enabled THEN '✓' ELSE NULL END
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id,
(VALUES
  -- Incluses
  ('import_documents_pdf_images',   true),
  ('circuits_validation_simple',    true),
  ('signature_electronique_simple', true),
  ('notification_email',            true),
  ('suivi_temps_reel',              true),
  ('hash_sha256',                   true),
  ('export_dossier_complet',        true),
  ('support_email',                 true),
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
WHERE p.slug = 'advist' AND pl.name = 'Business' AND f.key = v.fkey
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- ─────────────────────────────────────────
-- 2.6 plan_features pour ENTREPRISE (toutes activées — pattern Atlas F&A Premium)
-- ─────────────────────────────────────────
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, true, '✓'
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id
WHERE p.slug = 'advist' AND pl.name = 'Entreprise'
ON CONFLICT (plan_id, feature_id) DO NOTHING;


-- ═══════════════════════════════════════════════════
-- 3. Vérifications finales (raise notice si quelque chose cloche)
-- ═══════════════════════════════════════════════════
DO $check$
DECLARE
  v_taxpilot_plans INT;
  v_advist_active_plans INT;
  v_taxpilot_pf INT;
  v_advist_pf INT;
BEGIN
  SELECT COUNT(*) INTO v_taxpilot_plans
  FROM plans pl JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'taxpilot' AND pl.active = true;

  SELECT COUNT(*) INTO v_advist_active_plans
  FROM plans pl JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'advist' AND pl.active = true;

  SELECT COUNT(*) INTO v_taxpilot_pf
  FROM plan_features pf
  JOIN plans pl ON pf.plan_id = pl.id
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'taxpilot';

  SELECT COUNT(*) INTO v_advist_pf
  FROM plan_features pf
  JOIN plans pl ON pf.plan_id = pl.id
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'advist';

  RAISE NOTICE 'LiassPilot active plans: % (expected 2)', v_taxpilot_plans;
  RAISE NOTICE 'LiassPilot plan_features: % (expected > 0)', v_taxpilot_pf;
  RAISE NOTICE 'ADVIST active plans: % (expected 2)', v_advist_active_plans;
  RAISE NOTICE 'ADVIST plan_features: % (expected > 0)', v_advist_pf;
END;
$check$;

COMMIT;
