-- Aligne la table plans (portail) sur la grille tarifaire. Mise à jour en place
-- (par product_id + nom) pour préserver les liens d'abonnement existants.
-- Annuel = mensuel x12 x0.85 (-15%). Forfait socle + sièges inclus ; siège suppl. en description.

-- ============ Atlas F&A (3 plans) ============
update public.plans set
  name='Starter', display_name='Starter — Essentiel',
  price_monthly_fcfa=18000, price_annual_fcfa=183600, max_seats=3,
  annual_discount_pct=15, is_popular=false, sort_order=1, active=true, is_available=true,
  description='3 sièges inclus · +6 000 FCFA/siège supplémentaire/mois'
where product_id='c874b1ad-bb67-4258-ab61-e3d59369a3b5' and name='PME / TPE';

update public.plans set
  name='Business', display_name='Business — PME',
  price_monthly_fcfa=45000, price_annual_fcfa=459000, max_seats=10,
  annual_discount_pct=15, is_popular=true, sort_order=2, active=true, is_available=true,
  description='10 sièges inclus · +4 500 FCFA/siège supplémentaire/mois'
where product_id='c874b1ad-bb67-4258-ab61-e3d59369a3b5' and name='Premium';

insert into public.plans (product_id, name, display_name, price_monthly_fcfa, price_annual_fcfa, max_seats, annual_discount_pct, is_popular, sort_order, active, is_available, description)
select 'c874b1ad-bb67-4258-ab61-e3d59369a3b5','Entreprise','Entreprise — Volume',95000,969000,25,15,false,3,true,true,'25 sièges inclus · +3 500 FCFA/siège supplémentaire/mois'
where not exists (select 1 from public.plans where product_id='c874b1ad-bb67-4258-ab61-e3d59369a3b5' and name='Entreprise');

-- ============ Advist (forfait + sièges) ============
update public.plans set
  name='Starter', display_name='Starter — Signature OHADA',
  price_monthly_fcfa=20000, price_annual_fcfa=204000, max_seats=5,
  annual_discount_pct=15, is_popular=false, sort_order=1, active=true, is_available=true,
  description='5 sièges inclus · +3 000 FCFA/siège supplémentaire/mois'
where product_id='1a274f1b-885f-4902-b602-d5ae284a5b79' and name='Business';

update public.plans set
  display_name='Entreprise — Workflow à l''échelle',
  price_monthly_fcfa=55000, price_annual_fcfa=561000, max_seats=20,
  annual_discount_pct=15, is_popular=true, sort_order=2, active=true, is_available=true,
  description='20 sièges inclus · +2 500 FCFA/siège supplémentaire/mois'
where product_id='1a274f1b-885f-4902-b602-d5ae284a5b79' and name='Entreprise';

-- ============ Cockpit F&A (forfait société) ============
update public.plans set
  display_name='Solo — 1 société',
  price_monthly_fcfa=22000, price_annual_fcfa=224400, annual_discount_pct=15,
  max_companies=1, is_popular=true, sort_order=1, active=true, is_available=true,
  description='1 société · forfait (reporting, pas par utilisateur)'
where product_id='b51b9123-0073-4c66-80a5-609f4629e4d8' and name='Solo';

update public.plans set
  display_name='Group — multi-sociétés',
  price_monthly_fcfa=55000, price_annual_fcfa=561000, annual_discount_pct=15,
  is_popular=false, sort_order=2, active=true, is_available=true,
  description='Multi-entités / groupe · forfait'
where product_id='b51b9123-0073-4c66-80a5-609f4629e4d8' and name='Group';

-- ============ CockpitCR (création des 2 plans manquants) ============
insert into public.plans (product_id, name, display_name, price_monthly_fcfa, price_annual_fcfa, max_seats, max_companies, annual_discount_pct, is_popular, sort_order, active, is_available, description)
select 'ada5b9eb-9381-49e1-95b3-548ab8550d5b','Solo','Solo — 1 portefeuille',22000,224400,-1,1,15,true,1,true,true,'1 portefeuille · forfait (recouvrement, ROI rapide)'
where not exists (select 1 from public.plans where product_id='ada5b9eb-9381-49e1-95b3-548ab8550d5b' and name='Solo');

