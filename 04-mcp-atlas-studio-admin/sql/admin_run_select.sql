-- ============================================================
-- Atlas Studio admin MCP — fonction RPC requise pour `execute_sql_query`
-- A executer UNE FOIS dans Supabase SQL Editor.
-- ============================================================
-- Garantit qu'on ne peut faire que des SELECT / WITH / EXPLAIN
-- (le MCP filtre cote client mais on double-verrouille cote DB).

CREATE OR REPLACE FUNCTION public.admin_run_select(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
  cleaned text;
BEGIN
  cleaned := regexp_replace(sql, ';\s*$', '');

  IF cleaned !~* '^\s*(select|with|explain)\b' THEN
    RAISE EXCEPTION 'Only SELECT/WITH/EXPLAIN queries are allowed';
  END IF;

  IF cleaned ~* '\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|replace|merge|copy|vacuum|reindex|cluster|listen|notify)\b' THEN
    RAISE EXCEPTION 'Write/DDL keywords detected — refused';
  END IF;

  IF cleaned ~ ';\s*\S' THEN
    RAISE EXCEPTION 'Multiple statements detected — refused';
  END IF;

  EXECUTE 'SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (' || cleaned || ') t'
    INTO result;

  RETURN result;
END;
$$;

-- Le MCP utilise le service_role qui contourne RLS et appelle cette RPC.
-- On verrouille quand meme l'execution aux roles de service.
REVOKE EXECUTE ON FUNCTION public.admin_run_select(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_run_select(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_run_select(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_run_select(text) TO service_role;
