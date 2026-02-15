import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LoginPage } from "./LoginPage";
import { Sidebar } from "./Sidebar";
import { MyAppsPage } from "./pages/MyAppsPage";
import { CatalogPage } from "./pages/CatalogPage";
import { BillingPage } from "./pages/BillingPage";
import { SettingsPage } from "./pages/SettingsPage";

function PortalDashboard() {
  const { user, profile, signOut } = useAuth();
  const [page, setPage] = useState("apps");

  const handleOpenApp = (appId: string) => {
    alert(`Redirection vers https://${appId}.atlasstudio.com\n\n(En production, l'utilisateur est redirigé avec son token JWT)`);
  };

  return (
    <div className="flex min-h-screen bg-warm-bg">
      <Sidebar page={page} setPage={setPage} profile={profile} onLogout={signOut} />
      <main className="flex-1 p-8 md:p-10 overflow-y-auto">
        {page === "apps" && <MyAppsPage userId={user?.id} onOpenApp={handleOpenApp} onNavigate={setPage} />}
        {page === "catalog" && <CatalogPage userId={user?.id} />}
        {page === "billing" && <BillingPage userId={user?.id} />}
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
