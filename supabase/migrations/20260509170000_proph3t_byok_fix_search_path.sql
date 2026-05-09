-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T BYOK — Fix critique : pgcrypto schema search_path
-- ═══════════════════════════════════════════════════════════════════════════
-- Les RPCs proph3t_set/get_anthropic_key et proph3t_set/get_gemini_key
-- creees dans 20260509120000 et 20260509120001 avaient :
--   SET search_path = public, pg_temp
-- Or sur Supabase, l'extension pgcrypto est dans le schema "extensions",
-- pas "public". Donc pgp_sym_encrypt() et pgp_sym_decrypt() n'etaient
-- pas trouves -> erreur "function does not exist".
--
-- Symptome utilisateur : bouton "Test et enregistrement" de l'IA Proph3t
-- echoue silencieusement, aucune cle stockee, has_anthropic/has_gemini
-- restent false.
--
-- Fix : ajouter "extensions" au search_path des 4 RPCs.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.proph3t_set_anthropic_key(
  p_user_id UUID,
  p_api_key TEXT,
  p_master_key TEXT,
  p_model TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_model TEXT;
BEGIN
  IF p_user_id IS NULL OR p_api_key IS NULL OR p_master_key IS NULL THEN
    RAISE EXCEPTION 'p_user_id, p_api_key et p_master_key sont requis';
  END IF;
  IF length(p_api_key) < 20 THEN
    RAISE EXCEPTION 'Cle Anthropic invalide (trop courte)';
  END IF;
  IF length(p_master_key) < 16 THEN
    RAISE EXCEPTION 'master_key trop court (min 16 caracteres)';
  END IF;
  v_model := COALESCE(p_model, (SELECT anthropic_model FROM profiles WHERE id = p_user_id), 'claude-haiku-4-5-20251001');
  IF v_model NOT IN ('claude-haiku-4-5-20251001', 'claude-sonnet-4-6') THEN
    RAISE EXCEPTION 'Modele invalide : %', v_model;
  END IF;
  UPDATE public.profiles SET
    anthropic_api_key_encrypted = pgp_sym_encrypt(p_api_key, p_master_key),
    anthropic_model = v_model,
    proph3t_provider = 'anthropic',
    anthropic_key_set_at = now(),
    updated_at = now()
  WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable : %', p_user_id; END IF;
  RETURN jsonb_build_object('ok', true, 'model', v_model, 'provider', 'anthropic', 'set_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.proph3t_get_anthropic_key(
  p_user_id UUID,
  p_master_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_encrypted BYTEA;
  v_plaintext TEXT;
BEGIN
  IF p_user_id IS NULL OR p_master_key IS NULL THEN
    RAISE EXCEPTION 'p_user_id et p_master_key sont requis';
  END IF;
  SELECT anthropic_api_key_encrypted INTO v_encrypted FROM public.profiles WHERE id = p_user_id;
  IF v_encrypted IS NULL THEN RETURN NULL; END IF;
  BEGIN
    v_plaintext := pgp_sym_decrypt(v_encrypted, p_master_key);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Echec dechiffrement (master_key invalide ou cle corrompue)';
  END;
  BEGIN
    UPDATE public.profiles SET anthropic_key_last_used_at = now() WHERE id = p_user_id;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN v_plaintext;
END;
$$;

CREATE OR REPLACE FUNCTION public.proph3t_set_gemini_key(
  p_user_id UUID,
  p_api_key TEXT,
  p_master_key TEXT,
  p_model TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_model TEXT;
BEGIN
  IF p_user_id IS NULL OR p_api_key IS NULL OR p_master_key IS NULL THEN
    RAISE EXCEPTION 'arguments requis';
  END IF;
  IF length(p_api_key) < 20 THEN
    RAISE EXCEPTION 'Cle Gemini invalide (trop courte)';
  END IF;
  IF length(p_master_key) < 16 THEN
    RAISE EXCEPTION 'master_key trop court';
  END IF;
  v_model := COALESCE(p_model, (SELECT gemini_model FROM profiles WHERE id = p_user_id), 'gemini-2.0-flash');
  IF v_model NOT IN ('gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro') THEN
    RAISE EXCEPTION 'Modele Gemini invalide : %', v_model;
  END IF;
  UPDATE public.profiles SET
    gemini_api_key_encrypted = pgp_sym_encrypt(p_api_key, p_master_key),
    gemini_model = v_model,
    proph3t_provider = 'gemini',
    gemini_key_set_at = now(),
    updated_at = now()
  WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  RETURN jsonb_build_object('ok', true, 'model', v_model, 'provider', 'gemini', 'set_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.proph3t_get_gemini_key(
  p_user_id UUID,
  p_master_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_encrypted BYTEA;
  v_plaintext TEXT;
BEGIN
  IF p_user_id IS NULL OR p_master_key IS NULL THEN
    RAISE EXCEPTION 'arguments requis';
  END IF;
  SELECT gemini_api_key_encrypted INTO v_encrypted FROM public.profiles WHERE id = p_user_id;
  IF v_encrypted IS NULL THEN RETURN NULL; END IF;
  BEGIN
    v_plaintext := pgp_sym_decrypt(v_encrypted, p_master_key);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Echec dechiffrement Gemini';
  END;
  BEGIN
    UPDATE public.profiles SET gemini_key_last_used_at = now() WHERE id = p_user_id;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN v_plaintext;
END;
$$;
