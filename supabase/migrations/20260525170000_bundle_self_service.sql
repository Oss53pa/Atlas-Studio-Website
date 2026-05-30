-- Self-service des suites : un paiement provisionne N abonnements (apps incluses).
alter table public.subscriptions add column if not exists bundle_slug text;
alter table public.invoices add column if not exists bundle_slug text;

-- included enrichi avec app_id (slug), plan canonique et sièges pour le provisioning.
update public.bundles set included = '[
  {"app_id":"atlas-compta","app":"Atlas F&A","plan":"Business","seats":10},
  {"app_id":"taxpilot","app":"Liass''Pilot","plan":"1 société","seats":1},
  {"app_id":"cockpit-fa","app":"Cockpit F&A","plan":"Solo","seats":1}
]'::jsonb where slug = 'suite-finance';

update public.bundles set included = '[
  {"app_id":"cockpit-fa","app":"Cockpit F&A","plan":"Solo","seats":1},
  {"app_id":"cockpit-cr","app":"CockpitCR","plan":"Solo","seats":1},
  {"app_id":"cockpit-journey","app":"CockpitJourney","plan":"Équipe","seats":5}
]'::jsonb where slug = 'suite-cockpit';

update public.bundles set included = '[
  {"app_id":"advist","app":"Advist","plan":"Entreprise","seats":20},
  {"app_id":"cockpit-journey","app":"CockpitJourney","plan":"Équipe","seats":5}
]'::jsonb where slug = 'suite-rh-ops';

update public.bundles set included = '[
  {"app_id":"cockpit-cr","app":"CockpitCR","plan":"Solo","seats":1},
  {"app_id":"cockpit-fa","app":"Cockpit F&A","plan":"Solo","seats":1},
  {"app_id":"advist","app":"Advist","plan":"Starter","seats":5}
]'::jsonb where slug = 'suite-recouvrement';

update public.bundles set included = '[
  {"app_id":"tablesmart","app":"TableSmart","plan":"Resto Solo","seats":1},
  {"app_id":"cockpit-journey","app":"CockpitJourney","plan":"Solo","seats":1},
  {"app_id":"cockpit-fa","app":"Cockpit F&A","plan":"Solo","seats":1}
]'::jsonb where slug = 'suite-restauration';
