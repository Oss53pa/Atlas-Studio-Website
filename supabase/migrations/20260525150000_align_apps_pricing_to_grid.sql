-- Grille tarifaire concurrentielle (UEMOA/CEMAC) : modèle hybride forfait socle + sièges.
-- pricing = forfait mensuel par plan (FCFA) ; pricing_notes = nuance sièges/unité affichée sous le prix.
alter table public.apps add column if not exists pricing_notes jsonb not null default '{}'::jsonb;

-- Atlas F&A : 3 plans (Starter / Business / Entreprise), forfait + sièges
update public.apps set
  pricing = '{"Starter":18000,"Business":45000,"Entreprise":95000}'::jsonb,
  pricing_period = 'mois',
  pricing_notes = '{"Starter":"3 sièges inclus · +6 000 FCFA/siège suppl.","Business":"10 sièges inclus · +4 500 FCFA/siège suppl.","Entreprise":"25 sièges inclus · +3 500 FCFA/siège suppl."}'::jsonb,
  updated_at = now()
where id = 'atlas-compta';

-- Liass'Pilot : annuel ferme
update public.apps set
  pricing = '{"1 société":180000,"Cabinet multi-dossiers":900000}'::jsonb,
  pricing_period = 'an',
  pricing_notes = '{"1 société":"Engagement annuel ferme","Cabinet multi-dossiers":"Dossiers illimités · engagement annuel"}'::jsonb,
  updated_at = now()
where id = 'taxpilot';

-- Advist : forfait + sièges
update public.apps set
  pricing = '{"Starter":20000,"Entreprise":55000}'::jsonb,
  pricing_period = 'mois',
  pricing_notes = '{"Starter":"5 sièges inclus · +3 000 FCFA/siège suppl.","Entreprise":"20 sièges inclus · +2 500 FCFA/siège suppl."}'::jsonb,
  updated_at = now()
where id = 'advist';

-- Cockpit F&A : forfait société (reporting, pas par utilisateur)
update public.apps set
  pricing = '{"Solo":22000,"Group":55000}'::jsonb,
  pricing_period = 'mois',
  pricing_notes = '{"Solo":"1 société · forfait","Group":"Multi-entités / groupe · forfait"}'::jsonb,
  updated_at = now()
where id = 'cockpit-fa';

-- CockpitCR : même tarif que Cockpit F&A, forfait société
update public.apps set
  pricing = '{"Solo":22000,"Group":55000}'::jsonb,
  pricing_period = 'mois',
  pricing_notes = '{"Solo":"1 portefeuille · forfait","Group":"Multi-portefeuilles · forfait"}'::jsonb,
  updated_at = now()
where id = 'cockpit-cr';

-- CockpitJourney : par personne, dégressif au volume
update public.apps set
  pricing = '{"Solo":8000,"Équipe":6500,"Entreprise":5000}'::jsonb,
  pricing_period = 'mois',
  pricing_notes = '{"Solo":"par personne · 1 utilisateur","Équipe":"par personne · 2 à 10","Entreprise":"par personne · 11 et +"}'::jsonb,
  updated_at = now()
where id = 'cockpit-journey';

-- TableSmart : forfait par établissement
update public.apps set
  pricing = '{"Resto Solo":19000,"Multi-sites":15000}'::jsonb,
  pricing_period = 'mois',
  pricing_notes = '{"Resto Solo":"1 établissement","Multi-sites":"par établissement · dégressif chaînes"}'::jsonb,
  updated_at = now()
where id = 'tablesmart';
