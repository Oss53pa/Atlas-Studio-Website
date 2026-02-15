import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, AppWindow, Users, Repeat, Receipt, ArrowLeft, LogOut, type LucideIcon } from "lucide-react";
import { Logo } from "../components/ui/Logo";
import { useAuth } from "../lib/auth";

const nav: { to: string; icon: LucideIcon; label: string }[] = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/content", icon: FileText, label: "Contenu" },
  { to: "/admin/apps", icon: AppWindow, label: "Applications" },
  { to: "/admin/clients", icon: Users, label: "Clients" },
  { to: "/admin/subscriptions", icon: Repeat, label: "Abonnements" },
  { to: "/admin/invoices", icon: Receipt, label: "Factures" },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <div className="w-64 min-h-screen bg-onyx border-r border-white/10 p-6 flex flex-col flex-shrink-0">
      <div className="px-2 mb-8">
        <Link to="/">
          <Logo size={22} color="text-neutral-light" />
        </Link>
        <div className="text-gold text-[10px] font-bold uppercase tracking-widest mt-1.5">Administration</div>
      </div>

      <nav className="flex-1 space-y-0.5">
        {nav.map(n => {
          const isActive = n.to === "/admin"
            ? location.pathname === "/admin"
            : location.pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-white/10 text-gold"
                  : "text-neutral-400 hover:bg-white/5 hover:text-neutral-light"
              }`}
            >
              <n.icon size={16} strokeWidth={1.5} />
              <span className={`text-sm ${isActive ? "font-semibold" : "font-normal"}`}>
                {n.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 pt-4 space-y-2">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-onyx text-[12px] font-bold">
            {(profile?.full_name || "A").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-neutral-light text-[13px] font-medium truncate">{profile?.full_name || "Admin"}</div>
            <div className="text-gold text-[11px]">Admin</div>
          </div>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-500 text-[13px] hover:text-neutral-300 hover:bg-white/5 transition-all"
        >
          <ArrowLeft size={14} />
          Retour au site
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-500 text-[13px] hover:text-red-400 hover:bg-white/5 transition-all w-full"
        >
          <LogOut size={14} />
          Déconnexion
        </button>
      </div>
    </div>
  );
}
