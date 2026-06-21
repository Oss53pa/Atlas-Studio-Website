// PROPH3T Workflow Stream — SSE pour pousser les etapes d'un workflow en live.
// Body : { workflow_name: string, args: object }
// Response : text/event-stream avec evenements :
//   data: {"type":"step_start","step":1,"label":"..."}
//   data: {"type":"step_done","step":1,"ok":true,"result":{...}}
//   data: {"type":"complete","summary":{...}}

import { corsHeaders, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { runTool, type ToolName } from "../_shared/proph3t/tools.ts";

interface StreamBody {
  workflow_name: string;
  args: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await requireUser(req);
    const body = await req.json() as StreamBody;

    if (!body.workflow_name?.startsWith("workflow_")) {
      return errorResponse("workflow_name doit commencer par 'workflow_'", 400);
    }

    // SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          sendEvent({ type: "started", workflow: body.workflow_name, ts: new Date().toISOString() });

          // On wrap runTool pour intercepter chaque appel intermediaire et le streamer
          let stepCounter = 0;
          const wrappedRunTool = async (name: string, args: Record<string, unknown>) => {
            stepCounter++;
            const stepNum = stepCounter;
            sendEvent({ type: "step_start", step: stepNum, tool: name, label: humanLabel(name) });
            const t0 = Date.now();
            try {
              // Wave A (TI-1/2/3) : `requireUser` (utilisateur Supabase core)
              // ne porte pas de claim `allowed_societies` → workflow non scopé
              // (rétrocompatible). Injecter ici le périmètre si le core adopte
              // sa propre multi-tenance.
              const result = await runTool(name as ToolName, args, { user_id: user.id });
              sendEvent({
                type: "step_done", step: stepNum, tool: name,
                ok: true, duration_ms: Date.now() - t0,
                preview: JSON.stringify(result).slice(0, 200),
              });
              return result;
            } catch (e) {
              sendEvent({
                type: "step_done", step: stepNum, tool: name,
                ok: false, duration_ms: Date.now() - t0,
                error: (e as Error).message,
              });
              throw e;
            }
          };

          // Importer dynamiquement le workflow et l'executer avec le wrappedRunTool
          const wf = await import("../_shared/proph3t/workflows.ts");
          const wf2 = await import("../_shared/proph3t/workflows_v2.ts");
          const handlers: Record<string, (run: typeof wrappedRunTool, a: any) => Promise<unknown>> = {
            workflow_audit_complet_societe: (r, a) => wf.workflowAuditCompletSociete(r as any, a),
            workflow_closing_mensuel: (r, a) => wf.workflowClosingMensuel(r as any, a),
            workflow_due_diligence_lite: (r, a) => wf.workflowDueDiligenceLite(r as any, a),
            workflow_simulation_recrutement: (r, a) => wf.workflowSimulationRecrutement(r as any, a),
            workflow_analyse_client_360: (r, a) => wf.workflowAnalyseClient360(r as any, a),
            workflow_closing_annuel: (r, a) => wf2.workflowClosingAnnuel(r as any, a),
            workflow_paie_mensuelle: (r, a) => wf2.workflowPaieMensuelle(r as any, a),
            workflow_audit_juridique: (r, a) => wf2.workflowAuditJuridique(r as any, a),
          };

          const handler = handlers[body.workflow_name];
          if (!handler) {
            sendEvent({ type: "error", message: `Workflow '${body.workflow_name}' introuvable` });
            controller.close();
            return;
          }

          const finalResult = await handler(wrappedRunTool, body.args);
          sendEvent({ type: "complete", result: finalResult, total_steps: stepCounter });
          controller.close();
        } catch (e) {
          sendEvent({ type: "error", message: (e as Error).message });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    return errorResponse(e.message, e.status ?? 500);
  }
});

function humanLabel(toolName: string): string {
  const labels: Record<string, string> = {
    validate_journal_entry: "Validation des ecritures",
    test_balance_general: "Test balance generale",
    apply_benford_law: "Test loi de Benford",
    detect_accounting_anomalies: "Detection anomalies",
    analyze_variance_interperiode: "Variance N vs N-1",
    compute_materiality: "Seuil de signification",
    generate_balance_sheet: "Generation du Bilan",
    generate_compte_resultat: "Compte de resultat",
    compute_ratio: "Calcul ratio financier",
    compute_immobilisations_amortissements: "Calcul amortissements",
    validate_clos_exercice: "Checklist cloture",
    forecast_dsf: "Projection DSF fiscale",
    generate_audit_report: "Rapport d'audit",
    compute_paie_batch: "Paie batch (toutes fiches)",
    compute_taxes_parafiscales: "Taxes parafiscales",
    forecast_masse_salariale: "Projection masse salariale",
    validate_societe_creation: "Conformite creation",
    compute_capital_minimum: "Capital minimum",
    analyze_contract_clauses: "Analyse clauses contractuelles",
    compute_risk_assessment_matrix: "Matrice risques",
    score_internal_control: "Score controle interne",
    score_churn_risk: "Risque churn",
    compute_panier_moyen: "Panier moyen",
    compute_cac_ltv_ratio: "Ratio CAC/LTV",
    generate_report: "Generation rapport",
  };
  return labels[toolName] ?? toolName;
}
