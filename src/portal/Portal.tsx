import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiCall } from "../lib/api";
import { LoginPage } from "./LoginPage";
import { Sidebar } from "./Sidebar";
import { MyAppsPage } from "./pages/MyAppsPage";
import { CatalogPage } from "./pages/CatalogPage";
import { BillingPage } from "./pages/BillingPage";
import { SupportPage } from "./pages/SupportPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TeamPage } from "./pages/TeamPage";
import { ActivatePage } from "./pages/ActivatePage";
import { SubscriptionPage } from "./pages/SubscriptionPage";
import { UpgradePage } from "./pages/UpgradePage";

function PortalDashboard() {
  const { user, profile, signOut } = useAuth();
  const [page, setPage] = useState("apps");

  const handleOpenApp = async (appId: string) => {
    try {
      const { redirectUrl } = await apiCall<{ token: string; redirectUrl: string }>("app-token", {
        method: "POST",
        body: { appId },
      });
      window.open(redirectUrl, "_blank");
    } catch (err: any) {
      alert(err.message || "Impossible d'ouvrir l'application");
    }
  };

  return (
    <div className="flex min-h-screen bg-warm-bg">
      <Sidebar page={page} setPage={setPage} profile={profile} onLogout={signOut} />
      <main className="flex-1 p-8 md:p-10 overflow-y-auto">
        {page === "apps" && <MyAppsPage userId={user?.id} onOpenApp={handleOpenApp} onNavigate={setPage} />}
        {page === "catalog" && <CatalogPage userId={user?.id} />}
        {page === "billing" && <BillingPage userId={user?.id} />}
        {page === "support" && <SupportPage userId={user?.id} />}
        {page === "team" && <TeamPage userId={user?.id} />}
        {page === "activate" && <ActivatePage userId={user?.id} />}
        {page === "subscription" && <SubscriptionPage userId={user?.id} />}
        {page === "upgrade" && <UpgradePage userId={user?.id} />}
        {page === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}

export default function Portal() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-onyx">
        <div className="text-neutral-placeholder text-sm">Chargement...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="login" element={user ? <Navigate to="/portal" replace /> : <LoginPage />} />
      <Route path="*" element={user ? <PortalDashboard /> : <Navigate to="/portal/login" replace />} />
    </Routes>
  );
}
