-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T Workflows orchestres — 5 meta-tools qui chainent plusieurs L2
-- Domaine 'workflows' (compositions multi-domaines).
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.proph3t_tools (id, level, domain, name, description, schema, is_deterministic, requires_embeddings) VALUES
  ('workflow_audit_complet_societe', 2, 'workflows', 'workflow_audit_complet_societe',
   'Workflow audit complet : validation + balance + Benford + anomalies + variance + materiality + rapport.',
   '{"type":"object"}'::jsonb, FALSE, FALSE),
  ('workflow_closing_mensuel', 2, 'workflows', 'workflow_closing_mensuel',
   'Cloture mensuelle : validation + balance + bilan + compte resultat + ratios cles + rapport.',
   '{"type":"object"}'::jsonb, FALSE, FALSE),
  ('workflow_due_diligence_lite', 2, 'workflows', 'workflow_due_diligence_lite',
   'Mini due diligence : ratios + Benford + materiality + sample audit + controle interne + GO/NOGO.',
   '{"type":"object"}'::jsonb, FALSE, FALSE),
  ('workflow_simulation_recrutement', 2, 'workflows', 'workflow_simulation_recrutement',
   'Simulation embauche : check SMIG + salaire net + cotisations + parafiscales + cout total + fiche paie.',
   '{"type":"object"}'::jsonb, FALSE, FALSE),
  ('workflow_analyse_client_360', 2, 'workflows', 'workflow_analyse_client_360',
   'Vue 360 client : risque churn + RFM + panier moyen + CAC/LTV + niveau priorite + actions.',
   '{"type":"object"}'::jsonb, FALSE, FALSE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, schema = EXCLUDED.schema, domain = EXCLUDED.domain;
