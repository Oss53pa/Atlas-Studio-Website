export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover: string;
  category: string;
  date: string;
  readTime: string;
  author?: string;
  tags?: string[];
}

export const blogCategories = [
  "Tous",
  "Gestion",
  "Fiscalité",
  "Digital",
  "Actualités",
];

export const blogPosts: BlogPost[] = [
  {
    slug: "digitalisation-pme-afrique-2026",
    title: "Digitalisation des PME en Afrique : où en est-on en 2026 ?",
    excerpt:
      "Le continent africain connaît une accélération sans précédent de sa transformation digitale. Tour d'horizon des tendances, des défis et des opportunités pour les PME.",
    cover: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=450&fit=crop",
    category: "Digital",
    date: "25 mars 2026",
    readTime: "6 min",
    author: "Équipe Atlas Studio",
    tags: ["PME", "Afrique", "Digitalisation", "SaaS"],
    content: `
      <p>L'Afrique est aujourd'hui le continent où la croissance du numérique est la plus rapide au monde. En 2026, plus de <strong>60% des PME</strong> du continent utilisent au moins un outil digital dans leur gestion quotidienne — contre seulement 30% en 2020.</p>

      <h2>Les moteurs de la transformation</h2>
      <p>Plusieurs facteurs expliquent cette accélération :</p>
      <ul>
        <li><strong>L'explosion du mobile</strong> — avec un taux de pénétration smartphone dépassant 70% dans les grandes villes</li>
        <li><strong>Le Mobile Money</strong> — qui a démocratisé les paiements numériques bien avant les cartes bancaires</li>
        <li><strong>Le cloud computing</strong> — qui permet aux PME d'accéder à des outils professionnels sans investissement lourd</li>
        <li><strong>La jeunesse de la population</strong> — digital-native et entrepreneuriale</li>
      </ul>

      <h2>Les défis persistants</h2>
      <p>Malgré ces avancées, des obstacles demeurent. La connectivité reste inégale entre zones urbaines et rurales. La formation aux outils digitaux est encore insuffisante, et la conformité réglementaire (SYSCOHADA, fiscalité locale) n'est pas toujours prise en compte par les solutions internationales.</p>

      <h2>L'approche Atlas Studio</h2>
      <p>C'est précisément pour répondre à ces défis que nous avons conçu notre suite d'applications. Chaque outil est pensé pour le contexte africain : conformité SYSCOHADA native, intégration Mobile Money, interface adaptée aux connexions intermittentes, et tarification accessible.</p>

      <blockquote>« Notre mission est de donner aux entreprises africaines les mêmes outils que les grandes entreprises internationales, mais adaptés à leur réalité. »</blockquote>

      <p>La transformation digitale n'est plus une option — c'est un avantage compétitif décisif pour les PME africaines qui veulent se développer durablement.</p>
    `,
  },
  {
    slug: "guide-syscohada-revise",
    title: "SYSCOHADA révisé : guide pratique pour les entreprises",
    excerpt:
      "Comprendre les exigences du plan comptable SYSCOHADA révisé et comment s'y conformer simplement avec les bons outils de gestion.",
    cover: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6e?w=800&h=450&fit=crop",
    category: "Fiscalité",
    date: "18 mars 2026",
    readTime: "8 min",
    author: "Équipe Atlas Studio",
    tags: ["SYSCOHADA", "Comptabilité", "Conformité", "OHADA"],
    content: `
      <p>Le SYSCOHADA révisé, entré en vigueur le 1er janvier 2018, a profondément modifié le référentiel comptable applicable dans les 17 pays membres de l'espace OHADA. Pourtant, de nombreuses entreprises peinent encore à s'y conformer pleinement.</p>

      <h2>Les principales nouveautés</h2>
      <p>Le SYSCOHADA révisé introduit plusieurs changements majeurs :</p>
      <ul>
        <li>Un <strong>nouveau plan de comptes</strong> avec des comptes spécifiques pour les opérations courantes en Afrique</li>
        <li>L'obligation de produire un <strong>tableau des flux de trésorerie</strong></li>
        <li>Des règles d'évaluation harmonisées avec les normes <strong>IFRS</strong></li>
        <li>Un traitement spécifique des <strong>subventions et contrats de concession</strong></li>
      </ul>

      <h2>Comment se mettre en conformité</h2>
      <p>La mise en conformité passe par trois étapes clés :</p>
      <ol>
        <li><strong>Audit du plan de comptes existant</strong> — identifier les écarts avec le nouveau référentiel</li>
        <li><strong>Migration des données</strong> — reclasser les comptes selon la nouvelle nomenclature</li>
        <li><strong>Formation des équipes</strong> — s'assurer que chaque collaborateur comprend les nouvelles règles</li>
      </ol>

      <h2>Atlas Finance : la conformité intégrée</h2>
      <p>Atlas Finance intègre nativement le plan comptable SYSCOHADA révisé. Pas besoin de paramétrage complexe : vos états financiers, votre balance et votre grand livre sont automatiquement conformes.</p>

      <p>Avec Liass'Pilot, la génération de votre liasse fiscale se fait en quelques clics, directement depuis vos données comptables Atlas Finance.</p>
    `,
  },
  {
    slug: "mobile-money-integration-entreprise",
    title: "Intégrer le Mobile Money dans la gestion de votre entreprise",
    excerpt:
      "Orange Money, Wave, MTN MoMo... Comment automatiser la collecte et le suivi des paiements Mobile Money dans votre comptabilité.",
    cover: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=450&fit=crop",
    category: "Gestion",
    date: "10 mars 2026",
    readTime: "5 min",
    author: "Équipe Atlas Studio",
    tags: ["Mobile Money", "Paiements", "Trésorerie", "CashPilot"],
    content: `
      <p>En Afrique francophone, le Mobile Money est devenu le principal moyen de paiement digital. Pourtant, la plupart des entreprises gèrent encore ces transactions manuellement — source d'erreurs, de retards et de pertes.</p>

      <h2>Le problème</h2>
      <p>Chaque jour, des milliers de PME font face au même défi : réconcilier les paiements reçus par Mobile Money avec leur comptabilité. Entre les SMS de confirmation, les relevés opérateurs et les écritures manuelles, le processus est chronophage et peu fiable.</p>

      <h2>La solution CashPilot</h2>
      <p>CashPilot automatise l'ensemble du processus :</p>
      <ul>
        <li><strong>Collecte automatique</strong> — recevez les paiements depuis Orange Money, Wave, MTN MoMo et plus</li>
        <li><strong>Réconciliation en temps réel</strong> — chaque paiement est automatiquement rapproché de la facture correspondante</li>
        <li><strong>Écriture comptable automatique</strong> — les mouvements sont enregistrés directement dans Atlas Finance</li>
        <li><strong>Tableau de bord trésorerie</strong> — suivez vos encaissements par opérateur, par période et par client</li>
      </ul>

      <blockquote>« Depuis CashPilot, on a réduit de 80% le temps passé sur la réconciliation des paiements Mobile Money. » — Directeur financier, PME à Abidjan</blockquote>

      <p>L'intégration du Mobile Money n'est plus un luxe technique — c'est une nécessité pour toute entreprise qui veut maîtriser sa trésorerie en temps réel.</p>
    `,
  },
  {
    slug: "intelligence-artificielle-comptabilite-afrique",
    title: "L'IA au service de la comptabilité africaine",
    excerpt:
      "Comment l'intelligence artificielle Proph3t transforme la saisie comptable, la détection d'anomalies et la prévision financière.",
    cover: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=450&fit=crop",
    category: "Digital",
    date: "4 mars 2026",
    readTime: "7 min",
    author: "Équipe Atlas Studio",
    tags: ["IA", "Proph3t", "Comptabilité", "Innovation"],
    content: `
      <p>L'intelligence artificielle n'est plus réservée aux géants de la tech. Avec Proph3t, notre moteur IA intégré, les PME africaines accèdent à des capacités d'analyse et d'automatisation jusqu'ici inaccessibles.</p>

      <h2>Qu'est-ce que Proph3t ?</h2>
      <p>Proph3t est le moteur d'intelligence artificielle développé par Atlas Studio, spécialement entraîné sur les données comptables et fiscales africaines. Il comprend les spécificités du SYSCOHADA, les pratiques locales et les normes fiscales de chaque pays.</p>

      <h2>Ce que Proph3t peut faire pour vous</h2>
      <ul>
        <li><strong>Saisie automatique</strong> — scannez une facture, Proph3t identifie le fournisseur, le montant, la TVA et le compte comptable</li>
        <li><strong>Détection d'anomalies</strong> — repérage automatique des doublons, écarts et incohérences</li>
        <li><strong>Prévisions de trésorerie</strong> — anticipez vos besoins de financement à 30, 60 et 90 jours</li>
        <li><strong>Assistant fiscal</strong> — posez vos questions en langage naturel sur la fiscalité de votre pays</li>
      </ul>

      <h2>Une IA qui respecte vos données</h2>
      <p>Proph3t fonctionne en mode privé : vos données ne sont jamais partagées avec des tiers. Le traitement se fait de manière sécurisée, dans le respect des réglementations locales sur la protection des données.</p>

      <p>L'avenir de la comptabilité en Afrique sera intelligent, automatisé et accessible à tous. C'est la promesse de Proph3t.</p>
    `,
  },
  {
    slug: "5-erreurs-gestion-tresorerie-pme",
    title: "5 erreurs de gestion de trésorerie qui coûtent cher aux PME",
    excerpt:
      "Découvrez les erreurs les plus courantes en gestion de trésorerie et comment les éviter grâce à des outils adaptés.",
    cover: "https://images.unsplash.com/photo-1553729459-uj8hne0ce17f?w=800&h=450&fit=crop",
    category: "Gestion",
    date: "24 février 2026",
    readTime: "4 min",
    author: "Équipe Atlas Studio",
    tags: ["Trésorerie", "PME", "Conseils", "Gestion"],
    content: `
      <p>La trésorerie est le nerf de la guerre pour toute PME. Pourtant, de nombreuses entreprises commettent des erreurs qui mettent en péril leur stabilité financière. Voici les 5 plus courantes.</p>

      <h2>1. Ne pas suivre sa trésorerie en temps réel</h2>
      <p>Beaucoup de dirigeants ne consultent leur position de trésorerie qu'une fois par mois — parfois même par trimestre. À ce rythme, les problèmes sont détectés trop tard.</p>

      <h2>2. Confondre rentabilité et trésorerie</h2>
      <p>Une entreprise peut être rentable sur le papier tout en manquant de liquidités. Le décalage entre facturation et encaissement est un piège classique.</p>

      <h2>3. Négliger les relances clients</h2>
      <p>Les retards de paiement sont endémiques dans de nombreux secteurs. Sans processus de relance structuré, les créances s'accumulent et la trésorerie se dégrade.</p>

      <h2>4. Sous-estimer les charges fixes</h2>
      <p>Loyers, salaires, abonnements, impôts… Les charges fixes représentent souvent plus de 60% des dépenses. Ne pas les anticiper mène à des fins de mois difficiles.</p>

      <h2>5. Gérer sa trésorerie sur Excel</h2>
      <p>Les tableurs sont source d'erreurs, ne se mettent pas à jour automatiquement et ne permettent pas de collaborer efficacement. Un outil de gestion dédié comme CashPilot offre une vision claire et actualisée en permanence.</p>

      <blockquote>« La trésorerie ne se gère pas une fois par mois. Elle se pilote au quotidien. »</blockquote>

      <p>Avec les bons outils et les bonnes pratiques, chaque PME peut reprendre le contrôle de sa trésorerie et assurer sa pérennité.</p>
    `,
  },
  {
    slug: "atlas-studio-lancement-cockpit",
    title: "Atlas Studio lance COCKPIT : le tableau de bord des dirigeants",
    excerpt:
      "Notre nouvelle application COCKPIT offre une vue consolidée et en temps réel de tous les indicateurs clés de votre entreprise.",
    cover: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop",
    category: "Actualités",
    date: "15 février 2026",
    readTime: "3 min",
    author: "Équipe Atlas Studio",
    tags: ["COCKPIT", "Dashboard", "Lancement", "Produit"],
    content: `
      <p>Nous sommes fiers d'annoncer le lancement de <strong>COCKPIT</strong>, la nouvelle application de la suite Atlas Studio dédiée aux dirigeants et décideurs.</p>

      <h2>Pourquoi COCKPIT ?</h2>
      <p>Les dirigeants de PME passent trop de temps à chercher l'information. Entre les différents outils, les rapports Excel et les tableaux éparpillés, obtenir une vue d'ensemble prend des heures. COCKPIT résout ce problème en centralisant tous vos indicateurs clés en un seul endroit.</p>

      <h2>Fonctionnalités clés</h2>
      <ul>
        <li><strong>Dashboard temps réel</strong> — chiffre d'affaires, trésorerie, rentabilité, le tout mis à jour en continu</li>
        <li><strong>Alertes intelligentes</strong> — soyez notifié quand un indicateur dépasse un seuil critique</li>
        <li><strong>Rapports automatiques</strong> — recevez un résumé hebdomadaire directement par email</li>
        <li><strong>Vue multi-entités</strong> — consolidez les données de plusieurs entreprises ou filiales</li>
      </ul>

      <h2>Disponibilité</h2>
      <p>COCKPIT est disponible dès maintenant pour tous les abonnés à la suite Atlas Studio. Les utilisateurs existants peuvent l'activer depuis leur espace client.</p>

      <p>Découvrez COCKPIT et reprenez le contrôle de vos indicateurs dès aujourd'hui.</p>
    `,
  },
];
