-- ═══════════════════════════════════════════════════
-- ATLAS STUDIO — SEEDS PLANS & FEATURES
-- Pour toutes les applications du catalogue
-- ═══════════════════════════════════════════════════

-- ── PLANS ADVIST ──

INSERT INTO plans (product_id, name, display_name, description, is_popular, price_monthly_fcfa, price_annual_fcfa, annual_discount_pct, max_seats, storage_gb, sort_order, active)
SELECT p.id, v.name, v.display_name, v.description, v.is_popular, v.monthly, v.annual, v.discount, v.seats, v.storage, v.sort, true
FROM products p, (VALUES
  ('Starter', 'Starter — Essentiel', 'Idéal pour démarrer', false, 15000, 152100, 15, 3, 1, 1),
  ('Pro', 'Pro — Croissance', 'Le plus populaire', true, 35000, 352800, 16, 10, 10, 2),
  ('Enterprise', 'Enterprise — Sur mesure', 'Pour les grandes équipes', false, 0, 0, 18, -1, 100, 3)
) AS v(name, display_name, description, is_popular, monthly, annual, discount, seats, storage, sort)
WHERE p.slug = 'advist'
ON CONFLICT DO NOTHING;

-- ── FEATURES ADVIST ──

INSERT INTO features (product_id, key, name, category, feature_type, limit_unit, is_core, sort_order)
SELECT p.id, v.key, v.name, v.category, v.ftype, v.unit, v.is_core, v.sort
FROM products p, (VALUES
  ('document_import', 'Import de documents', 'Documents', 'boolean', NULL, true, 1),
  ('basic_workflow', 'Circuit de validation simple', 'Workflow', 'boolean', NULL, true, 2),
  ('email_notifications', 'Notifications email', 'Notifications', 'boolean', NULL, true, 3),
  ('audit_trail', 'Piste d''audit basique', 'Sécurité', 'boolean', NULL, true, 4),
  ('documents_per_month', 'Documents soumis par mois', 'Documents', 'limit', 'documents', false, 10),
  ('storage_gb', 'Stockage', 'Documents', 'limit', 'Go', false, 11),
  ('workflow_steps', 'Étapes par circuit', 'Workflow', 'limit', 'étapes', false, 12),
  ('external_validators', 'Validateurs externes', 'Workflow', 'limit', 'validateurs', false, 13),
  ('advanced_workflow', 'Circuits parallèles et conditionnels', 'Workflow', 'boolean', NULL, false, 20),
  ('qualified_signature', 'Signature électronique qualifiée', 'Signature', 'boolean', NULL, false, 21),
  ('bulk_send', 'Envoi en masse', 'Documents', 'boolean', NULL, false, 22),
  ('custom_templates', 'Modèles personnalisés', 'Workflow', 'boolean', NULL, false, 23),
  ('proph3t_ai', 'PROPH3T — Assistant IA', 'IA', 'boolean', NULL, false, 26),
  ('api_access', 'Accès API REST', 'API', 'boolean', NULL, false, 30),
  ('sso_saml', 'SSO / SAML', 'Sécurité', 'boolean', NULL, false, 31),
  ('dedicated_support', 'Support dédié SLA 4h', 'Support', 'boolean', NULL, false, 32),
  ('white_label', 'White-label', 'Configuration', 'boolean', NULL, false, 35)
) AS v(key, name, category, ftype, unit, is_core, sort)
WHERE p.slug = 'advist'
ON CONFLICT (product_id, key) DO NOTHING;

-- ── PLAN_FEATURES ADVIST — Starter ──

INSERT INTO plan_features (plan_id, feature_id, enabled, limit_value, limit_unit, display_value)
SELECT pl.id, f.id, v.enabled, v.lv, v.lu, v.dv
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id,
(VALUES
  ('documents_per_month', true, 50, 'documents', '50 docs/mois'),
  ('storage_gb', true, 1, 'Go', '1 Go'),
  ('workflow_steps', true, 5, 'étapes', '5 étapes max'),
  ('external_validators', true, 2, 'validateurs', '2 externes'),
  ('advanced_workflow', false, NULL, NULL, NULL),
  ('qualified_signature', false, NULL, NULL, NULL),
  ('bulk_send', false, NULL, NULL, NULL),
  ('custom_templates', false, NULL, NULL, NULL),
  ('proph3t_ai', false, NULL, NULL, NULL),
  ('api_access', false, NULL, NULL, NULL),
  ('sso_saml', false, NULL, NULL, NULL),
  ('dedicated_support', false, NULL, NULL, NULL),
  ('white_label', false, NULL, NULL, NULL)
) AS v(fkey, enabled, lv, lu, dv)
WHERE p.slug = 'advist' AND pl.name = 'Starter' AND f.key = v.fkey
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- ── PLAN_FEATURES ADVIST — Pro ──

