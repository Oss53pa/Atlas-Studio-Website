-- Corrige le nombre de produits affiché (était figé à 3, obsolète).
-- Le site le calcule désormais dynamiquement (HomePage), mais on aligne la
-- valeur de secours en base pour éviter un flash de "3" au chargement.
update public.site_content
set data = '[{"value":"500+","label":"entreprises clientes"},{"value":"10+","label":"pays couverts"},{"value":"7","label":"produits"},{"value":"99.9%","label":"disponibilité"}]'::jsonb,
    updated_at = now()
where key = 'stats';
