-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Bugfix CDC v2.0 : criticality `orange`/`purple` + departments `rd`/`production`
-- ═══════════════════════════════════════════════════════════════════════════
-- Annexe A (system prompts COO) référence les niveaux 🟠 ORANGE (PR/preview)
-- et 🟣 PURPLE (deploy production avec double confirmation). Le CHECK constraint
-- déployé les rejetait → bug bloquant. Cette migration les ajoute.
--
-- Annexe B distingue 'rd' et 'production' comme départements à part entière.
-- Le déploiement initial les avait fourrés dans 'direction' faute de CHECK
-- étendu. On rétablit l'ontologie propre.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. criticality : ajouter 'orange' et 'purple'
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.asvc_agent_actions
  DROP CONSTRAINT IF EXISTS asvc_agent_actions_criticality_check;
ALTER TABLE public.asvc_agent_actions
  ADD CONSTRAINT asvc_agent_actions_criticality_check
  CHECK (criticality IN ('low', 'normal', 'orange', 'high', 'purple', 'critical'));

-- ───────────────────────────────────────────────────────────────────────────
-- 2. department : ajouter 'rd' et 'production' + UPDATE des 7 agents mal classés
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.asvc_agents
  DROP CONSTRAINT IF EXISTS asvc_agents_department_check;
ALTER TABLE public.asvc_agents
  ADD CONSTRAINT asvc_agents_department_check
  CHECK (department IN ('direction', 'rd', 'production', 'sav', 'marketing', 'ventes', 'finance'));

-- R&D : veille, user_research, product_designer
UPDATE public.asvc_agents
  SET department = 'rd'
  WHERE code IN ('veille', 'user_research', 'product_designer');

-- Production : dev, qa, devops_release, documentation
UPDATE public.asvc_agents
  SET department = 'production'
  WHERE code IN ('dev', 'qa', 'devops_release', 'documentation');

-- coo reste 'direction' (pivot orchestrateur unique)
