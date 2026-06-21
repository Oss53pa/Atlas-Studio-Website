-- ASVC — audit déterministe de la cohérence des plans d'abonnement (toutes les apps).
-- Capacité réutilisable par le COO Agent (brief.ts) / une page admin / l'UI.
-- Détecte : inversions de prix, prix annuel ≠ mensuel×12×(1−remise), remise
-- hors-norme, nommage incohérent, stockage figé sur tous les paliers.
create or replace function public.asvc_offer_coherence_audit()
returns table (severity text, category text, app text, plan text, detail text)
language sql
stable
security definer
set search_path = public
as $$
  with active_plans as (
    select pl.*, pr.name as app_name
    from plans pl
    join products pr on pr.id = pl.product_id
    where pl.active = true and coalesce(pl.is_custom,false) = false
  ),
  discount_mode as (
    select annual_discount_pct as m
    from active_plans
    group by annual_discount_pct
    order by count(*) desc, annual_discount_pct desc
    limit 1
  )
  -- 1) Inversion de prix : un palier supérieur (sort_order plus grand) coûte moins cher
  select 'high'::text, 'inversion_prix'::text, lo.app_name, hi.display_name,
         format('« %s » (%s/mois, ordre %s) est MOINS cher que « %s » (%s/mois, ordre %s) du même produit',
                hi.display_name, hi.price_monthly_fcfa, hi.sort_order,
                lo.display_name, lo.price_monthly_fcfa, lo.sort_order)
  from active_plans lo
  join active_plans hi
    on hi.product_id = lo.product_id
   and hi.sort_order > lo.sort_order
   and hi.price_monthly_fcfa < lo.price_monthly_fcfa

  union all
  -- 2) Prix annuel incohérent vs mensuel*12*(1-remise)
  select 'high', 'annuel_incoherent', app_name, display_name,
         format('annuel=%s mais théorique=%s (mensuel %s × 12 × (1-%s%%))',
                price_annual_fcfa,
                round(price_monthly_fcfa*12*(1 - coalesce(annual_discount_pct,0)/100.0)),
                price_monthly_fcfa, coalesce(annual_discount_pct,0))
  from active_plans
  where abs(price_annual_fcfa - round(price_monthly_fcfa*12*(1 - coalesce(annual_discount_pct,0)/100.0))) > 1

  union all
  -- 3) Remise annuelle hors-norme (différente de la remise majoritaire)
  select 'medium', 'remise_hors_norme', app_name, display_name,
         format('remise %s%% alors que la norme est %s%%',
                coalesce(annual_discount_pct,0), (select m from discount_mode))
  from active_plans
  where coalesce(annual_discount_pct,0) <> (select m from discount_mode)

  union all
  -- 4) Nommage incohérent : le nom interne n'apparaît pas dans le libellé affiché
  select 'medium', 'nommage', app_name, name,
         format('nom interne « %s » absent du libellé affiché « %s »', name, display_name)
  from active_plans
  where display_name is not null
    and position(lower(name) in lower(display_name)) = 0

  union all
  -- 5) Stockage figé : tous les paliers d'un produit ont le même storage_gb
  select 'low', 'stockage_fige', app_name, '(tous les paliers)',
         format('%s paliers, tous à %s Go de stockage (pas de différenciation)',
                count(*), max(storage_gb))
  from active_plans
  group by product_id, app_name
  having count(*) > 1 and count(distinct storage_gb) = 1

  order by 1, 3;
$$;

grant execute on function public.asvc_offer_coherence_audit() to authenticated, service_role;

comment on function public.asvc_offer_coherence_audit() is
  'ASVC — audit déterministe de cohérence des plans d''abonnement (prix, remises, nommage, quotas). Utilisé par le COO Agent et l''UI admin.';
