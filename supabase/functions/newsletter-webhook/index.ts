import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = await req.json();
    const { type, data } = payload;
    const tags = data?.tags || [];
    const campaignId = tags.find((t: { name: string }) => t.name === "campaign_id")?.value;
    const subscriberId = tags.find((t: { name: string }) => t.name === "subscriber_id")?.value;

    if (!campaignId || !subscriberId) {
      return new Response("OK", { headers: corsHeaders });
    }

    const now = new Date().toISOString();

    switch (type) {
      case "email.delivered":
        await supabase.from("newsletter_sends")
          .update({ status: "delivered" })
          .match({ campaign_id: campaignId, subscriber_id: subscriberId });
        break;

      case "email.opened":
        await supabase.from("newsletter_sends")
          .update({ status: "opened", opened_at: now })
          .match({ campaign_id: campaignId, subscriber_id: subscriberId });
        await supabase.rpc("increment_campaign_opens", { p_campaign_id: campaignId });
        // Update subscriber stats
        await supabase.from("newsletter_subscribers")
          .update({ open_count: supabase.rpc ? undefined : 0, last_opened_at: now })
          .eq("id", subscriberId);
        break;

      case "email.clicked":
        await supabase.from("newsletter_sends")
          .update({ status: "clicked", clicked_at: now })
          .match({ campaign_id: campaignId, subscriber_id: subscriberId });
        await supabase.rpc("increment_campaign_clicks", { p_campaign_id: campaignId });
        break;

      case "email.bounced":
        await supabase.from("newsletter_sends")
          .update({ status: "bounced", bounced_at: now, bounce_reason: data?.bounce?.message || "Unknown" })
          .match({ campaign_id: campaignId, subscriber_id: subscriberId });
        await supabase.from("newsletter_subscribers")
          .update({ status: "bounced" })
          .eq("id", subscriberId);
        break;

      case "email.complained":
        await supabase.from("newsletter_subscribers")
          .update({ status: "complained" })
          .eq("id", subscriberId);
        break;
    }

    return new Response("OK", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
  } catch (error) {
    console.error("Newsletter webhook error:", error);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
