-- ═══════════════════════════════════════════════════
-- apps.visible : contrôle d'affichage sur le site public
-- ═══════════════════════════════════════════════════
-- Distinct du `status` (available / coming_soon / unavailable) :
--   • status   = état métier de l'app (en service, en maintenance, à venir)
--   • visible  = doit-elle apparaître sur atlas-studio.org ?
--
-- Cas d'usage : retirer une app du site public sans changer son status
-- (ex. app interne, beta privée, retrait commercial sans archiver).
--
-- Default true → toutes les apps existantes restent visibles après migration.
-- ═══════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_apps_visible_sort
  ON public.apps (visible, sort_order)
  WHERE visible = true;

COMMENT ON COLUMN public.apps.visible IS
  'Si false, l''app est masquée du site public atlas-studio.org. Indépendant du status métier.';

COMMIT;
