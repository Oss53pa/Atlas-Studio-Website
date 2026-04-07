-- ═══════════════════════════════════════════════════
-- CENTRALIZED LANDING PAGE CONTENT
-- Managed from Atlas Studio console, consumed by each app
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS app_landing_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT NOT NULL,
  section TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  UNIQUE(app_id, section)
);

ALTER TABLE app_landing_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_landing" ON app_landing_content FOR SELECT USING (true);
CREATE POLICY "auth_manage_landing" ON app_landing_content FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT ON app_landing_content TO anon, authenticated;
GRANT ALL ON app_landing_content TO authenticated;

CREATE INDEX IF NOT EXISTS idx_landing_content_app ON app_landing_content(app_id);

-- ═══════════════════════════════════════════════════
-- SEED: ADVIST
-- ═══════════════════════════════════════════════════

INSERT INTO app_landing_content (app_id, section, sort_order, data) VALUES
('advist', 'hero', 1, '{
  "title": "Workflow documentaire & signature électronique",
  "subtitle": "Digitalisez vos circuits de validation avec signature électronique. 2 à 3x moins cher que DocuSign, conçu pour l''Afrique et conforme OHADA.",
  "cta_primary": {"text": "Souscrire maintenant", "url": "https://atlas-studio.org/portal?app=advist"},
  "cta_secondary": {"text": "Voir la démo", "url": "/demo"},
  "badges": ["eIDAS", "ISO 27001", "OHADA"],
  "rotating_words": ["Validez", "Signez", "Accélérez"],
  "social_proof": {"count": "2,500+", "label": "entreprises satisfaites"}
}'::jsonb),

('advist', 'stats', 2, '{
  "items": [
    {"value": "500+", "label": "ENTREPRISES"},
    {"value": "17", "label": "PAYS OHADA"},
    {"value": "100%", "label": "CONFORMITÉ"},
    {"value": "99.9%", "label": "DISPONIBILITÉ"}
  ]
}'::jsonb),

('advist', 'features', 3, '{
  "title": "Fonctionnalités",
  "subtitle": "Digitalisez vos circuits de validation avec signature électronique.",
  "items": [
    {"icon": "FileText", "title": "Gestion documentaire", "description": "Import PDF, Word, Excel. Organisation par dossiers."},
    {"icon": "GitBranch", "title": "Workflows de validation", "description": "Circuits séquentiels et parallèles, jusqu''à 10 intervenants."},
    {"icon": "PenTool", "title": "Signature électronique", "description": "Simple et qualifiée. Conforme eIDAS et OHADA."},
    {"icon": "BarChart", "title": "Analytics temps réel", "description": "Suivi des documents, délais, taux de validation."},
    {"icon": "Smartphone", "title": "Application mobile", "description": "Validez et signez depuis votre téléphone."},
    {"icon": "Shield", "title": "Sécurité", "description": "Chiffrement AES-256, ISO 27001, RGPD."}
  ]
}'::jsonb),

('advist', 'pricing', 4, '{
  "title": "Tarifs transparents",
  "subtitle": "Souscrivez maintenant. Annulation à tout moment.",
  "plans": [
    {
      "name": "Business",
      "price": 25000,
      "period": "mois",
      "currency": "FCFA",
      "is_popular": false,
      "cta_text": "S''abonner maintenant",
      "cta_url": "https://atlas-studio.org/portal?app=advist&plan=Business",
      "features": ["1-5 utilisateurs", "Signataires externes illimités", "50 documents/mois", "Circuits séquentiels", "Signature simple", "Notifications email", "Hash SHA-256", "Support email"]
    },
    {
      "name": "Entreprise",
      "price": 150000,
      "period": "mois",
      "currency": "FCFA",
      "is_popular": true,
      "cta_text": "S''abonner maintenant",
      "cta_url": "https://atlas-studio.org/portal?app=advist&plan=Entreprise",
      "features": ["Utilisateurs illimités", "Documents illimités", "Circuits parallèles et conditionnels", "Signature qualifiée eIDAS", "Multi-départements", "RBAC & permissions", "API REST", "SSO / SAML", "Support prioritaire"]
    }
  ],
  "add_ons": [
    {"name": "Émetteur supplémentaire", "price": 15000, "period": "mois"},
    {"name": "Pack 100 documents suppl.", "price": 10000, "period": "mois"}
  ]
}'::jsonb),

