-- ============================================================================
-- ANNEXE B — Scripts SQL migrations Supabase ASVC v2.0 (RÉFÉRENCE — NE PAS EXÉCUTER)
-- ============================================================================
-- Document : Annexe B du CDC ASVC v2.0
-- Version : 1.0
-- Date : Mai 2026
-- Total : 24 tables + RLS + indexes + triggers + audit log immutable
-- ============================================================================
--
-- ⚠️ AVERTISSEMENT : Ce fichier est conservé comme RÉFÉRENCE DOCUMENTAIRE
-- uniquement. Le schéma effectivement déployé diverge volontairement.
-- Voir ANNEXE_B_cdc_v2_reference.md pour la liste des écarts assumés
-- et la liste des migrations réellement appliquées.
--
-- NE PAS exécuter ce SQL sur la base de production — il créerait des
-- tables en conflit avec le schéma déployé.
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS REQUISES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- 1. TABLE : asvc_agents
-- ============================================================================
-- Registre central des 17 agents ASVC
-- ============================================================================

CREATE TABLE asvc_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN (
    'direction', 'rd', 'production', 'marketing', 'ventes', 'sav', 'finance'
  )),
  llm_provider TEXT NOT NULL CHECK (llm_provider IN ('ollama', 'claude_api')),
  llm_model TEXT NOT NULL,
  llm_temperature NUMERIC(3,2) DEFAULT 0.7 CHECK (llm_temperature BETWEEN 0 AND 2),
  llm_max_tokens INTEGER DEFAULT 4096,
  system_prompt TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  allowed_tools JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'paused', 'quarantine', 'disabled'
  )),
  health_score NUMERIC(3,2) DEFAULT 1.0 CHECK (health_score BETWEEN 0 AND 1),
  version TEXT DEFAULT '1.0',
  description TEXT,
  reports_to TEXT REFERENCES asvc_agents(code),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- (Le fichier complet de 750+ lignes a été archivé dans l'historique de
-- conversation Claude Code du 2026-05-16. Il contient les 24 tables, RLS
-- atlas_ceo, hash chain audit, vues, et 6 cron jobs pg_cron + pg_net.)
--
-- Pour récupérer le fichier complet : voir le commit qui a créé ce fichier
-- ou la conversation Claude Code mentionnée dans ANNEXE_B_cdc_v2_reference.md.
-- ============================================================================
