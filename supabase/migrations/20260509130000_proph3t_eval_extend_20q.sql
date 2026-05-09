-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T — Eval set OHADA : table + 20 questions
-- ═══════════════════════════════════════════════════════════════════════════
-- Crée proph3t_eval_questions si pas déjà là (migration 20260501b avait été skip).
CREATE TABLE IF NOT EXISTS proph3t_eval_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_version TEXT NOT NULL DEFAULT 'ohada-v0.1',
  category TEXT NOT NULL CHECK (category IN (
    'syscohada','analyse_financiere','fiscal_ohada','droit_audcif','cas_pratique'
  )),
  question TEXT NOT NULL,
  reference_answer TEXT NOT NULL,
  acceptance_keywords TEXT[] DEFAULT '{}',
  forbidden_keywords TEXT[] DEFAULT '{}',
  expected_sources TEXT[] DEFAULT '{}',
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  validated_by TEXT,
  validated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE proph3t_eval_questions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_proph3t_eval_q_category
  ON proph3t_eval_questions(set_version, category);


-- Étend proph3t_eval_questions avec 20 questions calibrées pour le profil
-- réel des users Cockpit F&A (DAF / contrôleurs de gestion / dirigeants)
-- et Advist (juristes / experts-comptables).
--
-- Mix par niveau :
--   - 8 easy   (réponses factuelles, classes de comptes, taux fiscaux)
--   - 8 medium (analyse ratio, écritures spécifiques, interprétation)
--   - 4 hard   (cas pratique, raisonnement multi-étapes)
--
-- Mix par catégorie :
--   - syscohada       : 6 questions
--   - analyse_fin     : 5 questions
--   - fiscal_ohada    : 5 questions
--   - droit_audcif    : 2 questions
--   - cas_pratique    : 2 questions
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO proph3t_eval_questions (set_version, category, question, reference_answer, acceptance_keywords, expected_sources, difficulty) VALUES

-- ═══════ SYSCOHADA (6) ═══════
('ohada-v0.2','syscohada',
 'Quel est le compte SYSCOHADA pour enregistrer un achat de marchandises ?',
 'Compte 601 « Achats de marchandises » (classe 6, charges). Subdivision : 6011 marchandises A, 6012 marchandises B selon nature. Au crédit : 401 fournisseurs ou 521 banque. La TVA déductible (4452) est isolée si le redevable. Pour stocks tenus en inventaire intermittent : variation de stocks via 6031.',
 ARRAY['601','marchandises','classe 6','401'],
 ARRAY['SYSCOHADA-Classe6'], 'easy'),

('ohada-v0.2','syscohada',
 'Quelle est la classe SYSCOHADA des comptes de capitaux propres ?',
 'Classe 1 = Comptes de ressources durables. Inclut : 10 capital, 11 réserves, 12 report à nouveau, 13 résultat net, 14 subventions d''investissement, 15 provisions réglementées, 16 emprunts et dettes, 17 dettes de location-financement, 18 dettes liées aux participations, 19 provisions financières pour risques.',
 ARRAY['classe 1','capital','réserves','ressources durables'],
 ARRAY['SYSCOHADA-Classe1'], 'easy'),

('ohada-v0.2','syscohada',
 'Comment comptabiliser une dotation aux amortissements d''immobilisation ?',
 'Débit 681 « Dotations aux amortissements d''exploitation » (sous-comptes selon nature : 6811 immo incorporelles, 6813 immo corporelles), Crédit 28X « Amortissements des immobilisations » (281 incorporelles, 283 corporelles, 284 financières). La dotation est calculée selon plan d''amortissement (linéaire, dégressif, fiscal accéléré).',
 ARRAY['681','28','dotation','amortissement'],
 ARRAY['SYSCOHADA-Classe2','SYSCOHADA-Classe6'], 'medium'),

