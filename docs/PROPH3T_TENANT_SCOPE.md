# Proph3t — Tenant-scope contract (Wave A · TI-1/2/3)

> **Audience:** developers maintaining a satellite app federated with the Atlas
> Studio Proph3t core (Cockpit F&A, TableSmart, AtlasBanx/Scrutix, Liass'Pilot,
> Advist, CockpitJourney, Atlas F&A, …).
>
> **TL;DR:** the core can now refuse a tool call that touches a tenant the
> caller isn't allowed to. To turn that protection on for your app, **sign the
> caller's authorised societies into the SSO token** (claim `allowed_societies`).
> Until you do, nothing changes — the contract is **opt-in and backward-compatible**.

---

## 1. Why this exists

The Proph3t core runs every tool in `service_role` (Supabase RLS is bypassed).
Historically it **trusted** the `society_id` / `tenant_id` that the caller — or
the LLM — put in the tool arguments. A satellite acting for **tenant A** could
therefore read or write **tenant B**'s shared memory, RAG documents and business
rules just by passing B's id (audit findings **TI-1 / TI-2 / TI-3**).

The core **does not own** the satellites' tenant data (each app has its own
Supabase), so it cannot look up "which societies may this user touch?". The only
trustworthy place to assert that perimeter is **inside the signed token**.

## 2. The contract

A new optional claim on the **HS256 SSO JWT** (the same token minted by
`app-token`, signed with the shared `JWT_SECRET` / per-app key):

```jsonc
{
  "userId": "…",
  "appId": "cockpit-fa",
  "aud": "cockpit-fa",
  "allowed_societies": ["soc-uuid-1", "soc-uuid-2"],  // ← NEW (Wave A)
  "iat": 1730000000,
  "exp": 1730028800
}
```

Enforcement, applied in `runTool` **before any tool runs** (so it covers
`proph3t-tool-direct`, the ReAct loop of `proph3t-ask`, every workflow sub-step,
and the L3 dispatcher):

| Token state | Behaviour |
|---|---|
| **No `allowed_societies` claim** | No enforcement — legacy behaviour (backward-compatible). |
| `allowed_societies: ["A","B"]` | **Fail-closed.** A tool arg referencing any society/tenant id **not** in the list → **HTTP 403**. |
| `allowed_societies: []` | Authorises **nothing** — every tenant-scoped tool is refused. |

Two rejection rules:

1. **Membership** — any `society_id`, `tenant_id`, or `scope_id` (when
   `scope === "tenant"`) present in the args **must** be in the perimeter.
2. **Omission guard** — for tools that read tenant rows with an *optional*
   filter (`get_memory`, `get_financial_data`, `search_documents`,
   `search_tenant_documents`, `recall_similar_cases`), a scoped caller **must**
   name an in-scope tenant. Otherwise omitting the id would silently read across
   **all** tenants. No id → 403.

> Non-tenant tools are never affected: pure calculators (`compute_tva`, …),
> global/app knowledge (`search_app_knowledge` with an *app* `scope_id`), and
> `save_semantic_memory` with `scope` `global`/`app`/`user` all pass through.

The reference implementation is
[`tenant_scope.ts`](../supabase/functions/_shared/proph3t/tenant_scope.ts), with
tests in `tenant_scope.test.ts`.

## 3. How to emit the claim (satellite side — the production path)

Because the core can't know your societies, **your app** asserts the perimeter.
You already hold the shared `JWT_SECRET` (you verify the SSO redirect token with
it), so mint a short-lived scoped token **server-side** and use it as the Bearer
when calling the core. **Never** derive the perimeter from a client-supplied
value — that would be self-declaration, i.e. a bypass.

```ts
// satellite backend (edge function / API route) — NOT the browser.
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

async function mintScopedCoreToken(userId: string, appId: string) {
  // 1. Resolve the user's societies from YOUR OWN database (source of truth).
  const allowedSocieties = await db.societiesForUser(userId); // string[]

  // 2. Sign with the SHARED secret (same key family app-token uses).
  const secret = Deno.env.get("ATLAS_JWT_SECRET")!; // the shared JWT_SECRET
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const now = Math.floor(Date.now() / 1000);
  return create(
    { alg: "HS256", typ: "JWT", kid: appId },
    {
      userId, appId, aud: appId,
      allowed_societies: allowedSocieties, // ← the perimeter
      iat: now, exp: now + 15 * 60,        // keep it short (15 min)
    },
    key,
  );
}
```

