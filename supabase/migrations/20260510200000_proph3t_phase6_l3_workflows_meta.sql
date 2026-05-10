-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T Phase 6 — L3 app-specific (20) + Workflows v2 (3) + Meta-tools (3)
-- ═══════════════════════════════════════════════════════════════════════════
-- L3 :
--   cockpit-fa : 8 tools (KPI dashboard, cycles breaks, DSO forecast, GL summary,
--     clos exercice, amortissements, ecart inventaire, situation intermediaire)
--   wisehr     : 6 tools (paie batch, transport, heures supp, avenant, STC, masse sal)
--   duedeck    : 6 tools (lettre affirmation, risk matrix, round-tripping,
--     substantive test, JET ISA 240, audit report)
--
-- Workflows v2 (orchestres) :
--   workflow_closing_annuel  : cloture annuelle complete
--   workflow_paie_mensuelle  : paie batch + parafiscales + projection
--   workflow_audit_juridique : creation + capital + clauses + risques + IC
--
-- Meta-tools (universels niveau 1) :
--   load_domain_tools : chargement dynamique tools par domaine
--   list_available_tools : liste de tous les tools sans schemas
--   describe_tool : details + schema d'un tool
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.proph3t_tools (id, level, domain, app_id, name, description, schema, is_deterministic, requires_embeddings) VALUES
  -- L3 cockpit-fa (8)
  ('compute_kpi_dashboard', 3, 'finance', 'cockpit-fa', 'compute_kpi_dashboard', 'Dashboard KPI Cockpit FA.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('detect_cycle_breaks', 3, 'finance', 'cockpit-fa', 'detect_cycle_breaks', 'Detection ruptures sequence numerique pieces.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('forecast_dso_evolution', 3, 'finance', 'cockpit-fa', 'forecast_dso_evolution', 'Projection DSO + tendance.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_grand_livre_summary', 3, 'finance', 'cockpit-fa', 'compute_grand_livre_summary', 'Synthese GL + agregation classes.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('validate_clos_exercice', 3, 'finance', 'cockpit-fa', 'validate_clos_exercice', 'Checklist conformite cloture.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_immobilisations_amortissements', 3, 'finance', 'cockpit-fa', 'compute_immobilisations_amortissements', 'Amortissements lineaires/degressifs.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('detect_ecart_inventaire', 3, 'finance', 'cockpit-fa', 'detect_ecart_inventaire', 'Ecarts stock comptable vs physique.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('generate_situation_intermediaire', 3, 'finance', 'cockpit-fa', 'generate_situation_intermediaire', 'Situation comptable proforma.', '{"type":"object"}'::jsonb, TRUE, FALSE),

  -- L3 wisehr (6)
  ('compute_paie_batch', 3, 'rh', 'wisehr', 'compute_paie_batch', 'Batch fiches paie.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_indemnite_transport', 3, 'rh', 'wisehr', 'compute_indemnite_transport', 'Transport exoneree vs imposable.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_heures_supp', 3, 'rh', 'wisehr', 'compute_heures_supp', 'Heures supp avec majorations legales.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('validate_avenant_salaire', 3, 'rh', 'wisehr', 'validate_avenant_salaire', 'Check coherence avenant.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_solde_tout_compte', 3, 'rh', 'wisehr', 'compute_solde_tout_compte', 'Solde de tout compte rupture.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('forecast_masse_salariale', 3, 'rh', 'wisehr', 'forecast_masse_salariale', 'Projection masse salariale annuelle.', '{"type":"object"}'::jsonb, TRUE, FALSE),

  -- L3 duedeck (6)
  ('generate_lettre_affirmation', 3, 'audit', 'duedeck', 'generate_lettre_affirmation', 'Lettre affirmation client.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_risk_assessment_matrix', 3, 'audit', 'duedeck', 'compute_risk_assessment_matrix', 'Matrice risques ISA 315.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('detect_round_tripping', 3, 'audit', 'duedeck', 'detect_round_tripping', 'Detection schemas circulaires.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_substantive_test', 3, 'audit', 'duedeck', 'compute_substantive_test', 'Tests substantifs bilan.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('analyze_journal_entries_anomalies', 3, 'audit', 'duedeck', 'analyze_journal_entries_anomalies', 'JET ISA 240.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('generate_audit_report', 3, 'audit', 'duedeck', 'generate_audit_report', 'Rapport audit avec opinion.', '{"type":"object"}'::jsonb, TRUE, FALSE),

  -- Workflows v2 (3)
  ('workflow_closing_annuel', 2, 'workflows', NULL, 'workflow_closing_annuel', 'Cloture annuelle complete.', '{"type":"object"}'::jsonb, FALSE, FALSE),
  ('workflow_paie_mensuelle', 2, 'workflows', NULL, 'workflow_paie_mensuelle', 'Paie mensuelle complete.', '{"type":"object"}'::jsonb, FALSE, FALSE),
  ('workflow_audit_juridique', 2, 'workflows', NULL, 'workflow_audit_juridique', 'Audit juridique complet.', '{"type":"object"}'::jsonb, FALSE, FALSE),

  -- Meta-tools (3)
  ('load_domain_tools', 1, NULL, NULL, 'load_domain_tools', 'META : retourne tools d un domaine.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('list_available_tools', 1, NULL, NULL, 'list_available_tools', 'META : liste tous tools regroupes par domaine.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('describe_tool', 1, NULL, NULL, 'describe_tool', 'META : details + schema d un tool.', '{"type":"object"}'::jsonb, TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description, schema = EXCLUDED.schema,
  domain = EXCLUDED.domain, app_id = EXCLUDED.app_id, level = EXCLUDED.level;
