import { Building2, Factory, HeartPulse, Landmark, ShoppingCart, Ship, Zap, Hotel, GraduationCap, Building, type LucideIcon } from "lucide-react";

export interface SectorItem {
  icon: LucideIcon;
  name: string;
}

export type AppType = "Module ERP" | "App" | "App mobile";
export type AppStatus = "available" | "coming_soon" | "unavailable";

export interface AppItem {
  id: string;
  name: string;
  type: AppType;
  tagline: string;
  desc: string;
  features: string[];
  categories: string[];
  pricing: Record<string, number>;
  color?: string;
  icon?: string;
  highlights?: string[];
}

export interface SiteContent {
  hero: {
    title: string;
    subtitle: string;
    cta1: string;
    cta2: string;
  };
  stats: { value: string; label: string }[];
  apps: AppItem[];
  about: {
    p1: string;
    p2: string;
    p3: string;
    values: { title: string; desc: string }[];
  };
  sectors: SectorItem[];
  testimonials: { name: string; role: string; company: string; text: string; avatar: string }[];
  faqs: { q: string; a: string }[];
  contact: { email: string; phone: string; city: string };
}

export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    title: "Simplifiez le quotidien de vos équipes",
    subtitle: "Une suite d'applications SaaS pour les professionnels qui veulent aller plus vite. ERP modulaire, apps métier, outils mobiles — des solutions simples et puissantes, adaptées aux réalités africaines.",
    cta1: "Démarrer gratuitement",
    cta2: "Découvrir les apps",
  },
  stats: [
    { value: "500+", label: "entreprises" },
    { value: "22", label: "produits" },
    { value: "10+", label: "pays" },
    { value: "99.9%", label: "disponibilité" },
  ],
  apps: [
    // ── MODULES ERP ──────────────────────────────────────────
    { id: "atlas-facture", name: "Atlas Facture", type: "Module ERP", tagline: "Facturation, devis, paiements", desc: "Créez devis et factures en quelques clics, suivez vos paiements et relancez automatiquement vos clients. Export conforme SYSCOHADA.", features: ["Devis & factures", "Suivi des paiements", "Relances automatiques", "Export SYSCOHADA"], categories: ["Finance", "Facturation"], pricing: { starter: 19, pro: 49, enterprise: 99 }, color: "#3B82F6", icon: "receipt", highlights: ["Devis en 30s", "Export PDF", "Norme SYSCOHADA"] },
    { id: "atlas-caisse", name: "Atlas Caisse", type: "Module ERP", tagline: "Trésorerie, Mobile Money", desc: "Gérez votre trésorerie en temps réel. Intégration Mobile Money, rapprochements bancaires et prévisions de cash-flow.", features: ["Suivi de trésorerie", "Mobile Money", "Rapprochements bancaires", "Prévisions cash-flow"], categories: ["Finance", "Trésorerie"], pricing: { starter: 19, pro: 49, enterprise: 99 }, color: "#10B981", icon: "wallet", highlights: ["Temps réel", "Mobile Money", "Multi-banques"] },
    { id: "atlas-clients", name: "Atlas Clients", type: "Module ERP", tagline: "CRM, contacts, relances", desc: "Centralisez vos contacts, suivez vos opportunités et automatisez vos relances. Pipeline commercial visuel.", features: ["Gestion des contacts", "Pipeline commercial", "Relances automatiques", "Historique des échanges"], categories: ["Commercial", "CRM"], pricing: { starter: 19, pro: 49, enterprise: 99 }, color: "#8B5CF6", icon: "users", highlights: ["Pipeline visuel", "Relances auto", "Import CSV"] },
    { id: "atlas-stock", name: "Atlas Stock", type: "Module ERP", tagline: "Inventaire, mouvements", desc: "Pilotez votre inventaire avec précision. Entrées, sorties, transferts et alertes de seuil en temps réel.", features: ["Gestion des stocks", "Mouvements en temps réel", "Alertes de seuil", "Inventaire multi-sites"], categories: ["Logistique", "Inventaire"], pricing: { starter: 19, pro: 49, enterprise: 99 }, color: "#F59E0B", icon: "package", highlights: ["Multi-sites", "Alertes seuil", "Scan QR code"] },
    { id: "atlas-compta", name: "Atlas Compta", type: "Module ERP", tagline: "Comptabilité SYSCOHADA", desc: "Comptabilité générale et analytique conforme SYSCOHADA. Journaux, grand livre, balance et états financiers automatisés.", features: ["Plan comptable SYSCOHADA", "Journaux & grand livre", "États financiers", "Comptabilité analytique"], categories: ["Finance", "Comptabilité"], pricing: { starter: 25, pro: 59, enterprise: 119 }, color: "#EF4444", icon: "calculator", highlights: ["SYSCOHADA natif", "Bilan auto", "Analytique"] },
    { id: "atlas-projets", name: "Atlas Projets", type: "Module ERP", tagline: "Gestion de projets", desc: "Planifiez, exécutez et suivez vos projets avec des jalons, des KPIs et des rapports automatisés.", features: ["Planification & jalons", "Suivi temps réel", "Dashboards KPI", "Rapports automatisés"], categories: ["Gestion de projet", "Management"], pricing: { starter: 19, pro: 49, enterprise: 99 }, color: "#06B6D4", icon: "layout-dashboard", highlights: ["Jalons visuels", "KPIs temps réel", "Gantt intégré"] },
    { id: "atlas-rh", name: "Atlas RH", type: "Module ERP", tagline: "Ressources humaines, paie", desc: "Gérez vos collaborateurs de A à Z : fiches employés, paie, congés, évaluations et conformité locale.", features: ["Fiches employés", "Gestion de la paie", "Congés & absences", "Évaluations"], categories: ["RH", "Paie"], pricing: { starter: 25, pro: 59, enterprise: 119 }, color: "#EC4899", icon: "user-check", highlights: ["Paie conforme", "Congés en 1 clic", "200+ employés"] },
    { id: "atlas-marketing", name: "Atlas Marketing", type: "Module ERP", tagline: "Campagnes, leads", desc: "Lancez des campagnes ciblées, capturez des leads et mesurez votre ROI marketing en temps réel.", features: ["Gestion de campagnes", "Capture de leads", "Scoring & nurturing", "Analytics ROI"], categories: ["Marketing", "Commercial"], pricing: { starter: 19, pro: 49, enterprise: 99 }, color: "#F97316", icon: "megaphone", highlights: ["ROI mesurable", "Lead scoring", "Multi-canal"] },
    { id: "atlas-reporting", name: "Atlas Reporting", type: "Module ERP", tagline: "Tableaux de bord", desc: "Transformez vos données en décisions avec des dashboards interactifs et rapports personnalisés.", features: ["Dashboards interactifs", "Rapports sur mesure", "Export multi-format", "Alertes intelligentes"], categories: ["BI", "Direction"], pricing: { starter: 19, pro: 49, enterprise: 99 }, color: "#6366F1", icon: "bar-chart-3", highlights: ["Dashboards live", "Export multi-format", "Alertes auto"] },
    { id: "atlas-operations", name: "Atlas Opérations", type: "Module ERP", tagline: "Maintenance, work orders", desc: "Planifiez et suivez vos interventions de maintenance. Work orders, plannings d'équipe et historique complet.", features: ["Work orders", "Planning d'équipe", "Maintenance préventive", "Historique interventions"], categories: ["Maintenance", "Terrain"], pricing: { starter: 19, pro: 49, enterprise: 99 }, color: "#14B8A6", icon: "wrench", highlights: ["Work orders", "Préventif", "Historique complet"] },
    { id: "atlas-immo", name: "Atlas Immo", type: "Module ERP", tagline: "Gestion locative", desc: "Gérez votre parc immobilier locatif : baux, quittances, loyers, charges et états des lieux numériques.", features: ["Gestion des baux", "Quittances & loyers", "Suivi des charges", "États des lieux"], categories: ["Immobilier", "Gestion locative"], pricing: { starter: 25, pro: 59, enterprise: 119 }, color: "#84CC16", icon: "home", highlights: ["Gestion baux", "Quittances auto", "États des lieux"] },
    { id: "atlas-construction", name: "Atlas Construction", type: "Module ERP", tagline: "Suivi chantiers", desc: "Pilotez vos chantiers de bout en bout : planning, budgets, sous-traitants et rapports d'avancement.", features: ["Planning chantier", "Suivi budgétaire", "Gestion sous-traitants", "Rapports d'avancement"], categories: ["BTP", "Chantiers"], pricing: { starter: 25, pro: 59, enterprise: 119 }, color: "#D97706", icon: "hammer", highlights: ["Suivi chantiers", "Budget temps réel", "Sous-traitants"] },
    { id: "atlas-syndic", name: "Atlas Syndic", type: "Module ERP", tagline: "Copropriété", desc: "Simplifiez la gestion de copropriété : appels de charges, AG, carnets d'entretien et communication résidents.", features: ["Appels de charges", "Gestion des AG", "Carnet d'entretien", "Portail résidents"], categories: ["Immobilier", "Copropriété"], pricing: { starter: 25, pro: 59, enterprise: 119 }, color: "#7C3AED", icon: "building-2", highlights: ["Appels de charges", "AG en ligne", "Portail résidents"] },

    // ── APPS STANDALONE ──────────────────────────────────────
    { id: "docjourney", name: "DocJourney", type: "App", tagline: "Circuit de validation & signature", desc: "Digitalisez vos circuits de validation documentaire avec signature électronique et traçabilité complète.", features: ["Circuits de validation", "Signature électronique", "Traçabilité complète", "Notifications temps réel"], categories: ["Documents", "Validation"], pricing: { basic: 25, pro: 55 }, color: "#2563EB", icon: "file-check", highlights: ["Signature e-", "Traçabilité 100%", "Circuits flexibles"] },
    { id: "advist", name: "Advist", type: "App", tagline: "Workflow documentaire", desc: "Automatisez vos workflows documentaires. Classement intelligent, versioning et recherche full-text.", features: ["Workflows automatisés", "Classement intelligent", "Versioning", "Recherche full-text"], categories: ["Documents", "Workflow"], pricing: { basic: 25, pro: 55 }, color: "#059669", icon: "folder-open", highlights: ["Classement IA", "Versioning auto", "Recherche full-text"] },
    { id: "wedo", name: "WeDo", type: "App mobile", tagline: "Tontine digitale", desc: "La tontine réinventée. Créez et gérez vos groupes d'épargne collaborative depuis votre smartphone.", features: ["Création de groupes", "Calendrier des tours", "Notifications de collecte", "Historique transparent"], categories: ["Finance", "Épargne", "Mobile"], pricing: { basic: 9, pro: 19 }, color: "#DC2626", icon: "banknote", highlights: ["Tontine digitale", "Notifications auto", "100% transparent"] },
    { id: "uwallet", name: "U'Wallet", type: "App", tagline: "Portefeuille digital", desc: "Portefeuille numérique multi-devises. Envoyez, recevez et gérez vos fonds en toute sécurité.", features: ["Multi-devises", "Transferts instantanés", "QR code paiement", "Historique détaillé"], categories: ["Finance", "Paiement"], pricing: { basic: 0, pro: 15 }, color: "#7C3AED", icon: "credit-card", highlights: ["Multi-devises", "QR paiement", "Transfert instant"] },
    { id: "yiri", name: "Yiri", type: "App mobile", tagline: "Troc géolocalisé", desc: "Échangez biens et services autour de vous. Matching géolocalisé et messagerie intégrée.", features: ["Géolocalisation", "Matching intelligent", "Messagerie intégrée", "Évaluations & avis"], categories: ["Marketplace", "Échange", "Mobile"], pricing: { basic: 0, pro: 9 }, color: "#EA580C", icon: "arrow-left-right", highlights: ["Géolocalisation", "Matching IA", "Messagerie intégrée"] },
    { id: "taxpilot", name: "TaxPilot", type: "App", tagline: "Liasse fiscale SYSCOHADA", desc: "Générez votre liasse fiscale SYSCOHADA automatiquement à partir de vos données comptables.", features: ["Liasse fiscale auto", "Conformité SYSCOHADA", "Contrôle de cohérence", "Export DGI"], categories: ["Fiscalité", "Comptabilité"], pricing: { basic: 29, pro: 69 }, color: "#0891B2", icon: "file-text", highlights: ["Liasse auto", "Contrôle cohérence", "Export DGI"] },
    { id: "clarityx", name: "ClarityX", type: "App", tagline: "Audit frais bancaires B2B", desc: "Analysez et optimisez vos frais bancaires professionnels. Détection d'anomalies et recommandations.", features: ["Analyse des frais", "Détection d'anomalies", "Benchmarking", "Rapport d'optimisation"], categories: ["Finance", "Audit"], pricing: { basic: 39, pro: 89 }, color: "#4F46E5", icon: "search", highlights: ["Détection anomalies", "Benchmarking", "Optimisation"] },
    { id: "cockpit", name: "Cockpit", type: "App", tagline: "Pilotage projet", desc: "Tableau de bord de pilotage projet temps réel. Vue consolidée, KPIs et alertes pour les décideurs.", features: ["Vue consolidée", "KPIs temps réel", "Alertes & seuils", "Rapports automatisés"], categories: ["Gestion de projet", "Pilotage"], pricing: { starter: 29, pro: 69, enterprise: 149 }, color: "#0D9488", icon: "gauge", highlights: ["Vue consolidée", "Temps réel", "Alertes & seuils"] },
  ],
  about: {
    p1: "Atlas Studio développe des applications SaaS qui simplifient le quotidien des professionnels. Notre conviction : les entreprises africaines méritent des outils digitaux aussi performants que ceux disponibles partout dans le monde — mais adaptés à leurs réalités.",
    p2: "Née de plus de 20 ans d'expérience opérationnelle à travers 10 pays africains, notre suite répond aux vrais problèmes du terrain : suivi de projets approximatif, documents qui se perdent, décisions sans données.",
    p3: "Nos apps sont simples, rapides et fonctionnent partout — même avec une connexion limitée.",
    values: [
      { title: "Pas besoin de DSI", desc: "Prêt à l'emploi. Créez un compte, choisissez une app, c'est parti." },
      { title: "Normes locales", desc: "Conformité OHADA, SYSCOHADA, formats et usages africains." },
      { title: "Évolutif", desc: "Du freelance à la multinationale — nos plans s'adaptent." },
      { title: "Support réactif", desc: "Équipe basée en Afrique, qui comprend vos défis." },
    ],
  },
  sectors: [
    { icon: Building2, name: "Immobilier & Construction" },
    { icon: Factory, name: "Industrie & Manufacture" },
    { icon: HeartPulse, name: "Santé & Pharmacie" },
    { icon: Landmark, name: "Banque & Finance" },
    { icon: ShoppingCart, name: "Distribution & Retail" },
    { icon: Ship, name: "Logistique & Transport" },
    { icon: Zap, name: "Énergie & Mines" },
    { icon: Hotel, name: "Hôtellerie & Tourisme" },
    { icon: GraduationCap, name: "Éducation & Formation" },
    { icon: Building, name: "Secteur public" },
  ],
  testimonials: [
    { name: "Aminata K.", role: "Directrice des Opérations", company: "Groupe industriel, Abidjan", text: "Atlas Projets a transformé notre suivi de chantiers. On a réduit nos délais de reporting de 60%.", avatar: "AK" },
    { name: "Franck D.", role: "DRH", company: "Groupe bancaire, Dakar", text: "Atlas RH nous permet de gérer la paie de 200 collaborateurs sans erreur. Un gain de temps énorme.", avatar: "FD" },
    { name: "Mariam T.", role: "Directrice Administrative", company: "Société minière, Conakry", text: "Avec DocJourney, plus aucun document ne se perd. Les validations se font maintenant en 48h.", avatar: "MT" },
    { name: "Jean-Paul M.", role: "Responsable Achats", company: "Chaîne de distribution, Douala", text: "Atlas Stock nous a permis de réduire nos ruptures de 40%. L'inventaire multi-sites est un game changer.", avatar: "JM" },
  ],
  faqs: [
    { q: "À qui s'adressent les applications ?", a: "À tous les professionnels et entreprises qui veulent digitaliser leur gestion, quel que soit le secteur." },
    { q: "Quelle est la différence entre les modules ERP et les apps standalone ?", a: "Les modules ERP partagent une base commune et s'interconnectent. Les apps standalone fonctionnent de manière indépendante pour des besoins spécifiques." },
    { q: "Comment fonctionne l'abonnement ?", a: "Facturation mensuelle, changement ou annulation à tout moment. Aucun engagement." },
    { q: "Faut-il installer quelque chose ?", a: "Non. 100% en ligne, accessible depuis n'importe quel navigateur. Certaines apps sont aussi disponibles sur mobile." },
    { q: "Mes données sont-elles sécurisées ?", a: "Oui. Chiffrement SSL, sauvegardes quotidiennes, conformité internationale." },
    { q: "Puis-je combiner plusieurs apps ?", a: "Oui, chaque app est indépendante. Combinez modules ERP et apps standalone selon vos besoins." },
    { q: "Quels moyens de paiement ?", a: "Carte bancaire, virement. Mobile Money bientôt disponible." },
  ],
  contact: { email: "contact@atlasstudio.com", phone: "+225 XX XX XX XX", city: "Abidjan, Côte d'Ivoire" },
};
