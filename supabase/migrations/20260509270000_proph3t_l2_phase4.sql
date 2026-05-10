-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T Phase 4 — FISCAL (5) + JURIDIQUE (5) + MARKETING (5) = 15 tools
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.proph3t_tools (id, level, domain, name, description, schema, is_deterministic, requires_embeddings) VALUES
  -- FISCAL L2
  ('compute_irvm', 2, 'fiscal', 'compute_irvm', 'IRVM (Impot Revenus Valeurs Mobilieres) selon pays et residence beneficiaire.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_droit_enregistrement', 2, 'fiscal', 'compute_droit_enregistrement', 'Droits d''enregistrement (cession parts, vente immo, augmentation capital, bail).', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_minimum_forfaitaire', 2, 'fiscal', 'compute_minimum_forfaitaire', 'Impot Minimum Forfaitaire IMF.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('forecast_dsf', 2, 'fiscal', 'forecast_dsf', 'Projection DSF annuelle agreges (IS + IMF + IRVM).', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_credit_tva', 2, 'fiscal', 'compute_credit_tva', 'Credit TVA + eligibilite remboursement.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  -- JURIDIQUE L2
  ('compute_capital_minimum', 2, 'juridique', 'compute_capital_minimum', 'Capital minimum legal selon forme juridique OHADA.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('validate_societe_creation', 2, 'juridique', 'validate_societe_creation', 'Checklist conformite formalites creation societe OHADA.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('forecast_ag_quorum', 2, 'juridique', 'forecast_ag_quorum', 'Quorum AGO/AGE et majorite requise selon AUSCGIE.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_mise_demeure_delai', 2, 'juridique', 'compute_mise_demeure_delai', 'Delai mise en demeure + interets retard + indemnite.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('analyze_contract_clauses', 2, 'juridique', 'analyze_contract_clauses', 'Analyse clauses-types + score completude.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  -- MARKETING L2
  ('compute_cac_ltv_ratio', 2, 'marketing', 'compute_cac_ltv_ratio', 'CAC + LTV + ratio LTV/CAC + payback period.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_campaign_roi', 2, 'marketing', 'compute_campaign_roi', 'ROI/ROAS d''une campagne marketing.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('ab_test_significance', 2, 'marketing', 'ab_test_significance', 'Significativite statistique A/B test (Z-test 2 proportions).', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_conversion_funnel', 2, 'marketing', 'compute_conversion_funnel', 'Analyse entonnoir + drop-off + bottleneck.', '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('forecast_growth_compound', 2, 'marketing', 'forecast_growth_compound', 'Projection croissance composee mensuelle.', '{"type":"object"}'::jsonb, TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, schema = EXCLUDED.schema, domain = EXCLUDED.domain;

DO $$
DECLARE l1 INT; l2 INT;
BEGIN
  SELECT COUNT(*) INTO l1 FROM public.proph3t_tools WHERE level = 1;
  SELECT COUNT(*) INTO l2 FROM public.proph3t_tools WHERE level = 2;
  RAISE NOTICE 'PROPH3T total : % L1 + % L2 = % tools', l1, l2, l1 + l2;
END $$;
