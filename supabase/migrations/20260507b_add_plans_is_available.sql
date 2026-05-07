-- ═══════════════════════════════════════════════════
-- plans.is_available : controle de souscription par plan
-- ═══════════════════════════════════════════════════
-- Pendant de apps.visible (migration 20260507_add_apps_visible.sql)
-- mais a la granularite plan plutot qu'application :
--   • Une app peut rester "available" mais un plan precis bloque
--     (ex: Premium retire temporairement, Starter conserve)
--   • Independant de plans.is_popular (decoration marketing) et de
--     l'attribut metier de l'app
--
-- Default true -> tous les plans existants restent souscriptibles.
-- Si false : l'UI marketing affiche le plan en grise + le checkout
-- doit refuser la souscription (a verifier cote create-checkout).
-- ═══════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_plans_is_available
  ON public.plans (is_available)
  WHERE is_available = true;

COMMENT ON COLUMN public.plans.is_available IS
  'Si false, le plan ne peut pas etre souscrit (mais les souscriptions actives existantes continuent). Independant de is_popular.';

COMMIT;
