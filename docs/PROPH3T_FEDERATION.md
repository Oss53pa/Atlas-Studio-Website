# Proph3t — Federation guide for satellite apps

> **Audience:** developers maintaining a satellite app (Cockpit FnA,
> TableSmart, AtlasBanx, Liass'Pilot, Advist, AtlasLease, WiseHR, …).
>
> **Goal:** plug your local Proph3t agent into the Atlas Studio shared core so
> users get cross-app memory, shared SYSCOHADA knowledge, the 197-tool registry
> and an OHADA-grade audit chain — **without giving up your local LLM**.

---

## Scope — apps enregistrées dans Atlas Studio admin

Seules les apps déjà publiées dans le catalogue Atlas Studio (table `apps`,
visible dans `Admin → Applications`) sont en scope pour la fédération
Proph3t. Les autres apps explorées localement (Atlas Mall Suite, AtlasLease,
WiseFM, WiseHR, DueDeck, CashPilot, DocJourney, AtlasTrade, Scrutix) sont
hors scope tant qu'elles ne sont pas publiées.

### État courant (audit du 2026-05-14)

| App registry | `product` (app_id) | Repo local | Local Proph3t | Hooked to core |
|---|---|---|---|---|
| Atlas F&A | `atlas-fa` | `atlas-fa-api` | ❌ pas d'agent | ❌ |
| Liass'Pilot | `liasspilot` | `LiasseConnect` | ❌ pas d'agent | ❌ |
| Advist | `advist` | `Advist` | ❌ pas d'agent | ❌ |
| Cockpit F&A | `cockpit-fa` | `Cockpit FnA` | ✅ moteur in-memory (`Proph3tIntelligence.tsx`) | ❌ |
| AtlasBanx | `atlasbanx` | `Scrutix` *(même app)* | ✅ engine local (`intelligence-gateway`) | ❌ |
| CockpitJourney | `cockpit-journey` | `CockpitJourney` | ✅ Groq/OpenRouter direct | ❌ |
| TableSmart | `tablesmart` | `TableSmart` | ✅ `ai-proxy` edge fn (Claude) | ❌ |

**7 apps en scope, 0 fédérée.** Ce guide corrige ça.

> **Note de nommage** — AtlasBanx (nom commercial dans le catalogue Atlas
> Studio) et Scrutix (nom de code du repo) désignent la **même application**.
> Le `product` à utiliser côté SDK est `atlasbanx`.

### Stratégie de migration par profil

- **Apps avec un agent local mature** (Cockpit F&A, AtlasBanx/Scrutix,
  CockpitJourney, TableSmart) → garder l'agent local, **ajouter les 4 hooks**
  du SDK (recall, knowledge, runTool, audit). Migration ~1h/app.
- **Apps sans agent** (Atlas F&A, Liass'Pilot, Advist) → soit démarrer avec
  un agent local minimal + SDK, soit déléguer 100 % au core via
  `proph3t-ask`. Le choix dépend de la criticité latence.

---

## Architecture — fédération, pas centralisation

The local Proph3t agent stays in charge of the LLM call. The central core
provides **enrichment** and **persistence**:

```
                       Atlas Studio Core (Supabase)
                       https://vgtmljfayiysuvrcmunt.supabase.co
                       ┌─────────────────────────────────────┐
                       │ proph3t_memory_episodic / _semantic │  ← recall()
                       │ proph3t_knowledge (RAG SYSCOHADA)   │  ← searchKnowledge()
                       │ proph3t_tools (197 tools)           │  ← runTool()
                       │ proph3t_audit_log (chained SHA-256) │  ← logAudit()
                       └─────────────────────────────────────┘
                                       ▲
                  HTTPS (CORS *, JWT user from app-token)
                                       │
                 ┌─────────────────────┼─────────────────────┐
                 │                     │                     │
            Cockpit FnA            TableSmart            AtlasBanx  …
            local LLM agent        local LLM agent       local LLM agent
            (Ollama)               (Claude)              (Groq)
```

**Properties:**
- The end user's free-text message never leaves the app. The core only sees
  enrichment queries (`recall query`, `search query`, `tool name + args`).
- If the core is down, the local agent degrades gracefully (no cross-app
  memory, no central tools) but **keeps answering**.
- LLM cost stays where it is — no surprise mutualisation, no vendor lock-in.

---

## Integration in 5 minutes

### 1. Install the SDK

```bash
npm install @atlas-studio/proph3t-client
```

### 2. Initialise once

```ts
// src/lib/proph3t.ts
import { Proph3tClient } from "@atlas-studio/proph3t-client";
import { supabase } from "./supabase";

export async function getProph3t() {
  const { data: { session } } = await supabase.auth.getSession();
  return new Proph3tClient({
    product: "cockpit-fa",                                       // your app_id
    supabaseUrl: import.meta.env.VITE_ATLAS_SUPABASE_URL,
    apiKey: import.meta.env.VITE_ATLAS_SUPABASE_ANON_KEY,
    userToken: session?.access_token,
    societyId: useSocietyStore.getState().currentSocietyId,
  });
}
```

> **Note:** `VITE_ATLAS_SUPABASE_URL` points at the **Atlas Studio core
> project** (`vgtmljfayiysuvrcmunt`), not your app's own Supabase project.
> They can be different.

### 3. Replace your local memory by central recall

**Before (silo)**:

```ts
const past = await localDb.from("ai_history").select("*").limit(5);
```

**After (federated)**:

```ts
const proph3t = await getProph3t();
const past = await proph3t.recall({ query: userMessage, limit: 5 });
```

### 4. Ground your prompt in the shared knowledge base

```ts
const refs = await proph3t.searchKnowledge({
  query: userMessage,
  sourceType: "syscohada",
  topK: 5,
});

const systemPrompt = `Tu es Proph3t (Cockpit FnA).
Cite uniquement les sources ci-dessous, jamais autre chose :
${refs.map((r, i) => `[${i+1}] ${r.title} — ${r.excerpt}`).join("\n")}`;
```

### 5. Delegate heavy compute to a central tool

```ts
// Replace your local implementation of IRPP/IS/TVA calculators by:
const r = await proph3t.runTool({
  name: "compute_irpp_uemoa",
  args: { salaire_brut: 500_000, pays: "CI" },
});
```

Browse the full tool registry:
```bash
curl "https://vgtmljfayiysuvrcmunt.supabase.co/rest/v1/proph3t_tools?select=name,level,domain,app_id,description&is_active=eq.true&order=level" \
  -H "apikey: $VITE_ATLAS_SUPABASE_ANON_KEY"
```

### 6. Persist what the local agent learnt + audit

```ts
// User said "next time, group invoices by month"
await proph3t.rememberFact({
  subject: "invoice_grouping_preference",
  fact: "L'utilisateur préfère grouper les factures par mois",
  source: "user_explicit_request",
  scope: "user",
});

// Every Proph3t response goes in the audit chain
await proph3t.logAudit({
  action: "ai_response",
  subjectType: "society",
  subjectId: societyId,
  content: { question_len: userMessage.length, model: "claude-sonnet-4-6", confidence: 0.78 },
});
```

---

## App identifiers (catalogue Atlas Studio)

Pass the right `product` in the constructor — it drives L3 tool routing:

| `product` | App registry | Domain mapped | L3 tools (5 each) |
|---|---|---|---|
| `atlas-fa` | Atlas F&A (Module ERP) | finance | consolidate_group_accounts, compute_intercompany_eliminations, generate_reporting_pnl, compute_free_cash_flow, compute_wacc_company |
| `liasspilot` | Liass'Pilot | fiscal | generate_liasse_fiscale, check_conformite_fiscale, compute_acomptes_provisionnels, generate_declaration_tva, detect_erreurs_liasse |
| `advist` | Advist (signature électronique) | documentaire | verify_signature_validity, generate_otp_challenge, define_signature_circuit, track_signature_status, compute_signature_legal_value |
| `cockpit-fa` | Cockpit F&A | finance | compute_kpi_dashboard, detect_cycle_breaks, forecast_dso_evolution, compute_grand_livre_summary, validate_clos_exercice, … |
| `atlasbanx` | AtlasBanx (audit bancaire ; alias `scrutix`) | audit | apply_benford_analysis, compute_zscore_anomalies, detect_ghost_fees, score_bank_risk_global, generate_audit_report_anomalies |
| `tablesmart` | TableSmart | retail | compute_addition_table, compute_taux_occupation_salle, analyze_menu_performance, forecast_approvisionnement, compute_pourboire_repartition |

Toutes ces apps ont déjà leur bundle L3 défini dans
[`L3_TOOLS_BY_APP`](../supabase/functions/_shared/proph3t/routing.ts) — la
mécanique côté core est prête.

Si tu publies une nouvelle app dans le catalogue Atlas Studio, ajoute son
`app_id` dans cette table et déclare ses 5 tools dans `L3_TOOLS_BY_APP` +
`L3_DISPATCHER`.

---

## Auth model

The SDK supports two modes:

- **JWT user (recommended)** — pass `userToken` = the Supabase session
  `access_token`. RLS applies. The user sees only their own memories.
- **Anon key only** — pass only `apiKey`. Useful for landing pages / demos.
  Most central endpoints will refuse.

For server-to-server (cron, batch), use the Atlas Studio service role key as
`apiKey` and omit `userToken`. RLS is bypassed — handle authz yourself.

### Tenant isolation — the `allowed_societies` claim (Wave A · TI-1/2/3)

The core runs tools in `service_role` and used to trust the `society_id` you
pass. It can now **refuse** a tool call that touches a society outside the
caller's signed perimeter. To enable it for your app, sign the user's authorised
societies into the SSO token (`allowed_societies: string[]`) — minted
**server-side**, never from a client value. Enforcement is **opt-in and
fail-closed only when the claim is present**, so nothing breaks until you ship it.

Full contract, minting recipe, rollout and test plan:
**[PROPH3T_TENANT_SCOPE.md](./PROPH3T_TENANT_SCOPE.md)**.

---

## Rollout plan (7 apps registry-only)

Ordre conseillé, du plus mûr au plus simple :

1. **Cockpit F&A** (pilote) — 4 abonnés, moteur in-memory mature à brancher.
   Cas d'usage parfait pour valider les 4 hooks en prod sans risque.
2. **CockpitJourney** — déjà sur Groq/OpenRouter, juste à factoriser via le SDK.
3. **TableSmart** — déjà sur Claude via `ai-proxy`, remplacer par `runTool` +
   `searchKnowledge` pour bénéficier du RAG SYSCOHADA.
4. **AtlasBanx** (repo `Scrutix`) — engine local en place, ajouter les 4 hooks.
5. **Atlas F&A**, **Liass'Pilot**, **Advist** — pas d'agent existant, ship
   directement avec le SDK fédéré (pas de legacy à dégager).

Track progress by querying:

```sql
select content->>'app_id' as app, action, count(*)
from proph3t_audit_log
where action in ('proph3t_tool_direct', 'audit_trail_write')
  and (content->>'app_id') is not null
group by 1, 2
order by 1, 2;
```

Each `app_id` that shows up = an app that has shipped the federation.

## Hors-scope (à reconsidérer plus tard)

Apps explorées localement mais **non enregistrées** dans le catalogue Atlas
Studio aujourd'hui : Atlas Mall Suite, AtlasLease, AtlasTrade, CashPilot,
DocJourney, DueDeck, WiseFM, WiseHR. Si elles sont publiées plus tard,
elles pourront reprendre le même SDK — le mapping L3 existe déjà côté core
pour la plupart.

(Le repo `Scrutix` n'est pas hors-scope : c'est le code source d'AtlasBanx,
déjà listé dans le scope ci-dessus.)
