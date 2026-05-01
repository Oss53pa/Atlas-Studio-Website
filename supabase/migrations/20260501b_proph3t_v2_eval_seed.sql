-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T v2 — Eval set OHADA (seed initial)
-- 10 questions de référence pour bootstrap, à étendre à 100 avec un expert.
-- Cible CDC §5.2: 30 SYSCOHADA + 20 analyse fin + 20 fiscal + 15 droit + 15 cas.
-- ═══════════════════════════════════════════════════════════════════════════

-- Table dédiée: questions de référence (séparée de proph3t_eval_runs qui stocke
-- les RÉSULTATS des évaluations). Cette table contient le QUESTIONNAIRE.
CREATE TABLE IF NOT EXISTS proph3t_eval_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_version TEXT NOT NULL DEFAULT 'ohada-v0.1',
  category TEXT NOT NULL CHECK (category IN (
    'syscohada','analyse_financiere','fiscal_ohada','droit_audcif','cas_pratique'
  )),
  question TEXT NOT NULL,
  reference_answer TEXT NOT NULL,
  acceptance_keywords TEXT[] DEFAULT '{}',   -- mots-clés requis dans la réponse
  forbidden_keywords TEXT[] DEFAULT '{}',    -- termes qui invalident la réponse
  expected_sources TEXT[] DEFAULT '{}',      -- ex: 'AUDCIF-Art.X','SYSCOHADA-Class7'
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  validated_by TEXT,                         -- nom de l'expert-comptable validateur
  validated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE proph3t_eval_questions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_proph3t_eval_q_category
  ON proph3t_eval_questions(set_version, category);

-- ─── 10 questions seed (à valider/compléter par expert-comptable OHADA) ─────

INSERT INTO proph3t_eval_questions (category, question, reference_answer, acceptance_keywords, expected_sources, difficulty) VALUES

-- SYSCOHADA (3 questions sur 30 cibles)
('syscohada',
 'Dans le SYSCOHADA révisé, dans quelle classe se trouvent les comptes de stocks ?',
 'Les comptes de stocks sont en classe 3 du SYSCOHADA révisé (3 = stocks et en-cours). Comprend notamment 31 marchandises, 32 matières premières, 33 autres approvisionnements, 34 produits en cours, 35 services en cours, 36 produits finis, 37 stocks de marchandises en consignation, 38 stocks en cours de route.',
 ARRAY['classe 3','stocks','SYSCOHADA'],
 ARRAY['SYSCOHADA-Classe3'],
 'easy'),

('syscohada',
 'Quelle est la différence entre les comptes 6031 et 6033 du SYSCOHADA ?',
 '6031 = Variations des stocks de marchandises ; 6033 = Variations des stocks d''autres approvisionnements (emballages, fournitures). Les deux sont des comptes de variation de stocks au compte de résultat, mais 6031 concerne les marchandises destinées à la revente et 6033 les approvisionnements consommables.',
 ARRAY['variations','stocks','marchandises','approvisionnements'],
 ARRAY['SYSCOHADA-Classe6'],
 'medium'),

('syscohada',
 'Comment comptabiliser une provision pour congés payés selon SYSCOHADA ?',
 'Débit 6614 « Charges sociales sur congés à payer » ou 6611 selon nature, crédit 4282 « Personnel - Dettes provisionnées pour congés à payer ». La provision est calculée sur la base des droits acquis et non pris à la date de clôture. Charge à étaler ou non selon principe de spécialisation des exercices.',
 ARRAY['4282','provision','congés','dettes provisionnées'],
 ARRAY['SYSCOHADA-Art.42','AUDCIF'],
 'medium'),

-- ANALYSE FINANCIÈRE (2 questions sur 20)
('analyse_financiere',
 'Quelle est la formule du Besoin en Fonds de Roulement (BFR) selon SYSCOHADA ?',
 'BFR = Actif circulant d''exploitation - Passif circulant d''exploitation. En détail SYSCOHADA : BFR = (Stocks + Créances clients + Autres créances d''exploitation) - (Dettes fournisseurs + Dettes fiscales et sociales d''exploitation + Autres dettes d''exploitation). Ne pas inclure trésorerie ni dettes financières.',
 ARRAY['BFR','actif circulant','passif circulant','stocks','créances'],
 ARRAY['SYSCOHADA-AnalyseFin'],
 'medium'),

