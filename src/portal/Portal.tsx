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
  const { user, profile, signOut, loading } = useAuth();
  const [page, setPage] = useState("apps");

  // Double guard — never render dashboard without user AND profile
  if (!user || !profile || loading) return null;

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
      <main className="flex-1 px-4 pt-20 pb-8 sm:px-6 lg:p-10 overflow-y-auto min-w-0">
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
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-onyx">
        <div className="text-neutral-placeholder text-sm">Chargement...</div>
      </div>
    );
  }

  // Auth requirements, in order:
  //   1. Valid Supabase session (user)
  //   2. Existing profile row (blocks orphan auth.users inserts)
  //   3. Profile is active (blocks disabled/suspended accounts)
  //   4. First-login OTP completed (blocks accounts that never verified email)
  //   5. Role must be client, admin or super_admin — all three can consume apps.
  //      Admins voient leurs propres subs/licences comme un client normal.
  const role = profile?.role;
  const hasPortalAccess = role === 'client' || role === 'admin' || role === 'super_admin';
  const isVerified = profile?.first_login_completed === true;
  const isActive = profile?.is_active !== false;
  const isAuthed = Boolean(user && profile && hasPortalAccess && isActive && isVerified);

  return (
    <Routes>
      <Route path="login" element={isAuthed ? <Navigate to="/portal" replace /> : <LoginPage />} />
      <Route path="*" element={isAuthed ? <PortalDashboard /> : <Navigate to="/portal/login" replace />} />
    </Routes>
  );
}
