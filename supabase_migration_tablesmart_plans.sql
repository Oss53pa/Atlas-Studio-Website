-- ═══════════════════════════════════════════════════
-- TABLESMART — Configuration des plans Starter / Pro / Enterprise
-- ═══════════════════════════════════════════════════
-- Idempotent : peut être rejoué sans effet de bord.
-- Cohérent avec le pattern Atlas F&A (cf. supabase_migration_atlas_fa_plans.sql).
--
-- Étapes :
--   0. Pré-requis schéma (colonne max_companies + index uniques manquants)
--   1. Upsert produit `tablesmart`
--   2. Insérer / mettre à jour les 46 features TableSmart
--   3. Upsert les 3 plans (Starter / Pro / Enterprise)
--   4. Reset + reseed les plan_features (23 / 36 / 46 incluses)
-- ═══════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────
-- 0. Pré-requis schéma
-- ─────────────────────────────────────────
-- Colonne max_companies (équivalent max_establishments) — utilisée aussi par Atlas F&A
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_companies INTEGER DEFAULT -1;
COMMENT ON COLUMN plans.max_companies IS 'Nombre max de sociétés / établissements par tenant. -1 = illimité.';

-- Index uniques nécessaires pour les ON CONFLICT ci-dessous
CREATE UNIQUE INDEX IF NOT EXISTS features_product_key_unique
  ON public.features (product_id, key);

CREATE UNIQUE INDEX IF NOT EXISTS plans_product_name_unique
  ON public.plans (product_id, name);

