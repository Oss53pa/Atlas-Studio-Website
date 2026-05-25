// Client DataBus pour le portail / la console Atlas Studio.
//
// Enveloppe `supabase.functions.invoke('databus', ...)` ; le token de session
// de l'utilisateur est joint automatiquement. Les apps satellites, elles,
// appellent la même Edge Function avec leur JWT SSO.

import { supabase } from "../supabase";
import type { DataBusObject, PublishInput } from "./contract";

async function call<R>(body: Record<string, unknown>): Promise<R> {
  const { data, error } = await supabase.functions.invoke("databus", { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as R;
}

/** Publie un objet sur le bus. Idempotent si `idempotency_key` est fourni. */
export function publishObject<T>(
  input: PublishInput<T>,
): Promise<{ object: { id: string; status: string; created_at: string }; duplicate?: boolean }> {
  return call({ action: "publish", ...input });
}

/** Réclame les objets en attente pour un consommateur (les marque 'claimed'). */
export async function pullObjects<T = unknown>(opts: {
  consumer_app: string;
  object_type?: string;
  limit?: number;
}): Promise<DataBusObject<T>[]> {
  const res = await call<{ objects: DataBusObject<T>[] }>({ action: "pull", ...opts });
  return res.objects;
}

/** Accuse réception (consumed) ou signale un échec (failed) des objets traités. */
export function ackObjects(opts: {
  ids: string[];
  consumer_app: string;
  status?: "consumed" | "failed" | "archived";
  error?: string;
}): Promise<{ acked: number }> {
  return call({ action: "ack", ...opts });
}
