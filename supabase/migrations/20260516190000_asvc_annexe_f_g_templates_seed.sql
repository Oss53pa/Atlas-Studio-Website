-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Seed des templates Annexes F (templates agents) + G (communications incident)
-- ═══════════════════════════════════════════════════════════════════════════
-- Stockés dans asvc_agent_memory_shared (cf. Annexe F §intro :
--   "Tous ces templates sont stockés dans asvc_agent_memory_shared")
--
-- Convention de clé : template_<agent>_<purpose>
-- Structure JSONB :
--   { subject?: string, body: string, variables: string[], version: int,
--     source_annexe: 'F' | 'G' }
--
-- Idempotent via ON CONFLICT (key) DO NOTHING — préserve toute modif manuelle.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.asvc_agent_memory_shared (key, value, description) VALUES

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Customer Success Agent — 5 emails (Annexe F §1)
-- ───────────────────────────────────────────────────────────────────────────
('template_cs_email_t1_welcome',
 jsonb_build_object(
   'subject', 'Bienvenue chez Atlas Studio, [Prénom] !',
   'body', $tpl$Bonjour [Prénom],

Au nom de toute l'équipe Atlas Studio, nous sommes ravis de vous accueillir
parmi nos clients.

Votre abonnement à [Apps souscrites] est activé. Vous trouverez ci-dessous
les premières étapes pour démarrer :

🚀 Étape 1 : Connexion
   → [URL tenant]
   → Identifiants admin : dans l'email séparé sécurisé

📚 Étape 2 : Ressources
   → Guide utilisateur FR : [URL]
   → Guide utilisateur EN : [URL]
   → FAQ : [URL]

🎓 Étape 3 : Formation
   Je vous propose un créneau de formation personnalisée dans les 48h.
   Vous pouvez réserver directement ici : [Calendly]

📞 Support
   Notre équipe support est disponible du lundi au vendredi, 8h-18h GMT.
   Email : support@atlasstudio.org
   WhatsApp : [numéro]

À très bientôt,
L'équipe Atlas Studio$tpl$,
   'variables', jsonb_build_array('Prénom','Apps souscrites','URL tenant','Calendly','numéro'),
   'version', 1,
   'source_annexe', 'F'
 ),
 'Customer Success T1 - Email bienvenue J0'),

('template_cs_email_t2_setup',
 jsonb_build_object(
   'subject', '[Prénom], votre setup Atlas Studio est prêt',
   'body', $tpl$Bonjour [Prénom],

Votre tenant Atlas Studio est configuré. Voici les détails :

🏢 Tenant : [Nom organisation]
🌐 URL d'accès : [tenant-name].atlasstudio.org
👤 Admin principal : [email]

🔐 Identifiants de première connexion :
[Envoyé via canal sécurisé séparé]

⚙️ Configuration recommandée pour démarrer :
1. Connexion initiale (changement mot de passe obligatoire)
2. Ajout de vos utilisateurs (max [X] selon votre plan)
3. Import des données initiales (nous pouvons vous accompagner)
4. Personnalisation logo et branding

📅 Votre formation est prévue : [date/heure si planifiée]

Pour toute question, répondez simplement à cet email.

Cordialement,
L'équipe Atlas Studio$tpl$,
   'variables', jsonb_build_array('Prénom','Nom organisation','tenant-name','email','X','date/heure'),
   'version', 1,
   'source_annexe', 'F'
 ),
 'Customer Success T2 - Setup onboarding J+1'),

