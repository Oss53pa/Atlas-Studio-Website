-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T Core v1.0 — Seed des 18 nouveaux Core tools L1 (28/28 total)
-- CDC §3.2 Core L1 tools complet
-- ═══════════════════════════════════════════════════════════════════════════
-- Apres cette migration, la table proph3t_tools contient les 28 tools L1 :
--   Data (6)        : get_financial_data, search_knowledge*, search_documents*,
--                     get_memory, generate_alert, save_business_rule
--   Calcs (5)       : compute_ratio, compute_tva, apply_prorata_360,
--                     format_money_fcfa, convert_currency [NEW]
--   Reasoning (4)   : plan_task, chain_of_thought, verify_hypothesis,
--                     route_to_model [NEW]
--   Memory (5)      : save_episodic_memory, save_semantic_memory,
--                     recall_similar_cases, update_memory, forget_memory [NEW]
--   RAG (3)         : search_app_knowledge, search_tenant_documents,
--                     index_document [NEW]
--   Output (3)      : generate_report, send_notification, log_decision [NEW]
--   Vision (2)      : extract_from_image, parse_document_visual [NEW]
--   Security (3)    : verify_rls_context, audit_trail_write,
--                     check_compliance [NEW]
-- ═══════════════════════════════════════════════════════════════════════════
-- (*) search_knowledge / search_documents : legacy pour Ollama embeddings.
--     search_app_knowledge / search_tenant_documents : nouvelle generation
--     avec fallback texte (utilisable cloud sans Ollama).

