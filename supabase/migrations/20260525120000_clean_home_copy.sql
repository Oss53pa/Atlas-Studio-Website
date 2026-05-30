-- Nettoyage copy home (site_content) : retire les tirets longs et resserre le ton.
-- Aligne la base (source lue par le site) sur src/config/content.ts.

update public.site_content set data =
  '{"cta1":"Démarrer gratuitement","cta2":"Découvrir les apps","title":"Vos outils de gestion vous ralentissent. On change ça.","subtitle":"Comptabilité SYSCOHADA, liasse fiscale, signature électronique : des apps SaaS prêtes à l''emploi, pensées pour les entreprises africaines. Déjà adoptées par 500+ entreprises dans 10 pays."}'::jsonb,
  updated_at = now()
where key = 'hero';

update public.site_content set data =
  '{"p1":"Atlas Studio développe des applications SaaS qui simplifient le quotidien des professionnels. Notre conviction : les entreprises africaines méritent des outils aussi performants que partout ailleurs dans le monde, mais pensés pour leurs réalités.","p2":"Née de plus de 20 ans d''expérience opérationnelle à travers 10 pays africains, notre suite répond aux vrais problèmes du terrain : suivi de projets approximatif, documents qui se perdent, décisions prises sans données.","p3":"Nos apps sont simples, rapides, et tiennent la route partout, même quand la connexion faiblit.","values":[{"desc":"Prêt à l''emploi. Créez un compte, choisissez une app, c''est parti.","title":"Pas besoin de DSI"},{"desc":"Conformité OHADA, SYSCOHADA, formats et usages africains.","title":"Normes locales"},{"desc":"Du freelance à la multinationale, nos plans grandissent avec vous.","title":"Évolutif"},{"desc":"Une équipe basée en Afrique, qui comprend vos défis.","title":"Support réactif"}]}'::jsonb,
  updated_at = now()
where key = 'about';

update public.site_content set data =
  '[{"num":"01 · Compte","desc":"Inscription en 2 minutes. Votre espace entreprise est créé automatiquement avec vos informations.","title":"Créez votre workspace"},{"num":"02 · Activation","desc":"Choisissez les apps dont vous avez besoin. Commencez gratuitement, montez en gamme quand vous voulez.","title":"Activez vos applications"},{"num":"03 · Équipe","desc":"Ajoutez votre équipe avec des rôles précis. Chacun accède à ses modules depuis le même workspace.","title":"Invitez vos collaborateurs"},{"num":"04 · Intelligence","desc":"Le moteur IA analyse vos données, repère les anomalies et génère des prévisions en continu.","title":"*Proph3t* prend le relais"}]'::jsonb,
  updated_at = now()
where key = 'steps';