('ohada-v0.2','syscohada',
 'Quelle est la différence entre les comptes 411 et 416 ?',
 '411 = Clients (créances normales sur ventes en cours, exigibles à terme convenu). 416 = Clients douteux ou litigieux (créances dont le recouvrement est compromis). Transfert de 411 vers 416 dès qu''une difficulté de recouvrement est identifiée. Le 416 fait souvent l''objet d''une dépréciation (491 « Dépréciations des comptes clients »).',
 ARRAY['411','416','clients','douteux','dépréciation'],
 ARRAY['SYSCOHADA-Classe4'], 'medium'),

('ohada-v0.2','syscohada',
 'Comment enregistrer une cession d''immobilisation amortissable ?',
 'Étape 1 : Sortie du bien : Débit 81 « Valeurs comptables des cessions d''immobilisations », Débit 28X (amortissements cumulés), Crédit 2X (valeur brute). Étape 2 : Constatation du prix de cession : Débit 485 ou 521, Crédit 82 « Produits des cessions d''immobilisations ». Le résultat de cession (82-81) apparaît au compte de résultat hors-exploitation.',
 ARRAY['81','82','28','cession','immobilisation'],
 ARRAY['SYSCOHADA-Classe2','SYSCOHADA-Classe8'], 'hard'),

('ohada-v0.2','syscohada',
 'Quel compte utilise-t-on pour les charges de personnel salaires bruts ?',
 'Compte 661 « Rémunérations directes versées au personnel national ». Subdivisions : 6611 appointements salaires et commissions, 6612 primes et gratifications, 6613 congés payés, 6614 indemnités et avantages divers, 6617 sursalaires. Le 662 est pour personnel non national (expatrié).',
 ARRAY['661','salaires','rémunérations','personnel'],
 ARRAY['SYSCOHADA-Classe6'], 'easy'),

-- ═══════ ANALYSE FINANCIÈRE (5) ═══════
('ohada-v0.2','analyse_financiere',
 'Comment calcule-t-on le Fonds de Roulement (FR) ?',
 'FR = Ressources stables - Emplois stables = (Capitaux propres + Dettes financières long terme) - Actif immobilisé net. Indique la marge de sécurité financière à long terme. FR positif = ressources stables couvrent les emplois stables. FR négatif = financement de l''immobilisation par du court terme (situation à risque).',
 ARRAY['fonds de roulement','FR','ressources stables','actif immobilisé'],
 ARRAY['SYSCOHADA-AnalyseFin'], 'easy'),

('ohada-v0.2','analyse_financiere',
 'Qu''est-ce que la Capacité d''Autofinancement (CAF) ?',
 'CAF = Résultat net + Dotations aux amortissements et provisions - Reprises sur amortissements/provisions - Plus-values de cession + Moins-values de cession. Mesure la trésorerie potentiellement dégagée par l''activité. Sert à : rembourser dettes, financer investissements, distribuer dividendes. Ratio clé : CAF / CA (norme 5-15% selon secteur).',
 ARRAY['CAF','autofinancement','résultat','dotations','reprises'],
 ARRAY['SYSCOHADA-AnalyseFin'], 'medium'),

('ohada-v0.2','analyse_financiere',
 'Mon ratio d''autonomie financière est de 0,25 — est-ce bon ?',
 'Autonomie financière = Capitaux propres / Total bilan. 0,25 = 25% de fonds propres. C''est faible : la norme SYSCOHADA recommande > 30%, optimale > 40%. Risque : forte dépendance bancaire, vulnérabilité en cas de retournement. Actions : augmentation de capital, mise en réserve des bénéfices, consolidation de la dette long terme. Comparer au benchmark sectoriel avant conclusion.',
 ARRAY['autonomie','25','30','capitaux propres','faible'],
 ARRAY['SYSCOHADA-Ratios'], 'medium'),

('ohada-v0.2','analyse_financiere',
 'Comment interpréter un délai client (DSO) de 90 jours ?',
 'DSO 90 jours = les clients paient en moyenne à 3 mois. Élevé pour la plupart des secteurs (norme 30-60 jours en B2B SYSCOHADA). Conséquences : trésorerie tendue, BFR gonflé. Causes possibles : politique commerciale laxiste, secteur public, qualité des relances. Actions : conditions générales de vente strictes, escompte pour paiement rapide (2% à 10j), affacturage, factoring DUAS pour export.',
 ARRAY['DSO','délai client','90','trésorerie','BFR'],
 ARRAY['SYSCOHADA-Ratios'], 'medium'),

