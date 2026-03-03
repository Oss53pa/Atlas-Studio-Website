import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { initPayment } from "../_shared/cinetpay.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    const { appId, plan, priceAmount } = await req.json();
    const frontendUrl = Deno.env.get("FRONTEND_URL")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const transactionId = `cp_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    const result = await initPayment({
      amount: priceAmount,
      currency: "XOF",
      transactionId,
      description: `Atlas Studio - ${appId} (${plan})`,
      notifyUrl: `${supabaseUrl}/functions/v1/cinetpay-webhook`,
      returnUrl: `${frontendUrl}/portal?payment=success`,
      customerName: profile?.full_name,
      customerEmail: profile?.email,
    });

    if (result.code !== "201") {
      return errorResponse(result.message, 400);
    }

    // Store pending transaction
    await supabaseAdmin.from("invoices").insert({
      invoice_number: `INV-${Date.now()}`,
      user_id: user.id,
      app_id: appId,
      plan,
      amount: priceAmount,
      currency: "XOF",
      status: "pending",
      cinetpay_transaction_id: transactionId,
      payment_method: "cinetpay",
    });

    return jsonResponse({ url: result.data.payment_url });
  } catch (error: any) {
    console.error("CinetPay session error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});
