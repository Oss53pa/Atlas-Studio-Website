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
-- Reproduire pour Atlas F&A (atlas-compta)
-- ══════════════════════════════════════════

INSERT INTO plans (product_id, name, display_name, description, is_popular, price_monthly_fcfa, price_annual_fcfa, annual_discount_pct, max_seats, storage_gb, sort_order, active)
SELECT p.id, v.name, v.display_name, v.description, v.is_popular, v.monthly, v.annual, v.discount, v.seats, v.storage, v.sort, true
FROM products p, (VALUES
  ('Starter', 'PME / TPE', 'Pour les petites structures', false, 49000, 499800, 15, 5, 5, 1),
  ('Pro', 'Premium', 'Le plus complet', true, 250000, 2520000, 16, -1, 100, 2)
) AS v(name, display_name, description, is_popular, monthly, annual, discount, seats, storage, sort)
WHERE p.slug = 'atlas-compta'
ON CONFLICT DO NOTHING;

INSERT INTO features (product_id, key, name, category, feature_type, is_core, sort_order)
SELECT p.id, v.key, v.name, v.category, v.ftype, v.is_core, v.sort
FROM products p, (VALUES
  ('saisie_ecritures', 'Saisie des écritures & journaux', 'Comptabilité', 'boolean', true, 1),
  ('grand_livre', 'Grand livre & balance générale', 'Comptabilité', 'boolean', true, 2),
  ('lettrage', 'Lettrage automatique', 'Comptabilité', 'boolean', true, 3),
  ('rapprochement', 'Rapprochement bancaire', 'Comptabilité', 'boolean', true, 4),
  ('immobilisations', 'Immobilisations & amortissements', 'Immobilisations', 'boolean', true, 5),
  ('stocks', 'Gestion des stocks', 'Stocks', 'boolean', true, 6),
  ('tresorerie', 'Position de trésorerie', 'Trésorerie', 'boolean', true, 7),
  ('fiscalite', 'Fiscalité (TVA, IS, IMF)', 'Fiscalité', 'boolean', true, 8),
  ('cloture', 'Clôture & états financiers', 'Comptabilité', 'boolean', true, 9),
  ('multi_societes', 'Multi-sociétés illimité', 'Configuration', 'boolean', false, 20),
  ('multi_pays', 'Multi-pays OHADA 17 pays', 'Configuration', 'boolean', false, 21),
  ('devises', 'Opérations en devises', 'Comptabilité', 'boolean', false, 22),
  ('proph3t_ai_advanced', 'Proph3t IA avancé LLM + prédictif', 'IA', 'boolean', false, 23),
  ('workflow_validation', 'Workflow de validation & RBAC', 'Workflow', 'boolean', false, 24),
  ('audit_trail_complet', 'Audit trail complet OHADA', 'Sécurité', 'boolean', false, 25),
  ('api_rest', 'API REST & intégrations', 'API', 'boolean', false, 26),
  ('support_prioritaire', 'Support prioritaire & account manager', 'Support', 'boolean', false, 27)
) AS v(key, name, category, ftype, is_core, sort)
WHERE p.slug = 'atlas-compta'
ON CONFLICT (product_id, key) DO NOTHING;

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
