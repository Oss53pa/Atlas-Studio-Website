-- ═══════════════════════════════════════════════════
-- SYNC apps → products  (Option C-light)
-- ═══════════════════════════════════════════════════
-- Atlas Studio a deux catalogues parallèles :
--   • apps     : catalogue éditorial vivant (sidebar, landing pages, AppsManagementPage)
--   • products : catalogue technique pour le système plans/features/subscriptions
--
-- Cette migration garantit qu'ils sont TOUJOURS en sync via des triggers Postgres :
--   1. Backfill : crée le row products manquant pour toute app existante (atlas-compta)
--   2. Trigger AFTER INSERT ON apps  → crée la row products correspondante
--   3. Trigger AFTER UPDATE ON apps  → resync name, description, status, color, app_url
--   4. Trigger AFTER DELETE ON apps  → marque le products comme 'archived' (préserve les FK)
--
-- Mapping de schéma :
--   apps.id           → products.slug    (text)
--   apps.name         → products.name
--   apps.description  → products.description
--   apps.status       → products.status  (enum → check : available→live, coming_soon→beta, unavailable→archived)
--   apps.color        → products.color_accent
--   apps.external_url → products.app_url
--   (apps.icon n'est PAS mappé : c'est probablement un emoji, pas un logo URL)
--
-- 100% idempotente.
-- ═══════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════
-- 1. Fonction de mapping du status
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.map_app_status_to_product_status(p_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_status
    WHEN 'available'    THEN 'live'
    WHEN 'coming_soon'  THEN 'beta'
    WHEN 'unavailable'  THEN 'archived'
    ELSE 'live'  -- fallback safe par défaut
  END;
$$;


-- ═══════════════════════════════════════════════════
-- 2. Fonction trigger principale
-- ═══════════════════════════════════════════════════
-- SECURITY DEFINER : permet au trigger d'écrire dans products même si l'utilisateur
-- qui INSERT/UPDATE sur apps n'a pas les droits d'écriture sur products (cas RLS).
-- SET search_path = public : protection contre les attaques par hijacking de schema.
CREATE OR REPLACE FUNCTION public.sync_apps_to_products()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.products (
      id, slug, name, description, status, color_accent, app_url
    ) VALUES (
      gen_random_uuid(),
      NEW.id,
      NEW.name,
      NEW.description,
      public.map_app_status_to_product_status(NEW.status::text),
      NEW.color,
      NEW.external_url
    )
    ON CONFLICT (slug) DO UPDATE SET
      name          = EXCLUDED.name,
      description   = EXCLUDED.description,
      status        = EXCLUDED.status,
      color_accent  = EXCLUDED.color_accent,
      app_url       = EXCLUDED.app_url,
      updated_at    = now();
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Re-sync uniquement si un champ pertinent a changé (évite les UPDATE en boucle)
    IF (
      NEW.id IS DISTINCT FROM OLD.id OR
      NEW.name IS DISTINCT FROM OLD.name OR
      NEW.description IS DISTINCT FROM OLD.description OR
      NEW.status IS DISTINCT FROM OLD.status OR
      NEW.color IS DISTINCT FROM OLD.color OR
      NEW.external_url IS DISTINCT FROM OLD.external_url
    ) THEN
      -- Si l'id (= slug) a changé : on déplace la row plutôt que d'en créer une nouvelle
      IF NEW.id IS DISTINCT FROM OLD.id THEN
        UPDATE public.products
        SET slug          = NEW.id,
            name          = NEW.name,
            description   = NEW.description,
            status        = public.map_app_status_to_product_status(NEW.status::text),
            color_accent  = NEW.color,
            app_url       = NEW.external_url,
            updated_at    = now()
        WHERE slug = OLD.id;
      ELSE
        UPDATE public.products
        SET name          = NEW.name,
            description   = NEW.description,
            status        = public.map_app_status_to_product_status(NEW.status::text),
            color_accent  = NEW.color,
            app_url       = NEW.external_url,
            updated_at    = now()
        WHERE slug = NEW.id;
      END IF;

      -- Si la row products n'existait pas (cas inattendu), on la crée
      IF NOT FOUND THEN
        INSERT INTO public.products (
          id, slug, name, description, status, color_accent, app_url
        ) VALUES (
          gen_random_uuid(),
          NEW.id,
          NEW.name,
          NEW.description,
          public.map_app_status_to_product_status(NEW.status::text),
          NEW.color,
          NEW.external_url
        )
        ON CONFLICT (slug) DO NOTHING;
      END IF;
    END IF;
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    -- On NE supprime PAS le row products : on l'archive pour préserver les FK
    -- (subscriptions, plans, features, licences peuvent y faire référence)
    UPDATE public.products
    SET status = 'archived',
        updated_at = now()
    WHERE slug = OLD.id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;


-- ═══════════════════════════════════════════════════
-- 3. Pose des triggers sur apps
-- ═══════════════════════════════════════════════════
DROP TRIGGER IF EXISTS trg_apps_sync_to_products_ins ON public.apps;
CREATE TRIGGER trg_apps_sync_to_products_ins
  AFTER INSERT ON public.apps
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_apps_to_products();

DROP TRIGGER IF EXISTS trg_apps_sync_to_products_upd ON public.apps;
CREATE TRIGGER trg_apps_sync_to_products_upd
  AFTER UPDATE ON public.apps
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_apps_to_products();

DROP TRIGGER IF EXISTS trg_apps_sync_to_products_del ON public.apps;
CREATE TRIGGER trg_apps_sync_to_products_del
  AFTER DELETE ON public.apps
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_apps_to_products();


-- ═══════════════════════════════════════════════════
-- 4. Backfill : crée les rows products manquantes pour les apps existantes
-- ═══════════════════════════════════════════════════
-- À ce stade, les apps suivantes existent déjà :
--   • tablesmart    → déjà dans products  (préexistant)
--   • taxpilot      → déjà dans products  (créé par migration 20260411b)
--   • advist        → déjà dans products  (créé par migration 20260411b)
--   • atlas-compta  → MANQUANT — on le crée maintenant
INSERT INTO public.products (id, slug, name, description, status, color_accent, app_url)
SELECT
  gen_random_uuid(),
  a.id,
  a.name,
  a.description,
  public.map_app_status_to_product_status(a.status::text),
  a.color,
  a.external_url
FROM public.apps a
WHERE NOT EXISTS (
  SELECT 1 FROM public.products p WHERE p.slug = a.id
)
ON CONFLICT (slug) DO NOTHING;


-- ═══════════════════════════════════════════════════
-- 5. Re-sync des rows products existantes (corrige les noms/desc s'ils ont divergé)
-- ═══════════════════════════════════════════════════
-- On évite de toucher aux 3 produits qu'on a déjà soigneusement configurés via la
-- migration précédente (taxpilot, advist) et au préexistant tablesmart, sauf si
-- leur metadata (name/description) diffère vraiment de apps.
UPDATE public.products p
SET
  name          = a.name,
  description   = COALESCE(a.description, p.description),
  status        = public.map_app_status_to_product_status(a.status::text),
  color_accent  = COALESCE(a.color, p.color_accent),
  app_url       = COALESCE(a.external_url, p.app_url),
  updated_at    = now()
FROM public.apps a
WHERE p.slug = a.id
  AND (
    p.name IS DISTINCT FROM a.name OR
    p.status IS DISTINCT FROM public.map_app_status_to_product_status(a.status::text)
  );


-- ═══════════════════════════════════════════════════
-- 6. Vérifications finales
-- ═══════════════════════════════════════════════════
DO $check$
DECLARE
  v_apps_count INT;
  v_products_count INT;
  v_orphan_apps INT;
  v_orphan_products INT;
BEGIN
  SELECT COUNT(*) INTO v_apps_count FROM public.apps;
  SELECT COUNT(*) INTO v_products_count FROM public.products;

  -- apps qui n'ont PAS de products correspondant (devrait être 0)
  SELECT COUNT(*) INTO v_orphan_apps
  FROM public.apps a
  WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.slug = a.id);

  -- products qui n'ont PAS d'app correspondante (peut être > 0 si on a archivé)
  SELECT COUNT(*) INTO v_orphan_products
  FROM public.products p
  WHERE NOT EXISTS (SELECT 1 FROM public.apps a WHERE a.id = p.slug);

  RAISE NOTICE '─── SYNC apps ↔ products ───';
  RAISE NOTICE '  apps total                         : %', v_apps_count;
  RAISE NOTICE '  products total                     : %', v_products_count;
  RAISE NOTICE '  apps SANS products correspondant   : % (expected 0)', v_orphan_apps;
  RAISE NOTICE '  products SANS apps correspondant   : % (informationnel)', v_orphan_products;

  IF v_orphan_apps > 0 THEN
    RAISE EXCEPTION 'Backfill failed: % app(s) have no matching products row', v_orphan_apps;
  END IF;

  -- Sanity check : atlas-compta doit maintenant exister
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'atlas-compta') THEN
    RAISE EXCEPTION 'Sanity check failed: atlas-compta not found in products';
  END IF;

  RAISE NOTICE '✓ Tous les apps ont une row products correspondante';
  RAISE NOTICE '✓ Trigger sync_apps_to_products installé';
END;
$check$;

COMMIT;
