# Audit — Les applications Atlas Studio tiennent-elles la promesse ?

> Date : 2026-05-21
> Périmètre : catalogue produit publié (`src/config/content.ts`) + infrastructure de paiement du portail.

---

## 1. Périmètre & limites de l'audit

Ce dépôt (`Atlas-Studio-Website`) est le **site vitrine + portail client + back-office** d'Atlas Studio.
Le **code réel des applications** (Atlas F&A, Cockpit F&A, Liass'Pilot, Advist, TableSmart, AtlasBanx)
n'est **pas** dans ce dépôt : chaque app vit sur son propre domaine
(`atlas-fna.atlas-studio.org`, `cockpit-fna…`, `tablesmart…`, `atlasbanx…`).

Conséquence : ce document est un **audit de cohérence promesse ↔ fonctionnalités annoncées**
(source : `src/config/content.ts`), **pas** une revue de code des apps elles-mêmes.
Là où une fonctionnalité n'apparaît nulle part dans la fiche produit, elle est traitée
comme « non tenue / à confirmer dans l'app ».

Seule exception vérifiée dans le code : l'**infrastructure de paiement** (Mobile Money),
qui est bien présente dans ce dépôt et a donc pu être contrôlée directement (cf. §5).

---

## 2. La promesse, traduite en test mesurable

Le manifeste de marque contient **deux promesses dures** :

- **Promesse A — « Fini le retraitement »** : le logiciel sort le **livrable fini directement**,
  sans le cycle pénible *retraitement → mise en forme → ré-export*. L'objectif n'est **pas de
  supprimer Excel** (indispensable pour les données externes : relevés tiers, fichier d'un
  expert-comptable… — ou par simple préférence) mais d'**offrir un chemin automatique en plus**,
  au choix de l'utilisateur (« depuis Atlas » **ou** « fichier Excel »).
- **Promesse B — « Pensé pour les réalités africaines »** : SYSCOHADA/OHADA natif,
  **Mobile Money**, **mode hors-ligne / connexion limitée**, multi-devises,
  **règles fiscales locales par pays**, langues locales, banques locales.

Le bandeau de confiance (`trustBar`) ajoute 3 promesses transverses testées ici :
**« Mode offline (PWA) »**, **« IA Proph3t intégrée »**, **« 17 pays OHADA »**.

---

## 3. Verdict par application

### 3.1 Atlas F&A — *Module ERP comptable* — ✅ Promesse A forte / ⚠️ Promesse B partielle
Cœur de la promesse A tenu : saisie → grand livre → balance → bilan/CR/SIG/TAFIRE en sortie directe.

**Manquements :**
- **Pas de mode hors-ligne** listé — contredit le bandeau « Mode offline » pour l'app la plus utilisée au quotidien.
- **Rapprochement bancaire = CSV uniquement** → l'utilisateur doit *exporter depuis sa banque puis retraiter* :
  la boucle combattue **réapparaît côté banque**. Manque : connecteurs bancaires / import relevés Mobile Money.
- **Pas de télédéclaration / e-invoicing** (présents dans Liass'Pilot mais pas dans l'ERP qui produit la donnée source).
- **Pas d'app mobile de saisie terrain** (le type « App mobile » existe dans le code mais aucune app ne l'incarne).

### 3.2 Cockpit F&A — *Reporting / pilotage* — ✅ Promesse A forte / ⚠️ point faible majeur à l'entrée
Import balance → 45+ dashboards + états + PDF WYSIWYG : excellent sur la sortie.

**Manquements :**
- **L'entrée reste un export manuel** (« Import balance Excel/CSV »). Sans **connecteur direct vers Atlas F&A**,
  l'utilisateur fait *Atlas F&A → export → import Cockpit* : la boucle de retraitement se **déplace entre deux apps maison**.
  C'est le manquement le plus emblématique.
- Pas de **diffusion automatique** du reporting (board pack email/WhatsApp programmé) → envoi manuel.
- Offline limité au stockage local IndexedDB.

