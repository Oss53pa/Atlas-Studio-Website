-- ═══════════════════════════════════════════════════
-- ATLAS F&A — Refonte des plans Starter / Premium
-- ═══════════════════════════════════════════════════
-- Objectif :
--  1. Renommer le slug produit atlas-compta → atlas-fa
--  2. Ajouter une colonne plans.max_companies (int, -1 = illimité)
--  3. Renommer les feature keys (ex: saisie_ecritures → saisie_journaux)
--  4. Ajouter les 5 features manquantes (audit_trail_basic, budget_analytique,
--     recouvrement_balance_agee, consolidation_groupe, tableaux_bord_groupe)
--  5. Mettre à jour les plan_features pour différencier Starter et Premium
--  6. Renommer le plan interne 'Pro' → 'Premium' (et son display_name)
--
-- Idempotent : peut être rejoué sans effet de bord.
-- ═══════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────
-- 1. Ajouter la colonne max_companies sur plans
-- ─────────────────────────────────────────
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_companies INTEGER DEFAULT -1;
COMMENT ON COLUMN plans.max_companies IS 'Nombre max de sociétés par tenant. -1 = illimité.';

-- ─────────────────────────────────────────
-- 2. Renommer le slug produit atlas-compta → atlas-fa
-- ─────────────────────────────────────────
UPDATE products SET slug = 'atlas-fa' WHERE slug = 'atlas-compta';

-- ─────────────────────────────────────────
-- 3. Renommer les feature keys d'Atlas F&A
-- ─────────────────────────────────────────
-- saisie_ecritures → saisie_journaux
UPDATE features
SET key = 'saisie_journaux',
    name = 'Saisie des journaux & écritures'
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'saisie_ecritures';

-- grand_livre → grand_livre_balance
UPDATE features
SET key = 'grand_livre_balance',
    name = 'Grand livre & balance générale'
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'grand_livre';

-- lettrage → lettrage_automatique
UPDATE features
SET key = 'lettrage_automatique',
    name = 'Lettrage automatique (4 algorithmes)'
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'lettrage';

-- rapprochement → rapprochement_bancaire
UPDATE features
SET key = 'rapprochement_bancaire',
    name = 'Rapprochement bancaire'
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'rapprochement';

-- immobilisations → immobilisations_amortissements
UPDATE features
SET key = 'immobilisations_amortissements',
    name = 'Immobilisations & amortissements'
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'immobilisations';

-- stocks → stocks_cump_fifo
UPDATE features
SET key = 'stocks_cump_fifo',
    name = 'Gestion des stocks (CUMP / FIFO)'
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'stocks';

-- tresorerie → position_tresorerie (reste is_core=true, disponible pour Starter & Premium)
UPDATE features
SET key = 'position_tresorerie',
    name = 'Position de trésorerie'
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'tresorerie';

-- fiscalite → fiscalite_tva_is_imf
UPDATE features
SET key = 'fiscalite_tva_is_imf',
    name = 'Fiscalité (TVA, IS, IMF)'
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'fiscalite';

-- cloture → cloture_etats_financiers
UPDATE features
SET key = 'cloture_etats_financiers',
    name = 'Clôture & états financiers'
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'cloture';

-- proph3t_ai_advanced → proph3t_ia
UPDATE features
SET key = 'proph3t_ia',
    name = 'Proph3t IA avancé (LLM + prédictif)'
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'proph3t_ai_advanced';

-- audit_trail_complet → audit_trail_ohada_certifie
UPDATE features
SET key = 'audit_trail_ohada_certifie',
    name = 'Audit trail OHADA certifié'
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'audit_trail_complet';

-- api_rest → api_integrations
UPDATE features
SET key = 'api_integrations',
    name = 'API REST & intégrations'
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'api_rest';

-- support_prioritaire → support_dedie
UPDATE features
SET key = 'support_dedie',
    name = 'Support dédié & account manager'
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'support_prioritaire';

-- ─────────────────────────────────────────
-- 4. Insérer les 5 features manquantes
-- ─────────────────────────────────────────
INSERT INTO features (product_id, key, name, category, feature_type, is_core, sort_order)
SELECT p.id, v.key, v.name, v.category, 'boolean', false, v.sort
FROM products p, (VALUES
  ('audit_trail_basic', 'Audit trail basique',           'Sécurité',     10),
  ('budget_analytique',  'Budget & comptabilité analytique', 'Analytique',   28),
  ('recouvrement_balance_agee', 'Recouvrement & balance âgée', 'Trésorerie',  29),
  ('consolidation_groupe', 'Consolidation groupe',        'Consolidation',30),
  ('tableaux_bord_groupe', 'Tableaux de bord groupe',     'Reporting',    31)
) AS v(key, name, category, sort)
WHERE p.slug = 'atlas-fa'
ON CONFLICT (product_id, key) DO NOTHING;

