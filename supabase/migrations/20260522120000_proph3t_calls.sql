-- Observabilité du routeur PROPH3T (provider_router.ts).
-- Trace chaque appel : tenant, tâche, sensibilité, provider retenu, succès.

create table if not exists public.proph3t_calls (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   text,
  user_id     uuid,
  task        text not null,
  sensitivity text not null,
  provider    text not null,
  ok          boolean not null,
  detail      text,
  created_at  timestamptz not null default now()
);

create index if not exists proph3t_calls_created_idx  on public.proph3t_calls (created_at desc);
create index if not exists proph3t_calls_tenant_idx   on public.proph3t_calls (tenant_id, created_at desc);
create index if not exists proph3t_calls_provider_idx on public.proph3t_calls (provider, ok);

alter table public.proph3t_calls enable row level security;

-- Écriture : le routeur insère via service_role (edge functions).
drop policy if exists proph3t_calls_service_all on public.proph3t_calls;
create policy proph3t_calls_service_all on public.proph3t_calls
  for all to service_role using (true) with check (true);

-- Lecture : l'utilisateur voit ses propres appels ; les admins voient tout.
drop policy if exists proph3t_calls_read on public.proph3t_calls;
create policy proph3t_calls_read on public.proph3t_calls
  for select to authenticated
  using (user_id = auth.uid() or is_admin());
