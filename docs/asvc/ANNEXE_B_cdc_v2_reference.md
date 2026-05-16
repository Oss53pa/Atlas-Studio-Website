# Annexe B — Schéma SQL ASVC v2.0 (référence)

**Statut** : Document de référence CDC v2.0. **Le schéma déployé diverge volontairement** sur certains points (cf. section "Écarts assumés" ci-dessous).

**Date d'archivage** : 2026-05-16
**Auteur déploiement** : sync incrémental Annexe A + B sur projet `vgtmljfayiysuvrcmunt`

---

## Migrations effectivement appliquées

Le schéma déployé est composé de 11 migrations (timestamp → contenu) :

| Timestamp | Migration | Source |
|---|---|---|
| `20260515120000` | `asvc_foundation` | 15 tables + RLS + audit hash chain + seed 12 agents |
| `20260515130000` | `asvc_brief_rpcs` | `asvc_brief_stats()`, `asvc_log_audit()` |
| `20260515140000` | `asvc_customer_lifecycle` | `asvc_clients_lifecycle()` |
| `20260515150000` | `asvc_leads_pipeline` | `asvc_leads_pipeline()` |
| `20260515160000` | `asvc_finance_rpcs` | `asvc_overdue_invoices()`, `asvc_finance_dashboard()` |
| `20260515170000` | `asvc_hardening` | `asvc_health_check()`, `asvc_verify_audit_chain()`, `asvc_action_stats()` |
| `20260515180000` | `asvc_v2_rd_production` | 9 tables R&D/Production + 7 agents + `asvc_pipeline_summary()` |
| `20260515190000` | `asvc_system_prompts` | Injection des 19 system prompts (Annexe A) |
| `20260516120000` | `asvc_security_hardening` | Bug `company_name` + 3 fixes advisors |
| `20260516130000` | `asvc_rpc_invoker` | 8 RPCs → `SECURITY INVOKER` |
| `20260516140000` | `asvc_admin_select_orgs_societes` | Policies admin Atlas Studio sur `organizations`/`societes` |
| `20260516150000` | `asvc_cdc_v2_bugfix` | criticality `orange`/`purple` + departments `rd`/`production` |
| `20260516160000` | `asvc_cdc_v2_schema_extend` | Adoption colonnes Annexe B (non-destructive) |
| `20260516170000` | `asvc_cdc_v2_views_seeds` | Vues admin + seeds CEO preferences |

---

## Écarts assumés vs Annexe B

L'Annexe B propose certains choix que **nous n'avons pas adoptés** par décision conceptuelle (cf. analyse comparative dans l'historique de conversation) :

### 1. RLS pattern : `is_admin()` (déployé) vs `auth.jwt() ->> 'role' = 'atlas_ceo'` (Annexe B)

**Choix déployé** : `is_admin()` (reads `profiles.role IN ('admin','super_admin')`).

**Justification** : c'est le **standard du codebase Atlas Studio**, utilisé par toutes les autres apps (Atlas Finance, LiassPilot, AtlasBanx, etc.). Adopter le JWT claim `atlas_ceo` exigerait des auth hooks Supabase custom non déployés et créerait une île de sécurité isolée.

### 2. Embedding `vector(768)` (déployé) vs `vector(1536)` (Annexe B)

**Choix déployé** : 768 dim (nomic-embed-text via Ollama).

**Justification** : cohérent avec Proph3t (parent embedding system), 100% local, gratuit, aligné avec la doctrine de souveraineté numérique d'Atlas Studio. Le 1536 d'Annexe B implique text-embedding-3-small (OpenAI, coût + dépendance externe).

### 3. Colonnes préservées vs droppées par Annexe B

| Colonne déployée | Annexe B | Décision |
|---|---|---|
| `asvc_agent_sessions.cost_usd` | droppée | **conservée** (tracking finance critique pour budgéter les agents) |
| `asvc_agent_sessions.metadata` | droppée | **conservée** (extensibilité) |
| `asvc_audit_log.ip_address` | droppée | **conservée** (trace RGPD) |
| `asvc_audit_log.user_agent` | droppée | **conservée** (trace RGPD) |
| `asvc_agents.llm_fallback` | droppée | **conservée** (redondance LLM) |
| `asvc_agents.role_description` | renommée `description` | **les deux conservées** + backfill |
| `asvc_agents.tools` | renommée `allowed_tools` | **`tools` conservée**, `allowed_tools` non ajoutée |

### 4. Cron jobs : externe (déployé) vs `pg_cron + pg_net` (Annexe B)

**Choix déployé** : les agents sont déclenchés par Vercel Cron + Edge Functions (pattern Proph3t).

**Justification** : pg_net n'est pas activé. Vercel Cron donne un meilleur monitoring d'exécution (logs UI), et le pattern est déjà éprouvé sur Proph3t.

### 5. Renommages cosmétiques non appliqués

Pour éviter de casser les Edge Functions qui lisent les colonnes existantes :

| Annexe B | Déployé | Statut |
|---|---|---|
| `tokens_input` / `tokens_output` | `tokens_used` | **les deux conservés** (legacy + nouveaux) |
| `finished_at` | `ended_at` | `ended_at` conservé |
| `content_markdown` | `summary` + `details_markdown` | déployé conservé |
| `metrics` (briefs) | `kpis` | `kpis` conservé |
| `previous_hash` / `current_hash` | `prev_hash` / `hash` | déployé conservé |
| `target_type` / `target_id` | `resource_type` / `resource_id` | déployé conservé |
| `details` (audit) | `payload` | déployé conservé |

---

## Ajouts adoptés depuis Annexe B

### Tables existantes étendues (M2)

- `asvc_agents` : `llm_provider`, `llm_model`, `llm_temperature`, `llm_max_tokens`, `status` (enum 4 valeurs), `health_score`, `reports_to` (FK self), `version`, `description`
- `asvc_agent_sessions` : `tokens_input`, `tokens_output`, `duration_ms`, `output`, `error_message`
- `asvc_coo_briefs` : `weather` (green/yellow/red), `highlights`, `pending_decisions` ; brief_type étendu (`incident`, `special`)
- `asvc_audit_log` : `sequence_number BIGSERIAL UNIQUE`, `event_category`
- `asvc_ceo_preferences` : `is_auto_approve_pattern`, `pattern_match_count`, `pattern_required_threshold`

### CHECK constraints étendus (M1)

- `asvc_agent_actions.criticality` : ajout de `orange` + `purple` (référencés par les system prompts)
- `asvc_agents.department` : ajout de `rd` + `production` (les 7 agents R&D/Prod ont été migrés depuis 'direction')

### Vues admin créées (M3)

- `v_asvc_pending_ceo_arbitrations` (inbox Pame, tri par criticality)
- `v_asvc_product_pipeline` (Kanban opportunités → spec → PR → deploy)

Toutes en `security_invoker = true` pour respecter la RLS.

### Seeds CEO preferences (M3)

11 préférences initiales en 3 catégories : `communication` (brief times, signature, langue), `workflow` (max_daily_arbitrations, vacation_mode, canaux escalade), `auto_approve` (patterns d'apprentissage).

---

## SQL Annexe B original

Le SQL complet de l'Annexe B (CDC v2.0, version "from scratch") est conservé pour référence dans le fichier compagnon `ANNEXE_B_cdc_v2_original.sql` du même répertoire.

**Ne pas exécuter tel quel** sur la base de production — il créerait des tables en conflit avec le schéma déployé. À utiliser comme spec documentaire pour les évolutions futures.
