import { supabaseAdmin } from "./supabase.ts";
import { errorResponse } from "./cors.ts";

interface AuthUser {
  id: string;
  email: string;
}

export async function getUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return { id: user.id, email: user.email! };
}

export async function requireUser(req: Request): Promise<AuthUser> {
  const user = await getUser(req);
  if (!user) throw new AuthError("Token manquant ou invalide");
  return user;
}

export async function requireAdmin(req: Request): Promise<AuthUser> {
  const user = await requireUser(req);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role_id, roles(code)")
    .eq("id", user.id)
    .single();

  const roleCode = (profile?.roles as any)?.code;
  if (!profile || roleCode !== "admin") {
    throw new AuthError("Acces refuse", 403);
  }

  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}
