-- Les edge functions / pg_cron / GitHub Actions appellent la base avec le
-- service_role (auth.uid() est NULL). Sans cet ajout, toutes les RPC qui
-- gardent un `IF NOT is_admin() THEN RAISE` levaient « Forbidden: admin only »
-- — cassant notamment les briefs COO/treasury déclenchés par asvc-cron.
-- Le service_role est un secret serveur jamais exposé client : pas
-- d'élévation de privilège (un détenteur de la clé bypasse déjà la RLS).
create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.role() = 'service_role' then
    return true;
  end if;
  if current_user = 'postgres' then
    return true;
  end if;
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
      and is_active = true
  );
end;
$function$;
