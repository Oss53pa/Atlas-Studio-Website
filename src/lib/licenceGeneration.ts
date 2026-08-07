import { supabase } from "./supabase";
import { apiCall } from "./api";
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
    .maybeSingle() as { data: { id: string } | null };
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
    .single() as { data: { id: string } | null; error: { message: string } | null };
  if (error || !created) throw new Error(`tenant: ${error?.message || "creation failed"}`);
  return created.id;
}

// CDC v2.1 — Lot L1/L9 (sécurité) : la clé d'activation est générée et hachée
// CÔTÉ SERVEUR par l'Edge Function `admin-grant-licence`. Le navigateur ne produit
// plus aucune clé (Principe 5) et l'écriture directe de `licences` est gelée (L9 étape 6).
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
}): Promise<{ licenceId: string; keyMasked: string }> {
  return apiCall<{ licenceId: string; keyMasked: string }>("admin-grant-licence", {
    method: "POST",
    body: params,
  });
}
