-- ═══════════════════════════════════════════════════
-- SUBSCRIPTIONS — Abonnements offerts par le super_admin
-- ═══════════════════════════════════════════════════
-- Ajoute la tracabilite des abonnements gratuits accordes manuellement.
-- is_granted = true signifie que l'abonnement a ete offert (prix 0).
-- granted_by = UUID du super_admin qui a accorde l'abonnement.
-- 100% idempotent.
-- ═══════════════════════════════════════════════════

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_granted BOOLEAN DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES profiles(id);

COMMENT ON COLUMN subscriptions.is_granted IS 'true = abonnement offert gratuitement par un super_admin';
COMMENT ON COLUMN subscriptions.granted_by IS 'UUID du super_admin qui a accorde l''abonnement gratuit';
