// Résolution des icônes d'app (champ `apps.icon`, ex : "calculator") vers un
// composant lucide. Partagé (constellation, détail app…).
import {
  Receipt, Wallet, Users, Package, Calculator,
  LayoutDashboard, UserCheck, Megaphone, BarChart3,
  Wrench, Home, Hammer, Building2, FileCheck,
  FolderOpen, Banknote, CreditCard, ArrowLeftRight,
  FileText, Search, Gauge, UtensilsCrossed,
  GaugeCircle, KanbanSquare, Scale, Compass, HandCoins,
  Landmark, Briefcase, Building, ShieldCheck, LineChart,
  type LucideIcon,
} from "lucide-react";

export const APP_ICON_MAP: Record<string, LucideIcon> = {
  receipt: Receipt,
  wallet: Wallet,
  users: Users,
  package: Package,
  calculator: Calculator,
  "layout-dashboard": LayoutDashboard,
  "user-check": UserCheck,
  megaphone: Megaphone,
  "bar-chart-3": BarChart3,
  wrench: Wrench,
  home: Home,
  hammer: Hammer,
  "building-2": Building2,
  building: Building,
  "file-check": FileCheck,
  "folder-open": FolderOpen,
  banknote: Banknote,
  "credit-card": CreditCard,
  "arrow-left-right": ArrowLeftRight,
  "file-text": FileText,
  search: Search,
  gauge: Gauge,
  "gauge-circle": GaugeCircle,
  kanban: KanbanSquare,
  scale: Scale,
  compass: Compass,
  "hand-coins": HandCoins,
  landmark: Landmark,
  briefcase: Briefcase,
  "shield-check": ShieldCheck,
  "line-chart": LineChart,
  utensils: UtensilsCrossed,
};

export function appIcon(name?: string | null): LucideIcon {
  return (name && APP_ICON_MAP[name]) || Package;
}
