import { lazy, Suspense, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import LoginPage from "./auth/LoginPage";
import SignupPage from "./auth/SignupPage";
import ForgotPasswordPage from "./auth/ForgotPasswordPage";
import ResetPasswordPage from "./auth/ResetPasswordPage";
import { Sidebar } from "./Sidebar";
import { MyAppsPage } from "./pages/MyAppsPage";
import { CatalogPage } from "./pages/CatalogPage";
import { BillingPage } from "./pages/BillingPage";
import { SupportPage } from "./pages/SupportPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TeamPage } from "./pages/TeamPage";
import { ActivatePage } from "./pages/ActivatePage";
import { SubscriptionPage } from "./pages/SubscriptionPage";
import { SeatsCostsPage } from "./pages/SeatsCostsPage";
import { UpgradePage } from "./pages/UpgradePage";
import { Proph3tPortalPage } from "./pages/Proph3tPortalPage";

const WelcomePage = lazy(() => import("./pages/WelcomePage"));
const LaunchPage = lazy(() => import("./pages/LaunchPage"));

function PortalDashboard() {
  const { user, profile, signOut, loading } = useAuth();
  const location = useLocation();
  const [page, setPage] = useState(
    new URLSearchParams(location.search).get("bundle") ? "catalog" : "apps",
  );

  // Double guard — never render dashboard without user AND profile
  if (!user || !profile || loading) return null;

  const handleOpenApp = (appId: string) => {
    // Ouverture SYNCHRONE dans un nouvel onglet pour preserver le user gesture
    // (window.open apres await = bloque par popup blocker du navigateur).
    // /portal/launch genere ensuite le JWT via app-token et redirige.
    window.open(`/portal/launch?appId=${encodeURIComponent(appId)}`, "_blank");
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
        {page === "seats-costs" && <SeatsCostsPage userId={user?.id} />}
        {page === "activate" && <ActivatePage userId={user?.id} />}
        {page === "subscription" && <SubscriptionPage userId={user?.id} />}
        {page === "upgrade" && <UpgradePage userId={user?.id} />}
        {page === "proph3t" && <Proph3tPortalPage userId={user?.id} />}
        {page === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}

/**
 * Pages publiques accessibles sans auth (login, signup, forgot, reset).
 * Si l'utilisateur est déjà authentifié, on le redirige vers /portal sauf
 * pour /reset-password qui nécessite la session de recovery active.
 */
const PUBLIC_AUTH_PATHS = new Set([
  "/portal/login",
  "/portal/signup",
  "/portal/forgot-password",
  "/portal/reset-password",
]);

export default function Portal() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-onyx">
        <div className="text-neutral-placeholder text-sm">Chargement...</div>
      </div>
    );
  }

  // Critères d'accès au portail :
  //   1. Session Supabase valide (user)
  //   2. Profil existant
  //   3. Profil actif (non suspendu)
  //   4. Rôle compatible : client, admin ou super_admin
  // Note : on a supprimé l'exigence first_login_completed (OTP) — flow Supabase standard.
  const role = profile?.role;
  const hasPortalAccess = role === "client" || role === "admin" || role === "super_admin";
  const isActive = profile?.is_active !== false;
  const isAuthed = Boolean(user && profile && hasPortalAccess && isActive);

  const isPublicAuth = PUBLIC_AUTH_PATHS.has(location.pathname);

  return (
    <Routes>
      {/* Pages auth publiques — si déjà connecté, redirection vers /portal
          (sauf /reset-password qui peut être visité avec une session recovery) */}
      <Route
        path="login"
        element={isAuthed ? <Navigate to="/portal" replace /> : <LoginPage />}
      />
      <Route
        path="signup"
        element={isAuthed ? <Navigate to="/portal" replace /> : <SignupPage />}
      />
      <Route
        path="forgot-password"
        element={isAuthed ? <Navigate to="/portal" replace /> : <ForgotPasswordPage />}
      />
      <Route path="reset-password" element={<ResetPasswordPage />} />

      {/* Routes protégées spéciales (lazy) */}
      <Route
        path="welcome"
        element={
          isAuthed ? (
            <Suspense fallback={<div className="min-h-screen bg-onyx" />}>
              <WelcomePage />
            </Suspense>
          ) : (
            <Navigate to="/portal/login?next=/portal/welcome" replace />
          )
        }
      />
      <Route
        path="launch"
        element={
          isAuthed ? (
            <Suspense fallback={<div className="min-h-screen bg-onyx" />}>
              <LaunchPage />
            </Suspense>
          ) : (
            <Navigate to="/portal/login?next=/portal/launch" replace />
          )
        }
      />

      {/* Toutes les autres routes du portail : auth requise */}
      <Route
        path="*"
        element={
          isAuthed ? (
            <PortalDashboard />
          ) : isPublicAuth ? null : (
            <Navigate to={`/portal/login?next=${encodeURIComponent(location.pathname)}`} replace />
          )
        }
      />
    </Routes>
  );
}
