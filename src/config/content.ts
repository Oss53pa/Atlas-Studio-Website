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
  pricingPeriod?: "mois" | "an";
  color?: string;
  icon?: string;
  highlights?: string[];
  external_url?: string;
}

export interface SiteContent {
  hero: {
    title: string;
    subtitle: string;
    cta1: string;
    cta2: string;
  };
  stats: { value: string; label: string }[];
  trustBar: string[];
  steps: { num: string; title: string; desc: string }[];
  apps: AppItem[];
  about: {
    p1: string;
    p2: string;
    p3: string;
    values: { title: string; desc: string }[];
  };
  sectors: SectorItem[];
  testimonials: { name: string; role: string; company: string; text: string; avatar: string; photo?: string; companyLogo?: string }[];
  comparatif: {
    headers: string[];
    rows: { name: string; values: string[]; highlight?: boolean }[];
  };
  faqs: { q: string; a: string }[];
  contact: { email: string; phone: string; city: string };
  social?: { facebook?: string; instagram?: string; linkedin?: string; twitter?: string; youtube?: string; tiktok?: string };
  appearance?: { primaryColor?: string; accentColor?: string; heroBackground?: string; clientLogos?: string[] };
}

export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    title: "Vos outils de gestion vous ralentissent. On change ça.",
    subtitle: "Comptabilité SYSCOHADA, liasse fiscale, signature électronique — des apps SaaS prêtes à emploi, pensées pour les entreprises africaines. Déjà adoptées par 500+ entreprises dans 10 pays.",
    cta1: "Créer un compte",
    cta2: "Découvrir les apps",
  },
  stats: [
    { value: "500+", label: "entreprises clientes" },
    { value: "10+", label: "pays couverts" },
    { value: "4", label: "produits" },
    { value: "99.9%", label: "disponibilité" },
  ],
  trustBar: [
    "SYSCOHADA révisé natif",
    "Mode offline (PWA)",
    "IA Proph3t intégrée",
    "Données sécurisées",
    "17 pays OHADA",
  ],
  steps: [
    { num: "01 — Compte", title: "Créez votre workspace", desc: "Inscription en 2 minutes. Votre espace entreprise est créé automatiquement avec vos informations." },
    { num: "02 — Activation", title: "Activez vos applications", desc: "Choisissez les apps dont vous avez besoin. Commencez gratuitement, upgradez à tout moment." },
    { num: "03 — Équipe", title: "Invitez vos collaborateurs", desc: "Ajoutez votre équipe avec des rôles précis. Chacun accède à ses modules depuis le même workspace." },
    { num: "04 — Intelligence", title: "Proph3t prend le relai", desc: "Le moteur IA analyse vos données, détecte les anomalies et génère des prévisions en continu." },
  ],
  apps: [
    // ── MODULE ERP ───────────────────────────────────────────
    { id: "atlas-compta", name: "Atlas F&A", type: "Module ERP", tagline: "Finance & Administration", desc: "Comptabilité complète SYSCOHADA : saisie des écritures, grand livre, balance, lettrage automatique, rapprochement bancaire, immobilisations, budget analytique, stocks, recouvrement, fiscalité, clôture et états financiers.", features: ["Saisie des écritures & journaux", "Grand livre & balance générale", "Lettrage automatique (4 algorithmes)", "Rapprochement bancaire (CSV, scoring)", "Immobilisations & amortissements (linéaire, dégressif)", "Stocks (CUMP / FIFO)", "Réévaluation des immobilisations (Premium)", "Approche par composants bâtiment (Premium)", "Budget & comptabilité analytique", "Position de trésorerie", "Recouvrement & balance âgée", "Effets de commerce LC, BÀO (Premium)", "Fiscalité (TVA, IS, IMF, patente)", "Clôture (CCA, PCA, FNP, FAE, résultat)", "Affectation du résultat N-1", "Reports à nouveau automatiques", "Bilan, Compte de résultat, SIG", "TAFIRE & ratios financiers", "Export Excel & PDF", "Proph3t IA (contrôles & corrections)", "Proph3t IA avancé LLM + prédictif (Premium)", "1 société / 1 dossier", "Multi-sociétés illimité (Premium)", "Multi-sites (Premium)", "Multi-pays OHADA 17 pays (Premium)", "Opérations en devises EUR/XOF (Premium)", "Écarts de conversion 476/477 (Premium)", "Cloud sécurisé & backup quotidien", "1 à 5 utilisateurs", "Utilisateurs illimités (Premium)", "Workflow de validation & rôles RBAC (Premium)", "Audit trail complet conformité OHADA (Premium)", "API REST & intégrations (Premium)", "Support email", "Support prioritaire & account manager (Premium)", "Formation incluse 2 sessions/an (Premium)", "SLA 99.5% (Premium)"], categories: ["Finance", "Comptabilité"], pricing: { "PME / TPE": 49000, "Premium": 250000 }, color: "#EF4444", icon: "calculator", highlights: ["SYSCOHADA natif", "Proph3t IA", "Multi-sociétés"], external_url: "https://atlas-fna.atlas-studio.org/" },

    // ── APPS STANDALONE ──────────────────────────────────────
    { id: "taxpilot", name: "Liass'Pilot", type: "App", tagline: "Liasse fiscale SYSCOHADA", desc: "Votre balance entre. Votre liasse sort. Conforme. Un expert-comptable facture la liasse entre 500 000 et 2 000 000 FCFA. Liass'Pilot vous fait économiser au minimum 50 %.", features: ["Import balance CSV & Excel", "Plan comptable SYSCOHADA révisé (1 005 comptes)", "Bilan Actif & Passif complet", "Compte de résultat & 9 SIG", "TAFIRE / TFT (CAFG, FR, BFR, TN)", "18 notes annexes calculées", "129 contrôles de cohérence Proph3t", "Passage fiscal automatique CI", "7 réintégrations fiscales auto (CGI)", "Calcul IS & IMF", "Export Excel 84 onglets (Mode A)", "Export Excel template DGI (Mode B)", "Comparatif N / N-1", "Ratios financiers", "Archivage SHA-256", "Proph3t chatbot", "Multi-pays OHADA (17 pays)", "Secteurs spécialisés (banque, assurance, microfinance, EBNL)", "E-Invoicing (UBL 2.1, CII, PEPPOL)", "XML télédéclaration (DSF, DAS, TVA, IS)", "Audit trail & workflow de validation", "Support email & prioritaire"], categories: ["Fiscalité", "Comptabilité"], pricing: { "Entreprise · 1 société": 250000, "Cabinet · illimité": 1500000 }, pricingPeriod: "an", color: "#0891B2", icon: "file-text", highlights: ["SYSCOHADA natif", "Proph3t IA", "Économisez 50 %+"] },
    { id: "advist", name: "Advist", type: "App", tagline: "Workflow documentaire & signature électronique", desc: "Digitalisez vos circuits de validation avec signature électronique. DocuSign coûte 45 $/mois/utilisateur — Advist est 2 à 3x moins cher, conçu pour l'Afrique et conforme OHADA.", features: ["Import documents (PDF, images)", "Circuits de validation configurables", "Validation séquentielle & parallèle", "Jusqu'à 10 intervenants par circuit", "Annotations & commentaires (sidebar)", "Surlignage avec identification auteur", "Signature électronique simple", "Notification email à chaque étape", "Lien sécurisé pour intervenants externes", "Suivi en temps réel de l'avancement", "Historique & traçabilité complète", "Hash SHA-256 par document", "Export dossier complet (PDF + audit trail)", "Signataires/validateurs externes illimités", "Circuits conditionnels (si/alors) (Entreprise)", "Signature électronique avancée eIDAS (Entreprise)", "Cachet électronique personne morale (Entreprise)", "Horodatage qualifié (Entreprise)", "Templates de workflow réutilisables (Entreprise)", "Multi-départements / multi-sites (Entreprise)", "Gestion des rôles & permissions RBAC (Entreprise)", "Conformité OHADA (archivage 10 ans) (Entreprise)", "API REST pour intégrations (Entreprise)", "SSO / SAML (Entreprise)"], categories: ["Documents", "Workflow", "Signature"], pricing: { "Business": 25000, "Entreprise": 150000 }, color: "#059669", icon: "folder-open", highlights: ["2-3x moins cher que DocuSign", "Conforme OHADA", "Signataires illimités"] },
    { id: "tablesmart", name: "TableSmart", type: "App", tagline: "Digitalisation complète pour la restauration", desc: "Plateforme SaaS tout-en-un pour restaurants, bars, hôtels et food courts. Du QR code client au KDS cuisine, en passant par les paiements Mobile Money — TableSmart digitalise toute la chaîne de service avec l'écosystème africain en tête. Square POS coûte 60 $/mois — TableSmart est 2x moins cher avec Mobile Money natif et conformité SYSCOHADA/DGI.", features: ["Menu digital QR code (15 layouts premium)", "Commande client sans installation app", "Paiement Mobile Money (Orange Money, Wave, MTN, M-Pesa, Airtel)", "Paiement carte bancaire (Visa, Mastercard, Stripe)", "Paiement espèces avec rendu monnaie", "Split bill (égal, par item, montant custom)", "Pourboire ajustable (5 / 10 / 15 % ou libre)", "Cartes cadeaux & abonnements repas", "KDS cuisine temps réel (urgence chromatique)", "Validation item par item & boutons 64px", "Rupture stock cascade (menu + serveur + client)", "Filtre par poste (chaud/froid/grill/bar/pâtisserie)", "Mode rush (seuils réduits automatiquement)", "App serveur (plan de salle, notifications)", "Commandes manuelles & saisie verbale", "Notifications push staff (12 types prioritisés)", "App barman (tabs, bottle service, happy hour)", "App hôtesse (réservations, file d'attente, check-in)", "Console manager (service, stocks, rapports)", "Console propriétaire (finances, clients, fiscalité)", "Console SuperAdmin (multi-tenant, métriques SaaS)", "Multi-établissements & food courts", "Réservations avec acompte déductible", "Pré-commandes liées aux réservations", "Commandes groupées (plusieurs participants)", "Programme fidélité & badges gamification (Pro)", "Campagnes WhatsApp/SMS ciblées RFM (Pro)", "NPS & enquêtes satisfaction automatiques", "Studio personnalisation menu (3 modes preview)", "15 layouts premium (Galerie, Magazine, Néon, Bio...)", "Conformité fiscale SYSCOHADA & DGI multi-pays", "Tickets fiscaux séquentiels immuables", "TVA dynamique (CI 18%, CM 19.25%, GH 15%, MA 20%)", "Impression thermique ESC/POS (cuisine + caisse)", "PWA installable mobile/tablette", "Mode hors-ligne (KDS + serveur, IndexedDB)", "Notifications Web Push + WhatsApp + SMS", "Multi-langues (FR, EN, AR, Wolof, Dyula)", "RGPD : export données + anonymisation 1-clic", "Intégrations POS (Lightspeed, Square, Odoo) (Enterprise)", "Opera PMS hôtel (facturation chambre) (Enterprise)", "Google Maps & Instagram Graph API", "Audit trail complet & logs immutables", "IA Proph3t (recommandations menu, alertes stock)", "API REST pour intégrations sur mesure (Enterprise)", "SSO Atlas Studio inclus", "Support email", "Support prioritaire & account manager (Enterprise)", "Onboarding accompagné 1 session (Pro)", "Formation incluse 2 sessions/an (Enterprise)"], categories: ["Restauration", "Hôtellerie", "Paiement", "POS"], pricing: { "Starter": 25000, "Pro": 75000, "Enterprise": 200000 }, color: "#C9A84C", icon: "utensils", highlights: ["Mobile Money natif", "15 layouts premium", "Conforme OHADA + DGI"], external_url: "https://tablesmart.atlas-studio.org" },
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
  comparatif: {
    headers: ["Solution", "Prix PME", "SYSCOHADA", "Mode offline", "IA intégrée"],
    rows: [
      { name: "Sage 100", values: ["300–800 K FCFA", "✓", "✗", "✗"] },
      { name: "Odoo", values: ["150–400 K FCFA", "Plugin", "✗", "Partiel"] },
      { name: "Zoho / QuickBooks", values: ["80–300 K FCFA", "✗", "✗", "Basique"] },
      { name: "Atlas Studio", values: ["49 000 FCFA/mois", "✓ Natif", "✓ PWA", "✓ Proph3t"], highlight: true },
    ],
  },
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
