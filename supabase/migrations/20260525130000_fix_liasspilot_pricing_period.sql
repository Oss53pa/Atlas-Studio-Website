-- Liass'Pilot (taxpilot) est facturé à l'année (les liasses fiscales sont
-- annuelles), pas au mois. Corrige la période en base (la page Tarifs lit
-- apps.pricing_period). content.ts était déjà en "an".
update public.apps set pricing_period = 'an', updated_at = now()
where id = 'taxpilot' and pricing_period <> 'an';
