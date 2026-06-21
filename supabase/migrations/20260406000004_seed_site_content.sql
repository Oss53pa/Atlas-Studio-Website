-- Seed: site_content matching the live site screenshots

INSERT INTO public.site_content (key, data) VALUES
('hero', '{"title":"Vos outils de gestion vous ralentissent. On change ça.","subtitle":"Comptabilité SYSCOHADA, liasse fiscale, signature électronique — des apps SaaS prêtes à emploi, pensées pour les entreprises africaines. Déjà adoptées par 500+ entreprises dans 10 pays.","cta1":"Démarrer gratuitement","cta2":"Découvrir les apps"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

INSERT INTO public.site_content (key, data) VALUES
('stats', '[{"value":"500+","label":"entreprises clientes"},{"value":"10+","label":"pays couverts"},{"value":"3","label":"produits"},{"value":"99.9%","label":"disponibilité"}]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

INSERT INTO public.site_content (key, data) VALUES
('trustBar', '["SYSCOHADA révisé natif","Mode offline (PWA)","IA *Proph3t* intégrée","Données sécurisées","17 pays OHADA"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

INSERT INTO public.site_content (key, data) VALUES
('steps', '[{"num":"01 — Compte","title":"Créez votre workspace","desc":"Inscription en 2 minutes. Votre espace entreprise est créé automatiquement avec vos informations."},{"num":"02 — Activation","title":"Activez vos applications","desc":"Choisissez les apps dont vous avez besoin. Commencez gratuitement, upgradez à tout moment."},{"num":"03 — Équipe","title":"Invitez vos collaborateurs","desc":"Ajoutez votre équipe avec des rôles précis. Chacun accède à ses modules depuis le même workspace."},{"num":"04 — Intelligence","title":"*Proph3t* prend le relai","desc":"Le moteur IA analyse vos données, détecte les anomalies et génère des prévisions en continu."}]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

INSERT INTO public.site_content (key, data) VALUES
('about', '{"p1":"Atlas Studio développe des applications SaaS qui simplifient le quotidien des professionnels. Notre conviction : les entreprises africaines méritent des outils digitaux aussi performants que ceux disponibles partout dans le monde — mais adaptés à leurs réalités.","p2":"Née de plus de 20 ans d''expérience opérationnelle à travers 10 pays africains, notre suite répond aux vrais problèmes du terrain : suivi de projets approximatif, documents qui se perdent, décisions sans données.","p3":"Nos apps sont simples, rapides et fonctionnent partout — même avec une connexion limitée.","values":[{"title":"Pas besoin de DSI","desc":"Prêt à emploi. Créez un compte, choisissez une app, c''est parti."},{"title":"Normes locales","desc":"Conformité OHADA, SYSCOHADA, formats et usages africains."},{"title":"Évolutif","desc":"Du freelance à la multinationale — nos plans s''adaptent."},{"title":"Support réactif","desc":"Équipe basée en Afrique, qui comprend vos défis."}]}'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

INSERT INTO public.site_content (key, data) VALUES
('sectors', '["Immobilier & Construction","Industrie & Manufacture","Banque & Finance","Distribution & Retail","Logistique & Transport","Santé & Pharmacie","Énergie & Mines","Hôtellerie & Tourisme","Éducation & Formation","Secteur public"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

INSERT INTO public.site_content (key, data) VALUES
('comparatif', '{"headers":["Solution","Prix PME","SYSCOHADA","Mode offline","IA intégrée"],"rows":[{"name":"Sage 100","values":["300–800 K FCFA","✓","✗","✗"]},{"name":"Odoo","values":["150–400 K FCFA","Plugin","✗","Partiel"]},{"name":"Zoho / QuickBooks","values":["80–300 K FCFA","✗","✗","Basique"]},{"name":"Atlas Studio","values":["49 000 FCFA/mois","✓ Natif","✓ PWA","✓ *Proph3t*"],"highlight":true}]}'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

INSERT INTO public.site_content (key, data) VALUES
('testimonials', '[{"name":"Aminata K.","role":"Directrice des Opérations","company":"Groupe industriel, Abidjan","text":"Atlas Projets a transformé notre suivi de chantiers. On a réduit nos délais de reporting de 60%.","avatar":"AK"},{"name":"Franck D.","role":"DRH","company":"Groupe bancaire, Dakar","text":"Atlas RH nous permet de gérer la paie de 200 collaborateurs sans erreur. Un gain de temps énorme.","avatar":"FD"},{"name":"Mariam T.","role":"Directrice Administrative","company":"Société minière, Conakry","text":"Avec DocJourney, plus aucun document ne se perd. Les validations se font maintenant en 48h.","avatar":"MT"},{"name":"Jean-Paul M.","role":"Responsable Achats","company":"Chaîne de distribution, Douala","text":"Atlas Stock nous a permis de réduire nos ruptures de 40%. Inventaire multi-sites est un game changer.","avatar":"JM"}]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

INSERT INTO public.site_content (key, data) VALUES
('faqs', '[{"q":"À qui s''adressent les applications ?","a":"À tous les professionnels et entreprises qui veulent digitaliser leur gestion, quel que soit le secteur."},{"q":"Quelle est la différence entre les modules ERP et les apps standalone ?","a":"Les modules ERP partagent une base commune et s''interconnectent. Les apps standalone fonctionnent de manière indépendante pour des besoins spécifiques."},{"q":"Comment fonctionne l''abonnement ?","a":"Facturation mensuelle, changement ou annulation à tout moment. Aucun engagement."},{"q":"Faut-il installer quelque chose ?","a":"Non. 100% en ligne, accessible depuis n''importe quel navigateur. Certaines apps sont aussi disponibles sur mobile."},{"q":"Mes données sont-elles sécurisées ?","a":"Oui. Chiffrement SSL, sauvegardes quotidiennes, conformité internationale."},{"q":"Puis-je combiner plusieurs apps ?","a":"Oui, chaque app est indépendante. Combinez modules ERP et apps standalone selon vos besoins."},{"q":"Quels moyens de paiement ?","a":"Carte bancaire, virement. Mobile Money bientôt disponible."}]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

INSERT INTO public.site_content (key, data) VALUES
('contact', '{"email":"contact@atlas-studio.org","phone":"+225 XX XX XX XX","city":"Abidjan, Côte d''Ivoire"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

INSERT INTO public.site_content (key, data) VALUES
('social', '{"facebook":"","instagram":"","linkedin":"","twitter":""}'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
