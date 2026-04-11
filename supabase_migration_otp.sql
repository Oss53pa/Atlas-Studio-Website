-- ═══════════════════════════════════════════════════
-- OTP SYSTEM FOR CLIENT LOGIN
-- - First login verification (validate ownership of email)
-- - Recovery / password reset via OTP code
-- ═══════════════════════════════════════════════════

-- ── OTP codes table ──
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,                  -- SHA-256 hash of the 6-digit code
  purpose TEXT NOT NULL CHECK (purpose IN ('first_login', 'recovery', 'reset_password', 'mfa')),
  used BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,               -- track failed attempts
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_purpose ON otp_codes(email, purpose, used);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);

-- ── RLS: only service role can read/write ──
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- No public policies - only service_role (used by edge functions) can access
-- Strict no-access for anon and authenticated to prevent code leakage

-- ── Add columns to profiles for OTP tracking ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_login_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_otp_sent_at TIMESTAMPTZ;

-- Mark existing users as already-verified (they were created before this feature)
UPDATE profiles
SET first_login_completed = true, email_verified_at = COALESCE(email_verified_at, created_at)
WHERE first_login_completed IS NULL OR first_login_completed = false;

-- ── Cleanup expired OTPs (run periodically via cron) ──
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM otp_codes
  WHERE expires_at < now() - INTERVAL '1 day'
     OR (used = true AND used_at < now() - INTERVAL '1 day');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Rate limit helper: count recent OTPs sent for an email ──
CREATE OR REPLACE FUNCTION count_recent_otps(p_email TEXT, p_minutes INTEGER DEFAULT 5)
RETURNS INTEGER AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM otp_codes
  WHERE email = lower(p_email)
    AND created_at > now() - (p_minutes || ' minutes')::INTERVAL;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
