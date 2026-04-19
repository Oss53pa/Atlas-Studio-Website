import { supabase } from "./supabase";
import type { Profile } from "./database.types";

type ProductRow = { id: string; slug: string; name: string };
type PlanRow = { id: string; product_id: string; name: string; max_seats: number | null };

export interface ProductsMap {
  bySlug: Record<string, ProductRow & { plans: PlanRow[] }>;
}

// Loads all products + their plans from DB. Cache the result in component state.
export async function loadProductsMap(): Promise<ProductsMap> {
  const [productsRes, plansRes] = await Promise.all([
    supabase.from("products").select("id, slug, name"),
    supabase.from("plans").select("id, product_id, name, max_seats"),
  ]);
  const products = (productsRes.data || []) as ProductRow[];
  const plans = (plansRes.data || []) as PlanRow[];

  const bySlug: ProductsMap["bySlug"] = {};
  for (const p of products) {
    bySlug[p.slug] = { ...p, plans: plans.filter(pl => pl.product_id === p.id) };
  }
  return { bySlug };
}

export function resolvePlanId(map: ProductsMap, appSlug: string, planName: string): { productId: string; planId: string; maxSeats: number } | null {
  const product = map.bySlug[appSlug];
  if (!product) return null;
  const plan = product.plans.find(pl => pl.name === planName);
  if (!plan) return null;
  const maxSeats = plan.max_seats && plan.max_seats > 0 ? plan.max_seats : 999;
  return { productId: product.id, planId: plan.id, maxSeats };
}

// Finds a tenant by billing_email. If none, creates one from the profile.
export async function ensureTenantForProfile(client: Profile, adminUserId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("tenants")
    .select("id")
    .eq("billing_email", client.email)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("tenants")
    .insert({
      name: client.company_name || client.full_name || client.email,
      billing_email: client.email,
      country: "CI",
      currency: "XOF",
      status: "active",
      created_by: adminUserId,
    })
    .select("id")
    .single();
  if (error || !created) throw new Error(`tenant: ${error?.message || "creation failed"}`);
  return created.id;
}

function randomKeySegment(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, v => chars[v % chars.length]).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Creates an active licence + super_admin seat for the user. No email sent here —
// the admin can regenerate/send later if needed. Returns the activation key (shown to admin once).
export async function createGrantedLicence(params: {
  tenantId: string;
  productId: string;
  planId: string;
  maxSeats: number;
  subscriptionId: string;
  userEmail: string;
  userName: string | null;
  durationDays: number;
  productSlug: string;
  planName: string;
}): Promise<{ licenceId: string; activationKey: string }> {
  const slug = params.productSlug.toUpperCase().slice(0, 8);
  const planCode = params.planName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PLAN";
  const activationKey = `ATLAS-${slug}-${planCode}-${randomKeySegment(8)}-${randomKeySegment(8)}`;
  const keyHash = await sha256Hex(activationKey);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + params.durationDays * 86400000);

  const { data: licence, error: licErr } = await supabase.from("licences").insert({
    tenant_id: params.tenantId,
    product_id: params.productId,
    plan_id: params.planId,
    subscription_id: params.subscriptionId,
    activation_key: activationKey,
    key_hash: keyHash,
    status: "active",
    max_seats: params.maxSeats,
    activated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  }).select("id").single();
  if (licErr || !licence) throw new Error(`licence: ${licErr?.message || "insert failed"}`);

  const { error: seatErr } = await supabase.from("licence_seats").insert({
    licence_id: licence.id,
    tenant_id: params.tenantId,
    email: params.userEmail,
    full_name: params.userName,
    role: "app_super_admin",
    status: "active",
    invitation_accepted_at: now.toISOString(),
  });
  if (seatErr) throw new Error(`seat: ${seatErr.message}`);

  return { licenceId: licence.id, activationKey };
}
