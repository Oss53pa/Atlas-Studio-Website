-- ═══════════════════════════════════════════════════════════════════════════
-- APP SETTINGS — table de configuration générique
-- Remplace proph3t_preferences qui était utilisé à tort pour des configs
-- non-proph3t (paiement, notifications admin, etc.).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Admins seulement (lecture + écriture)
CREATE POLICY "Admins read app_settings" ON app_settings
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins write app_settings" ON app_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seeds par défaut
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
  ('notification_channels', '["email","dashboard"]'::jsonb, 'Canaux de notification admin'),
  ('session_duration_hours', '8'::jsonb, 'Durée par défaut session admin (heures)'),
  ('payment_config', '{}'::jsonb, 'Configuration des moyens de paiement (Stripe, CinetPay, Resend)')
ON CONFLICT (setting_key) DO NOTHING;
