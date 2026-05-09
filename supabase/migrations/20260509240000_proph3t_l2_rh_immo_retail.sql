-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T Phase 2 — L2 RH (10) + IMMOBILIER (5) + RETAIL (5) = 20 tools
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.proph3t_tools (id, level, domain, name, description, schema, is_deterministic, requires_embeddings) VALUES
  -- ─── RH L2 ───
  ('compute_smig', 2, 'rh', 'compute_smig',
   'Retourne le SMIG mensuel/horaire d''un pays UEMOA/CEMAC.',
   '{"type":"object","properties":{"pays":{"type":"string"},"type":{"type":"string","enum":["mensuel","horaire"]}},"required":["pays"]}'::jsonb, TRUE, FALSE),
  ('compute_salaire_net', 2, 'rh', 'compute_salaire_net',
   'Calcule salaire net (brut - cotisations CNSS salarie - ITS/IUTS).',
   '{"type":"object","properties":{"salaire_brut_centimes":{"type":"string"},"pays":{"type":"string"},"enfants_a_charge":{"type":"integer"}},"required":["salaire_brut_centimes","pays"]}'::jsonb, TRUE, FALSE),
  ('compute_iuts', 2, 'rh', 'compute_iuts',
   'Calcule IUTS (Impot Unique sur Traitements Salaires) Burkina Faso.',
   '{"type":"object","properties":{"salaire_brut_centimes":{"type":"string"}},"required":["salaire_brut_centimes"]}'::jsonb, TRUE, FALSE),
  ('compute_its', 2, 'rh', 'compute_its',
   'Calcule ITS (Impot sur Traitements et Salaires) UEMOA bareme progressif.',
   '{"type":"object","properties":{"salaire_imposable_centimes":{"type":"string"},"pays":{"type":"string"}},"required":["salaire_imposable_centimes","pays"]}'::jsonb, TRUE, FALSE),
  ('compute_taxes_parafiscales', 2, 'rh', 'compute_taxes_parafiscales',
   'Calcule taxes parafiscales (FDFP CI, FNAEF SN, TPA BF, etc.).',
   '{"type":"object","properties":{"salaire_brut_centimes":{"type":"string"},"pays":{"type":"string"}},"required":["salaire_brut_centimes","pays"]}'::jsonb, TRUE, FALSE),
  ('compute_conges_payes', 2, 'rh', 'compute_conges_payes',
   'Calcule conges payes acquis (2.5j/mois) et indemnite solde.',
   '{"type":"object","properties":{"salaire_mensuel_brut_centimes":{"type":"string"},"mois_travailles":{"type":"integer"},"jours_deja_pris":{"type":"integer"}},"required":["salaire_mensuel_brut_centimes","mois_travailles"]}'::jsonb, TRUE, FALSE),
  ('compute_indemnite_licenciement', 2, 'rh', 'compute_indemnite_licenciement',
   'Indemnite legale licenciement OHADA (30/35/40% selon anciennete, plafond 12 mois).',
   '{"type":"object","properties":{"salaire_moyen_centimes":{"type":"string"},"annees_anciennete":{"type":"number"},"pays":{"type":"string"}},"required":["salaire_moyen_centimes","annees_anciennete"]}'::jsonb, TRUE, FALSE),
  ('compute_prime_anciennete', 2, 'rh', 'compute_prime_anciennete',
   'Prime anciennete progressive (2-25%) convention collective UEMOA.',
   '{"type":"object","properties":{"salaire_base_centimes":{"type":"string"},"annees_anciennete":{"type":"number"}},"required":["salaire_base_centimes","annees_anciennete"]}'::jsonb, TRUE, FALSE),
  ('generate_fiche_paie', 2, 'rh', 'generate_fiche_paie',
   'Fiche de paie complete : lignes brut, retenues, net, cout employeur.',
   '{"type":"object","properties":{"salarie":{"type":"object"},"periode":{"type":"string"},"pays":{"type":"string"},"salaire_base_centimes":{"type":"string"},"primes_centimes":{"type":"string"},"heures_supp_centimes":{"type":"string"},"annees_anciennete":{"type":"number"}},"required":["salarie","periode","pays","salaire_base_centimes"]}'::jsonb, TRUE, FALSE),
  ('simulate_embauche_cost', 2, 'rh', 'simulate_embauche_cost',
   'Cout total employeur d''une embauche (bruts + cotisations + parafiscales) sur N mois.',
   '{"type":"object","properties":{"salaire_brut_mensuel_centimes":{"type":"string"},"pays":{"type":"string"},"duree_mois":{"type":"integer"}},"required":["salaire_brut_mensuel_centimes","pays"]}'::jsonb, TRUE, FALSE),

  -- ─── IMMOBILIER L2 ───
  ('compute_loyer_revise', 2, 'immobilier', 'compute_loyer_revise',
   'Indexation loyer via IRL ou inflation BCEAO/BEAC fallback.',
   '{"type":"object","properties":{"loyer_actuel_centimes":{"type":"string"},"irl_initial":{"type":"number"},"irl_actuel":{"type":"number"},"inflation_pct":{"type":"number"}},"required":["loyer_actuel_centimes"]}'::jsonb, TRUE, FALSE),
  ('compute_depot_garantie', 2, 'immobilier', 'compute_depot_garantie',
   'Depot de garantie selon usage et pays OHADA.',
   '{"type":"object","properties":{"loyer_mensuel_centimes":{"type":"string"},"usage":{"type":"string","enum":["habitation","commercial","bureau","autre"]},"pays":{"type":"string"}},"required":["loyer_mensuel_centimes","usage"]}'::jsonb, TRUE, FALSE),
  ('compute_taxe_fonciere', 2, 'immobilier', 'compute_taxe_fonciere',
   'Taxe fonciere bati/non-bati par pays UEMOA.',
   '{"type":"object","properties":{"valeur_locative_annuelle_centimes":{"type":"string"},"pays":{"type":"string"},"type":{"type":"string","enum":["bati","non_bati"]}},"required":["valeur_locative_annuelle_centimes","pays","type"]}'::jsonb, TRUE, FALSE),
  ('compute_charges_copropriete', 2, 'immobilier', 'compute_charges_copropriete',
   'Repartition des charges copropriete au tantieme (millieme).',
   '{"type":"object","properties":{"charges_annuelles_totales_centimes":{"type":"string"},"lots":{"type":"array"},"cles_repartition":{"type":"array"}},"required":["charges_annuelles_totales_centimes","lots"]}'::jsonb, TRUE, FALSE),
  ('compute_rendement_locatif', 2, 'immobilier', 'compute_rendement_locatif',
   'Rendement locatif brut/net annuel (vacance + charges + taxe fonciere).',
   '{"type":"object","properties":{"prix_achat_centimes":{"type":"string"},"frais_acquisition_centimes":{"type":"string"},"loyer_mensuel_centimes":{"type":"string"},"charges_annuelles_centimes":{"type":"string"},"taxe_fonciere_centimes":{"type":"string"},"vacance_locative_pct":{"type":"number"}},"required":["prix_achat_centimes","loyer_mensuel_centimes"]}'::jsonb, TRUE, FALSE),

  -- ─── RETAIL L2 ───
  ('compute_marge_brute', 2, 'retail', 'compute_marge_brute',
   'Marge brute commerciale (CA - cout achat) + taux + interpretation par secteur.',
   '{"type":"object","properties":{"ca_ht_centimes":{"type":"string"},"cout_achat_marchandises_centimes":{"type":"string"}},"required":["ca_ht_centimes","cout_achat_marchandises_centimes"]}'::jsonb, TRUE, FALSE),
  ('compute_taux_marque', 2, 'retail', 'compute_taux_marque',
   'Taux marque vs taux marge + coefficient multiplicateur.',
   '{"type":"object","properties":{"prix_achat_centimes":{"type":"string"},"prix_vente_centimes":{"type":"string"}},"required":["prix_achat_centimes","prix_vente_centimes"]}'::jsonb, TRUE, FALSE),
  ('compute_rotation_stocks', 2, 'retail', 'compute_rotation_stocks',
   'Rotation stocks et duree moyenne stockage.',
   '{"type":"object","properties":{"ca_ou_achats_centimes":{"type":"string"},"stock_debut_centimes":{"type":"string"},"stock_fin_centimes":{"type":"string"}},"required":["ca_ou_achats_centimes","stock_debut_centimes","stock_fin_centimes"]}'::jsonb, TRUE, FALSE),
  ('compute_point_mort', 2, 'retail', 'compute_point_mort',
   'Seuil de rentabilite (CA et quantite). CF / Taux marge sur CV.',
   '{"type":"object","properties":{"charges_fixes_centimes":{"type":"string"},"ca_total_centimes":{"type":"string"},"charges_variables_centimes":{"type":"string"},"prix_vente_unitaire_centimes":{"type":"string"}},"required":["charges_fixes_centimes","ca_total_centimes","charges_variables_centimes"]}'::jsonb, TRUE, FALSE),
  ('compute_panier_moyen', 2, 'retail', 'compute_panier_moyen',
   'Panier moyen + frequence achat + LTV client.',
   '{"type":"object","properties":{"ca_total_centimes":{"type":"string"},"nb_transactions":{"type":"integer"},"nb_clients_uniques":{"type":"integer"},"duree_retention_annees":{"type":"number"},"marge_brute_pct":{"type":"number"}},"required":["ca_total_centimes","nb_transactions","nb_clients_uniques"]}'::jsonb, TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  schema = EXCLUDED.schema,
  domain = EXCLUDED.domain,
  is_deterministic = EXCLUDED.is_deterministic;

DO $$
DECLARE
  l2_count INT;
BEGIN
  SELECT COUNT(*) INTO l2_count FROM public.proph3t_tools WHERE level = 2;
  RAISE NOTICE 'PROPH3T L2 total : % tools (FINANCE + RH + IMMOBILIER + RETAIL)', l2_count;
END $$;