Then pass that token to the SDK as `userToken`:

```ts
const proph3t = new Proph3tClient({
  product: "cockpit-fa",
  supabaseUrl: ATLAS_CORE_URL,
  apiKey: ATLAS_ANON_KEY,
  userToken: await mintScopedCoreToken(user.id, "cockpit-fa"), // carries the claim
  societyId: currentSocietyId, // MUST be one of allowed_societies
});
```

The SDK already sends `society_id: societyId` on every `runTool` call, so the
core checks that `societyId ∈ allowed_societies`. A mismatch (or a missing
`societyId` on a tenant-read tool) now returns **403** instead of leaking.

### Alternative: core-issued claim

If Atlas Studio core ever owns the tenancy for your app, `app-token` can embed
the claim itself — see `resolveAllowedSocieties()` in
[`app-token/index.ts`](../supabase/functions/app-token/index.ts). It returns
`null` today (claim omitted), so the SSO flow is unchanged until a core source of
truth exists.

## 4. Rollout — this is a versioned, multi-repo contract change

Because each satellite ships the claim independently, **do it per repo, behind a
flag, and verify before enforcing for real users**:

1. **Stage** — mint the scoped token in a non-prod environment. The core starts
   enforcing for that token immediately (fail-closed).
2. **Verify** — run the cross-tenant test below against staging.
3. **Ship** — roll out the scoped-token mint to production for that app.
4. **Track** — `proph3t_audit_log` records `tenant_scoped: true` on
   `proph3t_tool_direct` entries once a scoped token is in use:

   ```sql
   select content->>'app_id' as app,
          (content->>'tenant_scoped')::bool as scoped,
          count(*)
   from proph3t_audit_log
   where action = 'proph3t_tool_direct'
   group by 1, 2 order by 1;
   ```

No flag-day: an app that hasn't shipped the claim keeps working exactly as
before.

## 5. Test it — tenant A must not read tenant B

```bash
# A scoped to society A tries to read society B's rules → expect HTTP 403.
TOKEN_A=$(mint_scoped_token user_a '["A"]')   # your minting helper
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "$ATLAS_CORE_URL/functions/v1/proph3t-tool-direct" \
  -H "authorization: Bearer $TOKEN_A" -H "content-type: application/json" \
  -d '{"tool_name":"get_memory","args":{"society_id":"B","memory_type":"rules"}}'
# → 403  (Acces refuse: tenant 'B' hors du perimetre autorise)

# Same caller omits the id on a tenant-read tool → also 403 (no cross-tenant scan).
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "$ATLAS_CORE_URL/functions/v1/proph3t-tool-direct" \
  -H "authorization: Bearer $TOKEN_A" -H "content-type: application/json" \
  -d '{"tool_name":"recall_similar_cases","args":{"query":"TVA"}}'
# → 403  (Acces refuse: le tool 'recall_similar_cases' exige un society_id/tenant_id…)

# Reading its OWN tenant still works → 200.
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "$ATLAS_CORE_URL/functions/v1/proph3t-tool-direct" \
  -H "authorization: Bearer $TOKEN_A" -H "content-type: application/json" \
  -d '{"tool_name":"get_memory","args":{"society_id":"A","memory_type":"rules"}}'
# → 200
```

Pure unit coverage of the choke point (no network):

```bash
deno test supabase/functions/_shared/proph3t/tenant_scope.test.ts
```

## 6. Residual gaps (tracked separately)

- **`proph3t-ask` / `proph3t-workflow-stream`** authenticate via `requireUser`
  (a core Supabase user), which carries no `allowed_societies` claim → they stay
  unscoped today. The plumbing is in place (`ToolContext.allowed_societies`); a
  one-line change activates it once the core owns a tenancy model. See the
  comments at each `runTool` call site.
- **`service_role`** callers (cron, batch) are intentionally unscoped — trusted
  infra. Keep that key server-side only.
- **Per-app signing keys** (AN-1, item 12) and **core tenancy model** are
  separate work items.
