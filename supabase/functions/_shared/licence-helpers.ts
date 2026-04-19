import { supabaseAdmin } from "./supabase.ts";

// Resolves app slug + plan name to concrete UUIDs.
// Returns null if the pair doesn't exist in products/plans.
export async function resolveProductAndPlan(
  appSlug: string,
  planName: string,
): Promise<{ productId: string; planId: string; maxSeats: number } | null> {
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("slug", appSlug)
    .maybeSingle();
  if (!product?.id) return null;

  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("id, max_seats")
    .eq("product_id", product.id)
    .eq("name", planName)
    .maybeSingle();
  if (!plan?.id) return null;

  const maxSeats = plan.max_seats && plan.max_seats > 0 ? plan.max_seats : 999;
  return { productId: product.id, planId: plan.id, maxSeats };
}

// Finds or creates a tenant for a user profile.
// Uses billing_email as the key. Fills required NOT NULL columns with safe defaults.
export async function ensureTenantForUser(userId: string): Promise<string | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name, company_name")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.email) return null;

  const { data: existing } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("billing_email", profile.email)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabaseAdmin
    .from("tenants")
    .insert({
      name: profile.company_name || profile.full_name || profile.email,
      billing_email: profile.email,
      country: "CI",
      currency: "XOF",
      status: "active",
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[licence-helpers] tenant creation failed", error);
    return null;
  }
  return created.id;
}

function randomKeySegment(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (v) => chars[v % chars.length]).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Creates licence + super_admin seat. Best-effort: logs and returns null on failure.
// Used by payment webhooks after a successful payment.
export async function createLicenceAfterPayment(params: {
  userId: string;
  appSlug: string;
  planName: string;
  subscriptionId: string;
  durationDays?: number;
}): Promise<{ licenceId: string; activationKey: string } | null> {
  try {
    const tenantId = await ensureTenantForUser(params.userId);
    if (!tenantId) {
      console.warn("[licence-helpers] no tenant — skipping licence", params.userId);
      return null;
    }
    const resolved = await resolveProductAndPlan(params.appSlug, params.planName);
    if (!resolved) {
      console.warn("[licence-helpers] product/plan not found", params.appSlug, params.planName);
      return null;
    }
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", params.userId)
      .maybeSingle();
    if (!profile?.email) return null;

    const slug = params.appSlug.toUpperCase().slice(0, 8);
    const planCode = params.planName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PLAN";
    const activationKey = `ATLAS-${slug}-${planCode}-${randomKeySegment(8)}-${randomKeySegment(8)}`;
    const keyHash = await sha256Hex(activationKey);
    const now = new Date();
    const duration = params.durationDays || 365;
    const expiresAt = new Date(now.getTime() + duration * 86400000);

    const { data: licence, error: licErr } = await supabaseAdmin.from("licences").insert({
      tenant_id: tenantId,
      product_id: resolved.productId,
      plan_id: resolved.planId,
      subscription_id: params.subscriptionId,
      activation_key: activationKey,
      key_hash: keyHash,
      status: "active",
      max_seats: resolved.maxSeats,
      activated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    }).select("id").single();
    if (licErr || !licence) {
      console.error("[licence-helpers] licence insert failed", licErr);
      return null;
    }

    await supabaseAdmin.from("licence_seats").insert({
      licence_id: licence.id,
      tenant_id: tenantId,
      email: profile.email,
      full_name: profile.full_name,
      role: "app_super_admin",
      status: "active",
      invitation_accepted_at: now.toISOString(),
    });

    return { licenceId: licence.id, activationKey };
  } catch (err) {
    console.error("[licence-helpers] unexpected error", err);
    return null;
  }
}
