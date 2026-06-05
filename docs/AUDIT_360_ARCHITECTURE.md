# Audit 360° — Architecture Atlas Studio (boucle OODA)

> Date : 2026-06-05 · Périmètre : ce monorepo (site + portail + console + Proph3t Core + edge functions + migrations) + projet Supabase Core `vgtmljfayiysuvrcmunt`.
> Les apps satellites ont leur propre repo / projet Supabase : seul leur **contrat** d'intégration est auditable ici.

## TL;DR

La connexion des apps au Core **n'est pas uniforme** et plusieurs **failles de sécurité réelles** existaient dans le workflow. Les *criticals confirmés en live* sont **corrigés** (Sprint 0). Le reste est priorisé ci-dessous ; certains points sont des **décisions produit** ou des **changements de contrat** (multi-repos) qui ne peuvent pas être auto-appliqués sans casse.

---

## OBSERVE — architecture réelle

**Core Proph3t = 5 endpoints, auth hétérogène :**

| Endpoint | Auth | Note |
|---|---|---|
| `proph3t-ask` | JWT user Supabase only | Mode B hébergé |
| `proph3t-tool-direct` | JWT user / SSO HS256 / service_role | Mode A fédéré |
| `proph3t-workflow-stream` | JWT user only | |
| `proph3t-cron-runner` | secret partagé | |
| `proph3t-orchestrator` | ❌ aucune (corrigé) | KPI/PII |

**Câblage standard d'une app = 6 maillons** : catalogue `content.ts` → `products` (trigger) → plans/features → SSO `app-token` (JWT HS256) → registry `proph3t_apps` → L3 tools + databus. **3 référentiels d'identité** non alignés (`apps.id`, `products.slug`, `proph3t_apps.id`).

## ORIENT — uniforme ou pas ?

| App | Core | L3 | SSO | Verdict |
|---|---|---|---|---|
| TableSmart | ✅ | ✅ | ✅ | conforme |
| Cockpit F&A | ✅ | ✅ | ✅ | conforme |
| Atlas F&A | ✅ | ✅ | ⚠️ 3 ids (alias OK) | rustines |
| Liass'Pilot | ✅ | ⚠️ clé `liasspilot` | alias `taxpilot→liasspilot` existe | à vérifier en bout de chaîne |
| Advist | ⚠️ 0 feature Proph3t | ❌ L3 hors-métier (conseil ≠ signature) | claim « SAML » non adossé | trompeur |
| AtlasBanx | ⚠️ | ❌ L3 hors-métier (crédit ≠ audit anomalies) | codename `scrutix` vs `atlasbanx` | déviant |

\+ **9 apps fantômes** dans `proph3t_apps` sans existence commerciale · **Advist** stocke ses tables de signature dans le Core (enfreint « 1 app = 1 Supabase ») · **observabilité** : seul `atlas-studio` émet des erreurs, pas de vue santé par-app.

## DECIDE — registre de risques

### 🔴 CRITIQUE — CONFIRMÉ LIVE — ✅ CORRIGÉ
- **Auto-escalade de privilèges** : RLS UPDATE de `profiles` sans `WITH CHECK` sur `role` → tout user pouvait devenir `super_admin`. → **trigger `trg_guard_profiles_privilege`** (appliqué prod).
- **Audit log mutable** : `proph3t_audit_log` sans trigger d'immuabilité + hash partiel. → **trigger append-only** (prod) + **hash élargi** (action/actor/subject).
- **`proph3t-orchestrator` sans auth** (fuite MRR/ARR + noms/emails clients). → **`requireAdmin`** ajouté.

### 🟠 ÉLEVÉ — partiellement traité / staged
- **Secrets en `includes()`** (cron-runner, tool-direct). → ✅ **comparaison exacte**.
- **Isolation multi-tenant** (TI-1/2/3) : `runTool` tourne en service_role (RLS bypass) et fait confiance au `society_id`/`tenant_id` fourni par l'appelant. ⏳ **Staged — changement de contrat** : le Core ne possède pas les données tenant des satellites ; l'enforcement exige de porter le scope autorisé (`allowed_societies`) **dans le JWT SSO signé** (app-token + adoption satellites), puis `args.society_id ∈ scope`.
- **`proph3t-tool-direct` exécute tout tool pour tout authentifié** (AZ-1) + **`allowed_roles`/`quotas` définis mais jamais lus** (AZ-2). ⏳ Staged.
- **`JWT_SECRET` partagé, sans claim `aud`/`appId`** (AN-1). ⏳ Staged (per-app keys).
- **8 policies RLS `always_true`** + **197 fonctions SECURITY DEFINER exécutables anon/authenticated** (advisors). ⏳ Staged — revue par objet (risque de casser signup/logging).

### 🟡 MOYEN / hygiène
`is_admin()` accepte `current_user='postgres'` (large) · RBAC `admin_roles` cosmétique · CORS `*` + token SSO en query-string · BYOK : fix a perdu `cipher-algo=aes256` (downgrade AES-128) · `vector`/`pg_net` dans `public`.

### Uniformité — DÉCISIONS PRODUIT (pas des failles)
- **L3 factices Advist/AtlasBanx** : les vrais tools métier (signature/OTP ; Benford/Z-score) doivent être définis — *impossible à inventer sans input produit*.
- **9 apps fantômes** : décider purge vs activation commerciale.
- **Réconciliation des 3 référentiels d'id** : table de mapping canonique unique.
- **Error-SDK + vue santé par satellite** : câbler `captureError(appId,…)` dans chaque satellite.
- **Claim « SAML » Advist** : retirer ou implémenter.

## ACT — état de remédiation

| # | Action | Statut |
|---|---|---|
| 1 | Trigger anti-escalade `profiles` | ✅ prod + versionné |
| 2 | Trigger append-only `proph3t_audit_log` | ✅ prod + versionné |
| 3 | `requireAdmin` sur `proph3t-orchestrator` | ✅ code |
| 4 | Secrets en comparaison exacte | ✅ code |
| 5 | Hash audit élargi (action/actor/subject) | ✅ code |
| 6 | Enforcement tenant via scope signé (SSO) | ⏳ design — multi-repos |
| 7 | `allowed_roles` + quotas dans tool-direct/ask | ⏳ |
| 8 | JWT `aud`/appId + per-app keys | ⏳ |
| 9 | Durcir RLS `always_true` + SECURITY DEFINER | ⏳ revue par objet |
| 10 | BYOK `cipher-algo=aes256` | ⏳ |
| 11 | Uniformité id / L3 / ghost apps / observabilité | ⏳ décisions produit |

Commits : `de80e76` (Sprint 0 sécurité). Migration prod : `harden_profiles_escalation_and_audit_immutability`.
