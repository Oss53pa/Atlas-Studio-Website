-- ═══════════════════════════════════════════════════
-- ATLAS STUDIO — NEWSLETTER MODULE MIGRATION
-- Ajout segments, sends, links, templates + extensions schema
-- ═══════════════════════════════════════════════════

-- ── Alter newsletter_subscribers (ajouter colonnes manquantes) ──

ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS bounce_count INTEGER DEFAULT 0;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ── Alter newsletter_campaigns (ajouter colonnes manquantes) ──

ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS subject_variant_b TEXT;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS preview_text TEXT;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS from_name TEXT DEFAULT 'Pamela — Atlas Studio';
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS from_email TEXT DEFAULT 'notifications@atlasstudio.org';
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS reply_to TEXT;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]';
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS segment_ids UUID[] DEFAULT '{}';
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS ab_test_enabled BOOLEAN DEFAULT false;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS ab_split_ratio INTEGER DEFAULT 50;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS delivered_count INTEGER DEFAULT 0;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS unique_open_count INTEGER DEFAULT 0;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS unique_click_count INTEGER DEFAULT 0;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS unsubscribe_count INTEGER DEFAULT 0;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS bounce_count INTEGER DEFAULT 0;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS spam_count INTEGER DEFAULT 0;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS open_count_b INTEGER DEFAULT 0;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS click_count_b INTEGER DEFAULT 0;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ── Segments dynamiques ──

CREATE TABLE IF NOT EXISTS newsletter_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  subscriber_count INTEGER DEFAULT 0,
  last_computed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Logs d'envoi individuel ──

CREATE TABLE IF NOT EXISTS newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID,
  email TEXT NOT NULL,
  variant TEXT DEFAULT 'a' CHECK (variant IN ('a','b')),
  status TEXT DEFAULT 'queued' CHECK (status IN (
    'queued','sent','delivered','opened','clicked','bounced','unsubscribed','complained'
  )),
  resend_message_id TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Liens trackés ──

CREATE TABLE IF NOT EXISTS newsletter_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES newsletter_campaigns(id),
  original_url TEXT NOT NULL,
  tracked_url TEXT NOT NULL,
  click_count INTEGER DEFAULT 0,
  unique_click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Templates réutilisables ──

CREATE TABLE IF NOT EXISTS newsletter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  blocks JSONB NOT NULL DEFAULT '[]',
  category TEXT DEFAULT 'general',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ──

ALTER TABLE newsletter_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;