('analyse_financiere',
 'Comment interpréter un Z-Score d''Altman inférieur à 1,8 ?',
 'Un Z-Score d''Altman < 1,8 indique une zone de détresse financière : risque élevé de faillite à 2 ans. Entre 1,8 et 3 = zone grise (incertain). > 3 = zone de sécurité. Pour une PME africaine, on adapte souvent les pondérations (Z'' modifié). Recommandation : analyser BFR, autonomie financière et capacité de remboursement en complément.',
 ARRAY['Z-Score','Altman','détresse','faillite','1.8','1,8'],
 ARRAY['Altman1968','SYSCOHADA-Ratios'],
 'hard'),

-- FISCAL OHADA (2 questions sur 20)
('fiscal_ohada',
 'Quel est le taux de TVA standard en Côte d''Ivoire et comment le déclarer ?',
 'Taux standard TVA Côte d''Ivoire = 18 %. Déclaration mensuelle DGI via formulaire e-impôts avant le 15 du mois suivant. Liquidation : TVA collectée - TVA déductible. Pour les biens d''exportation, taux 0 %. Pour certains produits de première nécessité, exonération (annexe Code Général des Impôts).',
 ARRAY['18','%','TVA','Côte d''Ivoire','mensuel','15'],
 ARRAY['CGI-CI-237','DGI'],
 'easy'),

('fiscal_ohada',
 'Comment se calcule l''Impôt sur les Sociétés (IS) au Sénégal pour une PME ?',
 'IS Sénégal : taux normal 30 % du résultat fiscal. PME (chiffre d''affaires < 250 M FCFA) bénéficie d''un taux réduit 25 %. Acomptes trimestriels 25 % de l''IS de l''exercice précédent. Solde à régulariser au 30 avril N+1. Régime simplifié (CGE) pour les très petites entreprises avec base CA.',
 ARRAY['30','25','IS','Sénégal','PME'],
 ARRAY['CGI-SN-IS'],
 'medium'),

-- DROIT AUDCIF (2 questions sur 15)
('droit_audcif',
 'Quels sont les états financiers obligatoires selon AUDCIF pour une SARL en système normal ?',
 'AUDCIF système normal exige : (1) Bilan, (2) Compte de résultat, (3) TAFIRE (Tableau financier des ressources et emplois), (4) Notes annexes obligatoires. Délai de dépôt : 30 juin de l''année N+1 au registre du commerce. Audit obligatoire si 2 critères dépassés sur 3 : total bilan > 250 M FCFA, CA > 500 M, effectif > 50.',
 ARRAY['bilan','compte de résultat','TAFIRE','notes','annexes'],
 ARRAY['AUDCIF-Art.7','AUDCIF-Art.13'],
 'medium'),

('droit_audcif',
 'Quelle est la durée légale de conservation des pièces comptables OHADA ?',
 'Selon AUDCIF (Acte Uniforme révisé 2017) : conservation 10 ans pour les documents comptables (livres, pièces justificatives, états financiers). Conservation 30 ans pour titres de propriété. Conservation indéfinie pour statuts. Format papier ou électronique sécurisé acceptés. Sanction non-conservation : amendes + responsabilité pénale dirigeant.',
 ARRAY['10','ans','conservation','AUDCIF','pièces comptables'],
 ARRAY['AUDCIF-Art.24'],
 'easy'),

-- CAS PRATIQUE (1 question sur 15)
('cas_pratique',
 'Une société de retail au Cameroun a un CA de 800M FCFA, un BFR de 200M et une trésorerie négative de -50M. Quel diagnostic et quelles 3 actions prioritaires ?',
 'Diagnostic : BFR de 25 % du CA est élevé pour le retail (norme 10-15 %). Trésorerie négative confirme tension. Actions : (1) Réduire stocks via inventaire tournant et juste-à-temps fournisseurs, (2) Négocier délais fournisseurs (passer de 30 à 60 jours), (3) Affacturage ou escompte créances clients pour libérer 30-50M de trésorerie. Suivi mensuel BFR/CA, objectif descendre à 15 %.',
 ARRAY['BFR','trésorerie','stocks','fournisseurs','affacturage'],
 ARRAY['SYSCOHADA-AnalyseFin','BCEAO'],
 'hard');
