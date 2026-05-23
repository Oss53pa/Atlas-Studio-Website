-- Renseigne l'URL de Liass'Pilot (était NULL), pour cohérence avec le catalogue
-- (apps.external_url) et le SSO. Idempotent.
update public.products
set app_url = 'https://liasspilot.atlas-studio.org/', updated_at = now()
where slug = 'taxpilot' and app_url is null;
