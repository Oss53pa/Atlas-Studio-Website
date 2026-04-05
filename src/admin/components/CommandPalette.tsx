import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, LayoutDashboard, Users, Repeat, Receipt, MessageSquare,
  FileText, Mail, BarChart3, ClipboardList, CreditCard, Megaphone,
  ArrowRight, type LucideIcon,
} from "lucide-react";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  action: () => void;
  keywords?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const commands: Command[] = [
    { id: "dashboard", label: "Dashboard", description: "Vue d'ensemble", icon: LayoutDashboard, action: () => navigate("/admin"), keywords: "accueil home" },
    { id: "clients", label: "Utilisateurs", description: "Gérer les clients", icon: Users, action: () => navigate("/admin/clients"), keywords: "clients comptes users" },
    { id: "subscriptions", label: "Abonnements", description: "Gérer les abonnements", icon: Repeat, action: () => navigate("/admin/subscriptions"), keywords: "subs plans" },
    { id: "invoices", label: "Facturation", description: "Factures et paiements", icon: Receipt, action: () => navigate("/admin/invoices"), keywords: "factures paiements billing" },
    { id: "tickets", label: "Support Client", description: "Tickets et demandes", icon: MessageSquare, action: () => navigate("/admin/tickets"), keywords: "support aide help" },
    { id: "content", label: "Landing Page", description: "Contenu du site", icon: FileText, action: () => navigate("/admin/content"), keywords: "contenu cms page" },
    { id: "apps", label: "Grille Tarifaire", description: "Applications et tarifs", icon: CreditCard, action: () => navigate("/admin/apps"), keywords: "applications pricing tarifs" },
    { id: "analytics", label: "Analytics", description: "Métriques et tendances", icon: BarChart3, action: () => navigate("/admin/analytics"), keywords: "statistiques stats graphiques" },
    { id: "newsletter", label: "Newsletter", description: "Abonnés newsletter", icon: Mail, action: () => navigate("/admin/newsletter"), keywords: "email marketing" },
    { id: "emails", label: "Templates Email", description: "Modèles de notifications", icon: Megaphone, action: () => navigate("/admin/emails"), keywords: "templates notifications" },
    { id: "activity", label: "Logs & Audit", description: "Journal d'activité", icon: ClipboardList, action: () => navigate("/admin/activity"), keywords: "logs événements historique" },
    { id: "site", label: "Voir le site", description: "Ouvrir le site vitrine", icon: ArrowRight, action: () => window.open("/", "_blank") },
  ];

  const filtered = query.trim()
    ? commands.filter(c => {
        const q = query.toLowerCase();
        return c.label.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q) || (c.keywords || "").toLowerCase().includes(q);
      })
    : commands;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen(prev => !prev);
      setQuery("");
      setSelectedIndex(0);
    }
    if (e.key === "Escape" && open) {
      setOpen(false);
    }
  }, [open]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-warm-border">
          <Search size={18} className="text-neutral-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Rechercher une page, une action..."
            className="flex-1 text-neutral-text text-sm outline-none bg-transparent placeholder:text-neutral-placeholder"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 rounded bg-warm-bg border border-warm-border text-[10px] text-neutral-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-5 py-8 text-center text-neutral-muted text-sm">Aucun résultat pour "{query}"</div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => { cmd.action(); setOpen(false); }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                  i === selectedIndex ? "bg-gold/5" : "hover:bg-warm-bg"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  i === selectedIndex ? "bg-gold/10 text-gold" : "bg-warm-bg text-neutral-muted"
                }`}>
                  <cmd.icon size={16} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${i === selectedIndex ? "text-gold" : "text-neutral-text"}`}>{cmd.label}</div>
                  {cmd.description && <div className="text-[11px] text-neutral-muted truncate">{cmd.description}</div>}
                </div>
                {i === selectedIndex && <ArrowRight size={14} className="text-gold flex-shrink-0" />}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-warm-border bg-warm-bg/50 flex items-center gap-4 text-[10px] text-neutral-muted">
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-warm-border rounded font-mono">↑↓</kbd> naviguer</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-warm-border rounded font-mono">⏎</kbd> ouvrir</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-warm-border rounded font-mono">esc</kbd> fermer</span>
        </div>
      </div>
    </div>
  );
}