-- ─────────────────────────────────────────
-- 1. Upsert produit TableSmart
-- ─────────────────────────────────────────
INSERT INTO products (slug, name, description, status, color_accent, app_url)
VALUES (
  'tablesmart',
  'TableSmart',
  'Plateforme SaaS tout-en-un pour restaurants, bars, hôtels et food courts.',
  'active',
  '#C9A84C',
  'https://tablesmart.atlas-studio.org'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = 'active',
  color_accent = EXCLUDED.color_accent,
  app_url = EXCLUDED.app_url,
  updated_at = NOW();

-- ─────────────────────────────────────────
-- 2. Insérer les 46 features TableSmart
-- ─────────────────────────────────────────
INSERT INTO features (product_id, key, name, category, feature_type, is_core, sort_order)
SELECT p.id, v.key, v.name, v.category, 'boolean', false, v.sort
FROM products p, (VALUES
  -- Service client & paiements
  ('qr_menu_commande',                'Menu digital QR code & commande client',                  'Service client',     10),
  ('paiement_mobile_money',           'Paiement Mobile Money (Orange, Wave, MTN, M-Pesa, Airtel)','Paiement',           20),
  ('paiement_carte',                  'Paiement carte bancaire (Visa, Mastercard, Stripe)',      'Paiement',           30),
  ('paiement_especes',                'Paiement espèces avec rendu monnaie',                     'Paiement',           40),
  ('split_bill_pourboire',            'Split bill & pourboire ajustable',                        'Paiement',           50),
  ('menu_layouts_3',                  'Menu — 3 layouts de base',                                'Service client',     60),
  ('multi_langues',                   'Multi-langues (FR, EN, AR, Wolof, Dyula)',                'Service client',     70),
  ('pwa_hors_ligne',                  'PWA hors-ligne (KDS + serveur)',                          'Plateforme',         80),
  ('sso_atlas_studio',                'SSO Atlas Studio inclus',                                 'Plateforme',         90),

  -- Cuisine & opérations
  ('kds_cuisine',                     'KDS cuisine temps réel',                                  'Cuisine',           100),
  ('app_serveur_notifications',       'App serveur (plan de salle, notifications)',              'Service salle',     110),
  ('commandes_manuelles',             'Commandes manuelles & saisie verbale',                    'Service salle',     120),
  ('rupture_stock_cascade',           'Rupture stock cascade (menu + serveur + client)',         'Cuisine',           130),
  ('filtre_poste',                    'Filtre par poste (chaud / froid / grill / bar)',          'Cuisine',           140),
  ('mode_rush_basic',                 'Mode rush (seuils réduits automatiques)',                 'Cuisine',           150),
  ('impression_thermique',            'Impression thermique ESC/POS (cuisine + caisse)',         'Matériel',          160),

  -- Consoles
  ('console_manager',                 'Console manager (service, stocks, rapports)',             'Console',           190),
  ('console_proprietaire',            'Console propriétaire (finances, clients, fiscalité)',     'Console',           200),
  ('console_superadmin',              'Console SuperAdmin (multi-tenant, métriques SaaS)',       'Console',           210),

  -- Fiscalité
  ('fiscalite_syscohada',             'Conformité fiscale SYSCOHADA',                            'Fiscalité',         230),
  ('tickets_fiscaux',                 'Tickets fiscaux séquentiels immuables',                   'Fiscalité',         240),
  ('tva_dynamique_basic',             'TVA dynamique (pays principal)',                          'Fiscalité',         250),
  ('tva_dynamique_multipays',         'TVA dynamique multi-pays (CI, CM, GH, MA)',               'Fiscalité',         260),

  -- Conformité & support
  ('rgpd_export',                     'RGPD : export & anonymisation 1-clic',                    'Conformité',        290),
  ('audit_trail_complet',             'Audit trail complet & logs immutables',                   'Sécurité',          300),
  ('support_email',                   'Support email',                                           'Support',           310),
  ('support_prioritaire',             'Support prioritaire',                                     'Support',           320),
  ('account_manager',                 'Account manager dédié',                                   'Support',           330),
  ('onboarding_session',              'Onboarding accompagné (1 session)',                       'Support',           340),
  ('formation_sessions',              'Formation incluse (2 sessions / an)',                     'Support',           350),

  -- Apps spécialisées
  ('app_barman',                      'App barman (tabs, bottle service, happy hour)',           'Service salle',     360),
  ('app_hotesse',                     'App hôtesse (réservations, file d''attente, check-in)',   'Service salle',     370),

  -- Réservations & commandes avancées
  ('reservations_acompte',            'Réservations avec acompte déductible',                    'Réservations',      390),
  ('precommandes_resa',               'Pré-commandes liées aux réservations',                    'Réservations',      400),
  ('commandes_groupees',              'Commandes groupées (multi-participants)',                 'Réservations',      410),

  -- Marketing, fidélité, IA
  ('cartes_cadeaux_abonnements',      'Cartes cadeaux & abonnements repas',                      'Marketing',         430),
  ('fidelite_gamification',           'Programme fidélité & badges gamification',                'Marketing',         440),
  ('campagnes_whatsapp_sms',          'Campagnes WhatsApp / SMS ciblées (RFM)',                  'Marketing',         450),
  ('nps_enquetes',                    'NPS & enquêtes satisfaction automatiques',                'Marketing',         460),
  ('proph3t_ia',                      'IA Proph3t (recommandations menu, alertes stock)',        'IA',                470),
  ('studio_personnalisation_15layouts','Studio personnalisation menu — 15 layouts premium',      'Personnalisation',  480),
  ('google_maps_instagram_api',       'Google Maps & Instagram Graph API',                       'Intégrations',      490),

  -- Multi-établissements & intégrations enterprise
  ('multi_etablissements',            'Multi-établissements & food courts',                      'Multi-tenant',      500),
  ('integrations_pos',                'Intégrations POS (Lightspeed, Square, Odoo)',             'Intégrations',      510),
  ('opera_pms',                       'Opera PMS hôtel (facturation chambre)',                   'Intégrations',      520),
  ('api_rest',                        'API REST pour intégrations sur mesure',                   'Intégrations',      530)
) AS v(key, name, category, sort)
WHERE p.slug = 'tablesmart'
ON CONFLICT (product_id, key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- ─────────────────────────────────────────
-- 3. Upsert les 3 plans
-- ─────────────────────────────────────────
-- Starter — 25 000 FCFA / mois
INSERT INTO plans (
  product_id, name, display_name, description,
  is_popular, is_custom, active, sort_order,
  price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
  max_seats, max_companies, storage_gb, api_calls_monthly
)
SELECT p.id, 'Starter', 'Starter — Restaurant indépendant',
       'Pour un établissement avec une petite équipe',
       false, false, true, 10,
       25000, 270000, 10,
       3, 1, 5, 10000
FROM products p WHERE p.slug = 'tablesmart'
ON CONFLICT (product_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_popular = EXCLUDED.is_popular,
  active = true,
  price_monthly_fcfa = EXCLUDED.price_monthly_fcfa,
  price_annual_fcfa = EXCLUDED.price_annual_fcfa,
  max_seats = EXCLUDED.max_seats,
  max_companies = EXCLUDED.max_companies,
  sort_order = EXCLUDED.sort_order;

-- Pro — 75 000 FCFA / mois (populaire)
INSERT INTO plans (
  product_id, name, display_name, description,
  is_popular, is_custom, active, sort_order,
  price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
  max_seats, max_companies, storage_gb, api_calls_monthly
)
SELECT p.id, 'Pro', 'Pro — Restaurant en croissance',
       'Pour un établissement qui veut digitaliser toute sa relation client',
       true, false, true, 20,
       75000, 810000, 10,
       -1, 1, 50, 100000
FROM products p WHERE p.slug = 'tablesmart'
ON CONFLICT (product_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_popular = EXCLUDED.is_popular,
  active = true,
  price_monthly_fcfa = EXCLUDED.price_monthly_fcfa,
  price_annual_fcfa = EXCLUDED.price_annual_fcfa,
  max_seats = EXCLUDED.max_seats,
  max_companies = EXCLUDED.max_companies,
  sort_order = EXCLUDED.sort_order;

-- Enterprise — 200 000 FCFA / mois
INSERT INTO plans (
  product_id, name, display_name, description,
  is_popular, is_custom, active, sort_order,
  price_monthly_fcfa, price_annual_fcfa, annual_discount_pct,
  max_seats, max_companies, storage_gb, api_calls_monthly
)
SELECT p.id, 'Enterprise', 'Enterprise — Groupes & food courts',
       'Multi-établissements illimité, intégrations POS / PMS, support dédié',
       false, false, true, 30,
       200000, 2160000, 10,
       -1, -1, 500, 1000000
FROM products p WHERE p.slug = 'tablesmart'
ON CONFLICT (product_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_popular = EXCLUDED.is_popular,
  active = true,
  price_monthly_fcfa = EXCLUDED.price_monthly_fcfa,
  price_annual_fcfa = EXCLUDED.price_annual_fcfa,
  max_seats = EXCLUDED.max_seats,
  max_companies = EXCLUDED.max_companies,
  sort_order = EXCLUDED.sort_order;

-- ─────────────────────────────────────────
-- 4. Reset des plan_features TableSmart
-- ─────────────────────────────────────────
DELETE FROM plan_features
WHERE plan_id IN (
  SELECT pl.id FROM plans pl
  JOIN products p ON pl.product_id = p.id
  WHERE p.slug = 'tablesmart' AND pl.name IN ('Starter', 'Pro', 'Enterprise')
);

-- ─────────────────────────────────────────
-- 5. Plan Starter — features incluses (true) et locked (false)
-- ─────────────────────────────────────────
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, v.enabled,
       CASE WHEN v.enabled THEN '✓' ELSE NULL END
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id,
(VALUES
  ('qr_menu_commande',                 true),
  ('paiement_mobile_money',            true),
  ('paiement_carte',                   true),
  ('paiement_especes',                 true),
  ('split_bill_pourboire',             true),
  ('kds_cuisine',                      true),
  ('app_serveur_notifications',        true),
  ('commandes_manuelles',              true),
  ('rupture_stock_cascade',            true),
  ('filtre_poste',                     true),
  ('mode_rush_basic',                  true),
  ('console_manager',                  true),
  ('console_proprietaire',             true),
  ('fiscalite_syscohada',              true),
  ('tickets_fiscaux',                  true),
  ('tva_dynamique_basic',              true),
  ('impression_thermique',             true),
  ('pwa_hors_ligne',                   true),
  ('multi_langues',                    true),
  ('rgpd_export',                      true),
  ('sso_atlas_studio',                 true),
  ('support_email',                    true),
  ('menu_layouts_3',                   true),
  ('app_barman',                       false),
  ('app_hotesse',                      false),
  ('reservations_acompte',             false),
  ('precommandes_resa',                false),
  ('commandes_groupees',               false),
  ('cartes_cadeaux_abonnements',       false),
  ('fidelite_gamification',            false),
  ('campagnes_whatsapp_sms',           false),
  ('nps_enquetes',                     false),
  ('proph3t_ia',                       false),
  ('studio_personnalisation_15layouts',false),
  ('google_maps_instagram_api',        false),
  ('multi_etablissements',             false),
  ('console_superadmin',               false),
  ('integrations_pos',                 false),
  ('opera_pms',                        false),
  ('api_rest',                         false),
  ('audit_trail_complet',              false),
  ('tva_dynamique_multipays',          false),
  ('support_prioritaire',              false),
  ('account_manager',                  false),
  ('formation_sessions',               false),
  ('onboarding_session',               false)
) AS v(fkey, enabled)
WHERE p.slug = 'tablesmart' AND pl.name = 'Starter' AND f.key = v.fkey;

-- ─────────────────────────────────────────
-- 6. Plan Pro — Starter + 13 features additionnelles
-- ─────────────────────────────────────────
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, v.enabled,
       CASE WHEN v.enabled THEN '✓' ELSE NULL END
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id,
(VALUES
  ('qr_menu_commande',                 true),
  ('paiement_mobile_money',            true),
  ('paiement_carte',                   true),
  ('paiement_especes',                 true),
  ('split_bill_pourboire',             true),
  ('kds_cuisine',                      true),
  ('app_serveur_notifications',        true),
  ('commandes_manuelles',              true),
  ('rupture_stock_cascade',            true),
  ('filtre_poste',                     true),
  ('mode_rush_basic',                  true),
  ('console_manager',                  true),
  ('console_proprietaire',             true),
  ('fiscalite_syscohada',              true),
  ('tickets_fiscaux',                  true),
  ('tva_dynamique_basic',              true),
  ('impression_thermique',             true),
  ('pwa_hors_ligne',                   true),
  ('multi_langues',                    true),
  ('rgpd_export',                      true),
  ('sso_atlas_studio',                 true),
  ('support_email',                    true),
  ('menu_layouts_3',                   true),
  ('app_barman',                       true),
  ('app_hotesse',                      true),
  ('reservations_acompte',             true),
  ('precommandes_resa',                true),
  ('commandes_groupees',               true),
  ('cartes_cadeaux_abonnements',       true),
  ('fidelite_gamification',            true),
  ('campagnes_whatsapp_sms',           true),
  ('nps_enquetes',                     true),
  ('proph3t_ia',                       true),
  ('studio_personnalisation_15layouts',true),
  ('google_maps_instagram_api',        true),
  ('onboarding_session',               true),
  ('multi_etablissements',             false),
  ('console_superadmin',               false),
  ('integrations_pos',                 false),
  ('opera_pms',                        false),
  ('api_rest',                         false),
  ('audit_trail_complet',              false),
  ('tva_dynamique_multipays',          false),
  ('support_prioritaire',              false),
  ('account_manager',                  false),
  ('formation_sessions',               false)
) AS v(fkey, enabled)
WHERE p.slug = 'tablesmart' AND pl.name = 'Pro' AND f.key = v.fkey;

-- ─────────────────────────────────────────
-- 7. Plan Enterprise — TOUTES les features activées
-- ─────────────────────────────────────────
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, true, '✓'
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id
WHERE p.slug = 'tablesmart' AND pl.name = 'Enterprise';

COMMIT;

-- ═══════════════════════════════════════════════════
-- Vérification post-migration (à exécuter manuellement)
-- ═══════════════════════════════════════════════════
-- SELECT pl.name, pl.display_name, pl.price_monthly_fcfa,
--        pl.max_seats, pl.max_companies,
--        COUNT(*) FILTER (WHERE pf.enabled) AS nb_incluses,
--        COUNT(*) FILTER (WHERE NOT pf.enabled) AS nb_locked
-- FROM plans pl
-- JOIN products p ON pl.product_id = p.id
-- LEFT JOIN plan_features pf ON pf.plan_id = pl.id
-- WHERE p.slug = 'tablesmart'
-- GROUP BY pl.id, pl.name, pl.display_name, pl.price_monthly_fcfa,
--          pl.max_seats, pl.max_companies, pl.sort_order
-- ORDER BY pl.sort_order;
--
-- Résultat attendu :
--   Starter    | 25 000  | seats=3   | companies=1   | nb_incluses=23 | nb_locked=23
--   Pro        | 75 000  | seats=-1  | companies=1   | nb_incluses=36 | nb_locked=10
--   Enterprise | 200 000 | seats=-1  | companies=-1  | nb_incluses=46 | nb_locked=0
