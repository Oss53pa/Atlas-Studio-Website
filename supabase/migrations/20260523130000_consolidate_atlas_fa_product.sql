-- Consolide le doublon produit Atlas F&A vers le canonique `atlas-compta`
-- (utilisé par le catalogue `apps` et les abonnements). Le doublon `atlas-fa`
-- portait à tort 1 licence + 2 plans réels et n'avait pas d'URL.
-- Re-pointe ces références puis supprime le doublon (0 FK restante :
-- seules licences.product_id et plans.product_id référencent products).

update public.plans
set product_id = 'c874b1ad-bb67-4258-ab61-e3d59369a3b5'
where product_id = '34d3d289-715b-48ec-97c7-36dddfbbb136';

update public.licences
set product_id = 'c874b1ad-bb67-4258-ab61-e3d59369a3b5', updated_at = now()
where product_id = '34d3d289-715b-48ec-97c7-36dddfbbb136';

delete from public.products
where id = '34d3d289-715b-48ec-97c7-36dddfbbb136' and slug = 'atlas-fa';