-- Promouvoir audit_trail_basic en is_core=true (disponible pour Starter)
UPDATE features
SET is_core = true
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND key = 'audit_trail_basic';

-- ─────────────────────────────────────────
-- 5. Renommer le plan Pro → Premium (interne)
-- ─────────────────────────────────────────
UPDATE plans
SET name = 'Premium',
    display_name = 'Premium — Groupes & Holdings',
    description = 'Multi-sociétés illimité pour holdings et groupes',
    is_popular = false,
    max_seats = -1,
    max_companies = -1,
    price_monthly_fcfa = 250000,
    price_annual_fcfa = 2520000
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND name = 'Pro';

-- ─────────────────────────────────────────
-- 6. Mettre à jour le plan Starter (PME / TPE)
-- ─────────────────────────────────────────
UPDATE plans
SET display_name = 'Starter — PME / TPE',
    description = 'Pour les petites et moyennes entreprises',
    is_popular = true,
    max_seats = 3,
    max_companies = 1,
    price_monthly_fcfa = 49000,
    price_annual_fcfa = 499800
WHERE product_id = (SELECT id FROM products WHERE slug = 'atlas-fa')
  AND name = 'Starter';

-- ─────────────────────────────────────────
-- 7. Reset + reconfigurer plan_features pour Starter
-- ─────────────────────────────────────────
-- Supprimer les anciens mappings pour repartir propre
DELETE FROM plan_features
WHERE plan_id IN (
  SELECT pl.id FROM plans pl
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'atlas-fa' AND pl.name IN ('Starter', 'Premium')
);

-- Plan Starter — features incluses (enabled=true) et exclues (enabled=false)
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, v.enabled,
       CASE WHEN v.enabled THEN '✓' ELSE NULL END
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id,
(VALUES
  -- Incluses dans Starter
  ('saisie_journaux',                true),
  ('grand_livre_balance',            true),
  ('lettrage_automatique',           true),
  ('rapprochement_bancaire',         true),
  ('immobilisations_amortissements', true),
  ('stocks_cump_fifo',               true),
  ('position_tresorerie',            true),
  ('fiscalite_tva_is_imf',           true),
  ('cloture_etats_financiers',       true),
  ('audit_trail_basic',              true),
  -- Exclues (locked) dans Starter
  ('budget_analytique',              false),
  ('recouvrement_balance_agee',      false),
  ('proph3t_ia',                     false),
  ('multi_societes',                 false),
  ('multi_pays',                     false),
  ('devises',                        false),
  ('workflow_validation',            false),
  ('consolidation_groupe',           false),
  ('audit_trail_ohada_certifie',     false),
  ('tableaux_bord_groupe',           false),
  ('api_integrations',               false),
  ('support_dedie',                  false)
) AS v(fkey, enabled)
WHERE p.slug = 'atlas-fa' AND pl.name = 'Starter' AND f.key = v.fkey;

-- ─────────────────────────────────────────
-- 8. Plan Premium — toutes les features activées
-- ─────────────────────────────────────────
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, true, '✓'
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id
WHERE p.slug = 'atlas-fa' AND pl.name = 'Premium';

COMMIT;

-- ═══════════════════════════════════════════════════
-- Vérification post-migration (à exécuter manuellement)
-- ═══════════════════════════════════════════════════
-- SELECT pl.name, pl.display_name, pl.price_monthly_fcfa, pl.max_seats, pl.max_companies,
--        COUNT(*) FILTER (WHERE pf.enabled) AS nb_incluses,
--        COUNT(*) FILTER (WHERE NOT pf.enabled) AS nb_locked
-- FROM plans pl
-- JOIN products p ON pl.product_id = p.id
-- LEFT JOIN plan_features pf ON pf.plan_id = pl.id
-- WHERE p.slug = 'atlas-fa'
-- GROUP BY pl.id, pl.name, pl.display_name, pl.price_monthly_fcfa, pl.max_seats, pl.max_companies
-- ORDER BY pl.price_monthly_fcfa;
