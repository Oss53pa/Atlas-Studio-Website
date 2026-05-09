-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T Phase 1 — Domain L2 FINANCE / Comptabilite OHADA (10 tools)
-- ═══════════════════════════════════════════════════════════════════════════
-- Tools L2 metier (CDC §3.3) reserves au domaine 'finance' :
--   parse_grand_livre, generate_balance_sheet, generate_compte_resultat,
--   apply_benford_law, reconcile_bank_statement, compute_irpp_uemoa,
--   compute_is_uemoa, compute_cnss_contribution, validate_journal_entry,
--   detect_accounting_anomalies
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.proph3t_tools (id, level, domain, name, description, schema, is_deterministic, requires_embeddings) VALUES
  ('parse_grand_livre', 2, 'finance', 'parse_grand_livre',
   'Parse un grand livre SYSCOHADA (CSV ou JSON) en JournalEntry[]. Verifie equilibre debit/credit.',
   '{"type":"object","properties":{"format":{"type":"string","enum":["csv","json"]},"content":{"type":"string"},"decimal_separator":{"type":"string"},"thousand_separator":{"type":"string"}},"required":["format","content"]}'::jsonb,
   TRUE, FALSE),
  ('generate_balance_sheet', 2, 'finance', 'generate_balance_sheet',
   'Produit le Bilan (Actif/Passif) classe SYSCOHADA a partir des ecritures.',
   '{"type":"object","properties":{"entries":{"type":"array"},"exercice":{"type":"string"},"raison_sociale":{"type":"string"}},"required":["entries","exercice","raison_sociale"]}'::jsonb,
   TRUE, FALSE),
  ('generate_compte_resultat', 2, 'finance', 'generate_compte_resultat',
   'Produit le Compte de Resultat (Charges classe 6 / Produits classe 7).',
   '{"type":"object","properties":{"entries":{"type":"array"},"exercice":{"type":"string"},"raison_sociale":{"type":"string"}},"required":["entries","exercice","raison_sociale"]}'::jsonb,
   TRUE, FALSE),
  ('apply_benford_law', 2, 'finance', 'apply_benford_law',
   'Detecte fraude/anomalies via la loi de Benford (1er chiffre). Verdict + chi2.',
   '{"type":"object","properties":{"amounts_centimes":{"type":"array"},"min_amount_threshold":{"type":"integer"}},"required":["amounts_centimes"]}'::jsonb,
   TRUE, FALSE),
  ('reconcile_bank_statement', 2, 'finance', 'reconcile_bank_statement',
   'Rapprochement bancaire automatique : ecritures comptables vs releve bancaire.',
   '{"type":"object","properties":{"compta_entries":{"type":"array"},"bank_entries":{"type":"array"},"tolerance_days":{"type":"integer"}},"required":["compta_entries","bank_entries"]}'::jsonb,
   TRUE, FALSE),
  ('compute_irpp_uemoa', 2, 'finance', 'compute_irpp_uemoa',
   'Calcule IRPP (Impot sur le Revenu) avec bareme progressif UEMOA (CI/SN/BF a date).',
   '{"type":"object","properties":{"revenu_imposable_centimes":{"type":"string"},"pays":{"type":"string","enum":["CI","SN","BF","ML","BJ","TG","NE"]},"parts_fiscales":{"type":"number"}},"required":["revenu_imposable_centimes","pays"]}'::jsonb,
   TRUE, FALSE),
  ('compute_is_uemoa', 2, 'finance', 'compute_is_uemoa',
   'Calcule IS (Impot sur les Societes) selon taux pays UEMOA/CEMAC.',
   '{"type":"object","properties":{"benefice_imposable_centimes":{"type":"string"},"pays":{"type":"string"},"taux_reduit":{"type":"boolean"}},"required":["benefice_imposable_centimes","pays"]}'::jsonb,
   TRUE, FALSE),
  ('compute_cnss_contribution', 2, 'finance', 'compute_cnss_contribution',
   'Calcule cotisations CNSS/CNPS (salarie + employeur) avec plafond pays.',
   '{"type":"object","properties":{"salaire_brut_centimes":{"type":"string"},"pays":{"type":"string"}},"required":["salaire_brut_centimes","pays"]}'::jsonb,
   TRUE, FALSE),
  ('validate_journal_entry', 2, 'finance', 'validate_journal_entry',
   'Valide partie double + numeros de comptes SYSCOHADA + dates. Liste erreurs/warnings.',
   '{"type":"object","properties":{"entries":{"type":"array"},"current_date":{"type":"string"}},"required":["entries"]}'::jsonb,
   TRUE, FALSE),
  ('detect_accounting_anomalies', 2, 'finance', 'detect_accounting_anomalies',
   'Detecte ecritures suspectes : montants ronds, weekend, doublons, sous-seuils reglementaires.',
   '{"type":"object","properties":{"entries":{"type":"array"},"thresholds":{"type":"array"}},"required":["entries"]}'::jsonb,
   TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  schema = EXCLUDED.schema,
  domain = EXCLUDED.domain,
  is_deterministic = EXCLUDED.is_deterministic;

-- Verification
DO $$
DECLARE
  l2_count INT;
BEGIN
  SELECT COUNT(*) INTO l2_count FROM public.proph3t_tools WHERE level = 2 AND domain = 'finance';
  RAISE NOTICE 'PROPH3T L2 FINANCE: % tools actifs.', l2_count;
END $$;
