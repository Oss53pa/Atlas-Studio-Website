-- Audit 360° (Wave D) — restaure le chiffrement AES-256 pour les clés BYOK.
-- Appliqué en prod le 2026-06-05 via Supabase MCP (apply_migration).
--
-- `pgp_sym_encrypt(data, key)` sans option 'cipher-algo' retombe sur AES-128 par
-- défaut (pgcrypto). Un fix précédent (search_path) avait perdu l'option AES-256.
-- N'affecte que les NOUVEAUX enregistrements de clé (re-save) ; les clés
-- existantes restent déchiffrables (pgp_sym_decrypt détecte l'algo du conteneur).
create or replace function public.proph3t_set_anthropic_key(p_user_id uuid, p_api_key text, p_master_key text, p_model text default null)
returns jsonb language plpgsql security definer set search_path to 'public','extensions','pg_temp'
as $function$
declare v_model text;
begin
  if p_user_id is null or p_api_key is null or p_master_key is null then raise exception 'p_user_id, p_api_key et p_master_key sont requis'; end if;
  if length(p_api_key) < 20 then raise exception 'Cle Anthropic invalide (trop courte)'; end if;
  if length(p_master_key) < 16 then raise exception 'master_key trop court (min 16 caracteres)'; end if;
  v_model := coalesce(p_model, (select anthropic_model from profiles where id = p_user_id), 'claude-haiku-4-5-20251001');
  if v_model not in ('claude-haiku-4-5-20251001', 'claude-sonnet-4-6') then raise exception 'Modele invalide : %', v_model; end if;
  update public.profiles set anthropic_api_key_encrypted = pgp_sym_encrypt(p_api_key, p_master_key, 'cipher-algo=aes256'), anthropic_model = v_model, proph3t_provider = 'anthropic', anthropic_key_set_at = now(), updated_at = now() where id = p_user_id;
  if not found then raise exception 'Profil introuvable'; end if;
  return jsonb_build_object('ok', true, 'model', v_model, 'provider', 'anthropic', 'set_at', now());
end;
$function$;

create or replace function public.proph3t_set_gemini_key(p_user_id uuid, p_api_key text, p_master_key text, p_model text default null)
returns jsonb language plpgsql security definer set search_path to 'public','extensions','pg_temp'
as $function$
declare v_model text;
begin
  if p_user_id is null or p_api_key is null or p_master_key is null then raise exception 'arguments requis'; end if;
  if length(p_api_key) < 20 then raise exception 'Cle Gemini invalide (trop courte)'; end if;
  if length(p_master_key) < 16 then raise exception 'master_key trop court'; end if;
  v_model := coalesce(p_model, (select gemini_model from profiles where id = p_user_id), 'gemini-2.0-flash');
  if v_model not in ('gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro') then raise exception 'Modele Gemini invalide : %', v_model; end if;
  update public.profiles set gemini_api_key_encrypted = pgp_sym_encrypt(p_api_key, p_master_key, 'cipher-algo=aes256'), gemini_model = v_model, proph3t_provider = 'gemini', gemini_key_set_at = now(), updated_at = now() where id = p_user_id;
  if not found then raise exception 'Profil introuvable'; end if;
  return jsonb_build_object('ok', true, 'model', v_model, 'provider', 'gemini', 'set_at', now());
end;
$function$;
