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
- **🔥 `is_admin()` = `true` pour TOUT LE MONDE (y compris anon)** — découvert pendant la remédiation. La clause `current_user = 'postgres'` est toujours vraie en contexte `SECURITY DEFINER` → **toutes les RLS `USING(is_admin())` étaient ouvertes** (lecture de profiles, proph3t_*, error_logs… par n'importe qui). Vérifié live : anon `is_admin()` `true`→`false`. → clause supprimée (migration `fix_is_admin_critical_authz_bypass`). **C'est la faille la plus grave de l'audit.**
- **Auto-escalade de privilèges** : RLS UPDATE de `profiles` sans `WITH CHECK` sur `role` → tout user pouvait devenir `super_admin`. → **trigger `trg_guard_profiles_privilege`** (appliqué prod).
- **`admin_revenue_summary()` / `admin_dashboard_stats()`** : SECURITY DEFINER, PUBLIC EXECUTE, **sans contrôle** → CA/users lisibles par anon. → garde `is_admin()` interne.
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
| 0 | **FIX `is_admin()` bypass total** | ✅ prod + versionné + testé |
| 1 | Trigger anti-escalade `profiles` | ✅ prod + versionné |
| 2 | Trigger append-only `proph3t_audit_log` | ✅ prod + versionné |
| 3 | `requireAdmin` sur `proph3t-orchestrator` | ✅ code |
| 4 | Secrets en comparaison exacte | ✅ code |
| 5 | Hash audit élargi (action/actor/subject) | ✅ code |
| 6 | Garde `is_admin()` sur admin_revenue/dashboard | ✅ prod + versionné |
| 7 | `notify_admins_via_email` : EXECUTE retiré à PUBLIC | ✅ prod |
| 8 | `proph3t_audit_trail` INSERT → service_role | ✅ prod |
| 9 | `allowed_roles` enforcé dans tool-direct (Wave B) | ✅ code |
| 10 | BYOK `cipher-algo=aes256` (Wave D) | ✅ prod + versionné |
| 11 | Enforcement tenant via scope signé SSO (Wave A) | ⏳ **nécessite coordination satellites** |
| 12 | JWT `aud`/appId + per-app keys | ⏳ |
| 13 | Réconciliation id `atlasbanx`/`scrutix` + L3 factices + ghost apps | ⏳ décisions produit |

Migrations prod appliquées : `harden_profiles_escalation_and_audit_immutability`, `harden_admin_secdef_functions_and_audit_trail`, `fix_is_admin_critical_authz_bypass`, `byok_restore_aes256_cipher`.
Commits : `de80e76`, `ecf1e3c`, `f764b31`, `b90306f`.

## Wave A (tenant isolation) — pourquoi ce n'est pas auto-corrigible
Le Core tourne en `service_role` (RLS bypassée) et **ne possède pas** les données tenant des satellites (chaque app = son propre Supabase, cf. `federation_auth.ts`). Pour enforcer `args.society_id`, il faut **porter le scope autorisé dans le JWT SSO signé** :
1. `app-token` (ou le satellite) ajoute un claim `allowed_societies: string[]` au JWT.
2. `getFederationUser` expose ce scope ; `runTool`/`proph3t-ask` rejettent si `args.society_id ∉ scope`.
3. Adoption par **chaque repo satellite** (hors de ce monorepo).
Tant que les satellites n'émettent pas ce claim, l'enforcement Core serait soit un no-op, soit cassant. → à planifier comme un changement de contrat versionné.
