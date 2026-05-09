#!/usr/bin/env node
/**
 * @atlas-studio/admin-mcp
 * MCP server admin Atlas Studio — bypasse RLS via service_role.
 * Usage strictement reserve a l'owner.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// ------------------------------------------------------------
// Config / clients
// ------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "[atlas-studio-admin-mcp] SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis."
  );
  process.exit(1);
}

const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function ok(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function fail(message: string, extra?: unknown): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          { error: message, ...(extra ? { details: extra } : {}) },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}

function unwrap<T>(
  result: { data: T | null; error: { message: string } | null },
  context: string
): T {
  if (result.error) {
    throw new Error(`[${context}] ${result.error.message}`);
  }
  if (result.data === null) {
    throw new Error(`[${context}] aucune donnee retournee`);
  }
  return result.data;
}

// ------------------------------------------------------------
// Schemas Zod (validation des inputs)
// ------------------------------------------------------------
const ListClientsInput = z.object({
  search: z.string().optional().describe("Recherche partielle email/nom/societe"),
  is_active: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});

const GetClientInput = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email().optional(),
}).refine((v) => v.id || v.email, { message: "id ou email requis" });

const CreateClientInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).describe("Mot de passe initial (>= 8 char)"),
  full_name: z.string().min(1),
  company_name: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  trial_app_id: z.string().describe("ex: 'cockpit-fa', 'advist'"),
  trial_plan: z.string().default("trial"),
  trial_days: z.number().int().min(1).max(365).default(14),
  send_welcome_email: z.boolean().default(true),
});

const DeleteClientInput = z.object({
  user_id: z.string().uuid(),
  confirm: z.literal(true).describe(
    "Doit etre `true` pour confirmer la suppression definitive"
  ),
});

const ListSubscriptionsInput = z.object({
  status: z
    .enum(["active", "suspended", "cancelled", "expired", "trial"])
    .optional(),
  app_id: z.string().optional(),
  email: z.string().optional().describe("Filtre partiel sur l'email du client"),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});

const ExtendTrialInput = z.object({
  subscription_id: z.string().uuid(),
  additional_days: z.number().int().min(1).max(365),
});

const CancelSubscriptionInput = z.object({
  subscription_id: z.string().uuid(),
  immediate: z
    .boolean()
    .default(false)
    .describe("true = cancelled now ; false = a la fin de la periode"),
});

const GrantFreeInput = z.object({
  user_id: z.string().uuid(),
  app_id: z.string(),
  plan: z.string().default("solo"),
  duration_days: z
    .number()
    .int()
    .min(1)
    .max(3650)
    .default(365)
    .describe("Duree de l'acces gratuit en jours"),
});

const UpdateAppStatusInput = z.object({
  app_id: z.string(),
  status: z.enum(["available", "coming_soon", "unavailable"]),
});

const ToggleAppVisibilityInput = z.object({
  app_id: z.string(),
  visible: z.boolean(),
});

const UpdateAppPricingInput = z.object({
  app_id: z.string(),
  pricing: z
    .record(z.union([z.number(), z.string(), z.record(z.unknown())]))
    .describe("Objet JSONB pricing complet (remplace l'existant)"),
});

const ListExpiringTrialsInput = z.object({
  within_days: z.number().int().min(1).max(60).default(7),
});

const SendInvitationEmailInput = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  password: z
    .string()
    .min(8)
    .describe("Mot de passe a communiquer dans l'email"),
});

const ExecuteSqlInput = z.object({
  query: z.string().min(1),
});

// ------------------------------------------------------------
// Tool definitions (MCP listTools)
// ------------------------------------------------------------
const TOOLS = [
  // Clients
  {
    name: "list_clients",
    description:
      "Liste les clients (profiles role=client) avec recherche partielle email/nom/societe et filtre is_active.",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string" },
        is_active: { type: "boolean" },
        limit: { type: "number", minimum: 1, maximum: 500, default: 100 },
        offset: { type: "number", minimum: 0, default: 0 },
      },
    },
  },
  {
    name: "get_client",
    description:
      "Recupere les details complets d'un client (profile + subscriptions + invoices).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        email: { type: "string", format: "email" },
      },
    },
  },
  {
    name: "create_client_with_trial",
    description:
      "Cree un client (auth.users + profile), active un trial pour l'app demandee, envoie un email de bienvenue (si send_welcome_email=true).",
    inputSchema: {
      type: "object",
      required: ["email", "password", "full_name", "trial_app_id"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 8 },
        full_name: { type: "string" },
        company_name: { type: "string" },
        phone: { type: "string" },
        trial_app_id: { type: "string" },
        trial_plan: { type: "string", default: "trial" },
        trial_days: {
          type: "number",
          minimum: 1,
          maximum: 365,
          default: 14,
        },
        send_welcome_email: { type: "boolean", default: true },
      },
    },
  },
  {
    name: "delete_client",
    description:
      "Supprime DEFINITIVEMENT un client (auth.users + cascade profile/subscriptions/invoices). Requiert confirm=true.",
    inputSchema: {
      type: "object",
      required: ["user_id", "confirm"],
      properties: {
        user_id: { type: "string", format: "uuid" },
        confirm: { type: "boolean", const: true },
      },
    },
  },
  // Subscriptions
  {
    name: "list_subscriptions",
    description:
      "Liste les subscriptions avec filtres status/app_id/email du client (jointure profiles).",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "suspended", "cancelled", "expired", "trial"],
        },
        app_id: { type: "string" },
        email: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 500, default: 100 },
        offset: { type: "number", minimum: 0, default: 0 },
      },
    },
  },
  {
    name: "extend_trial",
    description:
      "Prolonge un trial de N jours en repoussant trial_ends_at et current_period_end.",
    inputSchema: {
      type: "object",
      required: ["subscription_id", "additional_days"],
      properties: {
        subscription_id: { type: "string", format: "uuid" },
        additional_days: { type: "number", minimum: 1, maximum: 365 },
      },
    },
  },
  {
    name: "cancel_subscription",
    description:
      "Annule une subscription. immediate=true → status=cancelled tout de suite ; immediate=false → cancelled_at marque, expire en fin de periode.",
    inputSchema: {
      type: "object",
      required: ["subscription_id"],
      properties: {
        subscription_id: { type: "string", format: "uuid" },
        immediate: { type: "boolean", default: false },
      },
    },
  },
  {
    name: "grant_free_subscription",
    description:
      "Offre un acces gratuit (status=active, price_at_subscription=0) a un client pour une app/plan donnees, sur duration_days jours.",
    inputSchema: {
      type: "object",
      required: ["user_id", "app_id"],
      properties: {
        user_id: { type: "string", format: "uuid" },
        app_id: { type: "string" },
        plan: { type: "string", default: "solo" },
        duration_days: {
          type: "number",
          minimum: 1,
          maximum: 3650,
          default: 365,
        },
      },
    },
  },
  // Apps
  {
    name: "list_apps",
    description:
      "Liste le catalogue d'apps avec status, visibilite, pricing et compteur de subscriptions actives.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "update_app_status",
    description:
      "Modifie le status d'une app (available / coming_soon / unavailable).",
    inputSchema: {
      type: "object",
      required: ["app_id", "status"],
      properties: {
        app_id: { type: "string" },
        status: {
          type: "string",
          enum: ["available", "coming_soon", "unavailable"],
        },
      },
    },
  },
  {
    name: "toggle_app_visibility",
    description:
      "Affiche ou cache une app sur la landing publique (column apps.visible).",
    inputSchema: {
      type: "object",
      required: ["app_id", "visible"],
      properties: {
        app_id: { type: "string" },
        visible: { type: "boolean" },
      },
    },
  },
  {
    name: "update_app_pricing",
    description:
      "Remplace le JSONB pricing d'une app (objet complet, ex: { solo: 25000, pro: 75000, group: 120000 }).",
    inputSchema: {
      type: "object",
      required: ["app_id", "pricing"],
      properties: {
        app_id: { type: "string" },
        pricing: { type: "object" },
      },
    },
  },
  // Stats
  {
    name: "get_dashboard",
    description:
      "Dashboard global : MRR, total clients, subscriptions actives/trials, factures payees ce mois, taux de conversion trial→paid.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_revenue_breakdown",
    description:
      "Repartition du revenu par app (factures status=paid, mois courant + total).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_expiring_trials",
    description:
      "Liste les trials qui expirent dans within_days (defaut 7). Trie par date la plus proche.",
    inputSchema: {
      type: "object",
      properties: {
        within_days: { type: "number", minimum: 1, maximum: 60, default: 7 },
      },
    },
  },
  // Ops
  {
    name: "send_invitation_email",
    description:
      "Re-envoie l'email de bienvenue avec identifiants (utilise RESEND_API_KEY). Necessite RESEND_API_KEY dans l'env.",
    inputSchema: {
      type: "object",
      required: ["email", "full_name", "password"],
      properties: {
        email: { type: "string", format: "email" },
        full_name: { type: "string" },
        password: { type: "string", minLength: 8 },
      },
    },
  },
  {
    name: "execute_sql_query",
    description:
      "Execute une requete SELECT adhoc (lecture seule). Refuse tout INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/GRANT/CREATE. Necessite la fonction Postgres `admin_run_select(sql text)` cote DB.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" },
      },
    },
  },
] as const;

// ------------------------------------------------------------
// Tool implementations
// ------------------------------------------------------------
async function toolListClients(raw: unknown): Promise<ToolResult> {
  const args = ListClientsInput.parse(raw);
  let q = supabase
    .from("profiles")
    .select(
      "id, email, full_name, company_name, phone, role, is_active, created_at",
      { count: "exact" }
    )
    .eq("role", "client")
    .order("created_at", { ascending: false })
    .range(args.offset, args.offset + args.limit - 1);

  if (typeof args.is_active === "boolean") q = q.eq("is_active", args.is_active);
  if (args.search) {
    const s = `%${args.search}%`;
    q = q.or(
      `email.ilike.${s},full_name.ilike.${s},company_name.ilike.${s}`
    );
  }

  const { data, count, error } = await q;
  if (error) return fail(error.message);
  return ok({ total: count ?? data?.length ?? 0, clients: data ?? [] });
}

async function toolGetClient(raw: unknown): Promise<ToolResult> {
  const args = GetClientInput.parse(raw);
  const profileQuery = supabase.from("profiles").select("*");
  const { data: profile, error: pe } = await (args.id
    ? profileQuery.eq("id", args.id).single()
    : profileQuery.eq("email", args.email!).single());
  if (pe) return fail(pe.message);
  if (!profile) return fail("Client introuvable");

  const [subs, inv] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return ok({
    profile,
    subscriptions: subs.data ?? [],
    invoices: inv.data ?? [],
  });
}

async function toolCreateClientWithTrial(raw: unknown): Promise<ToolResult> {
  const args = CreateClientInput.parse(raw);

  // 1) Create auth user
  const { data: authData, error: authErr } =
    await supabase.auth.admin.createUser({
      email: args.email,
      password: args.password,
      email_confirm: true,
      user_metadata: {
        full_name: args.full_name,
        company_name: args.company_name,
      },
    });
  if (authErr || !authData?.user) {
    return fail(authErr?.message ?? "auth.admin.createUser a echoue");
  }
  const userId = authData.user.id;

  // 2) Upsert profile (trigger handle_new_user en cree deja un, on complete)
  const { error: profErr } = await supabase.from("profiles").upsert({
    id: userId,
    email: args.email,
    full_name: args.full_name,
    company_name: args.company_name,
    phone: args.phone,
    role: "client",
    is_active: true,
  });
  if (profErr) return fail(`profile upsert: ${profErr.message}`);

  // 3) Create trial subscription
  const trialEnd = new Date(
    Date.now() + args.trial_days * 24 * 3600 * 1000
  ).toISOString();
  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      app_id: args.trial_app_id,
      plan: args.trial_plan,
      status: "trial",
      price_at_subscription: 0,
      trial_ends_at: trialEnd,
      current_period_start: new Date().toISOString(),
      current_period_end: trialEnd,
    })
    .select()
    .single();
  if (subErr) return fail(`subscription insert: ${subErr.message}`);

  // 4) Welcome email (best-effort)
  let email_sent = false;
  if (args.send_welcome_email && RESEND_API_KEY) {
    email_sent = await sendWelcomeEmail({
      email: args.email,
      full_name: args.full_name,
      password: args.password,
    }).catch(() => false);
  }

  return ok({
    success: true,
    user_id: userId,
    subscription: sub,
    trial_ends_at: trialEnd,
    email_sent,
  });
}

async function toolDeleteClient(raw: unknown): Promise<ToolResult> {
  const args = DeleteClientInput.parse(raw);
  const { error } = await supabase.auth.admin.deleteUser(args.user_id);
  if (error) return fail(error.message);
  return ok({ success: true, deleted_user_id: args.user_id });
}

async function toolListSubscriptions(raw: unknown): Promise<ToolResult> {
  const args = ListSubscriptionsInput.parse(raw);

  // Si filtre email, on resout d'abord les user_ids
  let userIdFilter: string[] | null = null;
  if (args.email) {
    const { data: users } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", `%${args.email}%`);
    userIdFilter = (users ?? []).map((u) => u.id);
    if (userIdFilter.length === 0) return ok({ total: 0, subscriptions: [] });
  }

  let q = supabase
    .from("subscriptions")
    .select(
      "*, profiles!inner(id, email, full_name, company_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(args.offset, args.offset + args.limit - 1);

  if (args.status) q = q.eq("status", args.status);
  if (args.app_id) q = q.eq("app_id", args.app_id);
  if (userIdFilter) q = q.in("user_id", userIdFilter);

  const { data, count, error } = await q;
  if (error) return fail(error.message);
  return ok({ total: count ?? data?.length ?? 0, subscriptions: data ?? [] });
}

async function toolExtendTrial(raw: unknown): Promise<ToolResult> {
  const args = ExtendTrialInput.parse(raw);
  const { data: existing, error: ge } = await supabase
    .from("subscriptions")
    .select("id, trial_ends_at, current_period_end, status")
    .eq("id", args.subscription_id)
    .single();
  if (ge) return fail(ge.message);
  if (!existing) return fail("Subscription introuvable");

  const ms = args.additional_days * 24 * 3600 * 1000;
  const baseTrial = existing.trial_ends_at
    ? new Date(existing.trial_ends_at)
    : new Date();
  const basePeriod = existing.current_period_end
    ? new Date(existing.current_period_end)
    : new Date();
  const newTrial = new Date(baseTrial.getTime() + ms).toISOString();
  const newPeriod = new Date(basePeriod.getTime() + ms).toISOString();

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      trial_ends_at: newTrial,
      current_period_end: newPeriod,
      status: existing.status === "expired" ? "trial" : existing.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.subscription_id)
    .select()
    .single();

  if (error) return fail(error.message);
  return ok({ success: true, subscription: data });
}

async function toolCancelSubscription(raw: unknown): Promise<ToolResult> {
  const args = CancelSubscriptionInput.parse(raw);
  const update: Record<string, unknown> = {
    cancelled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (args.immediate) update.status = "cancelled";

  const { data, error } = await supabase
    .from("subscriptions")
    .update(update)
    .eq("id", args.subscription_id)
    .select()
    .single();

  if (error) return fail(error.message);
  return ok({
    success: true,
    immediate: args.immediate,
    subscription: data,
  });
}

async function toolGrantFreeSubscription(raw: unknown): Promise<ToolResult> {
  const args = GrantFreeInput.parse(raw);
  const start = new Date();
  const end = new Date(start.getTime() + args.duration_days * 24 * 3600 * 1000);

  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: args.user_id,
        app_id: args.app_id,
        plan: args.plan,
        status: "active",
        price_at_subscription: 0,
        trial_ends_at: null,
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
        cancelled_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,app_id" }
    )
    .select()
    .single();

  if (error) return fail(error.message);
  return ok({ success: true, subscription: data });
}

async function toolListApps(): Promise<ToolResult> {
  const { data: apps, error } = await supabase
    .from("apps")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return fail(error.message);

  // Compteur de subs actives par app
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("app_id, status")
    .in("status", ["active", "trial"]);

  const counts = new Map<string, { active: number; trial: number }>();
  for (const s of subs ?? []) {
    const c = counts.get(s.app_id) ?? { active: 0, trial: 0 };
    if (s.status === "active") c.active++;
    else if (s.status === "trial") c.trial++;
    counts.set(s.app_id, c);
  }

  const enriched = (apps ?? []).map((a) => ({
    ...a,
    subscriptions_active: counts.get(a.id)?.active ?? 0,
    subscriptions_trial: counts.get(a.id)?.trial ?? 0,
  }));

  return ok({ total: enriched.length, apps: enriched });
}

async function toolUpdateAppStatus(raw: unknown): Promise<ToolResult> {
  const args = UpdateAppStatusInput.parse(raw);
  const { data, error } = await supabase
    .from("apps")
    .update({ status: args.status, updated_at: new Date().toISOString() })
    .eq("id", args.app_id)
    .select()
    .single();
  if (error) return fail(error.message);
  return ok({ success: true, app: data });
}

async function toolToggleAppVisibility(raw: unknown): Promise<ToolResult> {
  const args = ToggleAppVisibilityInput.parse(raw);
  const { data, error } = await supabase
    .from("apps")
    .update({ visible: args.visible, updated_at: new Date().toISOString() })
    .eq("id", args.app_id)
    .select()
    .single();
  if (error) return fail(error.message);
  return ok({ success: true, app: data });
}

async function toolUpdateAppPricing(raw: unknown): Promise<ToolResult> {
  const args = UpdateAppPricingInput.parse(raw);
  const { data, error } = await supabase
    .from("apps")
    .update({ pricing: args.pricing, updated_at: new Date().toISOString() })
    .eq("id", args.app_id)
    .select()
    .single();
  if (error) return fail(error.message);
  return ok({ success: true, app: data });
}

async function toolGetDashboard(): Promise<ToolResult> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [
    clientsAll,
    clientsActive,
    subsActive,
    subsTrial,
    subsCancelled,
    paidThisMonth,
    paidAllTime,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "client"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "client")
      .eq("is_active", true),
    supabase
      .from("subscriptions")
      .select("price_at_subscription", { count: "exact" })
      .eq("status", "active"),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "trial"),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "cancelled"),
    supabase
      .from("invoices")
      .select("amount")
      .eq("status", "paid")
      .gte("created_at", monthStart.toISOString()),
    supabase.from("invoices").select("amount").eq("status", "paid"),
  ]);

  const mrr = (subsActive.data ?? []).reduce(
    (s, r: any) => s + Number(r.price_at_subscription ?? 0),
    0
  );
  const revenueMonth = (paidThisMonth.data ?? []).reduce(
    (s, r: any) => s + Number(r.amount ?? 0),
    0
  );
  const revenueTotal = (paidAllTime.data ?? []).reduce(
    (s, r: any) => s + Number(r.amount ?? 0),
    0
  );

  const trialCount = subsTrial.count ?? 0;
  const activeCount = subsActive.count ?? 0;
  const cancelledCount = subsCancelled.count ?? 0;
  const denom = trialCount + activeCount;
  const conversionRate = denom > 0 ? activeCount / denom : 0;

  return ok({
    clients: {
      total: clientsAll.count ?? 0,
      active: clientsActive.count ?? 0,
    },
    subscriptions: {
      active: activeCount,
      trial: trialCount,
      cancelled: cancelledCount,
    },
    revenue: {
      mrr_active_subs_fcfa: mrr,
      paid_this_month_fcfa: revenueMonth,
      paid_total_fcfa: revenueTotal,
    },
    conversion: {
      trial_to_paid_rate: Number(conversionRate.toFixed(4)),
      formula: "active / (active + trial)",
    },
    period_start: monthStart.toISOString(),
  });
}

async function toolGetRevenueBreakdown(): Promise<ToolResult> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [allPaid, monthPaid, apps] = await Promise.all([
    supabase
      .from("invoices")
      .select("app_id, amount")
      .eq("status", "paid"),
    supabase
      .from("invoices")
      .select("app_id, amount")
      .eq("status", "paid")
      .gte("created_at", monthStart.toISOString()),
    supabase.from("apps").select("id, name"),
  ]);

  if (allPaid.error) return fail(allPaid.error.message);

  const nameById = new Map<string, string>();
  for (const a of apps.data ?? []) nameById.set(a.id, a.name);

  const totals = new Map<string, { all: number; month: number }>();
  for (const r of allPaid.data ?? []) {
    const cur = totals.get(r.app_id) ?? { all: 0, month: 0 };
    cur.all += Number(r.amount ?? 0);
    totals.set(r.app_id, cur);
  }
  for (const r of monthPaid.data ?? []) {
    const cur = totals.get(r.app_id) ?? { all: 0, month: 0 };
    cur.month += Number(r.amount ?? 0);
    totals.set(r.app_id, cur);
  }

  const breakdown = Array.from(totals.entries())
    .map(([app_id, v]) => ({
      app_id,
      app_name: nameById.get(app_id) ?? app_id,
      paid_this_month_fcfa: v.month,
      paid_total_fcfa: v.all,
    }))
    .sort((a, b) => b.paid_total_fcfa - a.paid_total_fcfa);

  return ok({
    period_start: monthStart.toISOString(),
    breakdown,
  });
}

async function toolListExpiringTrials(raw: unknown): Promise<ToolResult> {
  const args = ListExpiringTrialsInput.parse(raw);
  const now = new Date();
  const horizon = new Date(
    now.getTime() + args.within_days * 24 * 3600 * 1000
  );

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, user_id, app_id, plan, status, trial_ends_at, current_period_end, profiles!inner(email, full_name, company_name)"
    )
    .eq("status", "trial")
    .gte("trial_ends_at", now.toISOString())
    .lte("trial_ends_at", horizon.toISOString())
    .order("trial_ends_at", { ascending: true });

  if (error) return fail(error.message);
  return ok({
    horizon_days: args.within_days,
    horizon_until: horizon.toISOString(),
    count: data?.length ?? 0,
    trials: data ?? [],
  });
}

async function sendWelcomeEmail(opts: {
  email: string;
  full_name: string;
  password: string;
}): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Atlas Studio <notifications@atlasstudio.org>",
      to: [opts.email],
      subject: "Bienvenue sur Atlas Studio — Vos identifiants",
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0A0A0A;color:#fff;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;font-size:24px;">Atlas <span style="color:#C8A960;">Studio</span></h1>
          <p style="margin:8px 0 0;opacity:0.7;font-size:14px;">Bienvenue !</p>
        </div>
        <div style="background:#fff;padding:30px;">
          <h2 style="color:#1a1a1a;margin-top:0;">Bonjour ${escapeHtml(opts.full_name)},</h2>
          <p style="color:#444;line-height:1.6;">Votre compte Atlas Studio a ete cree par notre equipe. Voici vos identifiants de connexion :</p>
          <div style="background:#FAFAF8;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #C8A960;">
            <p style="margin:0 0 8px;"><strong>Email :</strong> ${escapeHtml(opts.email)}</p>
            <p style="margin:0;"><strong>Mot de passe :</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;">${escapeHtml(opts.password)}</code></p>
          </div>
          <p style="color:#666;font-size:13px;">Pour des raisons de securite, nous vous recommandons de changer votre mot de passe des votre premiere connexion.</p>
          <p style="text-align:center;margin:30px 0;">
            <a href="https://atlas-studio.org/portal/login" style="display:inline-block;background:#C8A960;color:#0A0A0B;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">Se connecter</a>
          </p>
        </div>
      </div>`,
    }),
  });
  return r.ok;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function toolSendInvitationEmail(raw: unknown): Promise<ToolResult> {
  const args = SendInvitationEmailInput.parse(raw);
  if (!RESEND_API_KEY) {
    return fail(
      "RESEND_API_KEY absent. Ajoutez-le dans l'env du MCP pour activer l'envoi d'emails."
    );
  }
  const sent = await sendWelcomeEmail(args).catch((e) => {
    throw e;
  });
  return ok({ success: sent, email: args.email });
}

const SQL_FORBIDDEN =
  /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|replace|comment|merge|copy|vacuum|reindex|cluster|listen|notify|do)\b/i;

async function toolExecuteSqlQuery(raw: unknown): Promise<ToolResult> {
  const args = ExecuteSqlInput.parse(raw);
  const sql = args.query.trim().replace(/;\s*$/, "");

  if (!/^\s*(select|with|explain)\b/i.test(sql)) {
    return fail("Seules les requetes SELECT / WITH / EXPLAIN sont autorisees.");
  }
  if (SQL_FORBIDDEN.test(sql)) {
    return fail("Mots-cles d'ecriture/DDL detectes. Refuse.");
  }
  if (/;\s*\S/.test(sql)) {
    return fail("Plusieurs statements detectes (';'). Refuse.");
  }

  // Necessite la fonction RPC ci-dessous cote DB :
  //   CREATE OR REPLACE FUNCTION admin_run_select(sql text)
  //   RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
  //   DECLARE r jsonb;
  //   BEGIN
  //     IF sql !~* '^\s*(select|with|explain)\b' THEN
  //       RAISE EXCEPTION 'Only SELECT/WITH/EXPLAIN allowed';
  //     END IF;
  //     EXECUTE 'SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (' || sql || ') t' INTO r;
  //     RETURN r;
  //   END $$;
  const { data, error } = await supabase.rpc("admin_run_select", { sql });
  if (error) {
    return fail(
      `RPC admin_run_select a echoue : ${error.message}. Verifiez que la fonction existe cote DB.`
    );
  }
  return ok({ rows: data });
}

// ------------------------------------------------------------
// MCP server wiring
// ------------------------------------------------------------
const server = new Server(
  { name: "atlas-studio-admin", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS as unknown as Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>,
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    switch (name) {
      case "list_clients":
        return await toolListClients(args ?? {});
      case "get_client":
        return await toolGetClient(args ?? {});
      case "create_client_with_trial":
        return await toolCreateClientWithTrial(args ?? {});
      case "delete_client":
        return await toolDeleteClient(args ?? {});
      case "list_subscriptions":
        return await toolListSubscriptions(args ?? {});
      case "extend_trial":
        return await toolExtendTrial(args ?? {});
      case "cancel_subscription":
        return await toolCancelSubscription(args ?? {});
      case "grant_free_subscription":
        return await toolGrantFreeSubscription(args ?? {});
      case "list_apps":
        return await toolListApps();
      case "update_app_status":
        return await toolUpdateAppStatus(args ?? {});
      case "toggle_app_visibility":
        return await toolToggleAppVisibility(args ?? {});
      case "update_app_pricing":
        return await toolUpdateAppPricing(args ?? {});
      case "get_dashboard":
        return await toolGetDashboard();
      case "get_revenue_breakdown":
        return await toolGetRevenueBreakdown();
      case "list_expiring_trials":
        return await toolListExpiringTrials(args ?? {});
      case "send_invitation_email":
        return await toolSendInvitationEmail(args ?? {});
      case "execute_sql_query":
        return await toolExecuteSqlQuery(args ?? {});
      default:
        return fail(`Outil inconnu : ${name}`);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return fail("Validation des arguments echouee", err.flatten());
    }
    return fail((err as Error).message ?? String(err));
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    "[atlas-studio-admin-mcp] connecte (stdio). 17 outils disponibles."
  );
}

main().catch((e) => {
  console.error("[atlas-studio-admin-mcp] fatal:", e);
  process.exit(1);
});
