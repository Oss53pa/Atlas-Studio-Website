// Unit tests for the Wave A tenant-scope enforcement (Audit 360° — TI-1/2/3).
//
//   deno test supabase/functions/_shared/proph3t/tenant_scope.test.ts
//
// No network / Supabase needed — this exercises the pure choke point that all
// three Proph3t entrypoints (proph3t-ask, proph3t-tool-direct,
// proph3t-workflow-stream) call before running a tool.

import { assertThrows } from "https://deno.land/std@0.224.0/assert/assert_throws.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { enforceTenantScope, TenantScopeError } from "./tenant_scope.ts";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

// ── The core threat: tenant A must NOT read tenant B ─────────────────────────

Deno.test("blocks reading another tenant's memory (society_id)", () => {
  assertThrows(
    () => enforceTenantScope({ tool: "get_memory", args: { society_id: B, memory_type: "rules" }, allowedSocieties: [A] }),
    TenantScopeError,
    "hors du perimetre",
  );
});

Deno.test("blocks reading another tenant's documents (tenant_id)", () => {
  assertThrows(
    () => enforceTenantScope({ tool: "search_tenant_documents", args: { query: "bilan", tenant_id: B }, allowedSocieties: [A] }),
    TenantScopeError,
  );
});

Deno.test("blocks writing semantic memory into another tenant (scope/scope_id)", () => {
  assertThrows(
    () => enforceTenantScope({ tool: "save_semantic_memory", args: { scope: "tenant", scope_id: B, fact: "x", source: "manual" }, allowedSocieties: [A] }),
    TenantScopeError,
  );
});

// ── Omission bypass: a scoped caller cannot read "all tenants" by omitting id ─

Deno.test("blocks tenant-read tools when no tenant id is supplied by a scoped caller", () => {
  assertThrows(
    () => enforceTenantScope({ tool: "recall_similar_cases", args: { query: "TVA" }, allowedSocieties: [A] }),
    TenantScopeError,
    "exige un society_id",
  );
});

// ── Allowed paths ────────────────────────────────────────────────────────────

Deno.test("allows reading own tenant", () => {
  enforceTenantScope({ tool: "get_memory", args: { society_id: A, memory_type: "rules" }, allowedSocieties: [A, B] });
});

Deno.test("allows non-tenant tools without an id (e.g. pure calculators)", () => {
  enforceTenantScope({ tool: "compute_tva", args: { base_ht_centimes: "100000", country: "CI" }, allowedSocieties: [A] });
});

Deno.test("allows global/app knowledge search (scope_id is an app id, not a tenant)", () => {
  enforceTenantScope({ tool: "search_app_knowledge", args: { query: "AUDCIF", scope_id: "cockpit-fa" }, allowedSocieties: [A] });
});

Deno.test("allows global semantic memory write (scope != tenant)", () => {
  enforceTenantScope({ tool: "save_semantic_memory", args: { scope: "global", scope_id: "cockpit-fa", fact: "x", source: "manual" }, allowedSocieties: [A] });
});

// ── Backward compatibility: no claim → no enforcement ────────────────────────

Deno.test("no claim (undefined) → enforcement skipped entirely", () => {
  enforceTenantScope({ tool: "get_memory", args: { society_id: B, memory_type: "rules" }, allowedSocieties: undefined });
  enforceTenantScope({ tool: "recall_similar_cases", args: { query: "x" }, allowedSocieties: null });
});

// ── Empty scope authorises nothing ──────────────────────────────────────────

Deno.test("empty allowed_societies array authorises no tenant", () => {
  assertThrows(
    () => enforceTenantScope({ tool: "get_memory", args: { society_id: A, memory_type: "rules" }, allowedSocieties: [] }),
    TenantScopeError,
  );
});

// ── Error carries the offending tenant id + 403 ──────────────────────────────

Deno.test("TenantScopeError exposes status 403 and the rejected tenant id", () => {
  try {
    enforceTenantScope({ tool: "get_memory", args: { society_id: B }, allowedSocieties: [A] });
  } catch (e) {
    const err = e as TenantScopeError;
    assertEquals(err.status, 403);
    assertEquals(err.tenantId, B);
    return;
  }
  throw new Error("expected TenantScopeError");
});