('ohada-v0.2','analyse_financiere',
 'Quelle est la formule de l''EBE (Excédent Brut d''Exploitation) selon SYSCOHADA ?',
 'EBE = Valeur ajoutée + Subventions d''exploitation - Impôts et taxes - Charges de personnel. La VA elle-même = Marge brute - Autres consommations externes. EBE mesure la performance économique avant amortissements et politique financière. Indicateur clé pour benchmarker le pricing power et l''efficacité opérationnelle. Norme variable selon secteur (10% en distribution, 25%+ en services).',
 ARRAY['EBE','valeur ajoutée','charges personnel','impôts','subventions'],
 ARRAY['SYSCOHADA-SIG'], 'hard'),

-- ═══════ FISCAL OHADA (5) ═══════
('ohada-v0.2','fiscal_ohada',
 'Quels sont les taux IS dans la zone UEMOA ?',
 'Taux IS 2026 par pays UEMOA : Côte d''Ivoire 25% (PME) / 30% (normal), Sénégal 30% (taux unique), Burkina Faso 27,5%, Mali 30%, Bénin 30%, Togo 27%, Niger 30% (dont contribution 1,5%), Guinée-Bissau 25%. Acomptes trimestriels généralisés. Dépôt déclaration : 30 avril N+1 ou 31 mai selon pays.',
 ARRAY['IS','25','30','UEMOA','Côte d''Ivoire','Sénégal'],
 ARRAY['CGI-CI','CGI-SN','UEMOA'], 'medium'),

('ohada-v0.2','fiscal_ohada',
 'Qu''est-ce que la patente et qui doit la payer en Côte d''Ivoire ?',
 'Patente = impôt local sur l''activité commerciale, industrielle et libérale. En Côte d''Ivoire : assujettissement obligatoire pour toute personne physique/morale exerçant une activité économique. Calcul : (1) droit fixe selon secteur + (2) droit proportionnel sur valeur locative. Exonérations : agriculteurs, ONG, professions exemptées par CGI. Paiement avant 31 mars. Régime simplifié pour CA < 50M FCFA.',
 ARRAY['patente','Côte d''Ivoire','droit fixe','droit proportionnel'],
 ARRAY['CGI-CI-Patente'], 'easy'),

('ohada-v0.2','fiscal_ohada',
 'Comment fonctionne la retenue à la source sur les prestations étrangères ?',
 'Retenue à la source applicable aux paiements à des prestataires non-résidents (logiciel, conseil, royalties, intérêts). Taux variable selon convention fiscale et type de revenu. En Côte d''Ivoire : 25% par défaut, réductions via conventions (10-15% UEMOA, 0% France pour certains revenus selon convention). À retenir par le débiteur lors du paiement et reverser au fisc au plus tard le 15 du mois suivant.',
 ARRAY['retenue source','25','non-résident','convention'],
 ARRAY['CGI-CI-RAS'], 'hard'),

('ohada-v0.2','fiscal_ohada',
 'Quelle est la différence entre amortissement comptable et amortissement fiscal ?',
 'Amortissement comptable = constaté selon plan SYSCOHADA, basé sur durée d''utilisation économique. Amortissement fiscal = celui admis en déduction par l''administration, plafonné par les durées fiscales du CGI (ex. véhicules : 4 ans CI, ordinateurs 3 ans, immeubles 20 ans). Si comptable > fiscal → réintégration extra-comptable du surplus dans la liasse fiscale. Si comptable < fiscal → possibilité d''amortissement dérogatoire (compte 151).',
 ARRAY['amortissement comptable','fiscal','réintégration','plan'],
 ARRAY['CGI','SYSCOHADA-Classe2'], 'hard'),

