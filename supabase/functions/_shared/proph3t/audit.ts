// Chained SHA-256 audit log (CDC §4.1 proph3t_audit_log).
// Chaque entrée embarque le hash de la précédente, ce qui rend toute
// modification a posteriori détectable.

import { supabaseAdmin } from "../supabase.ts";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function appendAudit(params: {
  action: string;
  actor_user_id?: string;
  subject_type?: string;
  subject_id?: string;
  content: Record<string, unknown>;
}): Promise<{ id: string; hash: string }> {
  // Récupère le dernier hash pour chaîner
  const { data: prev } = await supabaseAdmin
    .from("proph3t_audit_log")
    .select("hash")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prev_hash = prev?.hash || "GENESIS";

  const timestamp = new Date().toISOString();
  const payload = JSON.stringify(params.content);
  const hash = await sha256Hex(`${prev_hash}|${payload}|${timestamp}`);

  const { data, error } = await supabaseAdmin.from("proph3t_audit_log").insert({
    prev_hash,
    action: params.action,
    actor_user_id: params.actor_user_id ?? null,
    subject_type: params.subject_type ?? null,
    subject_id: params.subject_id ?? null,
    content: params.content,
    hash,
  }).select("id, hash").single();
  if (error) throw new Error(`audit: ${error.message}`);
  return { id: data.id, hash: data.hash };
}
