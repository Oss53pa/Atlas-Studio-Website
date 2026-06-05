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
| Advist | ⚠️ 0 feature Proph3t | ✅ L3 métier signature (OTP/circuit/valeur probante) | claim « SAML » non adossé | aligné (L3) |
| AtlasBanx | ⚠️ | ✅ L3 métier audit (Benford/Z-score/ghost-fees) | id canonique `atlasbanx` + alias `scrutix` | aligné |

\+ ~~**9 apps fantômes**~~ → **purgées** de `proph3t_apps` (migration `20260605140000`) · **Advist** stocke ses tables de signature dans le Core (enfreint « 1 app = 1 Supabase ») · **observabilité** : seul `atlas-studio` émet des erreurs, pas de vue santé par-app.

## DECIDE — registre de risques

### 🔴 CRITIQUE — CONFIRMÉ LIVE — ✅ CORRIGÉ
- **🔥 `is_admin()` = `true` pour TOUT LE MONDE (y compris anon)** — découvert pendant la remédiation. La clause `current_user = 'postgres'` est toujours vraie en contexte `SECURITY DEFINER` → **toutes les RLS `USING(is_admin())` étaient ouvertes** (lecture de profiles, proph3t_*, error_logs… par n'importe qui). Vérifié live : anon `is_admin()` `true`→`false`. → clause supprimée (migration `fix_is_admin_critical_authz_bypass`). **C'est la faille la plus grave de l'audit.**
- **Auto-escalade de privilèges** : RLS UPDATE de `profiles` sans `WITH CHECK` sur `role` → tout user pouvait devenir `super_admin`. → **trigger `trg_guard_profiles_privilege`** (appliqué prod).
- **`admin_revenue_summary()` / `admin_dashboard_stats()`** : SECURITY DEFINER, PUBLIC EXECUTE, **sans contrôle** → CA/users lisibles par anon. → garde `is_admin()` interne.
- **Audit log mutable** : `proph3t_audit_log` sans trigger d'immuabilité + hash partiel. → **trigger append-only** (prod) + **hash élargi** (action/actor/subject).
- **`proph3t-orchestrator` sans auth** (fuite MRR/ARR + noms/emails clients). → **`requireAdmin`** ajouté.

### 🟠 ÉLEVÉ — partiellement traité / staged
- **Secrets en `includes()`** (cron-runner, tool-direct). → ✅ **comparaison exacte**.
- **Isolation multi-tenant** (TI-1/2/3) : `runTool` tourne en service_role (RLS bypass) et faisait confiance au `society_id`/`tenant_id` fourni par l'appelant. → 🟢 **Enforcement Core livré (Wave A)** : claim signé `allowed_societies` exposé par `getFederationUser`, vérifié dans `runTool` (`enforceTenantScope` — membership + garde anti-omission sur les reads tenant), `proph3t-tool-direct` répond **403** hors périmètre. Fail-closed **uniquement si le claim est présent** (rétrocompatible). Tests : `tenant_scope.test.ts`. ⏳ Reste : **adoption satellites** (chaque repo émet le claim via token scopé serveur) + `proph3t-ask`/`-workflow-stream` (auth `requireUser`, non scopés tant que le Core n'a pas de modèle de tenance). Guide : `docs/PROPH3T_TENANT_SCOPE.md`.
- **`proph3t-tool-direct` exécute tout tool pour tout authentifié** (AZ-1) + **`allowed_roles`/`quotas` définis mais jamais lus** (AZ-2). ⏳ Staged.
- **`JWT_SECRET` partagé, sans claim `aud`/`appId`** (AN-1). → ✅ **code** : claim `aud=appId` + header `kid` au mint (`app-token`), vérification d'audience + cohérence `aud===appId` dans `verifySsoToken` (`federation_auth`), refus cross-app SSO dans `databus`, résolution de clé **par app** (`federation_keys` : `JWT_SECRET_<APPID>` avec fallback partagé → rotation opt-in). Tests : `federation_auth.test.ts`. ⏳ Reste : **provisionner** les clés per-app (`JWT_SECRET_<APP>`) côté core + satellites pour activer la rotation/isolation.
- **8 policies RLS `always_true`** + **197 fonctions SECURITY DEFINER exécutables anon/authenticated** (advisors). ⏳ Staged — revue par objet (risque de casser signup/logging).

### 🟡 MOYEN / hygiène
`is_admin()` accepte `current_user='postgres'` (large) · RBAC `admin_roles` cosmétique · CORS `*` + token SSO en query-string · BYOK : fix a perdu `cipher-algo=aes256` (downgrade AES-128) · `vector`/`pg_net` dans `public`.

