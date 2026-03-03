export interface AppPlan {
  price: number;
  label: string;
}

export type AppType = "Module ERP" | "App" | "App mobile";

export interface AppInfo {
  name: string;
  type: AppType;
  tagline: string;
  description: string;
  features: string[];
  pricing: Record<string, AppPlan>;
  color: string;
  icon: string;
  highlights: string[];
}

export const APP_INFO: Record<string, AppInfo> = {
  // ── MODULES ERP ──────────────────────────────────────────
  "atlas-facture": {
    name: "Atlas Facture", type: "Module ERP", tagline: "Facturation, devis, paiements",
    description: "Créez devis et factures en quelques clics, suivez vos paiements et relancez automatiquement vos clients.",
    features: ["Devis & factures", "Suivi des paiements", "Relances automatiques", "Export SYSCOHADA"],
    pricing: { starter: { price: 19, label: "Starter" }, pro: { price: 49, label: "Pro" }, enterprise: { price: 99, label: "Enterprise" } },
    color: "#3B82F6", icon: "receipt", highlights: ["Devis en 30s", "Export PDF", "Norme SYSCOHADA"],
  },
  "atlas-caisse": {
    name: "Atlas Caisse", type: "Module ERP", tagline: "Trésorerie, Mobile Money",
    description: "Gérez votre trésorerie en temps réel. Intégration Mobile Money et rapprochements bancaires.",
    features: ["Suivi de trésorerie", "Mobile Money", "Rapprochements bancaires", "Prévisions cash-flow"],
    pricing: { starter: { price: 19, label: "Starter" }, pro: { price: 49, label: "Pro" }, enterprise: { price: 99, label: "Enterprise" } },
    color: "#10B981", icon: "wallet", highlights: ["Temps réel", "Mobile Money", "Multi-banques"],
  },
  "atlas-clients": {
    name: "Atlas Clients", type: "Module ERP", tagline: "CRM, contacts, relances",
    description: "Centralisez vos contacts, suivez vos opportunités et automatisez vos relances.",
    features: ["Gestion des contacts", "Pipeline commercial", "Relances automatiques", "Historique des échanges"],
    pricing: { starter: { price: 19, label: "Starter" }, pro: { price: 49, label: "Pro" }, enterprise: { price: 99, label: "Enterprise" } },
    color: "#8B5CF6", icon: "users", highlights: ["Pipeline visuel", "Relances auto", "Import CSV"],
  },
  "atlas-stock": {
    name: "Atlas Stock", type: "Module ERP", tagline: "Inventaire, mouvements",
    description: "Pilotez votre inventaire avec précision. Entrées, sorties, transferts et alertes de seuil.",
    features: ["Gestion des stocks", "Mouvements en temps réel", "Alertes de seuil", "Inventaire multi-sites"],
    pricing: { starter: { price: 19, label: "Starter" }, pro: { price: 49, label: "Pro" }, enterprise: { price: 99, label: "Enterprise" } },
    color: "#F59E0B", icon: "package", highlights: ["Multi-sites", "Alertes seuil", "Scan QR code"],
  },
  "atlas-compta": {
    name: "Atlas Compta", type: "Module ERP", tagline: "Comptabilité SYSCOHADA",
    description: "Comptabilité générale et analytique conforme SYSCOHADA. États financiers automatisés.",
    features: ["Plan comptable SYSCOHADA", "Journaux & grand livre", "États financiers", "Comptabilité analytique"],
    pricing: { starter: { price: 25, label: "Starter" }, pro: { price: 59, label: "Pro" }, enterprise: { price: 119, label: "Enterprise" } },
    color: "#EF4444", icon: "calculator", highlights: ["SYSCOHADA natif", "Bilan auto", "Analytique"],
  },
  "atlas-projets": {
    name: "Atlas Projets", type: "Module ERP", tagline: "Gestion de projets",
    description: "Planifiez, exécutez et suivez vos projets avec des jalons, KPIs et rapports automatisés.",
    features: ["Planification & jalons", "Suivi temps réel", "Dashboards KPI", "Rapports automatisés"],
    pricing: { starter: { price: 19, label: "Starter" }, pro: { price: 49, label: "Pro" }, enterprise: { price: 99, label: "Enterprise" } },
    color: "#06B6D4", icon: "layout-dashboard", highlights: ["Jalons visuels", "KPIs temps réel", "Gantt intégré"],
  },
  "atlas-rh": {
    name: "Atlas RH", type: "Module ERP", tagline: "Ressources humaines, paie",
    description: "Gérez vos collaborateurs de A à Z : fiches employés, paie, congés et évaluations.",
    features: ["Fiches employés", "Gestion de la paie", "Congés & absences", "Évaluations"],
    pricing: { starter: { price: 25, label: "Starter" }, pro: { price: 59, label: "Pro" }, enterprise: { price: 119, label: "Enterprise" } },
    color: "#EC4899", icon: "user-check", highlights: ["Paie conforme", "Congés en 1 clic", "200+ employés"],
  },
  "atlas-marketing": {
    name: "Atlas Marketing", type: "Module ERP", tagline: "Campagnes, leads",
    description: "Lancez des campagnes ciblées, capturez des leads et mesurez votre ROI marketing.",
    features: ["Gestion de campagnes", "Capture de leads", "Scoring & nurturing", "Analytics ROI"],
    pricing: { starter: { price: 19, label: "Starter" }, pro: { price: 49, label: "Pro" }, enterprise: { price: 99, label: "Enterprise" } },
    color: "#F97316", icon: "megaphone", highlights: ["ROI mesurable", "Lead scoring", "Multi-canal"],
  },
  "atlas-reporting": {
    name: "Atlas Reporting", type: "Module ERP", tagline: "Tableaux de bord",
    description: "Transformez vos données en décisions avec des dashboards interactifs.",
    features: ["Dashboards interactifs", "Rapports sur mesure", "Export multi-format", "Alertes intelligentes"],
    pricing: { starter: { price: 19, label: "Starter" }, pro: { price: 49, label: "Pro" }, enterprise: { price: 99, label: "Enterprise" } },
    color: "#6366F1", icon: "bar-chart-3", highlights: ["Dashboards live", "Export multi-format", "Alertes auto"],
  },
  "atlas-operations": {
    name: "Atlas Opérations", type: "Module ERP", tagline: "Maintenance, work orders",
    description: "Planifiez et suivez vos interventions de maintenance. Work orders et historique complet.",
    features: ["Work orders", "Planning d'équipe", "Maintenance préventive", "Historique interventions"],
    pricing: { starter: { price: 19, label: "Starter" }, pro: { price: 49, label: "Pro" }, enterprise: { price: 99, label: "Enterprise" } },
    color: "#14B8A6", icon: "wrench", highlights: ["Work orders", "Préventif", "Historique complet"],
  },
  "atlas-immo": {
    name: "Atlas Immo", type: "Module ERP", tagline: "Gestion locative",
    description: "Gérez votre parc immobilier locatif : baux, quittances, loyers et charges.",
    features: ["Gestion des baux", "Quittances & loyers", "Suivi des charges", "États des lieux"],
    pricing: { starter: { price: 25, label: "Starter" }, pro: { price: 59, label: "Pro" }, enterprise: { price: 119, label: "Enterprise" } },
    color: "#84CC16", icon: "home", highlights: ["Gestion baux", "Quittances auto", "États des lieux"],
  },
  "atlas-construction": {
    name: "Atlas Construction", type: "Module ERP", tagline: "Suivi chantiers",
    description: "Pilotez vos chantiers de bout en bout : planning, budgets et sous-traitants.",
    features: ["Planning chantier", "Suivi budgétaire", "Gestion sous-traitants", "Rapports d'avancement"],
    pricing: { starter: { price: 25, label: "Starter" }, pro: { price: 59, label: "Pro" }, enterprise: { price: 119, label: "Enterprise" } },
    color: "#D97706", icon: "hammer", highlights: ["Suivi chantiers", "Budget temps réel", "Sous-traitants"],
  },
  "atlas-syndic": {
    name: "Atlas Syndic", type: "Module ERP", tagline: "Copropriété",
    description: "Simplifiez la gestion de copropriété : appels de charges, AG et communication résidents.",
    features: ["Appels de charges", "Gestion des AG", "Carnet d'entretien", "Portail résidents"],
    pricing: { starter: { price: 25, label: "Starter" }, pro: { price: 59, label: "Pro" }, enterprise: { price: 119, label: "Enterprise" } },
    color: "#7C3AED", icon: "building-2", highlights: ["Appels de charges", "AG en ligne", "Portail résidents"],
  },

  // ── APPS STANDALONE ──────────────────────────────────────
  docjourney: {
    name: "DocJourney", type: "App", tagline: "Circuit de validation & signature",
    description: "Digitalisez vos circuits de validation documentaire avec signature électronique.",
    features: ["Circuits de validation", "Signature électronique", "Traçabilité complète", "Notifications temps réel"],
    pricing: { basic: { price: 25, label: "Basic" }, pro: { price: 55, label: "Pro" } },
    color: "#2563EB", icon: "file-check", highlights: ["Signature e-", "Traçabilité 100%", "Circuits flexibles"],
  },
  advist: {
    name: "Advist", type: "App", tagline: "Workflow documentaire",
    description: "Automatisez vos workflows documentaires. Classement intelligent et versioning.",
    features: ["Workflows automatisés", "Classement intelligent", "Versioning", "Recherche full-text"],
    pricing: { basic: { price: 25, label: "Basic" }, pro: { price: 55, label: "Pro" } },
    color: "#059669", icon: "folder-open", highlights: ["Classement IA", "Versioning auto", "Recherche full-text"],
  },
  wedo: {
    name: "WeDo", type: "App mobile", tagline: "Tontine digitale",
    description: "La tontine réinventée. Gérez vos groupes d'épargne collaborative sur mobile.",
    features: ["Création de groupes", "Calendrier des tours", "Notifications de collecte", "Historique transparent"],
    pricing: { basic: { price: 9, label: "Basic" }, pro: { price: 19, label: "Pro" } },
    color: "#DC2626", icon: "banknote", highlights: ["Tontine digitale", "Notifications auto", "100% transparent"],
  },
  uwallet: {
    name: "U'Wallet", type: "App", tagline: "Portefeuille digital",
    description: "Portefeuille numérique multi-devises. Envoyez, recevez et gérez vos fonds.",
    features: ["Multi-devises", "Transferts instantanés", "QR code paiement", "Historique détaillé"],
    pricing: { basic: { price: 0, label: "Gratuit" }, pro: { price: 15, label: "Pro" } },
    color: "#7C3AED", icon: "credit-card", highlights: ["Multi-devises", "QR paiement", "Transfert instant"],
  },
  yiri: {
    name: "Yiri", type: "App mobile", tagline: "Troc géolocalisé",
    description: "Échangez biens et services autour de vous. Matching géolocalisé.",
    features: ["Géolocalisation", "Matching intelligent", "Messagerie intégrée", "Évaluations & avis"],
    pricing: { basic: { price: 0, label: "Gratuit" }, pro: { price: 9, label: "Pro" } },
    color: "#EA580C", icon: "arrow-left-right", highlights: ["Géolocalisation", "Matching IA", "Messagerie intégrée"],
  },
  taxpilot: {
    name: "TaxPilot", type: "App", tagline: "Liasse fiscale SYSCOHADA",
    description: "Générez votre liasse fiscale SYSCOHADA automatiquement.",
    features: ["Liasse fiscale auto", "Conformité SYSCOHADA", "Contrôle de cohérence", "Export DGI"],
    pricing: { basic: { price: 29, label: "Basic" }, pro: { price: 69, label: "Pro" } },
    color: "#0891B2", icon: "file-text", highlights: ["Liasse auto", "Contrôle cohérence", "Export DGI"],
  },
  clarityx: {
    name: "ClarityX", type: "App", tagline: "Audit frais bancaires B2B",
    description: "Analysez et optimisez vos frais bancaires professionnels.",
    features: ["Analyse des frais", "Détection d'anomalies", "Benchmarking", "Rapport d'optimisation"],
    pricing: { basic: { price: 39, label: "Basic" }, pro: { price: 89, label: "Pro" } },
    color: "#4F46E5", icon: "search", highlights: ["Détection anomalies", "Benchmarking", "Optimisation"],
  },
  cockpit: {
    name: "Cockpit", type: "App", tagline: "Pilotage projet",
    description: "Tableau de bord de pilotage projet temps réel pour les décideurs.",
    features: ["Vue consolidée", "KPIs temps réel", "Alertes & seuils", "Rapports automatisés"],
    pricing: { starter: { price: 29, label: "Starter" }, pro: { price: 69, label: "Pro" }, enterprise: { price: 149, label: "Enterprise" } },
    color: "#0D9488", icon: "gauge", highlights: ["Vue consolidée", "Temps réel", "Alertes & seuils"],
  },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  active: { label: "Actif", color: "#16a34a", dotColor: "#22c55e" },
  trial: { label: "Essai", color: "#2563eb", dotColor: "#3b82f6" },
  suspended: { label: "Suspendu", color: "#d97706", dotColor: "#f59e0b" },
  cancelled: { label: "Annulé", color: "#dc2626", dotColor: "#ef4444" },
  expired: { label: "Expiré", color: "#9ca3af", dotColor: "#d1d5db" },
};