-- ─── Calcs L1 ────────────────────────────────────────────────────────────
INSERT INTO public.proph3t_tools (id, level, name, description, schema, is_deterministic, requires_embeddings) VALUES
  ('convert_currency', 1, 'convert_currency',
   'Convertit un montant entre devises (XOF/XAF/EUR/USD). Taux BCEAO/BEAC fixes ou taux historique.',
   '{"type":"object","properties":{"amount_centimes":{"type":"string"},"from_code":{"type":"string"},"to_code":{"type":"string"},"date":{"type":"string"}},"required":["amount_centimes","from_code","to_code"]}'::jsonb,
   TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, schema = EXCLUDED.schema;

-- ─── Reasoning L1 ────────────────────────────────────────────────────────
INSERT INTO public.proph3t_tools (id, level, name, description, schema, is_deterministic, requires_embeddings) VALUES
  ('plan_task', 1, 'plan_task',
   'Decompose une tache complexe en etapes ordonnees avant execution.',
   '{"type":"object","properties":{"task":{"type":"string"},"steps":{"type":"array"},"estimated_iterations":{"type":"integer"}},"required":["task","steps"]}'::jsonb,
   TRUE, FALSE),
  ('chain_of_thought', 1, 'chain_of_thought',
   'Encapsule une chaine de raisonnement explicite (Q -> steps -> conclusion + confiance + caveats).',
   '{"type":"object","properties":{"question":{"type":"string"},"reasoning_steps":{"type":"array"},"conclusion":{"type":"string"},"confidence":{"type":"integer"},"caveats":{"type":"array"}},"required":["question","reasoning_steps","conclusion","confidence"]}'::jsonb,
   TRUE, FALSE),
  ('verify_hypothesis', 1, 'verify_hypothesis',
   'Verifie une hypothese metier en confrontant evidence pour/contre. Verdict + plausibilite.',
   '{"type":"object","properties":{"hypothesis":{"type":"string"},"evidence_for":{"type":"array"},"evidence_against":{"type":"array"},"sources":{"type":"array"}},"required":["hypothesis"]}'::jsonb,
   TRUE, FALSE),
  ('route_to_model', 1, 'route_to_model',
   'Recommande un LLM optimal selon le type de tache (CDC §5.3 routing).',
   '{"type":"object","properties":{"task_type":{"type":"string","enum":["simple_qa","analytical","vision","cost_sensitive","long_context","code_gen"]},"context_size_estimate":{"type":"integer"},"user_has_byok":{"type":"object"}},"required":["task_type"]}'::jsonb,
   TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, schema = EXCLUDED.schema;

-- ─── Memory L1 ───────────────────────────────────────────────────────────
INSERT INTO public.proph3t_tools (id, level, name, description, schema, is_deterministic, requires_embeddings) VALUES
  ('save_episodic_memory', 1, 'save_episodic_memory',
   'Enregistre un evenement date dans la memoire episodique.',
   '{"type":"object","properties":{"tenant_id":{"type":"string"},"user_id":{"type":"string"},"app_id":{"type":"string"},"event_type":{"type":"string"},"event_data":{"type":"object"},"occurred_at":{"type":"string"}},"required":["event_type","event_data"]}'::jsonb,
   TRUE, FALSE),
  ('save_semantic_memory', 1, 'save_semantic_memory',
   'Enregistre un fait/regle metier dans la memoire semantique (scope global/app/tenant/user).',
   '{"type":"object","properties":{"scope":{"type":"string","enum":["global","app","tenant","user"]},"scope_id":{"type":"string"},"fact":{"type":"string"},"source":{"type":"string"},"confidence":{"type":"number"},"validated_by":{"type":"string"}},"required":["scope","fact","source"]}'::jsonb,
   TRUE, FALSE),
  ('recall_similar_cases', 1, 'recall_similar_cases',
   'Recherche cas similaires dans la memoire (cosine similarity ou fallback texte).',
   '{"type":"object","properties":{"query":{"type":"string"},"scope":{"type":"string","enum":["episodic","semantic","both"]},"top_k":{"type":"integer"},"tenant_id":{"type":"string"},"app_id":{"type":"string"}},"required":["query"]}'::jsonb,
   TRUE, FALSE),
  ('update_memory', 1, 'update_memory',
   'Met a jour une entree memoire existante (correction, enrichissement).',
   '{"type":"object","properties":{"memory_id":{"type":"string"},"scope":{"type":"string","enum":["episodic","semantic"]},"patch":{"type":"object"}},"required":["memory_id","scope","patch"]}'::jsonb,
   TRUE, FALSE),
  ('forget_memory', 1, 'forget_memory',
   'Soft-delete RGPD pour semantique, hard-delete pour episodique. Reason obligatoire.',
   '{"type":"object","properties":{"memory_id":{"type":"string"},"scope":{"type":"string","enum":["episodic","semantic"]},"reason":{"type":"string"}},"required":["memory_id","scope","reason"]}'::jsonb,
   TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, schema = EXCLUDED.schema;

-- ─── RAG L1 ──────────────────────────────────────────────────────────────
INSERT INTO public.proph3t_tools (id, level, name, description, schema, is_deterministic, requires_embeddings) VALUES
  ('search_app_knowledge', 1, 'search_app_knowledge',
   'Recherche dans la base de connaissances knowledge (scope global ou app).',
   '{"type":"object","properties":{"query":{"type":"string"},"scope_id":{"type":"string"},"source_type":{"type":"string"},"top_k":{"type":"integer"}},"required":["query"]}'::jsonb,
   TRUE, FALSE),  -- requires_embeddings=FALSE car fallback texte
  ('search_tenant_documents', 1, 'search_tenant_documents',
   'Recherche dans les documents propres a un tenant (factures, contrats, bilans).',
   '{"type":"object","properties":{"query":{"type":"string"},"tenant_id":{"type":"string"},"source_type":{"type":"string"},"top_k":{"type":"integer"}},"required":["query","tenant_id"]}'::jsonb,
   TRUE, FALSE),
  ('index_document', 1, 'index_document',
   'Indexe un nouveau document dans le RAG (chunking automatique + embeddings si dispo).',
   '{"type":"object","properties":{"scope":{"type":"string","enum":["global","app","tenant"]},"scope_id":{"type":"string"},"source_url":{"type":"string"},"source_type":{"type":"string"},"title":{"type":"string"},"content":{"type":"string"},"metadata":{"type":"object"}},"required":["scope","source_type","title","content"]}'::jsonb,
   TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, schema = EXCLUDED.schema;

-- ─── Output L1 ───────────────────────────────────────────────────────────
INSERT INTO public.proph3t_tools (id, level, name, description, schema, is_deterministic, requires_embeddings) VALUES
  ('generate_report', 1, 'generate_report',
   'Genere un rapport structure (markdown / html / json) a partir de sections.',
   '{"type":"object","properties":{"title":{"type":"string"},"subtitle":{"type":"string"},"sections":{"type":"array"},"format":{"type":"string","enum":["markdown","html","json"]},"metadata":{"type":"object"}},"required":["title","sections"]}'::jsonb,
   TRUE, FALSE),
  ('send_notification', 1, 'send_notification',
   'Envoie une notification (in-app / email / sms / all).',
   '{"type":"object","properties":{"user_id":{"type":"string"},"tenant_id":{"type":"string"},"app_id":{"type":"string"},"channel":{"type":"string","enum":["in_app","email","sms","all"]},"severity":{"type":"string","enum":["P0","P1","P2","info"]},"title":{"type":"string"},"message":{"type":"string"},"payload":{"type":"object"}},"required":["channel","severity","title","message"]}'::jsonb,
   TRUE, FALSE),
  ('log_decision', 1, 'log_decision',
   'Log une decision metier (audit + memoire episodique). Tracability mode strict.',
   '{"type":"object","properties":{"decision":{"type":"string"},"rationale":{"type":"string"},"confidence":{"type":"integer"},"inputs_summary":{"type":"object"},"user_id":{"type":"string"},"tenant_id":{"type":"string"},"app_id":{"type":"string"}},"required":["decision","rationale","confidence"]}'::jsonb,
   TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, schema = EXCLUDED.schema;

-- ─── Vision L1 ───────────────────────────────────────────────────────────
INSERT INTO public.proph3t_tools (id, level, name, description, schema, is_deterministic, requires_embeddings) VALUES
  ('extract_from_image', 1, 'extract_from_image',
   'Extrait du texte/donnees d''une image (OCR + comprehension via Gemini Vision).',
   '{"type":"object","properties":{"image_base64":{"type":"string"},"mime_type":{"type":"string"},"prompt":{"type":"string"},"expected_schema":{"type":"object"}},"required":["image_base64","mime_type","prompt"]}'::jsonb,
   FALSE, FALSE),  -- non-deterministe : depend du LLM Vision
  ('parse_document_visual', 1, 'parse_document_visual',
   'Parse un document visuel (facture, releve, bilan, fiche paie) en JSON SYSCOHADA.',
   '{"type":"object","properties":{"image_base64":{"type":"string"},"mime_type":{"type":"string"},"document_type":{"type":"string","enum":["facture","releve_bancaire","bilan","compte_resultat","fiche_paie","contrat","auto"]}},"required":["image_base64","mime_type","document_type"]}'::jsonb,
   FALSE, FALSE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, schema = EXCLUDED.schema, is_deterministic = EXCLUDED.is_deterministic;

-- ─── Security L1 ─────────────────────────────────────────────────────────
INSERT INTO public.proph3t_tools (id, level, name, description, schema, is_deterministic, requires_embeddings) VALUES
  ('verify_rls_context', 1, 'verify_rls_context',
   'Verifie que le contexte RLS d''une table empeche bien la fuite cross-tenant.',
   '{"type":"object","properties":{"user_id":{"type":"string"},"expected_tenant_id":{"type":"string"},"table_to_test":{"type":"string"},"test_query_filter":{"type":"object"}},"required":["user_id","table_to_test"]}'::jsonb,
   TRUE, FALSE),
  ('audit_trail_write', 1, 'audit_trail_write',
   'Ecrit une entree dans l''audit trail chaine SHA-256 (CDC §4.1). Immuable.',
   '{"type":"object","properties":{"action":{"type":"string"},"actor_user_id":{"type":"string"},"subject_type":{"type":"string"},"subject_id":{"type":"string"},"content":{"type":"object"}},"required":["action","content"]}'::jsonb,
   TRUE, FALSE),
  ('check_compliance', 1, 'check_compliance',
   'Verifie compliance CDC : citations, confidence, RGPD PII, money en BIGINT centimes.',
   '{"type":"object","properties":{"mode":{"type":"string","enum":["strict","standard"]},"payload":{"type":"object"},"citations":{"type":"array"},"confidence":{"type":"integer"},"app_id":{"type":"string"},"rules":{"type":"object"}},"required":["mode","payload"]}'::jsonb,
   TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, schema = EXCLUDED.schema;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verification : on attend 28 tools L1 apres cette migration
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  l1_count INT;
BEGIN
  SELECT COUNT(*) INTO l1_count FROM public.proph3t_tools WHERE level = 1;
  IF l1_count < 28 THEN
    RAISE WARNING 'PROPH3T Core L1: % tools seedes (attendu: 28). Verifier les seeds.', l1_count;
  ELSE
    RAISE NOTICE 'PROPH3T Core L1 OK: % tools L1 actifs.', l1_count;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RPC d'aide : proph3t_search_rag_chunks (cosine similarity sur chunks)
-- Utilise par search_app_knowledge / search_tenant_documents quand embedding dispo
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.proph3t_search_rag_chunks(
  query_embedding vector(768),
  filter_scope_id TEXT DEFAULT NULL,
  filter_source_type TEXT DEFAULT NULL,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  source_type TEXT,
  title TEXT,
  scope TEXT,
  scope_id TEXT
)
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity,
    d.source_type,
    d.title,
    d.scope,
    d.scope_id
  FROM public.proph3t_rag_chunks c
  INNER JOIN public.proph3t_rag_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND (filter_scope_id IS NULL OR d.scope_id = filter_scope_id)
    AND (filter_source_type IS NULL OR d.source_type = filter_source_type)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.proph3t_search_rag_chunks TO authenticated, service_role;

COMMENT ON FUNCTION public.proph3t_search_rag_chunks IS 'CDC §3.2 RAG — Recherche cosine similarity sur chunks indexes. Utilise par search_app_knowledge / search_tenant_documents.';