### Uniformité — DÉCISIONS PRODUIT (pas des failles)
- ✅ **L3 factices Advist/AtlasBanx** : tranché → **vrais tools métier définis**. Advist = signature (`verify_signature_validity`, `generate_otp_challenge`, `define_signature_circuit`, `track_signature_status`, `compute_signature_legal_value`, domaine *documentaire*). AtlasBanx = audit (`apply_benford_analysis`, `compute_zscore_anomalies`, `detect_ghost_fees`, `score_bank_risk_global`, `generate_audit_report_anomalies`, domaine *audit*). Code : `l3_advist.ts` / `l3_atlasbanx.ts` + dispatcher + routing ; registry réaligné (migration `20260605140000`).
- ✅ **9 apps fantômes** : tranché → **purge**. `cashpilot, duedeck, wisehr, wisefm, atlas-lease, atlas-mall-suite, atlastrade, docjourney, cockpit-journey` retirées du registry (cascade `proph3t_tools`) et débranchées du routing. Fichiers `l3_*.ts` conservés en dépôt (réactivables).
- ✅ **Réconciliation des 3 référentiels d'id** : id canonique **`atlasbanx`** ; alias `scrutix→atlasbanx` ajouté à `APP_ID_ALIASES` (rejoint `atlas-compta→atlas-fa`, `taxpilot→liasspilot`) + sous-domaine aligné dans `app-token`. `normalizeAppId()` appliqué en amont du routing SSO→L3 (`detectDomains`), et `product_match` advist/atlasbanx force le bon domaine.
- **Error-SDK + vue santé par satellite** : câbler `captureError(appId,…)` dans chaque satellite. ⏳
- **Claim « SAML » Advist** : retirer ou implémenter. ⏳

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
| 11 | Enforcement tenant via scope signé SSO (Wave A) | ✅ Core (code + testé) — ⏳ **adoption satellites** (émission du claim) |
| 12 | JWT `aud`/appId + audience check + refus cross-app + per-app keys (AN-1) | ✅ code + testé — ⏳ provisioning clés per-app |
| 13 | Réconciliation id `atlasbanx`/`scrutix` + L3 factices + ghost apps | ✅ code + migration `20260605140000` (purge 9 ghosts, réalign L3 advist/atlasbanx, alias scrutix) |

Migrations prod appliquées : `harden_profiles_escalation_and_audit_immutability`, `harden_admin_secdef_functions_and_audit_trail`, `fix_is_admin_critical_authz_bypass`, `byok_restore_aes256_cipher`.
Commits : `de80e76`, `ecf1e3c`, `f764b31`, `b90306f`.

## Wave A (tenant isolation) — état & ce qui reste
Le Core tourne en `service_role` (RLS bypassée) et **ne possède pas** les données tenant des satellites (chaque app = son propre Supabase, cf. `federation_auth.ts`). L'enforcement repose donc sur un **scope porté dans le JWT SSO signé**.

**Livré côté Core (ce monorepo) :**
1. `app-token` peut inscrire `allowed_societies: string[]` au mint (`resolveAllowedSocieties` — renvoie `null` aujourd'hui car le Core n'a pas de source tenant → claim omis, rétrocompatible).
2. `getFederationUser` expose le claim (`FederationUser.allowedSocieties`, sanitisé ; claim malformé → `[]` fail-closed).
3. `runTool` appelle `enforceTenantScope` **avant** tout dispatch (couvre tool-direct, workflows, dispatcher L3) : refuse tout `society_id`/`tenant_id`/`scope_id(tenant)` hors périmètre **et** tout read tenant sans id in-scope (garde anti-omission). `proph3t-tool-direct` mappe → **403**. No-op si le claim est absent.
4. Tests purs : `supabase/functions/_shared/proph3t/tenant_scope.test.ts` (dont « tenant A ne lit pas tenant B »).

**Reste (hors de ce monorepo / produit) :**
- **Adoption par chaque repo satellite** : émettre le claim via un token scopé minté **serveur** (recette + rollout dans `docs/PROPH3T_TENANT_SCOPE.md`). Tant qu'un satellite n'émet pas le claim, son comportement est inchangé.
- `proph3t-ask` / `proph3t-workflow-stream` : auth `requireUser` (utilisateur Supabase core) → pas de claim → non scopés. Plomberie en place (`ToolContext.allowed_societies`), à activer si le Core se dote d'un modèle de tenance.
