-- ═══════════════════════════════════════════════════
-- ATLAS STUDIO — LICENCE SYSTEM MIGRATION
-- ═══════════════════════════════════════════════════

-- ── LICENCES ──

CREATE TABLE IF NOT EXISTS licences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  product_id UUID,
  plan_id UUID,
  subscription_id UUID,
  activation_key TEXT UNIQUE NOT NULL,
  key_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','revoked','expired')),
  max_seats INTEGER NOT NULL DEFAULT 1,
  used_seats INTEGER DEFAULT 0,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  suspension_reason TEXT,
  activated_by UUID,
  created_by TEXT DEFAULT 'system',
  offline_token TEXT,
  offline_valid_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── ACTIVATIONS HISTORY ──

CREATE TABLE IF NOT EXISTS licence_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  licence_id UUID REFERENCES licences(id) ON DELETE CASCADE,
  tenant_id UUID,
  activated_by UUID,
  activation_key TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── SEATS / MEMBERS ──

CREATE TABLE IF NOT EXISTS licence_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  licence_id UUID REFERENCES licences(id) ON DELETE CASCADE,
  tenant_id UUID,
  user_id UUID,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'editor' CHECK (role IN ('app_super_admin','app_admin','editor','viewer')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  invitation_token TEXT UNIQUE,
  invitation_sent_at TIMESTAMPTZ,
  invitation_expires_at TIMESTAMPTZ,
  invitation_accepted_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── ADMIN DELEGATE LINKS ──

CREATE TABLE IF NOT EXISTS admin_delegate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  licence_id UUID REFERENCES licences(id) ON DELETE CASCADE,
  tenant_id UUID,
  created_by UUID,
  token TEXT UNIQUE NOT NULL,
  token_hash TEXT NOT NULL,
  can_invite_users BOOLEAN DEFAULT true,
  can_manage_roles BOOLEAN DEFAULT true,
  can_view_users BOOLEAN DEFAULT true,
  can_revoke_users BOOLEAN DEFAULT true,
  can_view_billing BOOLEAN DEFAULT false,
  can_change_plan BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','used','expired','revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID,
  actions_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── AUDIT LOG ──

CREATE TABLE IF NOT EXISTS licence_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  licence_id UUID,
  tenant_id UUID,
  actor_id UUID,
  actor_type TEXT CHECK (actor_type IN ('system','pamela','tenant_admin','tenant_user')),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ──

ALTER TABLE licences ENABLE ROW LEVEL SECURITY;
ALTER TABLE licence_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE licence_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_delegate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE licence_audit_log ENABLE ROW LEVEL SECURITY;

-- ── INDEXES ──

CREATE INDEX IF NOT EXISTS idx_licences_tenant ON licences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_licences_status ON licences(status);
CREATE INDEX IF NOT EXISTS idx_licences_key_hash ON licences(key_hash);
CREATE INDEX IF NOT EXISTS idx_licence_seats_licence ON licence_seats(licence_id);
CREATE INDEX IF NOT EXISTS idx_licence_seats_user ON licence_seats(user_id);
CREATE INDEX IF NOT EXISTS idx_licence_seats_email ON licence_seats(email);
CREATE INDEX IF NOT EXISTS idx_licence_activations_licence ON licence_activations(licence_id);
CREATE INDEX IF NOT EXISTS idx_licence_audit_licence ON licence_audit_log(licence_id);
CREATE INDEX IF NOT EXISTS idx_admin_delegate_token ON admin_delegate_links(token_hash);

-- ── FUNCTION: Check seat quota ──

CREATE OR REPLACE FUNCTION check_seat_quota(p_licence_id UUID)
RETURNS JSONB AS $$
DECLARE
  lic licences%ROWTYPE;
  current_count INTEGER;
BEGIN
  SELECT * INTO lic FROM licences WHERE id = p_licence_id;
  SELECT COUNT(*) INTO current_count
  FROM licence_seats
  WHERE licence_id = p_licence_id AND status = 'active';

  RETURN jsonb_build_object(
    'can_add', current_count < lic.max_seats,
    'used', current_count,
    'max', lic.max_seats,
    'remaining', lic.max_seats - current_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── TRIGGER: Auto-update seat count ──

CREATE OR REPLACE FUNCTION update_seat_count()
RETURNS TRIGGER AS $$
DECLARE
  target_licence_id UUID;
BEGIN
  target_licence_id := COALESCE(NEW.licence_id, OLD.licence_id);
  UPDATE licences SET
    used_seats = (
      SELECT COUNT(*) FROM licence_seats
      WHERE licence_id = target_licence_id AND status = 'active'
    ),
    updated_at = now()
  WHERE id = target_licence_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS seat_count_trigger ON licence_seats;
CREATE TRIGGER seat_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON licence_seats
FOR EACH ROW EXECUTE FUNCTION update_seat_count();
