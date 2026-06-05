-- ============================================================================
-- SECURITY HARDENING (audit 360° — Sprint 0)
-- Appliqué en prod le 2026-06-05 via Supabase MCP (apply_migration).
--
-- 1) Empêche l'auto-escalade de privilèges via UPDATE direct sur `profiles`.
--    Les policies RLS UPDATE de `profiles` n'avaient AUCUN `WITH CHECK` sur la
--    colonne `role` → n'importe quel utilisateur authentifié pouvait faire
--    `update profiles set role='super_admin' where id = <son id>`.
-- 2) Rend `proph3t_audit_log` réellement append-only (aucun trigger d'immuabilité
--    n'existait ; le service_role pouvait UPDATE/DELETE les entrées d'audit).
--
-- Triggers en SECURITY INVOKER : `current_user` reflète le vrai rôle appelant
-- (authenticated / anon / service_role / postgres). NE PAS mettre DEFINER ici,
-- sinon `current_user` deviendrait toujours l'owner et la garde serait inopérante.
-- ============================================================================

-- 1. Garde anti-escalade sur profiles -----------------------------------------
create or replace function public.guard_profiles_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  -- Changement de rôle, OU réactivation (false -> true) = opération privilégiée.
  if (new.role is distinct from old.role)
     or (coalesce(old.is_active, true) = false and coalesce(new.is_active, true) = true)
  then
    -- Échappatoires légitimes : backend (service_role), superuser / RPC DEFINER
    -- (postgres), ou un super_admin authentifié via l'app.
    if current_user in ('service_role', 'postgres', 'supabase_admin')
       or public.is_super_admin()
    then
      return new;
    end if;

    raise exception
      'Privilege change denied: only a super_admin may alter role/is_active (attempted by uid=%).',
      coalesce(auth.uid()::text, 'anon')
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profiles_privilege on public.profiles;
create trigger trg_guard_profiles_privilege
  before update on public.profiles
  for each row execute function public.guard_profiles_privilege_escalation();

-- 2. Immuabilité de l'audit log chaîné ----------------------------------------
create or replace function public.guard_audit_log_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'proph3t_audit_log is append-only (% denied)', tg_op
    using errcode = '42501';
end;
$$;

drop trigger if exists trg_audit_log_immutable on public.proph3t_audit_log;
create trigger trg_audit_log_immutable
  before update or delete on public.proph3t_audit_log
  for each row execute function public.guard_audit_log_immutable();
