-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T Phase 3 — DOCUMENTAIRE (5) + AUDIT (5) + TRESORERIE (5) + COMMERCIAL (5)
-- = 20 tools L2 supplementaires
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.proph3t_tools (id, level, domain, name, description, schema, is_deterministic, requires_embeddings) VALUES
  -- DOCUMENTAIRE L2
  ('classify_document', 2, 'documentaire', 'classify_document',
   'Classification automatique d''un document (facture, contrat, releve, etc.) via heuristiques.',
   '{"type":"object","properties":{"text_content":{"type":"string"},"threshold":{"type":"number"}},"required":["text_content"]}'::jsonb, TRUE, FALSE),
  ('extract_document_metadata', 2, 'documentaire', 'extract_document_metadata',
   'Extrait dates, montants, emails, telephones, RIB, parties d''un document texte.',
   '{"type":"object","properties":{"text_content":{"type":"string"},"expected_doc_type":{"type":"string"}},"required":["text_content"]}'::jsonb, TRUE, FALSE),
  ('compute_legal_retention', 2, 'documentaire', 'compute_legal_retention',
   'Duree de conservation legale OHADA selon type de document.',
   '{"type":"object","properties":{"document_type":{"type":"string"},"date_creation":{"type":"string"}},"required":["document_type","date_creation"]}'::jsonb, TRUE, FALSE),
  ('detect_document_duplicates', 2, 'documentaire', 'detect_document_duplicates',
   'Detection doublons par hash exact + metadata + similarite Jaccard.',
   '{"type":"object","properties":{"documents":{"type":"array"},"similarity_threshold":{"type":"number"}},"required":["documents"]}'::jsonb, TRUE, FALSE),
  ('generate_archive_index', 2, 'documentaire', 'generate_archive_index',
   'Index d''archivage CSV/JSON avec retention legale calculee.',
   '{"type":"object","properties":{"documents":{"type":"array"},"format":{"type":"string","enum":["csv","json"]}},"required":["documents"]}'::jsonb, TRUE, FALSE),

  -- AUDIT L2
  ('compute_audit_sample', 2, 'audit', 'compute_audit_sample',
   'Echantillonnage audit ISA 530 : taille + selection (systematique/aleatoire/ciblee montants).',
   '{"type":"object","properties":{"population_size":{"type":"integer"},"confidence_level":{"type":"number"},"expected_error_rate":{"type":"number"},"tolerable_error_rate":{"type":"number"},"selection_method":{"type":"string"},"amounts_centimes":{"type":"array"}},"required":["population_size"]}'::jsonb, TRUE, FALSE),
  ('compute_materiality', 2, 'audit', 'compute_materiality',
   'Seuil de signification ISA 320 (5% resultat / 1% CA / 1% capitaux).',
   '{"type":"object","properties":{"resultat_avant_impot_centimes":{"type":"string"},"ca_total_centimes":{"type":"string"},"capitaux_propres_centimes":{"type":"string"},"approche":{"type":"string","enum":["resultat","ca","capitaux"]}}}'::jsonb, TRUE, FALSE),
  ('test_balance_general', 2, 'audit', 'test_balance_general',
   'Controle equilibre balance + soldes anormaux (411 crediteur, 401 debiteur) + coherence GL.',
   '{"type":"object","properties":{"balance":{"type":"array"},"grand_livre":{"type":"array"}},"required":["balance"]}'::jsonb, TRUE, FALSE),
  ('analyze_variance_interperiode', 2, 'audit', 'analyze_variance_interperiode',
   'Analyse variations significatives entre N et N-1 (% et valeur absolue).',
   '{"type":"object","properties":{"exercice_n":{"type":"array"},"exercice_n_minus_1":{"type":"array"},"seuil_variation_pct":{"type":"number"},"seuil_variation_centimes":{"type":"string"}},"required":["exercice_n","exercice_n_minus_1"]}'::jsonb, TRUE, FALSE),
  ('score_internal_control', 2, 'audit', 'score_internal_control',
   'Score controle interne sur 100 selon criteres COSO (5 categories).',
   '{"type":"object","properties":{"responses":{"type":"array"}},"required":["responses"]}'::jsonb, TRUE, FALSE),

  -- TRESORERIE L2
  ('forecast_cashflow', 2, 'tresorerie', 'forecast_cashflow',
   'Prevision tresorerie 13 semaines avec alertes passages en negatif.',
   '{"type":"object","properties":{"solde_initial_centimes":{"type":"string"},"encaissements":{"type":"array"},"decaissements":{"type":"array"},"horizon_semaines":{"type":"integer"}},"required":["solde_initial_centimes","encaissements","decaissements"]}'::jsonb, TRUE, FALSE),
  ('compute_decouvert_cost', 2, 'tresorerie', 'compute_decouvert_cost',
   'Cout total decouvert bancaire (interets + CPFD + frais) + TEG calcule.',
   '{"type":"object","properties":{"montant_decouvert_centimes":{"type":"string"},"duree_jours":{"type":"integer"},"taux_decouvert_annuel":{"type":"number"},"cpfd_pct":{"type":"number"},"frais_fixes_centimes":{"type":"string"}},"required":["montant_decouvert_centimes","duree_jours"]}'::jsonb, TRUE, FALSE),
  ('compute_escompte_commercial', 2, 'tresorerie', 'compute_escompte_commercial',
   'Escompte commercial pour paiement anticipe + decision recommandee vs placement.',
   '{"type":"object","properties":{"valeur_nominale_centimes":{"type":"string"},"taux_escompte_pct":{"type":"number"},"jours_avant_echeance":{"type":"integer"},"taux_placement_alternatif_pct":{"type":"number"}},"required":["valeur_nominale_centimes","taux_escompte_pct","jours_avant_echeance"]}'::jsonb, TRUE, FALSE),
  ('compute_factoring_cost', 2, 'tresorerie', 'compute_factoring_cost',
   'Cout affacturage (commission + financement + retenue garantie) + taux effectif.',
   '{"type":"object","properties":{"montant_creance_centimes":{"type":"string"},"jours_avant_echeance":{"type":"integer"},"commission_factoring_pct":{"type":"number"},"taux_financement_annuel_pct":{"type":"number"},"retenue_garantie_pct":{"type":"number"}},"required":["montant_creance_centimes","jours_avant_echeance","commission_factoring_pct","taux_financement_annuel_pct","retenue_garantie_pct"]}'::jsonb, TRUE, FALSE),
  ('score_bank_health', 2, 'tresorerie', 'score_bank_health',
   'Score sante banque partenaire (5 criteres ponderes) + niveau + recommandation.',
   '{"type":"object","properties":{"bank_name":{"type":"string"},"criteria":{"type":"object"}},"required":["bank_name","criteria"]}'::jsonb, TRUE, FALSE),

  -- COMMERCIAL L2
  ('score_lead', 2, 'commercial', 'score_lead',
   'Score lead BANT (Budget/Authority/Need/Timeline) + classement hot/warm/cold.',
   '{"type":"object","properties":{"budget_confirme":{"type":"boolean"},"budget_centimes":{"type":"string"},"decideur_identifie":{"type":"boolean"},"besoin_exprime":{"type":"string","enum":["vague","qualifie","urgent"]},"timeline_mois":{"type":"integer"},"industrie_strategique":{"type":"boolean"},"taille_entreprise":{"type":"string","enum":["TPE","PME","ETI","GE"]}},"required":["budget_confirme","decideur_identifie","besoin_exprime"]}'::jsonb, TRUE, FALSE),
  ('compute_commission', 2, 'commercial', 'compute_commission',
   'Commission commerciale paliers progressifs + bonus quota et overperformance.',
   '{"type":"object","properties":{"ca_realise_centimes":{"type":"string"},"quota_centimes":{"type":"string"},"paliers":{"type":"array"},"bonus_quota_pct":{"type":"number"},"bonus_overperformance_seuil_pct":{"type":"number"},"bonus_overperformance_pct":{"type":"number"}},"required":["ca_realise_centimes","quota_centimes","paliers"]}'::jsonb, TRUE, FALSE),
  ('forecast_pipeline', 2, 'commercial', 'forecast_pipeline',
   'Prevision CA pondere (montant × proba stage) + breakdown par stage et par mois.',
   '{"type":"object","properties":{"opportunites":{"type":"array"},"periode_mois":{"type":"integer"},"stages_overrides":{"type":"object"}},"required":["opportunites"]}'::jsonb, TRUE, FALSE),
  ('score_churn_risk', 2, 'commercial', 'score_churn_risk',
   'Risque churn 0-100 (recence + baisse activite + tickets + renouvellement) + actions.',
   '{"type":"object","properties":{"derniere_commande_jours":{"type":"integer"},"frequence_actuelle":{"type":"number"},"frequence_baseline":{"type":"number"},"tickets_critiques_ouverts":{"type":"integer"},"jours_avant_renouvellement":{"type":"integer"},"rdv_planifie":{"type":"boolean"}},"required":["derniere_commande_jours","frequence_actuelle","frequence_baseline"]}'::jsonb, TRUE, FALSE),
  ('analyze_customer_segment', 2, 'commercial', 'analyze_customer_segment',
   'Segmentation RFM (Recence/Frequence/Montant) en quintiles + segments champions/loyaux/a_risque.',
   '{"type":"object","properties":{"clients":{"type":"array"},"periode_jours":{"type":"integer"}},"required":["clients"]}'::jsonb, TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  schema = EXCLUDED.schema,
  domain = EXCLUDED.domain,
  is_deterministic = EXCLUDED.is_deterministic;

DO $$
DECLARE
  l1 INT; l2 INT;
BEGIN
  SELECT COUNT(*) INTO l1 FROM public.proph3t_tools WHERE level = 1;
  SELECT COUNT(*) INTO l2 FROM public.proph3t_tools WHERE level = 2;
  RAISE NOTICE 'PROPH3T total : % L1 + % L2 = % tools', l1, l2, l1 + l2;
END $$;
