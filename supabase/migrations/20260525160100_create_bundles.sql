-- Suites packagées (verrouillage MRR) — remise -20% vs somme des apps.
create table if not exists public.bundles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  app_ids text[] not null default '{}',
  included jsonb not null default '[]',
  sum_monthly_fcfa integer not null,
  price_monthly_fcfa integer not null,
  savings_monthly_fcfa integer not null,
  discount_pct integer not null default 20,
  is_popular boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bundles enable row level security;

drop policy if exists "bundles_public_read" on public.bundles;
create policy "bundles_public_read" on public.bundles
  for select using (active = true);

drop policy if exists "bundles_admin_all" on public.bundles;
create policy "bundles_admin_all" on public.bundles
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

insert into public.bundles (slug, name, tagline, app_ids, included, sum_monthly_fcfa, price_monthly_fcfa, savings_monthly_fcfa, discount_pct, is_popular, sort_order)
values
  ('suite-finance', 'Suite Finance', 'Compta, liasse fiscale et pilotage en un seul abonnement',
   array['atlas-compta','taxpilot','cockpit-fa'],
   '[{"app":"Atlas F&A","plan":"Business"},{"app":"Liass''Pilot","plan":"1 société"},{"app":"Cockpit F&A","plan":"Solo"}]'::jsonb,
   67000, 53600, 13400, 20, true, 1),
  ('suite-cockpit', 'Suite Cockpit', 'Pilotage, recouvrement et notes de frais réunis',
   array['cockpit-fa','cockpit-cr','cockpit-journey'],
   '[{"app":"Cockpit F&A","plan":"Solo"},{"app":"CockpitCR","plan":"Solo"},{"app":"CockpitJourney","plan":"Équipe (5 pers.)"}]'::jsonb,
   76500, 61200, 15300, 20, false, 2),
  ('suite-rh-ops', 'Suite RH & Ops', 'Workflow documentaire et gestion des équipes',
   array['advist','cockpit-journey'],
   '[{"app":"Advist","plan":"Entreprise"},{"app":"CockpitJourney","plan":"Équipe (5 pers.)"}]'::jsonb,
   87500, 70000, 17500, 20, false, 3),
  ('suite-recouvrement', 'Suite Recouvrement', 'Recouvrement, pilotage et signature pour accélérer le cash',
   array['cockpit-cr','cockpit-fa','advist'],
   '[{"app":"CockpitCR","plan":"Solo"},{"app":"Cockpit F&A","plan":"Solo"},{"app":"Advist","plan":"Starter"}]'::jsonb,
   64000, 51200, 12800, 20, false, 4),
  ('suite-restauration', 'Suite Restauration', 'Digitalisation complète du restaurant et de sa gestion',
   array['tablesmart','cockpit-journey','cockpit-fa'],
   '[{"app":"TableSmart","plan":"Resto Solo"},{"app":"CockpitJourney","plan":"Solo"},{"app":"Cockpit F&A","plan":"Solo"}]'::jsonb,
   49000, 39200, 9800, 20, false, 5)
on conflict (slug) do nothing;
