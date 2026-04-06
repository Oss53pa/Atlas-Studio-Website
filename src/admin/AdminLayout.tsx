import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Zap } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";
import { AppFilterProvider } from "./contexts/AppFilterContext";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { CommandPalette } from "./components/CommandPalette";
import { Proph3tChat } from "./components/Proph3tChat";
import { useRealtimeAlerts } from "./hooks/useRealtimeAlerts";

function AdminShell() {
  const [chatOpen, setChatOpen] = useState(false);
  const { isDark } = useTheme();
  const { alerts, unreadCount } = useRealtimeAlerts();
  const { toast } = useToast();

  // Show toast for realtime alerts
  useEffect(() => {
    if (alerts.length > 0) {
      const latest = alerts[0];
      toast(latest.message, latest.type === "payment" ? "success" : "info");
    }
  }, [alerts.length]);

  return (
    <div className={isDark ? "dark" : ""}>
      <div className={`flex min-h-screen ${isDark ? "bg-admin-bg" : "bg-warm-bg"}`}>
        <AdminSidebar />
        <main className="flex-1 p-8 md:p-10 overflow-y-auto">
          <Outlet />
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
