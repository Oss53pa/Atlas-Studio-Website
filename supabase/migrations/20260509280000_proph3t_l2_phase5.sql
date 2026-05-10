-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T Phase 5 — PRODUCTIVITE (5) + SUPPORT (5) = 10 tools
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.proph3t_tools (id, level, domain, name, description, schema, is_deterministic, requires_embeddings) VALUES
  -- PRODUCTIVITE L2
  ('prioritize_tasks', 2, 'productivite', 'prioritize_tasks',
   'Matrice Eisenhower (urgent × important) + alerte surcharge Q1.',
   '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_meeting_efficiency', 2, 'productivite', 'compute_meeting_efficiency',
   'Score efficacite reunion (cout × valeur) + verdict + recos.',
   '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('schedule_optimization', 2, 'productivite', 'schedule_optimization',
   'Optimise calendrier : focus blocks + jours surcharges + recos.',
   '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('estimate_project_duration', 2, 'productivite', 'estimate_project_duration',
   'PERT 3-points estimate + intervalle confiance.',
   '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_team_capacity', 2, 'productivite', 'compute_team_capacity',
   'Capacite reelle equipe (brute - meetings - conges - context switch).',
   '{"type":"object"}'::jsonb, TRUE, FALSE),
  -- SUPPORT L2
  ('compute_csat_nps', 2, 'support', 'compute_csat_nps',
   'CSAT et/ou NPS scoring + decomposition + niveau.',
   '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('score_ticket_priority', 2, 'support', 'score_ticket_priority',
   'Priorite ticket P0-P4 selon impact + urgence + VIP + securite.',
   '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('compute_sla_compliance', 2, 'support', 'compute_sla_compliance',
   'Taux respect SLA + breaches actuelles.',
   '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('predict_resolution_time', 2, 'support', 'predict_resolution_time',
   'Estimation duree resolution (historique + complexite + charge equipe).',
   '{"type":"object"}'::jsonb, TRUE, FALSE),
  ('analyze_ticket_categories', 2, 'support', 'analyze_ticket_categories',
   'Top 5 categories + tendance N vs N-1 + categories slow.',
   '{"type":"object"}'::jsonb, TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, schema = EXCLUDED.schema, domain = EXCLUDED.domain;