-- ── Index pour performance ──

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_campaign ON newsletter_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_subscriber ON newsletter_sends(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_links_campaign ON newsletter_links(campaign_id);

-- ── Seeds : templates prédéfinis ──

INSERT INTO newsletter_templates (name, description, category, is_system, blocks) VALUES
('Annonce produit', 'Présenter une nouveauté Atlas Studio', 'product', true, '[
  {"type":"header","id":"t1h","props":{"title":"Découvrez les nouveautés Atlas Studio","subtitle":"Vos outils de gestion évoluent pour vous","bg":"#0A0A0A","titleColor":"#EF9F27","subtitleColor":"#888888"}},
  {"type":"featured","id":"t1f","props":{"badge":"NOUVEAU","title":"","subtitle":"","ctaText":"Découvrir →","ctaUrl":"","bg":"#0A0A0A","accentColor":"#EF9F27"}},
  {"type":"text","id":"t1t","props":{"content":"Bonjour {{prénom}},\n\nNous avons le plaisir de vous présenter les dernières améliorations.","fontSize":14,"color":"#333333","align":"left","padding":"20px 32px"}},
  {"type":"button","id":"t1b","props":{"text":"Accéder à mon espace →","url":"https://app.atlasstudio.africa","color":"#EF9F27","textColor":"#000000","align":"center","borderRadius":8,"padding":"12px 32px","fullWidth":false}},
  {"type":"footer","id":"t1fo","props":{"companyName":"Atlas Studio","address":"Abidjan, Côte d''Ivoire","unsubscribeText":"Se désabonner","color":"#999999","showSocial":false,"socialLinks":[]}}
]'::jsonb),
('Relance essai', 'Convertir les tenants en fin d''essai', 'retention', true, '[
  {"type":"header","id":"t2h","props":{"title":"Votre essai Atlas Studio expire bientôt","subtitle":"Ne perdez pas l''accès à vos données","bg":"#C62828","titleColor":"#FFFFFF","subtitleColor":"#FFCDD2"}},
  {"type":"text","id":"t2t","props":{"content":"Bonjour {{prénom}},\n\nVotre période d''essai sur {{produit_souscrit}} expire dans 48h.","fontSize":14,"color":"#333333","align":"left","padding":"20px 32px"}},
  {"type":"button","id":"t2b","props":{"text":"Passer au plan Pro →","url":"","color":"#EF9F27","textColor":"#000000","align":"center","borderRadius":8,"padding":"12px 32px","fullWidth":false}},
  {"type":"footer","id":"t2fo","props":{"companyName":"Atlas Studio","address":"Abidjan, Côte d''Ivoire","unsubscribeText":"Se désabonner","color":"#999999","showSocial":false,"socialLinks":[]}}
]'::jsonb),
('Newsletter mensuelle', 'Récapitulatif mensuel des nouveautés', 'general', true, '[
  {"type":"header","id":"t3h","props":{"title":"Récapitulatif mensuel","subtitle":"","bg":"#0A0A0A","titleColor":"#EF9F27","subtitleColor":"#888888"}},
  {"type":"cols2","id":"t3c","props":{"left":{"title":"Nouveauté 1","text":"Description","iconEmoji":"✨"},"right":{"title":"Nouveauté 2","text":"Description","iconEmoji":"🚀"},"bg":"#F9F9F9","gap":16}},
  {"type":"text","id":"t3t","props":{"content":"","fontSize":14,"color":"#333333","align":"left","padding":"20px 32px"}},
  {"type":"button","id":"t3b","props":{"text":"En savoir plus →","url":"","color":"#EF9F27","textColor":"#000000","align":"center","borderRadius":8,"padding":"12px 32px","fullWidth":false}},
  {"type":"footer","id":"t3fo","props":{"companyName":"Atlas Studio","address":"Abidjan, Côte d''Ivoire","unsubscribeText":"Se désabonner","color":"#999999","showSocial":false,"socialLinks":[]}}
]'::jsonb)
ON CONFLICT DO NOTHING;

-- ── Seeds : segments prédéfinis ──

INSERT INTO newsletter_segments (name, description, filters) VALUES
('Tous les abonnés actifs', 'Tous les abonnés avec statut actif', '{"status":"active"}'::jsonb),
('Tenants en essai', 'Abonnés dont le tenant est en période d''essai', '{"tenant_status":"trial"}'::jsonb),
('Plan Starter', 'Abonnés sur le plan Starter', '{"plan":"Starter"}'::jsonb),
('Plan Pro', 'Abonnés sur le plan Pro', '{"plan":"Pro"}'::jsonb),
('Plan Enterprise', 'Abonnés sur le plan Enterprise', '{"plan":"Enterprise"}'::jsonb),
('Côte d''Ivoire', 'Abonnés basés en Côte d''Ivoire', '{"country":"CI"}'::jsonb),
('Sénégal', 'Abonnés basés au Sénégal', '{"country":"SN"}'::jsonb),
('Cameroun', 'Abonnés basés au Cameroun', '{"country":"CM"}'::jsonb),
('Score santé critique', 'Tenants avec score santé < 40', '{"health_score_max":40}'::jsonb),
('Inactifs 7 jours', 'Utilisateurs sans connexion depuis 7+ jours', '{"inactive_days":7}'::jsonb)
ON CONFLICT DO NOTHING;

-- ── RPC helpers pour le webhook ──

CREATE OR REPLACE FUNCTION increment_campaign_opens(p_campaign_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE newsletter_campaigns
  SET open_count = COALESCE(open_count, 0) + 1,
      unique_open_count = (
        SELECT COUNT(DISTINCT subscriber_id) FROM newsletter_sends
        WHERE campaign_id = p_campaign_id AND status IN ('opened','clicked')
      )
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_campaign_clicks(p_campaign_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE newsletter_campaigns
  SET click_count = COALESCE(click_count, 0) + 1,
      unique_click_count = (
        SELECT COUNT(DISTINCT subscriber_id) FROM newsletter_sends
        WHERE campaign_id = p_campaign_id AND status = 'clicked'
      )
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
