-- ═══════════════════════════════════════════════════
-- USER CONSENTS: CGU + Marketing opt-in
-- Required by GDPR/OHADA privacy laws
-- ═══════════════════════════════════════════════════

-- Terms of service acceptance
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- Marketing opt-in (newsletter, product updates, offers)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_opt_in_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_opt_out_at TIMESTAMPTZ;

-- Mark existing users as having accepted current terms (grandfathering)
UPDATE profiles
SET terms_accepted_at = COALESCE(terms_accepted_at, created_at),
    terms_version = COALESCE(terms_version, 'v1.0')
WHERE terms_accepted_at IS NULL;
