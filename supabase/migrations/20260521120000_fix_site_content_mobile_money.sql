-- Fix: le paiement Mobile Money (CinetPay : Orange/MTN/Wave) est déjà actif.
-- La FAQ "Mobile Money bientôt disponible" était périmée, et le bandeau n'affichait
-- pas ce différenciateur. Aligne la table site_content (source lue par le site public)
-- sur le contenu corrigé dans src/config/content.ts.

-- Bandeau de confiance : ajoute "Paiement Mobile Money"
INSERT INTO public.site_content (key, data) VALUES
('trustBar', '["SYSCOHADA révisé natif","Paiement Mobile Money","Mode offline (PWA)","IA *Proph3t* intégrée","Données sécurisées","17 pays OHADA"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

-- FAQ : moyens de paiement (Mobile Money désormais disponible)
INSERT INTO public.site_content (key, data) VALUES
('faqs', '[{"q":"À qui s''adressent les applications ?","a":"À tous les professionnels et entreprises qui veulent digitaliser leur gestion, quel que soit le secteur."},{"q":"Quelle est la différence entre les modules ERP et les apps standalone ?","a":"Les modules ERP partagent une base commune et s''interconnectent. Les apps standalone fonctionnent de manière indépendante pour des besoins spécifiques."},{"q":"Comment fonctionne l''abonnement ?","a":"Facturation mensuelle, changement ou annulation à tout moment. Aucun engagement."},{"q":"Faut-il installer quelque chose ?","a":"Non. 100% en ligne, accessible depuis n''importe quel navigateur. Certaines apps sont aussi disponibles sur mobile."},{"q":"Mes données sont-elles sécurisées ?","a":"Oui. Chiffrement SSL, sauvegardes quotidiennes, conformité internationale."},{"q":"Puis-je combiner plusieurs apps ?","a":"Oui, chaque app est indépendante. Combinez modules ERP et apps standalone selon vos besoins."},{"q":"Quels moyens de paiement ?","a":"Carte bancaire (Visa, Mastercard), Mobile Money (Orange Money, MTN, Wave) et virement bancaire."}]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
