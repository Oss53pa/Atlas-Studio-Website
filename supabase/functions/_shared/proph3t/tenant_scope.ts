// Tenant-scope enforcement for the Proph3t Core (Audit 360° — Wave A, TI-1/2/3).
//
// PROBLEM. `runTool` runs in `service_role` (RLS bypassed) and historically
// TRUSTED the `society_id` / `tenant_id` supplied by the caller — or chosen by
// the LLM. A satellite acting for tenant A could therefore read or write
// tenant B's memory, RAG documents and business rules simply by passing B's id.
//
// FIX. The caller's authorised tenant perimeter is carried INSIDE the signed
// SSO JWT (claim `allowed_societies: string[]`, verified with `JWT_SECRET` in
// `federation_auth.ts`). Before any tool runs, we reject when a tenant argument
// falls outside that perimeter.
//
// BACKWARD-COMPATIBLE / FAIL-CLOSED-ONLY-WHEN-CLAIMED. A caller whose token
// carries NO `allowed_societies` claim (legacy SSO tokens, core Supabase users,
// service_role infra calls) is unaffected — enforcement is skipped. As soon as
// a satellite emits the claim, enforcement is strict (fail-closed): unknown or
// missing tenant ids are refused. This lets satellites adopt the new contract
// one at a time without a flag-day migration.

/** Thrown when a tool argument references a tenant outside the signed scope. */
export class TenantScopeError extends Error {
  readonly status = 403;
  readonly tenantId?: string;
  constructor(message: string, tenantId?: string) {
    super(message);
    this.name = "TenantScopeError";
    this.tenantId = tenantId;
  }
}

/** Arg fields that directly carry a tenant / society identifier. */
const DIRECT_TENANT_FIELDS = ["society_id", "tenant_id"] as const;

/**
 * Tools that READ tenant-scoped rows whose tenant filter is OPTIONAL in the
 * underlying implementation — omitting the id silently widens the read to ALL
 * tenants (e.g. `recall_similar_cases` applies no filter when `tenant_id` is
 * absent; `proph3t_search_chunks` passes `filter_society: null`). For a scoped
 * caller we therefore REQUIRE an in-scope tenant id to be present. This closes
 * the "omit the field" bypass, not just the "pass another tenant's id" one.
 */
const TENANT_READ_TOOLS = new Set<string>([
  "get_memory",
  "get_financial_data",
  "search_documents",        // legacy Ollama RAG (filter_society nullable)
  "search_tenant_documents", // cloud RAG (scope='tenant')
  "recall_similar_cases",    // episodic + semantic, tenant filter optional
]);

export interface TenantScopeCheck {
  /** Tool being invoked. */
  tool: string;
  /** Raw tool args (may carry society_id / tenant_id / scope+scope_id). */
  args: Record<string, unknown> | undefined;
  /**
   * Authorised tenant scope from the signed token.
   *   - `undefined` / `null` → claim absent → NO enforcement (backward-compat).
   *   - `string[]` (incl. empty) → enforce. An empty array authorises nothing.
   */
  allowedSocieties?: string[] | null;
}

function asTrimmedString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Collect every tenant/society id referenced by the args. */
function collectTenantIds(args: Record<string, unknown>): string[] {
  const ids: string[] = [];
  for (const field of DIRECT_TENANT_FIELDS) {
    const v = asTrimmedString(args[field]);
    if (v) ids.push(v);
  }
  // scope/scope_id pattern (save_semantic_memory, index_document): only the
  // "tenant" scope binds scope_id to a society id. "global"/"app"/"user" scopes
  // reference an app id or the user — not a tenant — so they are NOT collected.
  if (args.scope === "tenant") {
    const sid = asTrimmedString(args.scope_id);
    if (sid) ids.push(sid);
  }
  return ids;
}

/**
 * Enforce the signed tenant perimeter on a single tool invocation.
 *
 * Throws {@link TenantScopeError} (HTTP 403) when `args` reference a tenant
 * outside `allowedSocieties`, or when a tenant-read tool is called without an
 * in-scope tenant id by a scoped caller. No-op when the claim is absent.
 */
export function enforceTenantScope(check: TenantScopeCheck): void {
  const { tool, allowedSocieties } = check;
  // Claim absent → caller predates the contract → leave behaviour unchanged.
  if (allowedSocieties == null || !Array.isArray(allowedSocieties)) return;

  const scope = new Set(
    allowedSocieties.map(asTrimmedString).filter((s): s is string => s !== null),
  );
  const args = check.args ?? {};
  const ids = collectTenantIds(args);

  // 1. Membership — every explicit tenant id must be inside the scope.
  for (const id of ids) {
    if (!scope.has(id)) {
      throw new TenantScopeError(
        `Acces refuse: tenant '${id}' hors du perimetre autorise (allowed_societies).`,
        id,
      );
    }
  }

  // 2. Omission guard — a scoped caller must NAME an in-scope tenant for tools
  //    whose tenant filter is optional; otherwise the read spans all tenants.
  if (TENANT_READ_TOOLS.has(tool) && ids.length === 0) {
    throw new TenantScopeError(
      `Acces refuse: le tool '${tool}' exige un society_id/tenant_id dans le perimetre autorise.`,
    );
  }
}
