-- ═══════════════════════════════════════════════════
-- PROFILES — champs complémentaires pour inscription B2B OHADA
-- ═══════════════════════════════════════════════════
-- Ajoute les colonnes manquantes au formulaire d'inscription client:
--   - country   : code pays ISO (ex: "CI", "SN", "CM")
--   - job_title : fonction dans l'entreprise (ex: "CEO", "DAF")
--
-- phone existe deja dans la table profiles.
-- 100% idempotent.
-- ═══════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title TEXT;

COMMENT ON COLUMN profiles.country   IS 'Code pays ISO 3166-1 alpha-2 (ex: CI, SN, CM). OHADA 17 pays + international.';
COMMENT ON COLUMN profiles.job_title IS 'Fonction du contact dans l''entreprise (CEO, CFO, DAF, Comptable, Gerant, etc.).';