('template_cs_email_t3_check_j7',
 jsonb_build_object(
   'subject', '[Prénom], comment se passe votre démarrage ?',
   'body', $tpl$Bonjour [Prénom],

Vous utilisez Atlas Studio depuis une semaine. J'espère que tout se passe bien !

Pour faciliter votre adoption, voici quelques ressources qui pourraient vous
être utiles :

[Si usage faible]
J'ai remarqué que certaines fonctionnalités n'ont pas encore été utilisées :
- [Feature 1] : [bénéfice + lien tuto]
- [Feature 2] : [bénéfice + lien tuto]

[Si usage normal]
Vous avez bien démarré avec [Atlas Finance / TableSmart / etc.] !
Voici quelques fonctionnalités avancées qui pourraient vous intéresser :
- [Feature avancée 1]
- [Feature avancée 2]

Avez-vous des questions ou besoin d'aide sur un point précis ?

Je suis à votre disposition.

Cordialement,
L'équipe Atlas Studio$tpl$,
   'variables', jsonb_build_array('Prénom','Feature 1','Feature 2','App'),
   'version', 1,
   'source_annexe', 'F'
 ),
 'Customer Success T3 - Check adoption J+7'),

('template_cs_email_t4_review_j30',
 jsonb_build_object(
   'subject', 'Bilan de votre premier mois avec Atlas Studio',
   'body', $tpl$Bonjour [Prénom],

Vous utilisez Atlas Studio depuis un mois. Voici un bilan personnalisé :

📊 Votre utilisation
- Connexions ce mois : [X]
- Utilisateurs actifs : [Y / Z]
- [App] : [Usage chiffré spécifique]

✅ Vos succès
- [Métrique 1 réussie]
- [Métrique 2 réussie]

💡 Opportunités d'optimisation
- [Feature non utilisée mais pertinente]
- [Suggestion d'amélioration workflow]

📈 Votre NPS
Sur une échelle de 0 à 10, à quel point recommanderiez-vous Atlas Studio à
un confrère ?
[Survey link]

Votre retour nous est précieux pour vous offrir le meilleur service.

Cordialement,
L'équipe Atlas Studio$tpl$,
   'variables', jsonb_build_array('Prénom','X','Y','Z','App','Survey link'),
   'version', 1,
   'source_annexe', 'F'
 ),
 'Customer Success T4 - Bilan J+30 + NPS'),

('template_cs_email_t8_churn_rescue',
 jsonb_build_object(
   'subject', '[Prénom], pouvons-nous échanger quelques minutes ?',
   'body', $tpl$Bonjour [Prénom],

J'ai constaté que votre utilisation d'Atlas Studio a baissé ces dernières
semaines. Je tiens à m'assurer que tout se passe bien de votre côté.

Y a-t-il :
- Un problème technique non résolu ?
- Une fonctionnalité qui manque ?
- Un changement dans votre organisation ?
- Autre chose dont nous devrions être informés ?

Je serais ravi(e) de comprendre comment nous pouvons mieux vous accompagner.

Auriez-vous 15 minutes cette semaine pour un échange rapide ?
[Calendly link]

Votre satisfaction est notre priorité.

Cordialement,
L'équipe Atlas Studio$tpl$,
   'variables', jsonb_build_array('Prénom','Calendly link'),
   'version', 1,
   'source_annexe', 'F'
 ),
 'Customer Success T8 - Sauvetage churn'),

-- ───────────────────────────────────────────────────────────────────────────
-- 2. SDR Agent — 3 emails séquence cabinets (Annexe F §2)
-- ───────────────────────────────────────────────────────────────────────────
('template_sdr_email_cabinets_j0',
 jsonb_build_object(
   'subject', '[Prénom], une question sur [pain point]',
   'body', $tpl$Bonjour [Prénom],

[Hook personnalisé — référence post LinkedIn récent ou actualité cabinet]

Une question rapide : comment votre cabinet [Nom Cabinet] gère-t-il
aujourd'hui [problème spécifique zone OHADA, ex: "la préparation des
liasses fiscales pour vos clients en plusieurs pays UEMOA"] ?

Je travaille avec Atlas Studio, où nous avons développé LiassPilot —
une solution qui :
- Génère automatiquement la liasse fiscale 84 pages à partir du grand livre
- Bridge intelligent vers Atlas Finance pour les états SYSCOHADA
- Mode multi-pays (CI, SN, CM, BF, ML, TG, BN)

Quelques cabinets que nous accompagnons :
- [Cabinet A, anonymisé] : -70% de temps de préparation liasse
- [Cabinet B] : 0 erreur de saisie depuis 6 mois

Auriez-vous 15 minutes la semaine prochaine pour échanger ?

Cordialement,
L'équipe Atlas Studio

---
Pour vous désinscrire : [lien opt-out]
Atlas Studio - SaaS B2B francophone Afrique - atlasstudio.org$tpl$,
   'variables', jsonb_build_array('Prénom','pain point','Nom Cabinet','Hook personnalisé','Cabinet A','Cabinet B','lien opt-out'),
   'version', 1,
   'source_annexe', 'F'
 ),
 'SDR Cabinets - Touche J0'),

('template_sdr_email_cabinets_j7',
 jsonb_build_object(
   'subject', 'Re: [sujet précédent] — exemple concret',
   'body', $tpl$Bonjour [Prénom],

Suite à mon message la semaine dernière, je voulais partager avec vous un
cas concret qui pourrait vous parler.

[Cabinet anonymisé] (situé en [pays], [X] collaborateurs, [Y] clients PME)
faisait face au même défi que de nombreux cabinets en zone UEMOA :
préparation manuelle des liasses fiscales, multiples allers-retours avec
les clients pour les états financiers, risque d'erreur sur les calculs
SYSCOHADA AUDCIF.

Depuis 6 mois avec LiassPilot :
✓ 70% de temps gagné sur la préparation
✓ 0 erreur de calcul détectée
✓ Capacité doublée de dossiers traités
✓ Clients livrés en J+3 au lieu de J+15

Tout cela sans changer leur outil comptable principal, grâce au bridge
intelligent.

Si ce sujet vous intéresse, voici 3 créneaux pour une démo de 20 minutes :
[Créneau 1] / [Créneau 2] / [Créneau 3]

Cordialement,
L'équipe Atlas Studio$tpl$,
   'variables', jsonb_build_array('Prénom','pays','X','Y','Créneau 1','Créneau 2','Créneau 3'),
   'version', 1,
   'source_annexe', 'F'
 ),
 'SDR Cabinets - Touche J+7 value proposition'),

('template_sdr_email_breakup_j21',
 jsonb_build_object(
   'subject', '[Prénom], dernier message',
   'body', $tpl$Bonjour [Prénom],

Je vous ai contacté il y a quelques semaines au sujet de LiassPilot et
n'ai pas eu de retour de votre part.

Je comprends parfaitement que ce ne soit peut-être pas le bon timing.

Je n'insiste pas. Si dans le futur ce sujet redevient pertinent pour
[Nom Cabinet], n'hésitez pas à me recontacter directement à cette adresse.

Je vous souhaite une excellente continuation.

Cordialement,
L'équipe Atlas Studio$tpl$,
   'variables', jsonb_build_array('Prénom','Nom Cabinet'),
   'version', 1,
   'source_annexe', 'F'
 ),
 'SDR Cabinets - Touche J+21 break-up'),

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Content Agent — 3 posts réseaux sociaux (Annexe F §3)
-- ───────────────────────────────────────────────────────────────────────────
('template_content_linkedin_educational_tva',
 jsonb_build_object(
   'body', $tpl$La TVA en zone UEMOA, c'est plus qu'un taux à appliquer.

3 erreurs courantes que je vois encore dans les bilans :

1️⃣ Confondre TVA déductible et TVA collectée
La TVA déductible (compte 4452) concerne vos achats.
La TVA collectée (compte 4431) concerne vos ventes.
La différence = ce que vous devez à l'État.

2️⃣ Oublier la TVA non récupérable
Frais de réception, véhicules de tourisme, certains achats hôteliers…
Tous ne sont pas déductibles. Vérifiez votre régime fiscal.

3️⃣ Ne pas adapter au pays
- Côte d'Ivoire : 18%
- Sénégal : 18%
- Cameroun : 19,25%
- Burkina Faso : 18%

Le taux dépend du pays de votre client, pas du vôtre.

📊 Notre conseil : automatiser cette logique avec un outil qui connaît
les règles SYSCOHADA AUDCIF par pays. Atlas Finance le fait nativement.

Vous voulez tester ? Lien démo en commentaire.

#OHADA #SYSCOHADA #FiscalitéAfrique #PME #ExpertComptable$tpl$,
   'platform', 'linkedin',
   'type', 'educational',
   'hashtags', jsonb_build_array('OHADA','SYSCOHADA','FiscalitéAfrique','PME','ExpertComptable'),
   'version', 1,
   'source_annexe', 'F'
 ),
 'Content LinkedIn - Post éducatif TVA UEMOA'),

('template_content_linkedin_case_study',
 jsonb_build_object(
   'body', $tpl$Comment un cabinet d'expertise comptable à Dakar a divisé par 3 le temps
de préparation de ses liasses fiscales 👇

Le cabinet [anonymisé] gère 47 PME sénégalaises. Chaque année, la
préparation des liasses fiscales mobilisait l'équipe pendant 6 semaines.

Manuel.
Sur Excel.
Avec saisie répétée.
Et corrections multiples.

Depuis l'adoption de LiassPilot d'Atlas Studio :
✓ 2 semaines au lieu de 6
✓ 0 erreur de calcul SYSCOHADA AUDCIF
✓ Bridge automatique depuis Atlas Finance
✓ Génération PDF officiel 84 pages
✓ Multi-pays UEMOA prêt à l'emploi

"On a récupéré 4 semaines d'équipe par an. C'est plus que de l'efficacité,
c'est de la sérénité pour nos collaborateurs." — Associé du cabinet

Le bilan :
- Capacité +50% sur l'année
- Marge brute +18%
- Stress équipe -90% (selon eux 😅)

LiassPilot n'est pas un outil. C'est une libération opérationnelle.

Démo gratuite 15 min : [lien]

#SYSCOHADA #ExpertComptable #UEMOA #Afrique #SaaSafrique$tpl$,
   'platform', 'linkedin',
   'type', 'case_study',
   'hashtags', jsonb_build_array('SYSCOHADA','ExpertComptable','UEMOA','Afrique','SaaSafrique'),
   'version', 1,
   'source_annexe', 'F'
 ),
 'Content LinkedIn - Cas client cabinet Dakar'),

('template_content_instagram_carousel_syscohada',
 jsonb_build_object(
   'body', $tpl$Slide 1 (Cover) :
5 erreurs SYSCOHADA AUDCIF qui coûtent cher
👉 Swipe pour découvrir
[Image : tablette avec graphiques amber sur fond noir]

Slide 2 :
ERREUR #1
Confondre charges et immobilisations
Une dépense >500k FCFA potentiellement immobilisable...
Vérifiez le seuil de votre pays.

Slide 3 :
ERREUR #2
Oublier les amortissements en N+1
SYSCOHADA AUDCIF impose des taux précis selon la nature du bien.
Bâtiment : 5%, matériel : 20%, mobilier : 10%...

Slide 4 :
ERREUR #3
Mal classer les provisions
Provisions pour risques (15) ≠ Dépréciations d'actifs (29 et 39)
La nature de la provision détermine son traitement.

Slide 5 :
ERREUR #4
Ignorer le compte 86 - Reprises
Une reprise de provision est un produit (compte 86),
pas une diminution de charge.

Slide 6 :
ERREUR #5
Mauvais traitement des plus-values de cession
La cession d'un actif génère des écritures spécifiques :
675 (VNC) / 81 (Valeur comptable) / 82 (Produit de cession)

Slide 7 (Closing) :
Vous voulez les éviter automatiquement ?
Atlas Finance gère tout ça pour vous.
Démo gratuite en bio ✨
@atlasstudio.africa$tpl$,
   'platform', 'instagram',
   'type', 'carousel',
   'slides', 7,
   'version', 1,
   'source_annexe', 'F'
 ),
 'Content Instagram - Carousel 5 erreurs SYSCOHADA'),

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Facturation Agent — facture OHADA SaaS B2B (Annexe F §4)
-- ───────────────────────────────────────────────────────────────────────────
('template_facturation_invoice_ohada_saas',
 jsonb_build_object(
   'body', $tpl$═══════════════════════════════════════════════════════════════
                          ATLAS STUDIO
                  [Adresse complète]
            RCCM : [N° RCCM]   |   NCC : [N° NCC]
              Régime fiscal : [Réel normal / TVA assujetti]
═══════════════════════════════════════════════════════════════

                         FACTURE
                    N° AS-[YYYY]-[NNNN]
                  Date d'émission : [DD/MM/YYYY]

CLIENT
────────────────────────────────────────────────────────────
Nom : [Nom client / Raison sociale]
Adresse : [Adresse client]
NCC : [N° NCC client si professionnel]
RCCM : [N° RCCM client si applicable]

PRESTATIONS
────────────────────────────────────────────────────────────
[Tableau prestations: Description | Qté | PU HT | Total HT]

                                    Total HT  : [X] FCFA
                                    TVA [taux]: [Y] FCFA
                                    ──────────────────────────
                                    Total TTC : [Z] FCFA

CONDITIONS DE PAIEMENT
────────────────────────────────────────────────────────────
Échéance : [DD/MM/YYYY] (30 jours après émission)
Mode de paiement : Mobile Money / Carte / Virement bancaire
Lien de paiement direct : [URL CinetPay sécurisé]

Coordonnées bancaires (si virement) :
Banque : [Nom banque]
RIB : [RIB complet]
IBAN : [IBAN]
BIC : [BIC]

MENTIONS LÉGALES
────────────────────────────────────────────────────────────
En cas de retard de paiement, conformément à l'article [...] du Code
des obligations civiles et commerciales, des intérêts de retard
seront appliqués au taux légal en vigueur.

Tout litige relatif à la présente facture relève de la compétence
exclusive des tribunaux de [ville siège social Atlas Studio].

Facture émise par Atlas Studio - SaaS B2B francophone Afrique
www.atlasstudio.org | support@atlasstudio.org

═══════════════════════════════════════════════════════════════
                Merci de votre confiance !
═══════════════════════════════════════════════════════════════$tpl$,
   'numbering_format', 'AS-YYYY-NNNN',
   'mandatory_fields', jsonb_build_array('RCCM','NCC','régime TVA','date émission','échéance','HT','TVA','TTC'),
   'version', 1,
   'source_annexe', 'F'
 ),
 'Facturation - Modèle facture OHADA SaaS B2B'),

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Support N1 — 3 templates réponses tickets (Annexe F §5)
-- ───────────────────────────────────────────────────────────────────────────
('template_support_n1_faq_standard',
 jsonb_build_object(
   'body', $tpl$Bonjour [Prénom],

Merci pour votre message.

[Réponse à la question, claire et concise en 2-4 phrases.]

[Si étapes : numérotées]
1. [Étape 1]
2. [Étape 2]
3. [Étape 3]

[Si lien utile : URL doc officielle]
Pour plus de détails, consultez notre guide : [URL]

N'hésitez pas si vous avez d'autres questions !

Cordialement,
L'équipe Atlas Studio$tpl$,
   'max_words', 200,
   'version', 1,
   'source_annexe', 'F'
 ),
 'Support N1 - T-SAV-001 Réponse FAQ standard'),

('template_support_n1_bug_in_progress',
 jsonb_build_object(
   'body', $tpl$Bonjour [Prénom],

Merci pour votre signalement.

Nous avons bien identifié le problème que vous décrivez. Nos équipes
techniques travaillent actuellement à sa résolution.

Voici le détail :
- Problème : [Description courte]
- Statut : En cours de correction (Priorité [P0/P1/P2])
- Estimation : [Délai estimé]
- Ticket interne : [GitHub issue ou ASVC ticket ID]

[Si workaround disponible]
En attendant le correctif, voici comment contourner :
1. [Étape workaround 1]
2. [Étape workaround 2]

Nous vous tiendrons informé(e) dès que le correctif sera déployé.

Cordialement,
L'équipe Atlas Studio$tpl$,
   'version', 1,
   'source_annexe', 'F'
 ),
 'Support N1 - T-SAV-002 Bug confirmé en cours de correction'),

('template_support_n1_clarification',
 jsonb_build_object(
   'body', $tpl$Bonjour [Prénom],

Merci pour votre message.

Afin de mieux vous aider, pourriez-vous nous préciser :
- [Question précise 1]
- [Question précise 2]
- [Si applicable : screenshot, logs, navigateur utilisé]

Vous pouvez également :
1. Vérifier que vous êtes bien connecté à votre tenant : [URL]
2. Tester en navigation privée (au cas où c'est lié au cache)
3. Vous reconnecter pour rafraîchir votre session

Dans tous les cas, n'hésitez pas à revenir vers nous avec les détails.

Cordialement,
L'équipe Atlas Studio$tpl$,
   'version', 1,
   'source_annexe', 'F'
 ),
 'Support N1 - T-SAV-003 Demande clarification'),

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Dev Agent — PR description template (Annexe F §6)
-- ───────────────────────────────────────────────────────────────────────────
('template_dev_pr_description_feature',
 jsonb_build_object(
   'body', $tpl$## 📋 Spec liée
[Lien vers asvc_product_specs ID : spec_xxx]
[Titre de la user story]

## 🎯 Objectif
[1-2 phrases : ce que cette PR accomplit]

## 📝 Changements

### Fichiers modifiés (X)
- `src/modules/[module]/[file].tsx` : [Description courte]
- `src/components/[Component].tsx` : [Description courte]
- `supabase/migrations/[YYYY]_[name].sql` : [Description]
- `src/hooks/[useHook].ts` : [Description]

### Tests ajoutés (Y)
- `src/__tests__/[module].test.tsx` : [Couvre quoi]
- `src/__tests__/e2e/[scenario].spec.ts` : [Scénario E2E]

### Migrations Supabase
- Nouvelles tables : [si applicable]
- Nouveaux RLS policies : [si applicable]
- Nouveaux indexes : [si applicable]

## 📸 Screenshots (si UI)
[Captures avant/après ou nouveaux écrans]

## 🧪 Tests effectués localement
- [x] Tests unitaires passent (`npm test`)
- [x] Coverage >80% sur nouveau code
- [x] TypeScript strict, 0 erreur
- [x] ESLint, 0 warning
- [x] Tests E2E principaux fonctionnent (Playwright)
- [x] Tests manuels du parcours utilisateur principal

## 📋 Checklist Atlas Studio
- [x] Conformité design system (#0A0A0A + #EF9F27 + Exo 2)
- [x] i18n FR + EN ajouté
- [x] RLS policies sur nouvelles tables
- [x] Mobile responsive (testé iPhone 14)
- [x] Documentation interne mise à jour
- [ ] Documentation publique (sera créée par Documentation Agent)

## 🔍 Points d'attention pour QA Agent
- Module finance : tests SYSCOHADA critiques (compte 411, 4431)
- Performance : nouveau composant avec liste virtualisée
- Sécurité : nouvel endpoint avec permissions tenant-scoped

## 🔄 Plan de rollback
En cas de problème post-merge :
1. `git revert [commit-hash]`
2. Rollback migration : `supabase migration down`
3. Rollback Vercel : revert deployment précédent

---
🤖 Submitted by ASVC Dev Agent
Co-Authored-By: ASVC-Dev-Agent <asvc-dev@atlasstudio.org>
Signed-by-agent: dev_agent_v1
Spec-id: [spec_uuid]$tpl$,
   'version', 1,
   'source_annexe', 'F'
 ),
 'Dev Agent - Template PR description nouvelle feature'),

-- ───────────────────────────────────────────────────────────────────────────
-- 7. QA Agent — Rapport PR template (Annexe F §7)
-- ───────────────────────────────────────────────────────────────────────────
('template_qa_report_pr_comment',
 jsonb_build_object(
   'body', $tpl$## 🧪 Rapport QA Agent — PR #[N]

**Run ID :** [uuid]
**Durée totale :** [X min Y sec]
**Verdict :** ✅ APPROVED / ⚠️ APPROVED WITH NOTES / ❌ REJECTED

---

### 📊 Résumé exécutif

| Catégorie | Statut | Détails |
|-----------|--------|---------|
| 🔍 Static Analysis | ✅ Passed | ESLint 0 warning, TS strict OK |
| 🧪 Unit Tests | ✅ Passed | [X/Y] passed |
| 📊 Coverage | ✅ [Z]% | Cible 80% atteinte |
| 🔗 Integration | ✅ Passed | [X/Y] passed |
| 🌐 E2E | ✅ Passed | [X/Y] scenarios |
| 💰 SYSCOHADA | ✅ Passed | [X/Y] cas (si module finance) |
| 🛡️ Security | ✅ Passed | 0 vulnerabilities |
| ⚡ Performance | ✅ Passed | Lighthouse [score] |

---

### 🔍 Détails par étape
[Voir Annexe F §7 pour structure complète]

### 🎯 Verdict final
✅ **APPROVED — Cette PR est prête pour le preview deploy**

### 🔗 Artifacts
- Coverage report HTML
- Playwright traces
- Lighthouse report
- SYSCOHADA test cases detail

---
🤖 ASVC QA Agent v1.0$tpl$,
   'version', 1,
   'source_annexe', 'F'
 ),
 'QA Agent - Template rapport PR'),

-- ───────────────────────────────────────────────────────────────────────────
-- 8. Closer Agent — Proposition commerciale (Annexe F §8)
-- ───────────────────────────────────────────────────────────────────────────
('template_closer_proposal_commercial',
 jsonb_build_object(
   'body', $tpl$# Proposition Commerciale

**De :** Atlas Studio
**À :** [Nom + fonction + entreprise]
**Date :** [date]
**Validité :** 30 jours
**Référence :** AS-PROP-[YYYY]-[NNNN]

---

## 1. Contexte et besoins identifiés
Suite à notre échange du [date démo], nous avons identifié les défis
principaux auxquels [Nom Cabinet/Entreprise] fait face :
- [Pain point 1]
- [Pain point 2]
- [Pain point 3]

## 2. Solution proposée
### 2.1 [Atlas Finance]
**À quoi ça sert pour vous :** [Description adaptée]
**Fonctionnalités clés :** [Liste]
**Bénéfices attendus :** [Gain temps, ROI estimé]

### 2.2 [LiassPilot] / [Autres apps]
[Sections similaires]

## 3. Périmètre fonctionnel
### ✅ Inclus
- Setup tenant et configuration initiale
- Import des données existantes (jusqu'à [X] enregistrements)
- Formation équipe (2 sessions de 2h)
- Support email illimité (jours ouvrés)
- Mises à jour incluses
- Sauvegardes automatiques quotidiennes

### ❌ Non inclus
- Développements sur mesure (sur devis)
- Intégrations spécifiques tierces (sur devis)
- Migration de données complexes (>[X] enregistrements - sur devis)

## 4. Pricing
[Tableau détail mensuel HT/TVA/TTC + total annuel + conditions paiement]

## 5. Planning de mise en œuvre
[Tableau semaine S1-S5+ : étapes + livrables]

## 6. Engagement et conditions
- Durée : 12 mois min, renouvellement tacite
- SLA : 99,5% dispo mensuelle
- Résiliation : préavis 30 jours
- Export données : assuré dans les 15 jours suivant résiliation

## 7. Prochaines étapes
1. ✅ Validation de la présente proposition
2. 📝 Signature électronique via ADVIST
3. 💳 Premier paiement
4. 🚀 Démarrage onboarding

---
**Pamela Atokouna**
Founder & CEO Atlas Studio
www.atlasstudio.org

---
*Cette proposition est confidentielle et destinée uniquement à [Nom client].*$tpl$,
   'reference_format', 'AS-PROP-YYYY-NNNN',
   'validity_days', 30,
   'escalation_threshold_fcfa', 2000000,
   'version', 1,
   'source_annexe', 'F'
 ),
 'Closer - Template proposition commerciale'),

-- ───────────────────────────────────────────────────────────────────────────
-- 9. Annexe G — Communications incident (3 templates)
-- ───────────────────────────────────────────────────────────────────────────
('template_incident_communication_in_progress',
 jsonb_build_object(
   'subject', 'Incident technique en cours — [App concernée]',
   'body', $tpl$Bonjour,

Atlas Studio rencontre actuellement un incident technique affectant
[App concernée].

Nature : [Description courte non technique]
Début : [Date/heure]
Statut : Investigation en cours

Nos équipes sont mobilisées pour résoudre rapidement. Nous vous tenons
informés.

Pour suivre l'évolution : status.atlasstudio.org

Cordialement,
L'équipe Atlas Studio$tpl$,
   'channels', jsonb_build_array('email','sms','status_page','social'),
   'version', 1,
   'source_annexe', 'G'
 ),
 'Incident - Communication "en cours"'),

('template_incident_communication_resolved',
 jsonb_build_object(
   'subject', 'Incident résolu — [App concernée]',
   'body', $tpl$Bonjour,

L'incident affectant [App] est désormais résolu.

Durée totale : [X minutes]
Cause : [Brève explication non technique]
Action corrective : [Ce qui a été fait]

Nos excuses pour la gêne occasionnée.

Un post-mortem détaillé sera partagé dans les 48h.

Cordialement,
L'équipe Atlas Studio$tpl$,
   'channels', jsonb_build_array('email','sms','status_page','social'),
   'version', 1,
   'source_annexe', 'G'
 ),
 'Incident - Communication "résolu"'),

('template_incident_post_mortem',
 jsonb_build_object(
   'subject', 'Post-Mortem — Incident du [date]',
   'body', $tpl$# Post-Mortem — Incident du [date]

## Résumé exécutif
- **Date :** [DD/MM/YYYY HH:MM] - [HH:MM]
- **Durée :** [X heures Y minutes]
- **Sévérité :** P0/P1/P2
- **Apps impactées :** [Liste]
- **Clients impactés :** [Nombre estimé]
- **Cause racine :** [Brève description]

## Chronologie
| Heure | Événement |
|-------|-----------|
| HH:MM | Premier signalement |
| HH:MM | Notification Pame |
| HH:MM | Confirmation incident, mitigation engagée |
| HH:MM | Rollback déclenché |
| HH:MM | Service rétabli |
| HH:MM | Communication clients envoyée |
| HH:MM | Surveillance terminée |

## Cause racine
[Explication technique détaillée]

## Actions prises pendant l'incident
1. [Action 1]
2. [Action 2]
3. [Action 3]

## Impact
- [Nombre] clients impactés
- [Nombre] tickets SAV générés
- [Durée] de service indisponible

## Actions correctives

### Immédiat (déjà fait)
- [x] Fix déployé
- [x] Communication clients

### Court terme (sous 7 jours)
- [ ] Améliorer monitoring sur [zone]
- [ ] Ajouter tests automatiques pour [scénario]

### Moyen terme (sous 30 jours)
- [ ] Refonte architecture [composant]
- [ ] Formation équipe sur [sujet]

## Leçons apprises
- [Leçon 1]
- [Leçon 2]
- [Leçon 3]

---
Atlas Studio s'engage à apprendre de chaque incident pour offrir un service
toujours plus fiable.$tpl$,
   'publication_delay_hours', 48,
   'audience', jsonb_build_array('clients_impactés','équipe_interne','public_si_majeur'),
   'version', 1,
   'source_annexe', 'G'
 ),
 'Incident - Template post-mortem (sous 48h)')

ON CONFLICT (key) DO NOTHING;
