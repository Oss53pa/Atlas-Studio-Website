-- Config structurée pour le calcul serveur des sièges (forfait + sièges, ou par personne).
-- mode: forfait_seats {included, extra} | per_person {rate, min, max} | flat (absent).
alter table public.apps add column if not exists seat_pricing jsonb not null default '{}'::jsonb;
alter table public.invoices add column if not exists seats integer;

update public.apps set seat_pricing = '{
  "Starter":{"mode":"forfait_seats","included":3,"extra":6000},
  "Business":{"mode":"forfait_seats","included":10,"extra":4500},
  "Entreprise":{"mode":"forfait_seats","included":25,"extra":3500}
}'::jsonb where id = 'atlas-compta';

update public.apps set seat_pricing = '{
  "Starter":{"mode":"forfait_seats","included":5,"extra":3000},
  "Entreprise":{"mode":"forfait_seats","included":20,"extra":2500}
}'::jsonb where id = 'advist';

update public.apps set seat_pricing = '{
  "Solo":{"mode":"per_person","rate":8000,"min":1,"max":1},
  "Équipe":{"mode":"per_person","rate":6500,"min":2,"max":10},
  "Entreprise":{"mode":"per_person","rate":5000,"min":11,"max":null}
}'::jsonb where id = 'cockpit-journey';
