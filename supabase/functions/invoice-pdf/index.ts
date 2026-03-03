import { corsHeaders, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return errorResponse("Invoice ID requis", 400);

    // Check admin status
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = profile?.role === "admin";

    const query = supabaseAdmin
      .from("invoices")
      .select("*, profiles(full_name, email, company_name, phone)")
      .eq("id", id);
    if (!isAdmin) query.eq("user_id", user.id);

    const { data: invoice } = await query.single();

    if (!invoice) return errorResponse("Facture introuvable", 404);

    // Generate PDF as SVG-based HTML (no PDFKit dependency needed in Deno)
    const pdfHtml = generateInvoiceHtml(invoice);

    return new Response(pdfHtml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename=facture-${invoice.invoice_number}.html`,
      },
    });
  } catch (error: any) {
    console.error("Invoice PDF error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});

function generateInvoiceHtml(invoice: any): string {
  const gold = "#C8A04A";
  const clientName = invoice.profiles?.full_name || "Client";
  const clientEmail = invoice.profiles?.email || "";
  const clientCompany = invoice.profiles?.company_name || "";
  const createdDate = new Date(invoice.created_at).toLocaleDateString("fr-FR");
  const paidDate = invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString("fr-FR") : "-";
  const paymentMethod = invoice.payment_method === "cinetpay" ? "CinetPay (Mobile Money)" : "Carte bancaire";
  const statusText = invoice.status === "paid" ? "Payee" : "En attente";
  const statusColor = invoice.status === "paid" ? "#16a34a" : "#d97706";
  const amount = `${Number(invoice.amount).toFixed(0)} ${invoice.currency}`;
  const planLabel = invoice.plan.charAt(0).toUpperCase() + invoice.plan.slice(1);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Facture ${invoice.invoice_number}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none; } }
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #111; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .logo h1 { margin: 0; font-size: 24px; }
  .logo p { color: #666; font-size: 12px; margin: 4px 0 0; }
  .invoice-label { text-align: right; }
  .invoice-label h2 { color: ${gold}; margin: 0; font-size: 16px; }
  .invoice-label p { margin: 4px 0 0; font-size: 12px; }
  .separator { border: none; border-top: 2px solid ${gold}; margin: 20px 0; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .party .label { color: #666; font-size: 11px; margin-bottom: 4px; }
  .party .name { font-weight: bold; }
  .party .detail { color: #666; font-size: 12px; }
  .details { display: flex; gap: 60px; margin-bottom: 30px; font-size: 12px; }
  .details .label { color: #666; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { background: #f5f5f5; padding: 10px; text-align: left; font-size: 11px; color: #666; }
  td { padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; }
  .total-row { background: ${gold}; color: #fff; }
  .total-row td { font-weight: bold; border: none; }
  .footer { text-align: center; color: #999; font-size: 10px; margin-top: 60px; border-top: 1px solid #eee; padding-top: 15px; }
  .print-btn { background: ${gold}; color: #fff; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-bottom: 20px; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">Imprimer / Sauvegarder en PDF</button>
<div class="header">
  <div class="logo"><h1>Atlas Studio</h1><p>Solutions digitales professionnelles</p></div>
  <div class="invoice-label"><h2>FACTURE</h2><p>${invoice.invoice_number}</p></div>
</div>
<hr class="separator">
<div class="parties">
  <div class="party"><div class="label">Emetteur</div><div class="name">Atlas Studio SAS</div><div class="detail">Abidjan, Cote d'Ivoire</div></div>
  <div class="party"><div class="label">Destinataire</div><div class="name">${clientName}</div>${clientCompany ? `<div class="detail">${clientCompany}</div>` : ""}<div class="detail">${clientEmail}</div></div>
</div>
<div class="details">
  <div><span class="label">Date d'emission:</span> ${createdDate}</div>
  <div><span class="label">Date de paiement:</span> ${paidDate}</div>
  <div><span class="label">Moyen de paiement:</span> ${paymentMethod}</div>
  <div><span class="label">Statut:</span> <span style="color:${statusColor};font-weight:bold">${statusText}</span></div>
</div>
<table>
  <thead><tr><th>Description</th><th>Plan</th><th>Prix unitaire</th><th>Total</th></tr></thead>
  <tbody>
    <tr><td>Atlas Studio - ${invoice.app_id}</td><td>${planLabel}</td><td>${amount}</td><td>${amount}</td></tr>
  </tbody>
  <tfoot><tr class="total-row"><td colspan="3">TOTAL</td><td>${amount}</td></tr></tfoot>
</table>
<div class="footer">
  <p>Atlas Studio SAS - RCCM CI-ABJ-2024-B-12345 - Capital: 10 000 000 FCFA</p>
  <p>Abidjan, Cote d'Ivoire - contact@atlas-studio.com</p>
</div>
</body></html>`;
}
