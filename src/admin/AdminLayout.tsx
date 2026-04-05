import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Zap } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";
import { AppFilterProvider } from "./contexts/AppFilterContext";
import { ToastProvider } from "./contexts/ToastContext";
import { CommandPalette } from "./components/CommandPalette";
import { Proph3tChat } from "./components/Proph3tChat";

export function AdminLayout() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <AppFilterProvider>
      <ToastProvider>
        <div className="flex min-h-screen bg-warm-bg">
          <AdminSidebar />
          <main className="flex-1 p-8 md:p-10 overflow-y-auto">
            <Outlet />
          </main>
        </div>

        {/* Floating Proph3t button */}
        <button onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-gold text-onyx shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
          title="Parler à Proph3t">
          <Zap size={22} className="group-hover:animate-pulse" />
        </button>

        <Proph3tChat open={chatOpen} onClose={() => setChatOpen(false)} />
        <CommandPalette />
      </ToastProvider>
    </AppFilterProvider>
  );
}