('advist', 'testimonials', 5, '{
  "items": [
    {"name": "Aminata K.", "role": "DAF", "company": "Groupe Sanogo", "text": "Advist a réduit nos délais de validation de 5 jours à 2 heures.", "avatar": "AK", "rating": 5},
    {"name": "Marcel D.", "role": "DG", "company": "Sefca SA", "text": "La signature électronique nous a fait économiser 60% sur les frais de courrier.", "avatar": "MD", "rating": 5}
  ]
}'::jsonb),

('advist', 'faq', 6, '{
  "items": [
    {"question": "Quelle est la différence avec DocuSign ?", "answer": "Advist est 2 à 3x moins cher, conçu pour l''Afrique francophone, conforme OHADA et avec support local."},
    {"question": "Mes documents sont-ils sécurisés ?", "answer": "Oui. Chiffrement AES-256, stockage sécurisé, hash SHA-256 par document, conforme ISO 27001."},
    {"question": "Puis-je inviter des signataires externes ?", "answer": "Oui, en illimité. Ils reçoivent un lien sécurisé par email sans avoir besoin de compte."},
    {"question": "Comment fonctionne la facturation ?", "answer": "Abonnement mensuel via Mobile Money ou carte bancaire. Annulation à tout moment depuis Atlas Studio."}
  ]
}'::jsonb),

('advist', 'cta', 7, '{
  "title": "Prêt à transformer votre gestion documentaire ?",
  "subtitle": "Souscrivez maintenant. Sans engagement.",
  "cta_text": "Souscrire maintenant",
  "cta_url": "https://atlas-studio.org/portal?app=advist",
  "trust_badges": ["Sans engagement", "Annulation à tout moment", "Support réactif"]
}'::jsonb)

ON CONFLICT (app_id, section) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

-- ═══════════════════════════════════════════════════
-- SEED: LIASS'PILOT (taxpilot)
-- ═══════════════════════════════════════════════════

INSERT INTO app_landing_content (app_id, section, sort_order, data) VALUES
('taxpilot', 'hero', 1, '{
  "title": "Liasse fiscale SYSCOHADA automatisée et intelligente",
  "subtitle": "Votre balance entre. Votre liasse sort. Conforme. Un expert-comptable facture la liasse entre 500 000 et 2 000 000 FCFA. Liass''Pilot vous fait économiser au minimum 50%.",
  "cta_primary": {"text": "Souscrire maintenant", "url": "https://atlas-studio.org/portal?app=taxpilot"},
  "cta_secondary": {"text": "Voir la démo", "url": "/demo"},
  "badges": ["SYSCOHADA natif", "Proph3t IA", "Économisez 50%+"],
  "social_proof": {"count": "500+", "label": "entreprises"}
}'::jsonb),

('taxpilot', 'stats', 2, '{
  "items": [
    {"value": "1 005", "label": "COMPTES SYSCOHADA"},
    {"value": "129", "label": "CONTRÔLES PROPH3T"},
    {"value": "84", "label": "ONGLETS EXCEL"},
    {"value": "17", "label": "PAYS OHADA"}
  ]
}'::jsonb),

('taxpilot', 'pricing', 4, '{
  "title": "Choisissez votre plan",
  "subtitle": "Toutes les fonctionnalités incluses.",
  "plans": [
    {
      "name": "Entreprise · 1 société",
      "price": 250000,
      "period": "an",
      "currency": "FCFA",
      "is_popular": false,
      "cta_text": "Souscrire",
      "cta_url": "https://atlas-studio.org/portal?app=taxpilot&plan=Entreprise",
      "features": ["Import balance CSV & Excel", "Plan comptable SYSCOHADA révisé", "Bilan Actif & Passif complet", "Compte de résultat & 9 SIG", "TAFIRE / TFT", "18 notes annexes", "129 contrôles Proph3t", "Export Excel 84 onglets"]
    },
    {
      "name": "Cabinet · illimité",
      "price": 1500000,
      "period": "an",
      "currency": "FCFA",
      "is_popular": true,
      "cta_text": "Souscrire",
      "cta_url": "https://atlas-studio.org/portal?app=taxpilot&plan=Cabinet",
      "features": ["Tout le plan Entreprise", "Sociétés illimitées", "Multi-pays OHADA (17 pays)", "Secteurs spécialisés", "E-Invoicing (UBL 2.1, PEPPOL)", "XML télédéclaration", "Audit trail & workflow", "Support prioritaire"]
    }
  ]
}'::jsonb),

