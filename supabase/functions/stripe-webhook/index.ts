import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";
import { sendMail } from "../_shared/mailer.ts";

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return errorResponse("Missing stripe-signature", 400);

  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature failed:", err.message);
    return errorResponse(`Webhook Error: ${err.message}`, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { userId, appId, plan, subscriptionId, type } = session.metadata || {};

        if (type === "regularization" && subscriptionId) {
          await supabaseAdmin.from("subscriptions").update({
            status: "active",
            stripe_subscription_id: session.subscription as string,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", subscriptionId);
        } else if (type === "reactivation" && subscriptionId) {
          await supabaseAdmin.from("subscriptions").update({
            status: "active",
            stripe_subscription_id: session.subscription as string,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
            cancelled_at: null,
            updated_at: new Date().toISOString(),
          }).eq("id", subscriptionId);
        } else if (userId && appId && plan) {
          await supabaseAdmin.from("subscriptions").insert({
            user_id: userId,
            app_id: appId,
            plan,
            status: "active",
            stripe_subscription_id: session.subscription as string,
            price_at_subscription: (session.amount_total || 0) / 100,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
          });
        }

        if (userId && appId) {
          await supabaseAdmin.from("invoices").insert({
            invoice_number: `INV-${Date.now()}`,
            user_id: userId,
            app_id: appId,
            plan: plan || "unknown",
            amount: (session.amount_total || 0) / 100,
            currency: "XOF",
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent as string,
            payment_method: "stripe",
          });
        }

        await supabaseAdmin.from("activity_log").insert({
          user_id: userId || null,
          action: "payment_completed",
          metadata: { appId, plan, amount: (session.amount_total || 0) / 100, provider: "stripe" },
        });

        // Send confirmation email to client
        try {
          const { data: clientProfile } = await supabaseAdmin.from("profiles").select("full_name, email").eq("id", userId).single();
          if (clientProfile?.email) {
            const { data: appInfo } = await supabaseAdmin.from("apps").select("name").eq("id", appId).single();
            const appName = appInfo?.name || appId;
            const amount = ((session.amount_total || 0) / 100).toLocaleString("fr-FR");
            await sendMail({
              to: clientProfile.email,
              subject: `Abonnement confirme — ${appName}`,
              html: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;"><div style="background:#0A0A0A;color:#fff;padding:30px;text-align:center;border-radius:12px 12px 0 0;"><h1 style="margin:0;font-size:22px;">Atlas <span style="color:#C8A960;">Studio</span></h1><div style="margin-top:8px;opacity:0.7;font-size:14px;">Confirmation de paiement</div></div><div style="background:#fff;padding:30px;"><h2>Bonjour ${clientProfile.full_name || ""},</h2><p>Votre abonnement a ete confirme avec succes !</p><div style="background:#FAFAF8;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #C8A960;"><p><strong>Application :</strong> <span style="color:#C8A960;font-weight:bold;">${appName}</span></p><p><strong>Plan :</strong> ${plan || "—"}</p><p><strong>Montant :</strong> <span style="color:#C8A960;font-weight:bold;">${amount} XOF</span></p></div><p>Vous pouvez acceder a votre application depuis votre espace client.</p><p style="text-align:center;margin:30px 0;"><a href="https://atlas-studio.org/portal" style="display:inline-block;background:#C8A960;color:#0A0A0A;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">Mon espace</a></p></div><div style="text-align:center;padding:20px;color:#999;font-size:12px;">Atlas Studio — Solutions digitales professionnelles</div></div>`,
            });
          }
        } catch (clientEmailErr) {
          console.error("Client confirmation email error:", clientEmailErr);
        }

        // Notify admin(s) of new subscription
        try {
          const { data: profile } = await supabaseAdmin.from("profiles").select("full_name, email").eq("id", userId).single();
          const { data: admins } = await supabaseAdmin
            .from("profiles")
            .select("email")
            .eq("role_id", "b0000000-0000-0000-0000-000000000001");
          const amount = ((session.amount_total || 0) / 100).toLocaleString("fr-FR");
          const clientName = profile?.full_name || profile?.email || "Client";
          const subject = type === "reactivation"
            ? `Reactivation: ${clientName} — ${appId}`
            : type === "regularization"
            ? `Regularisation: ${clientName} — ${appId}`
            : `Nouvelle souscription: ${clientName} — ${appId} (${plan})`;
          const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#0A0A0A;color:#fff;padding:20px;text-align:center;border-radius:12px 12px 0 0;"><h2 style="margin:0;font-size:18px;">Atlas <span style="color:#C8A960;">Studio</span> — Admin</h2></div><div style="padding:20px;background:#fff;"><h3>${subject}</h3><div style="background:#FAFAF8;padding:15px;border-radius:8px;border-left:4px solid #C8A960;margin:15px 0;"><p><strong>Client :</strong> ${clientName} (${profile?.email || ""})</p><p><strong>Application :</strong> ${appId}</p><p><strong>Plan :</strong> ${plan || "—"}</p><p><strong>Montant :</strong> ${amount} XOF</p><p><strong>Date :</strong> ${new Date().toLocaleDateString("fr-FR")}</p></div><p><a href="https://atlas-studio.org/admin/subscriptions" style="display:inline-block;background:#C8A960;color:#0A0A0A;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Voir dans la console</a></p></div></div>`;
          if (admins) {
            for (const admin of admins) {
              if (admin.email) await sendMail({ to: admin.email, subject, html });
            }
          }
        } catch (notifErr) {
          console.error("Admin notification error:", notifErr);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subRef = (invoice as any).parent?.subscription_details?.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id;
        if (subId) {
          const stripeSub = await stripe.subscriptions.retrieve(subId);
          await supabaseAdmin.from("subscriptions").update({
            current_period_start: new Date((stripeSub as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((stripeSub as any).current_period_end * 1000).toISOString(),
            status: "active",
            updated_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", subId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subRef2 = (invoice as any).parent?.subscription_details?.subscription;
        const subId = typeof subRef2 === "string" ? subRef2 : subRef2?.id;
        if (subId) {
          await supabaseAdmin.from("subscriptions").update({
            status: "suspended",
            updated_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", subId);

          await supabaseAdmin.from("activity_log").insert({
            action: "payment_failed",
            metadata: { stripe_subscription_id: subId, provider: "stripe" },
          });

          // Notify admin of failed payment
          try {
            const { data: sub } = await supabaseAdmin.from("subscriptions").select("user_id, app_id, profiles(full_name, email)").eq("stripe_subscription_id", subId).single();
            if (sub) {
              const { data: admins } = await supabaseAdmin.from("profiles").select("email").eq("role_id", "b0000000-0000-0000-0000-000000000001");
              const clientName = (sub.profiles as any)?.full_name || "Client";
              if (admins) {
                for (const admin of admins) {
                  if (admin.email) await sendMail({
                    to: admin.email,
                    subject: `Paiement echoue: ${clientName} — ${sub.app_id}`,
                    html: `<p>Le paiement de <strong>${clientName}</strong> pour <strong>${sub.app_id}</strong> a echoue. L'abonnement a ete suspendu.</p><p><a href="https://atlas-studio.org/admin/subscriptions">Voir dans la console</a></p>`,
                  });
                }
              }
            }
          } catch (e) { console.error("Admin notify error:", e); }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await supabaseAdmin.from("subscriptions").update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscription.id);
        break;
      }
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    return errorResponse("Webhook processing failed");
  }
});
