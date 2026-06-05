-- ============================================================================
-- 🔴 FIX CRITIQUE — bypass d'autorisation total via is_admin() (audit 360°)
-- Appliqué en prod le 2026-06-05 via Supabase MCP (apply_migration).
--
-- La migration précédente (20260531020000_is_admin_accepts_service_role_and_postgres)
-- avait ajouté `if current_user = 'postgres' then return true`. Comme is_admin()
-- est SECURITY DEFINER (owner = postgres), `current_user` y vaut TOUJOURS
-- 'postgres' → is_admin() renvoyait `true` pour TOUT appelant, y compris `anon`.
-- Toutes les policies RLS `USING (is_admin())` (profiles, proph3t_*, error_logs…)
-- étaient donc ouvertes à n'importe qui (lecture de toutes les données admin).
--
-- Vérifié en live : `set role anon; select is_admin();` renvoyait `true` AVANT,
-- `false` APRÈS ce correctif.
--
-- Correctif : suppression de la clause `current_user`. Le service_role est
-- détecté via auth.role() (claim JWT, fiable). Les sessions superuser/postgres
-- et pg_cron BYPASSENT déjà la RLS nativement → pas besoin de is_admin()=true.
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  -- Backend (edge functions / pg_cron via clé serveur) : traité comme admin.
  if auth.role() = 'service_role' then
    return true;
  end if;
  -- Utilisateur authentifié : doit avoir un profil admin/super_admin actif.
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
      and is_active = true
  );
end;
$$;