INSERT INTO plan_features (plan_id, feature_id, enabled, limit_value, limit_unit, display_value)
SELECT pl.id, f.id, v.enabled, v.lv, v.lu, v.dv
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id,
(VALUES
  ('documents_per_month', true, NULL, 'documents', 'Illimité'),
  ('storage_gb', true, 10, 'Go', '10 Go'),
  ('workflow_steps', true, NULL, 'étapes', 'Illimité'),
  ('external_validators', true, NULL, 'validateurs', 'Illimité'),
  ('advanced_workflow', true, NULL, NULL, '✓'),
  ('qualified_signature', true, NULL, NULL, '✓'),
  ('bulk_send', true, NULL, NULL, '✓'),
  ('custom_templates', true, NULL, NULL, '✓'),
  ('proph3t_ai', true, NULL, NULL, '✓'),
  ('api_access', false, NULL, NULL, NULL),
  ('sso_saml', false, NULL, NULL, NULL),
  ('dedicated_support', false, NULL, NULL, NULL),
  ('white_label', false, NULL, NULL, NULL)
) AS v(fkey, enabled, lv, lu, dv)
WHERE p.slug = 'advist' AND pl.name = 'Pro' AND f.key = v.fkey
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- ── PLAN_FEATURES ADVIST — Enterprise ──

INSERT INTO plan_features (plan_id, feature_id, enabled, limit_value, limit_unit, display_value)
SELECT pl.id, f.id, true, NULL, NULL, CASE WHEN f.feature_type = 'limit' THEN 'Illimité' ELSE '✓' END
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id
WHERE p.slug = 'advist' AND pl.name = 'Enterprise' AND f.is_core = false
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- ══════════════════════════════════════════
-- Atlas F&A (slug: atlas-fa)
-- Starter — PME / TPE : 49k FCFA/mois, 1 société, 3 utilisateurs
-- Premium — Groupes & Holdings : 250k FCFA/mois, illimité
-- ══════════════════════════════════════════

INSERT INTO plans (product_id, name, display_name, description, is_popular, price_monthly_fcfa, price_annual_fcfa, annual_discount_pct, max_seats, max_companies, storage_gb, sort_order, active)
SELECT p.id, v.name, v.display_name, v.description, v.is_popular, v.monthly, v.annual, v.discount, v.seats, v.companies, v.storage, v.sort, true
FROM products p, (VALUES
  ('Starter', 'Starter — PME / TPE',            'Pour les petites et moyennes entreprises', true,  49000,  499800,  15,  3,  1,   5, 1),
  ('Premium', 'Premium — Groupes & Holdings',  'Multi-sociétés illimité pour holdings et groupes', false, 250000, 2520000, 16, -1, -1, 100, 2)
) AS v(name, display_name, description, is_popular, monthly, annual, discount, seats, companies, storage, sort)
WHERE p.slug = 'atlas-fa'
ON CONFLICT DO NOTHING;

INSERT INTO features (product_id, key, name, category, feature_type, is_core, sort_order)
SELECT p.id, v.key, v.name, v.category, 'boolean', v.is_core, v.sort
FROM products p, (VALUES
  -- Features core (incluses dans Starter)
  ('saisie_journaux',                'Saisie des journaux & écritures',     'Comptabilité',     true,  1),
  ('grand_livre_balance',            'Grand livre & balance générale',      'Comptabilité',     true,  2),
  ('lettrage_automatique',           'Lettrage automatique (4 algorithmes)', 'Comptabilité',    true,  3),
  ('rapprochement_bancaire',         'Rapprochement bancaire',              'Trésorerie',       true,  4),
  ('immobilisations_amortissements', 'Immobilisations & amortissements',    'Immobilisations',  true,  5),
  ('stocks_cump_fifo',               'Gestion des stocks (CUMP / FIFO)',    'Stocks',           true,  6),
  ('position_tresorerie',            'Position de trésorerie',              'Trésorerie',       true,  7),
  ('fiscalite_tva_is_imf',           'Fiscalité (TVA, IS, IMF)',            'Fiscalité',        true,  8),
  ('cloture_etats_financiers',       'Clôture & états financiers',          'Comptabilité',     true,  9),
  ('audit_trail_basic',              'Audit trail basique',                 'Sécurité',         true, 10),
  -- Features locked (Premium uniquement)
  ('budget_analytique',              'Budget & comptabilité analytique',    'Analytique',       false, 20),
  ('recouvrement_balance_agee',      'Recouvrement & balance âgée',         'Trésorerie',       false, 21),
  ('proph3t_ia',                     'Proph3t IA avancé (LLM + prédictif)', 'IA',               false, 22),
  ('multi_societes',                 'Multi-sociétés illimité',             'Configuration',    false, 23),
  ('multi_pays',                     'Multi-pays OHADA 17 pays',            'Configuration',    false, 24),
  ('devises',                        'Opérations en devises',               'Comptabilité',     false, 25),
  ('workflow_validation',            'Workflow de validation & RBAC',       'Workflow',         false, 26),
  ('consolidation_groupe',           'Consolidation groupe',                'Consolidation',    false, 27),
  ('audit_trail_ohada_certifie',     'Audit trail OHADA certifié',          'Sécurité',         false, 28),
  ('tableaux_bord_groupe',           'Tableaux de bord groupe',             'Reporting',        false, 29),
  ('api_integrations',               'API REST & intégrations',             'API',              false, 30),
  ('support_dedie',                  'Support dédié & account manager',     'Support',          false, 31)
) AS v(key, name, category, is_core, sort)
WHERE p.slug = 'atlas-fa'
ON CONFLICT (product_id, key) DO NOTHING;

