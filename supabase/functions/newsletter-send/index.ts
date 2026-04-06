import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { campaign_id, test_email } = await req.json();

    const { data: campaign } = await supabase
      .from("newsletter_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (!campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode test — single email
    if (test_email) {
      const html = injectVariables(campaign.html_body || "", {
        "prénom": "Pamela",
        "entreprise": "Atlas Studio",
        "produit_souscrit": "Atlas Finance",
        "unsubscribe_url": "#",
        "view_online_url": "#",
      });

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${campaign.from_name} <${campaign.from_email}>`,
          to: [test_email],
          subject: `[TEST] ${campaign.subject}`,
          html,
        }),
      });

      const result = await res.json();
      return new Response(JSON.stringify({ success: true, id: result.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Real send — fetch active subscribers
    const { data: subscribers } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .eq("status", "active");

    if (!subscribers?.length) {
      return new Response(JSON.stringify({ error: "No subscribers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark campaign as sending
    await supabase.from("newsletter_campaigns").update({
      status: "sending",
      sent_at: new Date().toISOString(),
      recipient_count: subscribers.length,
    }).eq("id", campaign_id);

    // Send in batches of 50
    const batchSize = 50;
    let sentCount = 0;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      await Promise.all(batch.map(async (subscriber) => {
        const variant = campaign.ab_test_enabled && Math.random() * 100 > (campaign.ab_split_ratio || 50) ? "b" : "a";
        const subject = variant === "b" && campaign.subject_variant_b ? campaign.subject_variant_b : campaign.subject;

        let tenantName = "";
        if (subscriber.tenant_id) {
          const { data: tenant } = await supabase.from("tenants").select("name").eq("id", subscriber.tenant_id).single();
          tenantName = tenant?.name || "";
        }

        const html = injectVariables(campaign.html_body || "", {
          "prénom": subscriber.full_name?.split(" ")[0] || "cher client",
          "entreprise": tenantName,
          "produit_souscrit": "",
          "unsubscribe_url": `https://app.atlasstudio.africa/unsubscribe/${subscriber.id}`,
          "view_online_url": `https://app.atlasstudio.africa/email/${campaign_id}`,
        });

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: `${campaign.from_name} <${campaign.from_email}>`,
              to: [subscriber.email],
              subject,
              html,
              tags: [
                { name: "campaign_id", value: campaign_id },
                { name: "subscriber_id", value: subscriber.id },
                { name: "variant", value: variant },
              ],
            }),
          });

          const emailResult = await res.json();

          await supabase.from("newsletter_sends").insert({
            campaign_id,
            subscriber_id: subscriber.id,
            email: subscriber.email,
            variant,
            status: "sent",
            resend_message_id: emailResult?.id,
          });

          sentCount++;
        } catch (error) {
          await supabase.from("newsletter_sends").insert({
            campaign_id,
            subscriber_id: subscriber.id,
            email: subscriber.email,
            variant,
            status: "bounced",
            bounce_reason: (error as Error).message,
          });
        }
      }));

      // Pause between batches
      if (i + batchSize < subscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Finalize
    await supabase.from("newsletter_campaigns").update({
      status: "sent",
      delivered_count: sentCount,
    }).eq("id", campaign_id);

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function injectVariables(html: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (h, [k, v]) => h.replaceAll(`{{${k}}}`, v || ""),
    html
  );
}
