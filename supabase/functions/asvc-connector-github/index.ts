// ASVC — Connecteur GitHub (exécute create_pull_request / create_github_issue).
//
// POST /asvc-connector-github { action_id, account?: string }
// Auth: JWT admin OU CRON_SHARED_SECRET
//
// action_types supportés :
//   - create_pull_request: crée branche + fichier .asvc/plans/<branch>.md + PR draft
//   - create_github_issue: POST issue avec body markdown + labels

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import {
  fetchGithubPat,
  getDefaultGithubAccount,
  createPlanPullRequest,
  createIssue,
} from "../_shared/asvc/github.ts";

interface Body {
  action_id?: string;
  account?: string;
}

interface ActionRow {
  id: string;
  action_type: string;
  status: string;
  proposed_payload: Record<string, unknown>;
  modified_payload: Record<string, unknown> | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: Body;
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.action_id) return errorResponse("action_id requis", 400);

  const { data: actionData, error: actErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .select("id, action_type, status, proposed_payload, modified_payload")
    .eq("id", body.action_id)
    .single();
  if (actErr || !actionData) {
    return errorResponse(`Action introuvable: ${actErr?.message ?? body.action_id}`, 404);
  }
  const action = actionData as ActionRow;

  if (!["approved", "modified"].includes(action.status)) {
    return errorResponse(`Action non approuvée (status=${action.status})`, 400);
  }

  const account = body.account ?? (await getDefaultGithubAccount());
  if (!account) {
    return errorResponse(
      "Aucun compte GitHub connecté. Configure le PAT dans /admin/asvc/connectors",
      400,
    );
  }
  const creds = await fetchGithubPat(account);
  if (!creds) {
    return errorResponse(`Compte GitHub "${account}" introuvable`, 400);
  }

  const payload = (action.modified_payload ?? action.proposed_payload) as Record<string, unknown>;

  try {
    switch (action.action_type) {
      case "create_pull_request": {
        const repo = payload.repo as string;
        const branchName = payload.branch_name as string;
        const prTitle = payload.pr_title as string;
        const prDescription = payload.pr_description as string;

        if (!repo || !branchName || !prTitle) {
          return errorResponse("repo / branch_name / pr_title requis dans payload", 400);
        }

        // Construit le plan markdown depuis le payload
        const filePlan = (payload.file_plan as Array<Record<string, unknown>>) ?? [];
        const commits = (payload.commits as Array<Record<string, unknown>>) ?? [];
        const testPlan = (payload.test_plan as Array<Record<string, unknown>>) ?? [];
        const rollback = (payload.rollback_strategy as string) ?? "";

        const planMd = [
          `# Plan d'implémentation — ${prTitle}`,
          ``,
          `> Généré par ASVC Dev Agent. Cette PR est un **point de coordination** :`,
          `> elle référence le plan complet. Les commits réels (file edits) restent`,
          `> à apporter par un humain ou un futur runner de codegen.`,
          ``,
          `## Branche`,
          `- Repo : \`${repo}\``,
          `- Branche : \`${branchName}\``,
          ``,
          `## Description`,
          prDescription,
          ``,
          `## Fichiers prévus (${filePlan.length})`,
          filePlan
            .map((f) => `- **${f.action ?? "?"}** \`${f.path ?? ""}\` — ${f.purpose ?? ""}`)
            .join("\n"),
          ``,
          `## Commits prévus (${commits.length})`,
          commits
            .map((c) => `- \`${c.type ?? "feat"}(${c.scope ?? ""}): ${c.description ?? ""}\``)
            .join("\n"),
          ``,
          `## Test plan (${testPlan.length})`,
          testPlan
            .map((t) => `- **${t.test_type ?? "?"}** : ${t.what ?? ""}`)
            .join("\n"),
          ``,
          `## Rollback strategy`,
          rollback || "_(non spécifiée)_",
          ``,
          `---`,
          `_ASVC action_id : \`${action.id}\`_`,
        ].join("\n");

        const result = await createPlanPullRequest({
          token: creds.token,
          repo,
          branchName,
          prTitle,
          prDescription,
          planMarkdown: planMd,
          draft: true,
        });

        // Met à jour asvc_code_pull_requests
        const prId = payload.pr_id as string | undefined;
        if (prId) {
          await supabaseAdmin
            .from("asvc_code_pull_requests")
            .update({
              github_pr_number: result.pr_number,
              github_pr_url: result.pr_url,
              status: "preview_ready",
              updated_at: new Date().toISOString(),
            })
            .eq("id", prId);
        }

        // Marque action exécutée
        await supabaseAdmin
          .from("asvc_agent_actions")
          .update({
            status: "executed",
            executed_at: new Date().toISOString(),
            execution_result: {
              connector: "github",
              pr_number: result.pr_number,
              pr_url: result.pr_url,
              branch: result.branch,
              base: result.base,
              commit_sha: result.commit_sha,
              plan_path: result.plan_path,
              from_account: account,
            },
          })
          .eq("id", body.action_id);

        await supabaseAdmin.rpc("asvc_oauth_mark_used", {
          p_provider: "github",
          p_account_email: account,
        });

        await supabaseAdmin.rpc("asvc_log_audit", {
          p_actor_type: authz.isCron ? "system" : "ceo",
          p_actor_id: authz.actor,
          p_event_type: "github_pr_created",
          p_resource_type: "asvc_agent_actions",
          p_resource_id: body.action_id,
          p_payload: {
            pr_number: result.pr_number,
            pr_url: result.pr_url,
            repo,
          },
        });

        return jsonResponse({ ok: true, action: { id: body.action_id, ...result } });
      }

      case "create_github_issue": {
        const repo = payload.repo as string;
        const title = payload.title as string;
        const issueBody = payload.body as string;
        const labels = (payload.labels as string[]) ?? [];

        if (!repo || !title || !issueBody) {
          return errorResponse("repo / title / body requis dans payload", 400);
        }

        const [owner, name] = repo.split("/");
        if (!owner || !name) return errorResponse(`repo invalide: ${repo}`, 400);

        const issue = await createIssue(creds.token, owner, name, {
          title,
          body: issueBody,
          labels,
        });

        // Marque action exécutée
        await supabaseAdmin
          .from("asvc_agent_actions")
          .update({
            status: "executed",
            executed_at: new Date().toISOString(),
            execution_result: {
              connector: "github",
              issue_number: issue.number,
              issue_url: issue.html_url,
              from_account: account,
            },
          })
          .eq("id", body.action_id);

        await supabaseAdmin.rpc("asvc_oauth_mark_used", {
          p_provider: "github",
          p_account_email: account,
        });

        await supabaseAdmin.rpc("asvc_log_audit", {
          p_actor_type: authz.isCron ? "system" : "ceo",
          p_actor_id: authz.actor,
          p_event_type: "github_issue_created",
          p_resource_type: "asvc_agent_actions",
          p_resource_id: body.action_id,
          p_payload: {
            issue_number: issue.number,
            issue_url: issue.html_url,
            repo,
            labels,
          },
        });

        return jsonResponse({
          ok: true,
          action: {
            id: body.action_id,
            issue_number: issue.number,
            issue_url: issue.html_url,
          },
        });
      }

      default:
        return errorResponse(
          `action_type non supporté par GitHub connector: ${action.action_type}`,
          400,
        );
    }
  } catch (err) {
    const msg = (err as Error).message;
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "github_connector_failed",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: { error: msg, action_type: action.action_type },
    });
    return errorResponse(`GitHub connector failed: ${msg}`, 500);
  }
});
