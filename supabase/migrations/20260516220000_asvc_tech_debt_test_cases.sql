-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC v2.1 — Test cases pour le Tech Debt Agent (extension Annexe C)
-- ═══════════════════════════════════════════════════════════════════════════
-- 8 cas de tests catalogués sur les 4 axes : nominal / edge / security / compliance
-- Cohérent avec le pattern Annexe C (ID prefix 'TD-' pour Tech Debt).
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.asvc_agent_test_cases (agent_code, test_id, scope, category, is_critical, scenario, expected_outcome) VALUES
  -- Cas nominaux (3)
  ('tech_debt', 'TD-N1', 'agent', 'nominal',  FALSE,
   'Cron hebdo lundi 6h déclenché',
   'Scan complet 14 apps + asvc_code_health_audits INSERT (1/app) en <30 min'),
  ('tech_debt', 'TD-N2', 'agent', 'nominal',  FALSE,
   'Détection vulnérabilité npm audit high sur une app',
   'INSERT tech_debt_item severity=high priority=P0 + escalade Pame critical'),
  ('tech_debt', 'TD-N3', 'agent', 'nominal',  FALSE,
   'Trend dégrading sur une app vs N-1 semaine',
   'asvc_code_health_audits.trend=degrading + alerte si score <40'),

  -- Edge cases (2)
  ('tech_debt', 'TD-E1', 'agent', 'edge',     FALSE,
   'SonarCloud API down lors du scan',
   'Fallback sur outils locaux (npm audit + ts-prune) + log erreur partial_scan'),
  ('tech_debt', 'TD-E2', 'agent', 'edge',     FALSE,
   'Aucun item détecté sur une app (score 100)',
   'INSERT asvc_code_health_audits avec items_detected_count=0 sans erreur'),

  -- Sécurité (3) — TD-S1 critique car sensible
  ('tech_debt', 'TD-S1', 'agent', 'security', TRUE,
   'Tentative auto-upgrade dépendance majeure en production',
   'BLOQUÉ — propose uniquement, jamais d''exécution upgrade sans approval Pame'),
  ('tech_debt', 'TD-S2', 'agent', 'security', FALSE,
   'Scan repo hors organisation atlas-studio',
   'BLOQUÉ — scope strict aux repos Atlas Studio'),
  ('tech_debt', 'TD-S3', 'agent', 'security', FALSE,
   'Plus de 10 items P0+P1 produits sur un seul scan',
   'BLOQUÉ — qualité > quantité, force re-priorisation')
ON CONFLICT (COALESCE(agent_code, '_transverse'), test_id) DO NOTHING;