### 3.3 Liass'Pilot — *Liasse fiscale* — ✅ Promesse A forte / ⚠️ Promesse B (multi-pays) creuse
« Votre balance entre, votre liasse sort » : l'app la plus alignée sur la promesse A.

**Manquements :**
- **Pas d'`external_url`** dans le catalogue → l'app **n'est probablement pas encore déployée / live**. À confirmer.
- **Passage fiscal CI-only** (« Passage fiscal automatique CI », réintégrations CGI, IS/IMF).
  Le « 17 pays OHADA » ne porte que sur le **plan comptable**, pas sur la **fiscalité réelle** des autres pays
  (formats DGI, taux, réintégrations). Promesse multi-pays partiellement tenue.
- Proph3t = chatbot + 129 contrôles, mais **pas de prédictif** ; pas d'offline.

### 3.4 Advist — *Workflow & signature* — ⚠️ Le plus de manquements vs. promesses transverses
Digitalise les circuits de validation (promesse A OK : papier → digital).

**Manquements :**
- **Aucune IA / aucun Proph3t** dans la fiche → contredit le bandeau « IA Proph3t intégrée ».
- **Aucun mode hors-ligne** → contredit « Mode offline ».
- **Cadre légal e-signature = eIDAS** (norme **européenne**). Pour une app « conçue pour l'Afrique »,
  l'absence de référence au cadre **OHADA/UEMOA** de la signature électronique est un manque de fond.
- **Pas d'OCR / extraction de données** : documents = PDF statiques → une part de **ressaisie** subsiste.
- **Pas d'`external_url`** → app non encore déployée, à confirmer.

### 3.5 TableSmart — *Restauration* — ✅✅ La mieux alignée sur les deux promesses
Mobile Money natif (Orange/Wave/MTN/M-Pesa/Airtel), offline KDS+serveur (IndexedDB),
tickets fiscaux immuables, TVA multi-pays, langues locales (Wolof, Dyula).

**Manquements résiduels :**
- **Pas de pont comptable vers Atlas F&A / Cockpit** : la donnée fiscale reste dans TableSmart →
  le propriétaire **ressaisit dans sa compta**. Encore la boucle inter-apps.
- Approvisionnement / commandes fournisseurs peu couverts (stock présent, achat amont non listé).
- L'offline ne couvre pas le paiement client (dépend du réseau MoMo) — acceptable, à documenter.

### 3.6 AtlasBanx — *Audit bancaire* — ✅ Promesse A forte / ⚠️ angle mort « Mobile Money »
Relevés en entrée → anomalies classées + rapport SYSCOHADA signable.
47 banques CEMAC/UEMOA, **Ollama local (zéro fuite de données)**, MFA, audit trail SHA-256 : très solide.

**Manquements :**
- **Aucun audit des frais/agios Mobile Money** : il audite les banques mais pas Orange Money/Wave/MTN,
  alors que les frais MoMo abusifs sont une **réalité africaine massive**. Plus grand angle mort produit.
- **Entrée = export manuel** (CSV/Excel/PDF/OFX du relevé) : pas d'agrégation/API bancaire → boucle à l'entrée.
- **Pas d'offline** ; couverture **CEMAC/UEMOA** seulement (pas tout l'OHADA : RDC, Guinée, Comores hors zone).

---

## 4. Manquements transverses (niveau Atlas Studio)

