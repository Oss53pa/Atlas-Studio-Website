-- ============================================================================
-- SECURITY HARDENING (audit 360° — Wave C)
-- Appliqué en prod le 2026-06-05 via Supabase MCP (apply_migration).
--
-- Fonctions SECURITY DEFINER exposées à PUBLIC qui fuyaient des données sans
-- aucun contrôle d'autorisation interne (découvert en live) :
--  - admin_revenue_summary()  : CA mensuel/total/impayés -> tout anon pouvait lire
--  - admin_dashboard_stats()  : users/subscriptions/top apps -> idem
-- On ajoute un garde public.is_admin() DANS le corps. NB : ce garde n'est
-- réellement efficace qu'avec le fix is_admin (20260605130000) appliqué.
-- + notify_admins_via_email : retire l'EXECUTE à PUBLIC/anon (abus d'emails).
-- + proph3t_audit_trail : INSERT restreint au service_role (anti-spoofing).
-- ============================================================================

create or replace function public.admin_revenue_summary()
returns json
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'Acces refuse : privilege admin requis' using errcode = '42501';
  end if;
  return (
    select json_build_object(
      'monthly_revenue', coalesce(sum(amount) filter (where status = 'paid' and created_at >= date_trunc('month', now())), 0),
      'total_revenue',   coalesce(sum(amount) filter (where status = 'paid'), 0),
      'pending_payments',coalesce(sum(amount) filter (where status = 'pending'), 0)
    )
    from public.invoices
  );
end;
$$;

create or replace function public.admin_dashboard_stats()
returns json
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'Acces refuse : privilege admin requis' using errcode = '42501';
  end if;
  return (
    select json_build_object(
      'total_users', (select count(*) from profiles),
      'active_subscriptions', (select count(*) from subscriptions where status in ('active','trial','trialing')),
      'popular_apps', (
        select json_agg(row_to_json(t)) from (
          select coalesce(app_id, solution_id::text) as app_id, count(*) as sub_count
          from subscriptions
          where status in ('active','trial','trialing')
          group by coalesce(app_id, solution_id::text)
          order by sub_count desc
          limit 5
        ) t
      )
    )
  );
end;
$$;

revoke execute on function public.notify_admins_via_email(text, text, text, text, text, jsonb) from public;
revoke execute on function public.notify_admins_via_email(text, text, text, text, text, jsonb) from anon;
grant  execute on function public.notify_admins_via_email(text, text, text, text, text, jsonb) to authenticated, service_role;

drop policy if exists "Service role inserts audit" on public.proph3t_audit_trail;
create policy "audit_trail_service_insert"
  on public.proph3t_audit_trail
  for insert
  to service_role
  with check (true);