('taxpilot', 'faq', 6, '{
  "items": [
    {"question": "Quels formats de balance sont supportés ?", "answer": "CSV et Excel. L''import est automatique avec détection des colonnes."},
    {"question": "La liasse est-elle conforme SYSCOHADA révisé ?", "answer": "Oui, 100% conforme avec le plan comptable révisé et les 18 notes annexes."},
    {"question": "Combien de contrôles Proph3t effectue ?", "answer": "129 contrôles de cohérence automatiques avant génération de la liasse."},
    {"question": "Comment fonctionne la facturation ?", "answer": "Abonnement annuel via Atlas Studio. Mobile Money ou carte bancaire."}
  ]
}'::jsonb),

('taxpilot', 'cta', 7, '{
  "title": "Prêt à simplifier votre liasse fiscale ?",
  "subtitle": "Souscrivez maintenant. Sans engagement.",
  "cta_text": "Souscrire maintenant",
  "cta_url": "https://atlas-studio.org/portal?app=taxpilot"
}'::jsonb)

ON CONFLICT (app_id, section) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

-- ═══════════════════════════════════════════════════
-- SEED: ATLAS F&A (atlas-compta)
-- ═══════════════════════════════════════════════════

INSERT INTO app_landing_content (app_id, section, sort_order, data) VALUES
('atlas-compta', 'hero', 1, '{
  "title": "Finance & Administration — Comptabilité SYSCOHADA complète",
  "subtitle": "Saisie des écritures, grand livre, balance, lettrage, rapprochement bancaire, immobilisations, stocks, fiscalité, clôture et états financiers.",
  "cta_primary": {"text": "Souscrire maintenant", "url": "https://atlas-studio.org/portal?app=atlas-compta"},
  "cta_secondary": {"text": "Voir la démo", "url": "/demo"}
}'::jsonb),

('atlas-compta', 'stats', 2, '{
  "items": [
    {"value": "500+", "label": "ENTREPRISES"},
    {"value": "3", "label": "PRODUITS"},
    {"value": "17", "label": "PAYS OHADA"},
    {"value": "99.9%", "label": "DISPONIBILITÉ"}
  ]
}'::jsonb),

('atlas-compta', 'pricing', 4, '{
  "title": "Choisissez votre plan",
  "subtitle": "Comptabilité complète SYSCOHADA.",
  "plans": [
    {
      "name": "PME / TPE",
      "price": 49000,
      "period": "mois",
      "currency": "FCFA",
      "is_popular": false,
      "cta_text": "Souscrire",
      "cta_url": "https://atlas-studio.org/portal?app=atlas-compta&plan=PME",
      "features": ["Saisie des écritures & journaux", "Grand livre & balance", "Lettrage automatique", "Rapprochement bancaire", "Immobilisations", "Stocks (CUMP/FIFO)", "Fiscalité (TVA, IS)", "Clôture & états financiers", "1-5 utilisateurs", "Support email"]
    },
    {
      "name": "Premium",
      "price": 250000,
      "period": "mois",
      "currency": "FCFA",
      "is_popular": true,
      "cta_text": "Souscrire",
      "cta_url": "https://atlas-studio.org/portal?app=atlas-compta&plan=Premium",
      "features": ["Tout le plan PME/TPE", "Multi-sociétés illimité", "Multi-pays OHADA 17 pays", "Opérations en devises", "Proph3t IA avancé LLM", "Workflow & RBAC", "Audit trail OHADA", "API REST", "Utilisateurs illimités", "Support prioritaire & SLA"]
    }
  ]
}'::jsonb),

('atlas-compta', 'faq', 6, '{
  "items": [
    {"question": "Atlas F&A est-il conforme SYSCOHADA ?", "answer": "Oui, 100% natif SYSCOHADA révisé avec plan comptable complet."},
    {"question": "Puis-je gérer plusieurs sociétés ?", "answer": "Oui avec le plan Premium. Multi-sociétés illimité + multi-pays OHADA."},
    {"question": "Comment fonctionne Proph3t IA ?", "answer": "Proph3t détecte les anomalies, propose des corrections et génère des insights prédictifs."},
    {"question": "Quel est le délai de mise en service ?", "answer": "Immédiat. Créez votre compte, souscrivez et commencez à saisir vos écritures."}
  ]
}'::jsonb),

('atlas-compta', 'cta', 7, '{
  "title": "Prêt à digitaliser votre comptabilité ?",
  "subtitle": "Souscrivez maintenant. Sans engagement.",
  "cta_text": "Souscrire maintenant",
  "cta_url": "https://atlas-studio.org/portal?app=atlas-compta"
}'::jsonb)

ON CONFLICT (app_id, section) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
