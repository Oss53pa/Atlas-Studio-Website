-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T RAG — Seed initial SYSCOHADA / OHADA / Fiscal UEMOA
-- ═══════════════════════════════════════════════════════════════════════════
-- 8 documents fondamentaux indexes en scope='global' pour search_app_knowledge.
-- Pas d'embedding (NULL) -> fallback ilike texte. Embeddings seront calcules
-- au runtime par index_document quand une cle Gemini sera disponible.

WITH inserted AS (
  INSERT INTO public.proph3t_rag_documents (scope, scope_id, source_type, title, content, metadata) VALUES
    ('global', 'global', 'syscohada', 'SYSCOHADA - Plan comptable - Classes 1 a 9',
     'Le plan comptable SYSCOHADA est structure en 9 classes principales :
- Classe 1 : Comptes de capitaux (capitaux propres, dettes financieres long terme).
- Classe 2 : Comptes d''immobilisations (incorporelles, corporelles, financieres).
- Classe 3 : Comptes de stocks (matieres premieres, produits, marchandises).
- Classe 4 : Comptes de tiers (clients 411, fournisseurs 401, fisc/social 42-44).
- Classe 5 : Comptes de tresorerie (banques 521, caisse 571, decouverts 565).
- Classe 6 : Comptes de charges (achats 60, services 61, personnel 66, impots 64).
- Classe 7 : Comptes de produits (ventes 70, subventions 71, financiers 77).
- Classe 8 : Comptes des autres charges et produits (HAO).
- Classe 9 : Comptes analytiques.

Chaque compte respecte une nomenclature a 6 chiffres minimum. Les 2 premiers chiffres definissent la classe et la sous-classe.',
     '{"langue":"fr","derniere_mise_a_jour":"2024-01-01"}'::jsonb),

    ('global', 'global', 'audcif', 'AUDCIF - Acte uniforme relatif au droit comptable',
     'L''AUDCIF (Acte Uniforme relatif au Droit Comptable et a l''Information Financiere) regit l''application du SYSCOHADA dans les 17 etats OHADA.

Principes fondamentaux :
1. Permanence des methodes : meme methode comptable d''un exercice a l''autre.
2. Continuite d''exploitation : les comptes sont etablis dans l''hypothese que l''entreprise continue son activite.
3. Independance des exercices : rattacher charges et produits a l''exercice qui les genere.
4. Cout historique : enregistrement au cout d''acquisition.
5. Prudence : ne pas surevaluer l''actif ni sous-evaluer le passif.
6. Image fidele : les etats financiers doivent donner une image fidele du patrimoine.
7. Importance significative : detailler ce qui influence les decisions.

Etats financiers obligatoires : Bilan, Compte de Resultat, TAFIRE, Notes annexes.',
     '{}'::jsonb),

    ('global', 'global', 'syscohada', 'Compte 411 - Clients - Fonctionnement',
     'Le compte 411 enregistre les creances commerciales sur les clients (factures emises non encaissees).

Principe :
- Au debit (411) : montant TTC de la facture emise.
- Au credit (411) : encaissement, avoir, abandon de creance.

Sous-comptes courants :
- 4111 : Clients ordinaires
- 4112 : Clients - Effets a recevoir
- 4116 : Clients - Retenues de garantie
- 4118 : Clients douteux
- 4119 : Clients crediteurs

Provision : Si creance douteuse, dotation au compte 4912 en contrepartie d''un transfert 411 -> 416.

DSO (Days Sales Outstanding) = (411 / CA TTC) × 360. Norme B2B : 30-60 jours.',
     '{"compte":"411","theme":"creances clients"}'::jsonb),

    ('global', 'global', 'syscohada', 'Compte 521 - Banques - Operations courantes',
     'Le compte 521 enregistre les operations sur comptes bancaires.

Schema courant :
- Encaissement : 521 (D) / 411 (C)
- Paiement : 401 (D) / 521 (C)
- Decouvert : si solde crediteur, basculer en 565

Rapprochement bancaire mensuel obligatoire :
1. Solde compta (521).
2. Solde releve banque.
3. Identifier ecarts : virements en attente, cheques non encaisses, frais bancaires.

Les frais bancaires (627) doivent etre passes au moment de la reception du releve.',
     '{"compte":"521"}'::jsonb),

    ('global', 'global', 'fiscal', 'TVA UEMOA - Taux et regles',
     'La TVA dans la zone UEMOA suit la directive 02/98/CM/UEMOA harmonisee.

Taux standard par pays (2024) :
- Cote d''Ivoire : 18% (taux reduit 9%)
- Senegal : 18% (10%)
- Burkina Faso : 18% (10%)
- Mali, Benin, Togo : 18%
- Niger : 19%
- Guinee Bissau : 15%

TVA collectee sur ventes - TVA deductible sur achats = TVA due.

Exonerations : exportations, alimentaires de premiere necessite, services medicaux, education.

Depot mensuel obligatoire avant le 15 du mois suivant. Sanctions : 25% interet de retard + 5% penalite.',
     '{"theme":"fiscalite","zone":"UEMOA"}'::jsonb),

    ('global', 'global', 'fiscal', 'IS - Impot sur les Societes UEMOA/CEMAC',
     'L''IS s''applique aux personnes morales : SA, SARL, etablissements stables.

Taux normaux 2024 :
- CI : 25% (PME 20%)
- SN : 30%
- BF : 27.5%
- ML/BJ/NE : 30%
- TG : 27%
- CM : 33%
- CG : 28%
- TD : 35%

Acomptes : 4 acomptes provisionnels avant le 15 mars/juin/sept/dec.

Minimum d''imposition : 0.5%-1% du CA si IS calcule inferieur (impot minimum forfaitaire).',
     '{"theme":"fiscalite","impot":"IS"}'::jsonb),

    ('global', 'global', 'syscohada', 'Cycle d''exploitation - Calculs cles',
     'Le cycle d''exploitation regroupe les operations courantes.

Indicateurs cles :
1. Fonds de Roulement (FR) = Capitaux permanents - Actif immobilise.
   FR > 0 : ressources stables couvrent emplois stables (sain).
2. Besoin en Fonds de Roulement (BFR) = Actif circulant exploitation - Passif circulant exploitation.
   BFR > 0 : cycle absorbe de la tresorerie.
3. Tresorerie nette (TN) = FR - BFR.
   TN > 0 : excedent. TN < 0 : tension de tresorerie.

Ratios SYSCOHADA :
- Autonomie financiere = Capitaux propres / Total actif (norme >= 30%).
- Liquidite generale = Actif circulant / Passif circulant (>= 1).
- Z-Score Altman PME : >2.9 sain, 1.23-2.9 zone grise, <1.23 detresse.',
     '{"theme":"analyse financiere"}'::jsonb),

    ('global', 'global', 'audcif', 'AUSCGIE - Droit des societes commerciales OHADA',
     'L''Acte Uniforme relatif au droit des Societes Commerciales et du GIE (AUSCGIE) regit la creation et le fonctionnement des societes commerciales OHADA.

Formes juridiques principales :
- SA : capital min 10 000 000 FCFA, 1 actionnaire min, CA + conseil d''admin.
- SAS : capital libre, structure souple.
- SARL : capital min 1 000 000 FCFA (peut etre 100 000 si decision tenue en franchise), 1 a 100 associes.
- SNC, SCS : associes responsables solidairement.
- EI : pas de personne morale distincte.

Obligations comptables :
- Tenue d''une comptabilite SYSCOHADA des seuils CA/effectif depasses.
- Audit obligatoire pour SA et SARL au-dela de certains seuils.
- Depot annuel des etats financiers au tribunal de commerce.',
     '{"theme":"droit des societes"}'::jsonb)
  ON CONFLICT DO NOTHING
  RETURNING id, content
)
INSERT INTO public.proph3t_rag_chunks (document_id, chunk_index, content, token_count)
SELECT
  i.id,
  ROW_NUMBER() OVER (PARTITION BY i.id ORDER BY i.id) - 1 AS chunk_index,
  i.content AS content,
  CEIL(LENGTH(i.content) / 4.0)::int AS token_count
FROM inserted i;
