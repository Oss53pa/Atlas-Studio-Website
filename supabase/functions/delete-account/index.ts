import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);

    // Cancel all Stripe subscriptions
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profile?.stripe_customer_id) {
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: "active",
      });

      for (const sub of subscriptions.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }

    // Log activity before deletion
    await supabaseAdmin.from("activity_log").insert({
      user_id: user.id,
      action: "account_deleted",
      metadata: { userId: user.id },
    });

    // Delete user from Supabase Auth (cascades to profiles)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) return errorResponse(error.message);

    return jsonResponse({ success: true });
  } catch (error: any) {
    console.error("Account deletion error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});
