import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";
import { AppFilterProvider } from "./contexts/AppFilterContext";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CommandPalette } from "./components/CommandPalette";
import { Proph3tChat } from "./components/Proph3tChat";
import { LockScreen } from "./components/LockScreen";
import { useRealtimeAlerts } from "./hooks/useRealtimeAlerts";
import { useIdleLock } from "./hooks/useIdleLock";
import { useAuth } from "../lib/auth";

function AdminShell() {
  const [chatOpen, setChatOpen] = useState(false);
  const { alerts, unreadCount } = useRealtimeAlerts();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { locked, unlock } = useIdleLock(!!user);

  // Show toast for realtime alerts
  useEffect(() => {
    if (alerts.length > 0) {
      const latest = alerts[0];
      toast(latest.message, latest.type === "payment" ? "success" : "info");
    }
  }, [alerts.length]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  // Admin console is ALWAYS dark — all admin-* colors assume dark bg.
  // Without the "dark" class, the 38+ files that use dark: prefixes
  // (labels, inputs, modals) become unreadable (dark text on dark bg).
  return (
    <div className="dark">
      {/* Cadre BORNÉ à la hauteur de l'écran : seul <main> scrolle.
          Avant : `min-h-screen` sans overflow cadré → tout le body grandissait
          (scrolls interminables). Maintenant la zone contenu a son propre scroll
          et la sidebar reste fixe. */}
      <div className="flex h-screen overflow-hidden bg-admin-bg">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          {/* Largeur + padding cohérents pour TOUTES les pages admin
              (remplace les max-width disparates page par page). */}
          <div className="mx-auto w-full max-w-[1400px] px-6 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <button onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-gold dark:bg-admin-accent text-onyx shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
        title="Parler à Proph3t">
        <Zap size={22} className="group-hover:animate-pulse" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Proph3tChat open={chatOpen} onClose={() => setChatOpen(false)} />
      <CommandPalette />

      {/* Idle lock screen — appears after 5 min of inactivity */}
      {locked && <LockScreen onUnlock={unlock} onSignOut={handleSignOut} />}
    </div>
  );
}

export function AdminLayout() {
  return (
    <ThemeProvider>
      <AppFilterProvider>
        <ToastProvider>
          <AdminShell />
        </ToastProvider>
      </AppFilterProvider>
    </ThemeProvider>
  );
}
