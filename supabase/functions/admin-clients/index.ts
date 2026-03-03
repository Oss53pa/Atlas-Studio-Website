import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireAdmin(req);

    if (req.method === "POST") {
      const { email, password, full_name, company_name, phone } = await req.json();

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, company_name },
      });

      if (authError) return errorResponse(authError.message, 400);

      await supabaseAdmin.from("profiles").upsert({
        id: authUser.user.id,
        email,
        full_name,
        company_name: company_name || "",
        phone: phone || "",
        role: "client",
        is_active: true,
      });

      return jsonResponse({ success: true, userId: authUser.user.id });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) return errorResponse("Client ID requis", 400);

      await supabaseAdmin.auth.admin.deleteUser(id);
      return jsonResponse({ success: true });
    }

    return errorResponse("Methode non supportee", 405);
  } catch (error: any) {
    console.error("Admin clients error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});