-- ── PLAN_FEATURES ATLAS F&A — Starter ──
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, v.enabled, CASE WHEN v.enabled THEN '✓' ELSE NULL END
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id,
(VALUES
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
WHERE p.slug = 'atlas-fa' AND pl.name = 'Starter' AND f.key = v.fkey
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- ── PLAN_FEATURES ATLAS F&A — Premium (tout activé) ──
INSERT INTO plan_features (plan_id, feature_id, enabled, display_value)
SELECT pl.id, f.id, true, '✓'
FROM plans pl
JOIN products p ON pl.product_id = p.id
JOIN features f ON f.product_id = p.id
WHERE p.slug = 'atlas-fa' AND pl.name = 'Premium'
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- ══════════════════════════════════════════
-- Liass'Pilot (taxpilot)
-- ══════════════════════════════════════════

INSERT INTO plans (product_id, name, display_name, description, is_popular, price_monthly_fcfa, price_annual_fcfa, annual_discount_pct, max_seats, storage_gb, sort_order, active)
SELECT p.id, v.name, v.display_name, v.description, v.is_popular, v.monthly, v.annual, v.discount, v.seats, v.storage, v.sort, true
FROM products p, (VALUES
  ('Starter', 'Entreprise — 1 société', 'Pour une entreprise', false, 0, 250000, 0, 3, 2, 1),
  ('Pro', 'Cabinet — illimité', 'Pour les cabinets comptables', true, 0, 1500000, 0, -1, 50, 2)
) AS v(name, display_name, description, is_popular, monthly, annual, discount, seats, storage, sort)
WHERE p.slug = 'taxpilot'
ON CONFLICT DO NOTHING;

INSERT INTO features (product_id, key, name, category, feature_type, is_core, sort_order)
SELECT p.id, v.key, v.name, v.category, v.ftype, v.is_core, v.sort
FROM products p, (VALUES
  ('import_balance', 'Import balance CSV & Excel', 'Import', 'boolean', true, 1),
  ('plan_comptable', 'Plan comptable SYSCOHADA révisé', 'Comptabilité', 'boolean', true, 2),
  ('bilan', 'Bilan Actif & Passif complet', 'États', 'boolean', true, 3),
  ('compte_resultat', 'Compte de résultat & 9 SIG', 'États', 'boolean', true, 4),
  ('tafire', 'TAFIRE / TFT', 'États', 'boolean', true, 5),
  ('notes_annexes', '18 notes annexes calculées', 'États', 'boolean', true, 6),
  ('controles', '129 contrôles Proph3t', 'IA', 'boolean', true, 7),
  ('passage_fiscal', 'Passage fiscal automatique', 'Fiscalité', 'boolean', true, 8),
  ('export_excel', 'Export Excel 84 onglets', 'Export', 'boolean', true, 9),
  ('multi_pays', 'Multi-pays OHADA (17 pays)', 'Configuration', 'boolean', false, 20),
  ('secteurs_specialises', 'Secteurs spécialisés (banque, assurance)', 'Configuration', 'boolean', false, 21),
  ('e_invoicing', 'E-Invoicing (UBL 2.1, PEPPOL)', 'Export', 'boolean', false, 22),
  ('xml_teledeclaration', 'XML télédéclaration (DSF, DAS)', 'Fiscalité', 'boolean', false, 23),
  ('audit_workflow', 'Audit trail & workflow', 'Sécurité', 'boolean', false, 24)
) AS v(key, name, category, ftype, is_core, sort)
WHERE p.slug = 'taxpilot'
ON CONFLICT (product_id, key) DO NOTHING;