insert into public.plans (product_id, name, display_name, price_monthly_fcfa, price_annual_fcfa, max_seats, max_companies, annual_discount_pct, is_popular, sort_order, active, is_available, description)
select 'ada5b9eb-9381-49e1-95b3-548ab8550d5b','Group','Group — multi-portefeuilles',55000,561000,-1,-1,15,false,2,true,true,'Multi-portefeuilles · forfait'
where not exists (select 1 from public.plans where product_id='ada5b9eb-9381-49e1-95b3-548ab8550d5b' and name='Group');

-- ============ CockpitJourney (par personne) ============
update public.plans set
  name='Solo', display_name='Solo (1 pers.)',
  price_monthly_fcfa=8000, price_annual_fcfa=81600, max_seats=1,
  annual_discount_pct=15, is_popular=false, sort_order=1, active=true, is_available=true,
  description='par personne · 1 utilisateur'
where product_id='4b0fe38f-989a-45f8-9fa8-13e9edbd55c5' and name='Solo';

update public.plans set
  name='Équipe', display_name='Équipe (2-10)',
  price_monthly_fcfa=6500, price_annual_fcfa=66300, max_seats=10,
  annual_discount_pct=15, is_popular=true, sort_order=2, active=true, is_available=true,
  description='par personne · 2 à 10 utilisateurs'
where product_id='4b0fe38f-989a-45f8-9fa8-13e9edbd55c5' and name='Team';

update public.plans set
  name='Entreprise', display_name='Entreprise (11+)',
  price_monthly_fcfa=5000, price_annual_fcfa=51000, max_seats=-1,
  annual_discount_pct=15, is_popular=false, sort_order=3, active=true, is_available=true,
  description='par personne · 11 utilisateurs et +'
where product_id='4b0fe38f-989a-45f8-9fa8-13e9edbd55c5' and name='Business';

-- ============ Liass'Pilot (annuel ferme, mensualisé /12) ============
update public.plans set
  name='1 société', display_name='1 société',
  price_monthly_fcfa=15000, price_annual_fcfa=180000, annual_discount_pct=0,
  max_seats=3, sort_order=1, active=true, is_available=true,
  description='Engagement annuel ferme · 180 000 FCFA/an'
where product_id='2c56141e-f98c-46f3-9f80-b1d65e708653' and name='Entreprise 1 societe';

update public.plans set
  name='Cabinet multi-dossiers', display_name='Cabinet multi-dossiers',
  price_monthly_fcfa=75000, price_annual_fcfa=900000, annual_discount_pct=0,
  max_seats=-1, sort_order=2, active=true, is_available=true,
  description='Dossiers illimités · 900 000 FCFA/an'
where product_id='2c56141e-f98c-46f3-9f80-b1d65e708653' and name='Cabinet illimite';

-- ============ TableSmart (2 plans : Resto Solo / Multi-sites) ============
update public.plans set
  name='Resto Solo', display_name='Resto Solo',
  price_monthly_fcfa=19000, price_annual_fcfa=193800, max_seats=-1, max_companies=1,
  annual_discount_pct=15, is_popular=false, sort_order=1, active=true, is_available=true,
  description='1 établissement · forfait (QR + KDS)'
where product_id='86855af8-b982-4ab6-aa20-1759113a2912' and name='Starter';

update public.plans set
  name='Multi-sites', display_name='Multi-sites',
  price_monthly_fcfa=15000, price_annual_fcfa=153000, max_seats=-1, max_companies=-1,
  annual_discount_pct=15, is_popular=true, sort_order=2, active=true, is_available=true,
  description='Par établissement · dégressif chaînes'
where product_id='86855af8-b982-4ab6-aa20-1759113a2912' and name='Pro';

update public.plans set active=false, is_available=false
where product_id='86855af8-b982-4ab6-aa20-1759113a2912' and name='Enterprise';

-- ============ Remap des abonnements (texte) sur les plans renommés/retirés ============
update public.subscriptions set plan='1 société'   where app_id='taxpilot'        and plan='Entreprise 1 societe';
update public.subscriptions set plan='Entreprise'  where app_id='cockpit-journey' and plan='Business';
update public.subscriptions set plan='Entreprise'  where app_id='atlas-compta'    and plan='Premium';
update public.subscriptions set plan='Multi-sites' where app_id='tablesmart'      and plan='Enterprise';
