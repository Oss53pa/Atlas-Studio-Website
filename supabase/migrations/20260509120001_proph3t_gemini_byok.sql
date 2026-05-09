-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T — BYOK Gemini (multi-provider)
-- ═══════════════════════════════════════════════════════════════════════════
-- Étend la migration 20260509_proph3t_anthropic_byok.sql pour permettre
-- aussi Google Gemini comme provider (en plus de Ollama et Anthropic).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Élargir le CHECK pour autoriser 'gemini'
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_proph3t_provider_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_proph3t_provider_check
  CHECK (proph3t_provider IN ('ollama', 'anthropic', 'gemini'));

-- 2. Colonnes Gemini (mêmes patterns que Anthropic)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gemini_api_key_encrypted BYTEA;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gemini_model TEXT NOT NULL DEFAULT 'gemini-2.0-flash'
    CHECK (gemini_model IN ('gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gemini_key_set_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gemini_key_last_used_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.gemini_api_key_encrypted IS
  'Clé API Google Gemini chiffrée via pgp_sym_encrypt (AES-256). NE JAMAIS exposer en SELECT cote front.';
COMMENT ON COLUMN public.profiles.gemini_model IS
  'Modèle Gemini choisi : gemini-2.0-flash (le moins cher) / gemini-2.5-flash / gemini-2.5-pro';

-- 3. RPC : set_gemini_api_key (miroir de proph3t_set_anthropic_key)
CREATE OR REPLACE FUNCTION public.proph3t_set_gemini_key(
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
    RAISE EXCEPTION 'Clé Gemini invalide (trop courte)';
  END IF;

  IF length(p_master_key) < 16 THEN
    RAISE EXCEPTION 'master_key trop court (min 16 caractères)';
  END IF;

  v_model := COALESCE(p_model, (SELECT gemini_model FROM profiles WHERE id = p_user_id), 'gemini-2.0-flash');

  IF v_model NOT IN ('gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro') THEN
    RAISE EXCEPTION 'Modèle Gemini invalide : %', v_model;
  END IF;

  UPDATE public.profiles
  SET
    gemini_api_key_encrypted = pgp_sym_encrypt(p_api_key, p_master_key, 'cipher-algo=aes256'),
    gemini_model = v_model,
    proph3t_provider = 'gemini',
    gemini_key_set_at = now(),
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil introuvable : %', p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'model', v_model,
    'provider', 'gemini',
    'set_at', now()
  );
END;
$$;

-- 4. RPC : get_gemini_api_key
CREATE OR REPLACE FUNCTION public.proph3t_get_gemini_key(
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

  SELECT gemini_api_key_encrypted INTO v_encrypted
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_plaintext := pgp_sym_decrypt(v_encrypted, p_master_key);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Echec déchiffrement Gemini (master_key invalide ou clé corrompue)';
  END;

  BEGIN
    UPDATE public.profiles
    SET gemini_key_last_used_at = now()
    WHERE id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_plaintext;
END;
$$;

-- 5. RPC : clear_gemini_api_key
CREATE OR REPLACE FUNCTION public.proph3t_clear_gemini_key(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.profiles
  SET
    gemini_api_key_encrypted = NULL,
    gemini_key_set_at = NULL,
    gemini_key_last_used_at = NULL,
    proph3t_provider = CASE WHEN proph3t_provider = 'gemini' THEN 'ollama' ELSE proph3t_provider END,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 6. Mise à jour de proph3t_set_settings pour accepter gemini + valider la clé
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
  v_has_anthropic BOOLEAN;
  v_has_gemini BOOLEAN;
BEGIN
  IF p_provider IS NOT NULL AND p_provider NOT IN ('ollama', 'anthropic', 'gemini') THEN
    RAISE EXCEPTION 'Provider invalide : %', p_provider;
  END IF;

  -- Le modèle peut être Anthropic OU Gemini selon le provider courant.
  IF p_model IS NOT NULL AND p_model NOT IN (
    'claude-haiku-4-5-20251001', 'claude-sonnet-4-6',
    'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'
  ) THEN
    RAISE EXCEPTION 'Modèle invalide : %', p_model;
  END IF;

  IF p_provider = 'anthropic' THEN
    SELECT anthropic_api_key_encrypted IS NOT NULL INTO v_has_anthropic
    FROM public.profiles WHERE id = p_user_id;
    IF NOT COALESCE(v_has_anthropic, FALSE) THEN
      RAISE EXCEPTION 'Aucune clé Anthropic configurée. Saisissez d''abord une clé Anthropic.';
    END IF;
  ELSIF p_provider = 'gemini' THEN
    SELECT gemini_api_key_encrypted IS NOT NULL INTO v_has_gemini
    FROM public.profiles WHERE id = p_user_id;
    IF NOT COALESCE(v_has_gemini, FALSE) THEN
      RAISE EXCEPTION 'Aucune clé Gemini configurée. Saisissez d''abord une clé Gemini.';
    END IF;
  END IF;

  -- Routage du modèle vers la bonne colonne selon prefix
  UPDATE public.profiles
  SET
    proph3t_provider = COALESCE(p_provider, proph3t_provider),
    anthropic_model = CASE
      WHEN p_model LIKE 'claude-%' THEN p_model
      ELSE anthropic_model
    END,
    gemini_model = CASE
      WHEN p_model LIKE 'gemini-%' THEN p_model
      ELSE gemini_model
    END,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN (
    SELECT jsonb_build_object(
      'ok', true,
      'provider', proph3t_provider,
      'anthropic_model', anthropic_model,
      'gemini_model', gemini_model
    )
    FROM public.profiles WHERE id = p_user_id
  );
END;
$$;

-- 7. Mise à jour de proph3t_get_status pour inclure Gemini
CREATE OR REPLACE FUNCTION public.proph3t_get_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT jsonb_build_object(
    'provider', proph3t_provider,
    'anthropic', jsonb_build_object(
      'model', anthropic_model,
      'has_key', (anthropic_api_key_encrypted IS NOT NULL),
      'key_set_at', anthropic_key_set_at,
      'key_last_used_at', anthropic_key_last_used_at
    ),
    'gemini', jsonb_build_object(
      'model', gemini_model,
      'has_key', (gemini_api_key_encrypted IS NOT NULL),
      'key_set_at', gemini_key_set_at,
      'key_last_used_at', gemini_key_last_used_at
    )
  )
  FROM public.profiles
  WHERE id = p_user_id;
$$;

-- 8. Permissions : verrouiller aux roles serveur
REVOKE EXECUTE ON FUNCTION public.proph3t_set_gemini_key(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proph3t_get_gemini_key(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proph3t_clear_gemini_key(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.proph3t_set_gemini_key(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.proph3t_get_gemini_key(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.proph3t_clear_gemini_key(UUID) TO service_role;
