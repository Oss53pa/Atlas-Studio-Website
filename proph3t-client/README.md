# @atlas-studio/proph3t-client

Federation client for **Proph3t**, the Atlas Studio shared AI core.

Each satellite app (Cockpit FnA, TableSmart, AtlasBanx, Liass'Pilot, Advist…)
keeps its **own local LLM agent** (Ollama / Groq / Claude — your choice, your
latency, your sovereignty). This client only plugs the local agent into the
**shared central capabilities** that the core already exposes:

| Hook | What the central core gives you |
|---|---|
| `recall()` | Cross-app user memory — a fact saved in Cockpit FnA is recallable from TableSmart |
| `searchKnowledge()` | RAG over SYSCOHADA, AUDCIF, OHADA doctrine, country CGI |
| `runTool()` | 197 centrally maintained tools (compute_irpp_uemoa, generate_liasse_fiscale, …) |
| `logAudit()` | Chained SHA-256 audit log, OHADA-grade (10 years retention) |

The central core **never receives the end user's free-text message**. The local
agent does the LLM call and the prompt engineering; this SDK is just an
enrichment + persistence layer.

## Install

```bash
npm install @atlas-studio/proph3t-client
```

## Initialise

```ts
import { Proph3tClient } from "@atlas-studio/proph3t-client";

const proph3t = new Proph3tClient({
  product: "cockpit-fa",                                         // your app id
  supabaseUrl: "https://vgtmljfayiysuvrcmunt.supabase.co",
  apiKey: process.env.VITE_SUPABASE_ANON_KEY!,
  userToken: supabaseSession.access_token,                       // Supabase user JWT
  societyId: currentSocietyId,                                   // optional multi-tenant
});
```

The `product` field is **required** — it routes calls to the right L3 tool
bundle on the core (see `supabase/functions/_shared/proph3t/routing.ts`).

## Recipes

### 1. Ground your local LLM in SYSCOHADA doctrine

```ts
const refs = await proph3t.searchKnowledge({
  query: userMessage,
  scope: "global",
  sourceType: "syscohada",
  topK: 5,
});

const systemPrompt = `Tu es Proph3t (Cockpit FnA).
Cite uniquement les sources ci-dessous, jamais autre chose :
${refs.map((r, i) => `[${i+1}] ${r.title} — ${r.excerpt}`).join("\n")}`;
```

### 2. Recall what the user already knows / has done

```ts
const memories = await proph3t.recall({ query: userMessage, limit: 5 });
const userContext = memories.map(m => `- ${m.subject}: ${m.content}`).join("\n");
```

### 3. Delegate heavy compute to a central tool

```ts
const liasse = await proph3t.runTool({
  name: "generate_liasse_fiscale",
  args: { exercice: 2025, balance_id: balanceId, pays: "CI" },
});
```

### 4. Persist what the local agent learnt

```ts
await proph3t.remember({
  eventType: "anomaly_detected",
  eventData: { account: "411000", amount: -2_500_000, reason: "credit anormal" },
});

await proph3t.logAudit({
  action: "ai_response",
  subjectType: "society",
  subjectId: societyId,
  content: { question_length: userMessage.length, confidence: 0.78 },
});
```

## Architecture (federation, not centralisation)

```
            ┌───────────────────────────────────────────┐
            │           Atlas Studio Core               │
            │  ┌──────────────────────────────────────┐ │
            │  │  Proph3t shared memory               │ │
            │  │  Proph3t knowledge (SYSCOHADA RAG)   │ │
            │  │  Proph3t tools registry (197)        │ │
            │  │  Proph3t chained audit log           │ │
            │  └──────────────────────────────────────┘ │
            │      ▲                                    │
            └──────│────────────────────────────────────┘
                   │ HTTPS (CORS *, JWT user or anon)
   ┌───────────────┼──────────────┬────────────────┬──────────────┐
   │               │              │                │              │
[Cockpit FnA]  [TableSmart]  [AtlasBanx]   [Liass'Pilot]    [Advist] …
   │               │              │                │              │
   ▼               ▼              ▼                ▼              ▼
local LLM      local LLM      local LLM        local LLM       local LLM
(Ollama)       (Anthropic)    (Groq)           (Ollama)        (Groq)
```

The arrows are **one-way enrichment** — the local LLM stays in charge. If the
central core is down, each local agent keeps working with degraded context
(no cross-app memory, no central tools) but still answers.

## Error handling

All errors throw `Proph3tError` with `.status`, `.endpoint`, `.body`. A common
pattern is to wrap every call in a non-fatal try/catch so a central outage
doesn't break the user's local session:

```ts
import { Proph3tError } from "@atlas-studio/proph3t-client";

async function safeRecall(query: string) {
  try {
    return await proph3t.recall({ query });
  } catch (err) {
    if (err instanceof Proph3tError) console.warn("proph3t-core down:", err.message);
    return [];
  }
}
```

## License

MIT — Atlas Studio
