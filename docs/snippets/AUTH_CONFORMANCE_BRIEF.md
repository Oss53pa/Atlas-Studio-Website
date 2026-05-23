# BRIEF — Vérifier/aligner l'authentification d'une app sur le standard Atlas Studio

> À coller dans une session Claude Code ouverte **dans le dépôt de chaque app**
> (atlas-fa-api, LiasseConnect, Cockpit FnA, Scrutix, Advist, TableSmart,
> CockpitJourney). Une exécution par app. Référence canonique :
> `oss53pa/atlas-studio-website` → `docs/AUTH_TEMPLATE.md`.

## Objectif
Garantir que TOUTES les apps suivent le **même schéma d'auth** : 4 routes
standard, SSO Atlas Studio, et le flux d'invitation/onboarding unifié.

## Contrat canonique à respecter

### 1. Quatre routes d'auth (copiées du portail)
| Route | Champs | Redirection après succès |
|---|---|---|
| `/login` | email + mot de passe | `/` (accueil de l'app) |
| `/signup` | nom + email + mot de passe + CGU | `/` (auto-login) |
| `/forgot-password` | email (jamais de leak d'existence de compte) | écran « email envoyé » |
| `/reset-password` | nouveau mdp + confirmation (écoute l'event `PASSWORD_RECOVERY`) | `/` |

Respecter aussi le param `?next=` : `const next = new URLSearchParams(location.search).get("next") || "/";`

### 2. SSO Atlas Studio (contrat RÉEL — fait foi)
Le portail lance l'app via l'edge function `app-token`, qui redirige vers :
```
https://<sous-domaine>.atlas-studio.org/auth?token=<JWT HS256>
```
⚠️ Le param est **`/auth?token=`** (et NON `?atlas_token=` comme l'écrit
l'ancien doc). L'app DOIT :
- exposer une route **`/auth`** qui lit `?token=`, valide le JWT (HS256, secret
  partagé `JWT_SECRET` / via l'edge function `atlas-sso` si présente),
  établit une session Supabase, puis redirige vers `/`.
- sur `/login`, afficher un bouton **« Se connecter avec Atlas Studio »** →
  `https://atlas-studio.org/portal/login?next=${window.location.origin}`.

JWT payload émis par le core : `{ userId, email, fullName, appId, plan, iat, exp(+8h) }`.

### 3. Flux d'invitation (collaborateur) — NOUVEAU, unifié
1. L'admin invite depuis le portail/app → email HTML Atlas Studio **nommant
   l'app** + lien `https://atlas-studio.org/invite/<token>`.
2. Le collaborateur ouvre le lien → page d'acceptation du **portail** : prénom,
   nom, mot de passe + confirmation (email prouvé par le magic-link, pas
   d'écran « confirme ton email » séparé).
3. Après acceptation → le portail redirige vers
   **`/portal/launch?appId=<slug>`** → SSO → **`/auth?token=` de l'app** → `/`.
→ Donc, côté app, il suffit d'implémenter correctement **`/auth?token=`** (point 2) :
  le collaborateur arrive authentifié sur l'accueil de l'app.

### 4. Style — Midnight Emerald
Fond `#0A0F1A`, cartes `#0E1525`, accent émeraude `#10B981→#34D399→#6EE7B7`,
wordmark champagne « Atlas Studio », titres Inter, body Exo 2. (Voir
`tailwind.config.js` / `src/index.css` du repo website.)

## CHECKLIST DE VÉRIFICATION (dans CE dépôt)
- [ ] Les 4 routes existent et ont les bons champs + redirections (`/` pour une app).
- [ ] Route **`/auth`** : lit `?token=`, valide le JWT, ouvre la session, redirige `/`.
- [ ] Bouton « Se connecter avec Atlas Studio » sur `/login`.
- [ ] `/forgot-password` ne révèle pas l'existence du compte.
- [ ] `/reset-password` écoute `PASSWORD_RECOVERY` puis `updateUser({password})`.
- [ ] CGU obligatoire au signup (stockée `profiles.terms_accepted_at` + `terms_version`).
- [ ] Variables d'env : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
      `VITE_ATLAS_STUDIO_URL=https://atlas-studio.org`.
- [ ] Le `product`/`appId` utilisé = le **slug catalogue** de l'app (voir tableau).
- [ ] Toutes routes hors auth = **protégées** (redirigent vers `/login` si non connecté).

## TABLEAU PAR APP
| App | repo | slug (appId) | sous-domaine SSO |
|---|---|---|---|
| Atlas F&A | atlas-fa-api | `atlas-compta` | atlas-fna |
| Liass'Pilot | LiasseConnect | `taxpilot` | liasspilot |
| Cockpit F&A | Cockpit FnA | `cockpit-fa` | cockpit-fna |
| AtlasBanx | Scrutix | `atlasbanx` | scrutix/atlasbanx |
| Advist | Advist | `advist` | advist |
| TableSmart | TableSmart | `tablesmart` | tablesmart |
| CockpitJourney | CockpitJourney | `cockpit-journey` | cockpit-journey |

## TA MISSION
1. Auditer l'app contre la checklist ci-dessus ; lister les écarts.
2. Corriger les écarts (copier/adapter les 4 pages auth du portail si absentes ;
   implémenter/réparer `/auth?token=` ; ajouter le bouton SSO).
3. Ne PAS casser une auth locale existante qui fonctionne (ajouter le SSO À CÔTÉ).
4. Tester : login, signup, reset, et surtout l'arrivée via `/auth?token=`.
5. Commit + PR décrivant la conformité atteinte.

## PIÈGES CONNUS (vérifiés côté hub)
- Doc vs réalité : le SSO utilise **`/auth?token=`**, pas `?atlas_token=`.
- `app-token` exige aujourd'hui un **abonnement actif** (`subscriptions`) pour
  l'`appId` ; un collaborateur invité est un **siège** (`licence_seats`). Si le
  collaborateur n'a pas de ligne `subscriptions`, le SSO peut renvoyer 403 →
  vérifier comment l'app autorise l'accès des sièges (à remonter si bloquant).
- `products.app_url` est NULL pour `taxpilot` : ne pas s'appuyer dessus, utiliser
  le SSO `app-token` (mapping de sous-domaine intégré).
