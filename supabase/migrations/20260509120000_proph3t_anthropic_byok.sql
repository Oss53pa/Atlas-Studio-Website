-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T — BYOK Anthropic (Bring Your Own Key)
-- ═══════════════════════════════════════════════════════════════════════════
-- Permet à chaque user de coller sa propre clé Anthropic et choisir
-- entre Claude Haiku 4.5 et Claude Sonnet 4.6.
-- La clé est chiffrée AES-256 (pgp_sym_encrypt) avec un master_key serveur,
-- jamais retournée au front. Toutes les RPCs sont SECURITY DEFINER et
-- exécutables UNIQUEMENT par service_role.
-- ═══════════════════════════════════════════════════════════════════════════

-- pgcrypto est déjà activé via la migration 20260501_proph3t_v2_schema.sql
-- (CREATE EXTENSION IF NOT EXISTS pgcrypto;)

-- ─── Colonnes profiles ──────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS proph3t_provider TEXT NOT NULL DEFAULT 'ollama'
    CHECK (proph3t_provider IN ('ollama', 'anthropic'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anthropic_api_key_encrypted BYTEA;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anthropic_model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001'
    CHECK (anthropic_model IN ('claude-haiku-4-5-20251001', 'claude-sonnet-4-6'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anthropic_key_set_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anthropic_key_last_used_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.proph3t_provider IS
  'Backend LLM utilisé par Proph3t pour ce user : ollama (Ollama self-hosted) ou anthropic (Claude API BYOK)';
COMMENT ON COLUMN public.profiles.anthropic_api_key_encrypted IS
  'Clé API Anthropic chiffrée via pgp_sym_encrypt (AES-256). NE JAMAIS exposer en SELECT cote front.';
COMMENT ON COLUMN public.profiles.anthropic_model IS
  'Modèle Claude choisi : claude-haiku-4-5-20251001 (rapide/peu cher) ou claude-sonnet-4-6 (qualité supérieure)';

-- ─── RPC : set_anthropic_api_key ────────────────────────────────────────────
-- Chiffre la clé fournie avec master_key et la stocke dans profiles.
-- Mise à jour atomique : provider passe automatiquement à 'anthropic'.
CREATE OR REPLACE FUNCTION public.proph3t_set_anthropic_key(
  p_user_id UUID,
  p_api_key TEXT,
  p_master_key TEXT,
  p_model TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_model TEXT;
BEGIN
  IF p_user_id IS NULL OR p_api_key IS NULL OR p_master_key IS NULL THEN
    RAISE EXCEPTION 'p_user_id, p_api_key et p_master_key sont requis';
  END IF;

  IF length(p_api_key) < 20 THEN
    RAISE EXCEPTION 'Clé Anthropic invalide (trop courte)';
  END IF;

  IF length(p_master_key) < 16 THEN
    RAISE EXCEPTION 'master_key trop court (min 16 caractères)';
  END IF;

  v_model := COALESCE(p_model, (SELECT anthropic_model FROM profiles WHERE id = p_user_id), 'claude-haiku-4-5-20251001');

  IF v_model NOT IN ('claude-haiku-4-5-20251001', 'claude-sonnet-4-6') THEN
    RAISE EXCEPTION 'Modèle invalide : %', v_model;
  END IF;

  UPDATE public.profiles
  SET
    anthropic_api_key_encrypted = pgp_sym_encrypt(p_api_key, p_master_key, 'cipher-algo=aes256'),
    anthropic_model = v_model,
    proph3t_provider = 'anthropic',
    anthropic_key_set_at = now(),
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil introuvable : %', p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'model', v_model,
    'provider', 'anthropic',
    'set_at', now()
  );
END;
$$;

-- ─── RPC : get_anthropic_api_key ────────────────────────────────────────────
-- Déchiffre et retourne la clé. NE JAMAIS appeler depuis le front.
-- Marque anthropic_key_last_used_at pour audit.
CREATE OR REPLACE FUNCTION public.proph3t_get_anthropic_key(
  p_user_id UUID,
  p_master_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_encrypted BYTEA;
  v_plaintext TEXT;
BEGIN
  IF p_user_id IS NULL OR p_master_key IS NULL THEN
    RAISE EXCEPTION 'p_user_id et p_master_key sont requis';
  END IF;

  SELECT anthropic_api_key_encrypted INTO v_encrypted
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_plaintext := pgp_sym_decrypt(v_encrypted, p_master_key);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Echec déchiffrement (master_key invalide ou clé corrompue)';
  END;

  -- Audit dernier usage (best-effort, ne bloque pas si l'update échoue)
  BEGIN
    UPDATE public.profiles
    SET anthropic_key_last_used_at = now()
    WHERE id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_plaintext;
END;
$$;

-- ─── RPC : clear_anthropic_api_key ──────────────────────────────────────────
-- Efface la clé et bascule le provider vers ollama.
CREATE OR REPLACE FUNCTION public.proph3t_clear_anthropic_key(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.profiles
  SET
    anthropic_api_key_encrypted = NULL,
    anthropic_key_set_at = NULL,
    anthropic_key_last_used_at = NULL,
    proph3t_provider = 'ollama',
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'provider', 'ollama');
END;
$$;

-- ─── RPC : set_proph3t_settings ─────────────────────────────────────────────
-- Met à jour provider et/ou modèle sans toucher à la clé.
CREATE OR REPLACE FUNCTION public.proph3t_set_settings(
  p_user_id UUID,
  p_provider TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_key BOOLEAN;
BEGIN
  IF p_provider IS NOT NULL AND p_provider NOT IN ('ollama', 'anthropic') THEN
    RAISE EXCEPTION 'Provider invalide : %', p_provider;
  END IF;

  IF p_model IS NOT NULL AND p_model NOT IN ('claude-haiku-4-5-20251001', 'claude-sonnet-4-6') THEN
    RAISE EXCEPTION 'Modèle invalide : %', p_model;
  END IF;

  -- Si l'user veut passer en anthropic mais n'a pas de clé, on refuse.
  IF p_provider = 'anthropic' THEN
    SELECT anthropic_api_key_encrypted IS NOT NULL INTO v_has_key
    FROM public.profiles WHERE id = p_user_id;
    IF NOT COALESCE(v_has_key, FALSE) THEN
      RAISE EXCEPTION 'Aucune clé Anthropic configurée pour ce user. Saisissez d''abord une clé.';
    END IF;
  END IF;

  UPDATE public.profiles
  SET
    proph3t_provider = COALESCE(p_provider, proph3t_provider),
    anthropic_model = COALESCE(p_model, anthropic_model),
    updated_at = now()
  WHERE id = p_user_id
  RETURNING proph3t_provider, anthropic_model
  INTO p_provider, p_model;

  RETURN jsonb_build_object(
    'ok', true,
    'provider', p_provider,
    'model', p_model
  );
END;
$$;

-- ─── RPC : get_proph3t_status ───────────────────────────────────────────────
-- Renvoie les flags pour le front (sans exposer la clé).
CREATE OR REPLACE FUNCTION public.proph3t_get_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT jsonb_build_object(
    'provider', proph3t_provider,
    'model', anthropic_model,
    'has_anthropic_key', (anthropic_api_key_encrypted IS NOT NULL),
    'key_set_at', anthropic_key_set_at,
    'key_last_used_at', anthropic_key_last_used_at
  )
  FROM public.profiles
  WHERE id = p_user_id;
$$;

-- ─── Permissions : verrouiller aux roles serveur ────────────────────────────
REVOKE EXECUTE ON FUNCTION public.proph3t_set_anthropic_key(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proph3t_get_anthropic_key(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proph3t_clear_anthropic_key(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proph3t_set_settings(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proph3t_get_status(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.proph3t_set_anthropic_key(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.proph3t_get_anthropic_key(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.proph3t_clear_anthropic_key(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.proph3t_set_settings(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.proph3t_get_status(UUID) TO service_role;
