-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Stockage des tokens OAuth pour les connecteurs externes
-- ═══════════════════════════════════════════════════════════════════════════
-- Stratégie :
-- - Refresh tokens chiffrés AES-256 (pgp_sym_encrypt) avec APP_ENCRYPTION_KEY
-- - Access tokens cachés en clair (TTL court, regénérables) — pas critique
-- - RPCs SECURITY DEFINER : seul service_role peut écrire
-- - Lecture (status + email connecté) accessible aux admins
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────────────────────────────────────────────────────────────────────────
-- Table principale
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_oauth_tokens (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider               TEXT NOT NULL,            -- 'gmail', 'linkedin', 'github', ...
  account_email          TEXT,                     -- l'email/identifiant de l'utilisateur connecté
  account_label          TEXT,                     -- libellé court (ex: "pame@atlasstudio.org")
  refresh_token_encrypted BYTEA,                   -- AES-256 via pgp_sym_encrypt
  access_token_cached    TEXT,                     -- access token courant (peut être expiré)
  access_token_expires_at TIMESTAMPTZ,
  scope                  TEXT,
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  last_used_at           TIMESTAMPTZ,
  last_refresh_at        TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, account_email)
);
CREATE INDEX IF NOT EXISTS idx_asvc_oauth_provider ON public.asvc_oauth_tokens(provider, status);

DROP TRIGGER IF EXISTS trg_asvc_oauth_tokens_updated_at ON public.asvc_oauth_tokens;
CREATE TRIGGER trg_asvc_oauth_tokens_updated_at
  BEFORE UPDATE ON public.asvc_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.asvc_set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- RLS — admins peuvent voir le statut, JAMAIS le refresh_token chiffré.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.asvc_oauth_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read asvc_oauth_tokens" ON public.asvc_oauth_tokens;
CREATE POLICY "Admins read asvc_oauth_tokens" ON public.asvc_oauth_tokens
  FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Service manage asvc_oauth_tokens" ON public.asvc_oauth_tokens;
CREATE POLICY "Service manage asvc_oauth_tokens" ON public.asvc_oauth_tokens
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_oauth_set_token — stocke un refresh_token (chiffré) + métadonnées
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_oauth_set_token(
  p_provider       TEXT,
  p_account_email  TEXT,
  p_refresh_token  TEXT,
  p_master_key     TEXT,
  p_access_token   TEXT DEFAULT NULL,
  p_expires_at     TIMESTAMPTZ DEFAULT NULL,
  p_scope          TEXT DEFAULT NULL,
  p_account_label  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF length(p_master_key) < 16 THEN
    RAISE EXCEPTION 'master_key invalide (longueur min 16)';
  END IF;
  IF p_refresh_token IS NULL OR length(p_refresh_token) = 0 THEN
    RAISE EXCEPTION 'refresh_token requis';
  END IF;

  INSERT INTO public.asvc_oauth_tokens (
    provider, account_email, account_label,
    refresh_token_encrypted, access_token_cached,
    access_token_expires_at, scope, status,
    last_refresh_at
  )
  VALUES (
    p_provider, p_account_email, p_account_label,
    pgp_sym_encrypt(p_refresh_token, p_master_key, 'cipher-algo=aes256'),
    p_access_token,
    p_expires_at, p_scope, 'active',
    now()
  )
  ON CONFLICT (provider, account_email) DO UPDATE SET
    refresh_token_encrypted = pgp_sym_encrypt(p_refresh_token, p_master_key, 'cipher-algo=aes256'),
    access_token_cached = COALESCE(p_access_token, public.asvc_oauth_tokens.access_token_cached),
    access_token_expires_at = COALESCE(p_expires_at, public.asvc_oauth_tokens.access_token_expires_at),
    scope = COALESCE(p_scope, public.asvc_oauth_tokens.scope),
    account_label = COALESCE(p_account_label, public.asvc_oauth_tokens.account_label),
    status = 'active',
    last_refresh_at = now(),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_oauth_set_token(TEXT,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.asvc_oauth_set_token(TEXT,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT) TO service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_oauth_get_token — récupère le refresh_token déchiffré (service uniquement)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_oauth_get_token(
  p_provider       TEXT,
  p_account_email  TEXT,
  p_master_key     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_encrypted BYTEA;
  v_refresh   TEXT;
  v_access    TEXT;
  v_expires   TIMESTAMPTZ;
  v_id        UUID;
  v_label     TEXT;
BEGIN
  IF length(p_master_key) < 16 THEN
    RAISE EXCEPTION 'master_key invalide';
  END IF;

  SELECT id, refresh_token_encrypted, access_token_cached, access_token_expires_at, account_label
    INTO v_id, v_encrypted, v_access, v_expires, v_label
  FROM public.asvc_oauth_tokens
  WHERE provider = p_provider
    AND account_email = p_account_email
    AND status = 'active'
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_refresh := pgp_sym_decrypt(v_encrypted, p_master_key);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Échec déchiffrement (master_key incorrecte ou token corrompu)';
  END;

  RETURN jsonb_build_object(
    'id', v_id,
    'refresh_token', v_refresh,
    'access_token', v_access,
    'expires_at', v_expires,
    'account_email', p_account_email,
    'account_label', v_label
  );
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_oauth_get_token(TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.asvc_oauth_get_token(TEXT,TEXT,TEXT) TO service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_oauth_update_access_token — refresh du access token uniquement
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_oauth_update_access_token(
  p_provider       TEXT,
  p_account_email  TEXT,
  p_access_token   TEXT,
  p_expires_at     TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.asvc_oauth_tokens
     SET access_token_cached = p_access_token,
         access_token_expires_at = p_expires_at,
         last_refresh_at = now(),
         updated_at = now()
   WHERE provider = p_provider AND account_email = p_account_email;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_oauth_update_access_token(TEXT,TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.asvc_oauth_update_access_token(TEXT,TEXT,TEXT,TIMESTAMPTZ) TO service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_oauth_mark_used — incrémente last_used_at après envoi réussi
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_oauth_mark_used(
  p_provider       TEXT,
  p_account_email  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.asvc_oauth_tokens
     SET last_used_at = now()
   WHERE provider = p_provider AND account_email = p_account_email;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_oauth_mark_used(TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.asvc_oauth_mark_used(TEXT,TEXT) TO service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_oauth_revoke — admin peut révoquer un token (status='revoked')
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_oauth_revoke(
  p_provider       TEXT,
  p_account_email  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  UPDATE public.asvc_oauth_tokens
     SET status = 'revoked',
         updated_at = now()
   WHERE provider = p_provider AND account_email = p_account_email;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_oauth_revoke(TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_oauth_revoke(TEXT,TEXT) TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_oauth_list — admin voit le statut + email (mais pas le token)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_oauth_list()
RETURNS TABLE (
  provider         TEXT,
  account_email    TEXT,
  account_label    TEXT,
  status           TEXT,
  scope            TEXT,
  last_used_at     TIMESTAMPTZ,
  last_refresh_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  RETURN QUERY
  SELECT t.provider, t.account_email, t.account_label, t.status, t.scope,
         t.last_used_at, t.last_refresh_at, t.created_at
    FROM public.asvc_oauth_tokens t
   ORDER BY t.provider, t.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_oauth_list() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_oauth_list() TO authenticated, service_role;