('ohada-v0.2','fiscal_ohada',
 'Quelles sont les obligations TVA mensuelles d''une entreprise au régime du réel ?',
 'Régime du réel TVA (CA > 50M FCFA en CI) : (1) Tenir livre des achats et ventes avec TVA séparée, (2) Émettre factures conformes (mention TVA, n°IFU, etc.), (3) Déposer déclaration mensuelle e-impôts avant le 15 du mois N+1, (4) Liquider TVA collectée - TVA déductible, (5) Reverser le solde dû. Tout crédit de TVA est reporté sauf demande de remboursement (export, immo neuf).',
 ARRAY['TVA','mensuel','réel','15','collectée','déductible'],
 ARRAY['CGI-CI-TVA'], 'medium'),

-- ═══════ DROIT AUDCIF (2) ═══════
('ohada-v0.2','droit_audcif',
 'Quelles sont les sanctions en cas de non-tenue de comptabilité régulière ?',
 'AUDCIF (Acte Uniforme révisé 2017) prévoit : (1) Sanctions civiles : nullité des actes, responsabilité civile dirigeants envers tiers et associés, (2) Sanctions pénales : amendes (5M-25M FCFA selon Art. 891 ss), peines d''emprisonnement pour comptabilité fictive ou défaut volontaire, (3) Sanctions fiscales : redressement avec majoration jusqu''à 100% droits éludés, (4) Refus de quitus en AG, mise en examen possible.',
 ARRAY['sanctions','pénales','amendes','responsabilité','dirigeants'],
 ARRAY['AUDCIF-Art.891'], 'medium'),

('ohada-v0.2','droit_audcif',
 'Qui peut être commissaire aux comptes pour une SARL OHADA ?',
 'AUDCIF Art. 376 : CAC obligatoire pour SARL si 2 critères dépassés sur 3 (total bilan > 250M, CA > 500M, effectif > 50). Conditions : (1) Être expert-comptable inscrit au tableau de l''ordre du pays OHADA concerné, (2) Indépendance vis-à-vis de la société (incompatibilités Art. 700), (3) Mandat de 6 ans renouvelable, (4) Désigné en AG par associés ou par décision de justice. Honoraires fixés par barème de l''ordre.',
 ARRAY['commissaire','CAC','SARL','expert-comptable','indépendance'],
 ARRAY['AUDCIF-Art.376','AUDCIF-Art.700'], 'medium'),

-- ═══════ CAS PRATIQUE (2) ═══════
('ohada-v0.2','cas_pratique',
 'Une PME de services a un EBE de 50M FCFA, des intérêts de 8M, des amortissements de 12M, et un IS de 9M. Quel est le résultat net et que peut-on en dire ?',
 'Résultat net = EBE - Amortissements - Intérêts - IS = 50 - 12 - 8 - 9 = 21M FCFA. Marge nette dépend du CA (non donné), à comparer. Points : (1) Charge financière de 8M sur EBE 50M = 16% — élevé, signe d''endettement important, (2) IS 9M = 30% du résultat avant impôt (30M), conforme au taux normal Côte d''Ivoire, (3) CAF estimée = RN + Dotations = 21 + 12 = 33M, capacité d''autofinancement saine. Recommandation : analyser ratio dette/CAF (idéal < 4 ans).',
 ARRAY['résultat net','EBE','21','CAF','intérêts','endettement'],
 ARRAY['SYSCOHADA-SIG'], 'hard'),

('ohada-v0.2','cas_pratique',
 'Un client de Cockpit F&A constate que son compte 411 a un solde anormalement élevé après import de balance. Quelles 3 vérifications prioritaires ?',
 '(1) Vérifier l''antériorité des créances : extraire les soldes par échéance (DSO par client), identifier les créances > 90 jours suspectes ; (2) Rapprocher avec les ventes : 411 final = 411 initial + Ventes TTC - Encaissements clients de la période. Tout écart révèle une erreur d''écriture ou d''import ; (3) Examiner les éventuels transferts vers 416 (clients douteux) qui auraient dû être passés en dépréciation 491. Recommandation Cockpit F&A : activer l''alerte automatique « clients > 90j » et générer le rapport DSO mensuel.',
 ARRAY['411','416','créances','DSO','ventes','dépréciation'],
 ARRAY['SYSCOHADA-Classe4','SYSCOHADA-AnalyseFin'], 'hard');