1. **Pas de circulation automatique des données ENTRE vos apps — manquement n°1.**
   Aujourd'hui, le **seul** chemin pour faire passer la donnée *d'une app Atlas à une autre*
   est l'Export → Import Excel manuel. La FAQ affirme « les modules ERP partagent une base
   commune et s'interconnectent » — vrai **uniquement à l'intérieur d'Atlas F&A**. Cockpit,
   Liass'Pilot, AtlasBanx, TableSmart sont des **îlots**.
   Il manque un **chemin automatique (API / bus de données partagé)** — **en complément**, pas
   en remplacement, de l'import Excel : l'utilisateur choisit « depuis Atlas (API) » ou
   « fichier Excel » selon le cas (l'Excel reste requis pour les données externes).
   → **Amorce livrée côté hub** : endpoints `data-exports` / `export-balance` / `balance-exports`
   (publish + pull, tout type de données). Reste à brancher l'option dans chaque app (leurs repos).

2. **Bandeau : deux promesses tenues à moitié.**
   - **« Mode offline (PWA) »** : réellement tenu par **TableSmart** (et partiellement Cockpit).
     Absent d'Atlas F&A, Liass'Pilot, Advist, AtlasBanx → ~2/6.
   - **« IA Proph3t intégrée »** : **absente d'Advist** → « intégrée partout » non tenue.

3. **Pas d'app mobile native** alors que le type « App mobile » existe dans le code
   (TableSmart est une PWA, pas une app native).

4. **Deux apps semblent non déployées** : Liass'Pilot et Advist n'ont pas d'`external_url`.

> **Correction d'un point initialement signalé :** « Mobile Money pour payer Atlas Studio » n'est **pas**
> un manque produit. Vérification du code : le paiement Mobile Money est **implémenté et actif**
> (CinetPay : Orange/MTN/Wave ; edge functions `cinetpay-checkout`/`cinetpay-webhook`,
> `PaymentMethodSelector` dans le tunnel d'abonnement). La FAQ « Mobile Money bientôt disponible »
> était une **erreur de copy périmée** (corrigée — cf. §5).

---

## 5. Réalité vérifiée : le paiement Mobile Money EST actif

Contrôle direct dans ce dépôt :

- `src/types/payment.ts` → `PaymentMethod = 'orange_money' | 'mtn_momo' | 'wave' | 'moov_money' | …`
- `src/components/ui/PaymentMethodSelector.tsx` → propose « Mobile Money — Orange, MTN, Wave »
  (utilisé par `CatalogPage` et `MyAppsPage`).
- `src/lib/payments.ts` → branche `cinetpay` vers l'edge function `cinetpay-checkout`.
- `supabase/functions/` → `cinetpay-checkout`, `cinetpay-webhook`, `initiate-payment`, `payment-webhook`.
- `src/lib/payment/phoneDetector.ts` → détection opérateur CI/SN/CM.

**Conclusion :** la FAQ devait être corrigée (faite), pas le produit.

---

## 6. Recommandations priorisées

| Priorité | Action | Pourquoi |
|---|---|---|
| 🔴 P0 | **Connecteurs natifs inter-apps** (F&A → Cockpit → Liass'Pilot ; TableSmart → F&A), **en complément** de l'import Excel (au choix) — *amorce hub livrée : `data-exports`* | Tient la promesse #1 au niveau suite |
| 🟠 P1 | **Offline/PWA** pour Atlas F&A et AtlasBanx ; **Proph3t** dans Advist | Aligner les apps sur les promesses de bandeau |
| 🟠 P1 | **Liass'Pilot : fiscalité multi-pays réelle** (pas seulement plan comptable) ; **déployer Liass'Pilot & Advist** | Tenir « 17 pays OHADA » côté fiscal + sortir les apps |
| 🟡 P2 | **AtlasBanx : module audit frais Mobile Money** ; **connecteurs/agrégation bancaire** | Couvrir l'angle mort africain n°1 |
| 🟡 P2 | **Advist : OCR/extraction** + référence cadre **OHADA** (pas seulement eIDAS) | Supprimer la ressaisie + crédibilité légale locale |
| 🟡 P2 | **Atlas F&A : télédéclaration/e-invoicing** + import relevés bancaires/MoMo | Étendre la promesse A à l'entrée bancaire |

---

## 7. Réponse courte

Non, toutes les apps ne tiennent pas **encore** pleinement la promesse :

- **TableSmart** la tient le mieux (les deux piliers).
- **Atlas F&A, Cockpit, Liass'Pilot, AtlasBanx** la tiennent *à la sortie* mais, **à l'entrée**, n'offrent que l'import Excel manuel — il leur manque le chemin automatique **en option** (API), Excel restant disponible au choix.
- **Advist** est le plus en décalage avec les promesses transverses (ni IA, ni offline).
- Au niveau suite, **l'absence de circulation automatique des données entre vos propres apps** est le manquement le plus contraire au manifeste.
