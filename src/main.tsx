import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './lib/auth';
import { initErrorMonitor, AtlasErrorBoundary } from './lib/error-sdk';
import { Layout } from './components/layout/Layout';
import { RequireAdmin } from './components/guards/RequireAdmin';
import { RequireSuperAdmin } from './components/guards/RequireSuperAdmin';
import { AdminLayout } from './admin/AdminLayout';
import AdminLoginPage from './admin/AdminLoginPage';
import HomePage from './pages/HomePage';
import ApplicationsPage from './pages/ApplicationsPage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import FAQPage from './pages/FAQPage';
import LegalNoticePage from './pages/LegalNoticePage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import NotFoundPage from './pages/NotFoundPage';
import Portal from './portal/Portal';
import './i18n';
import './index.css';

// Lazy load admin pages
const DashboardPage = lazy(() => import('./admin/pages/DashboardPage'));
const ContentManagementPage = lazy(() => import('./admin/pages/ContentManagementPage'));
const AdminAppsTable = lazy(() => import('./admin/pages/AdminAppsTable'));
const ClientsPage = lazy(() => import('./admin/pages/ClientsPage'));
const SubscriptionsPage = lazy(() => import('./admin/pages/SubscriptionsPage'));
const InvoicesPage = lazy(() => import('./admin/pages/InvoicesPage'));
const ActivityLogPage = lazy(() => import('./admin/pages/ActivityLogPage'));
const TicketsPage = lazy(() => import('./admin/pages/TicketsPage'));
const NewsletterPage = lazy(() => import('./admin/pages/NewsletterPage'));
const EmailTemplatesPage = lazy(() => import('./admin/pages/EmailTemplatesPage'));
const AnalyticsPage = lazy(() => import('./admin/pages/AnalyticsPage'));
const AdminStatsPage = lazy(() => import('./admin/pages/AdminStatsPage'));
const Proph3tPage = lazy(() => import('./admin/pages/Proph3tPage'));
const SystemHealthPage = lazy(() => import('./admin/pages/SystemHealthPage'));
const FeatureFlagsPage = lazy(() => import('./admin/pages/FeatureFlagsPage'));
const AlertsPage = lazy(() => import('./admin/pages/AlertsPage'));
const PromoCodesPage = lazy(() => import('./admin/pages/PromoCodesPage'));
const DeploymentsPage = lazy(() => import('./admin/pages/DeploymentsPage'));
const KnowledgeBasePage = lazy(() => import('./admin/pages/KnowledgeBasePage'));
const SettingsPage = lazy(() => import('./admin/pages/SettingsPage'));
const RolesPage = lazy(() => import('./admin/pages/RolesPage'));
const CampaignsPage = lazy(() => import('./admin/pages/CampaignsPage'));
const Proph3tMemoryPage = lazy(() => import('./admin/pages/Proph3tMemoryPage'));
const Proph3tPlansPage = lazy(() => import('./admin/pages/Proph3tPlansPage'));
const Proph3tKnowledgePage = lazy(() => import('./admin/pages/Proph3tKnowledgePage'));
const LicencesPage = lazy(() => import('./admin/pages/LicencesPage'));
const PaymentsPage = lazy(() => import('./admin/pages/PaymentsPage'));
const LandingPagesPage = lazy(() => import('./admin/pages/LandingPagesPage'));
const PlansPage = lazy(() => import('./admin/pages/PlansPage'));
const AdminsPage = lazy(() => import('./admin/pages/AdminsPage'));
const ErrorMonitorIndexPage = lazy(() => import('./admin/pages/error-monitor/ErrorMonitorIndexPage'));
const ErrorMonitorAppPage = lazy(() => import('./admin/pages/error-monitor/ErrorMonitorAppPage'));
const ErrorMonitorDetailPage = lazy(() => import('./admin/pages/error-monitor/ErrorMonitorDetailPage'));
const AsvcHubPage = lazy(() => import('./admin/pages/asvc/AsvcHubPage'));
const AsvcArbitrationsPage = lazy(() => import('./admin/pages/asvc/AsvcArbitrationsPage'));
const AsvcAgentsPage = lazy(() => import('./admin/pages/asvc/AsvcAgentsPage'));
const AsvcActionsLogPage = lazy(() => import('./admin/pages/asvc/AsvcActionsLogPage'));
const AsvcKillSwitchPage = lazy(() => import('./admin/pages/asvc/AsvcKillSwitchPage'));
const AsvcConfigPage = lazy(() => import('./admin/pages/asvc/AsvcConfigPage'));
const AsvcTicketsPage = lazy(() => import('./admin/pages/asvc/AsvcTicketsPage'));
const AsvcCustomersPage = lazy(() => import('./admin/pages/asvc/AsvcCustomersPage'));
const AsvcContentPage = lazy(() => import('./admin/pages/asvc/AsvcContentPage'));
const AsvcLeadsPage = lazy(() => import('./admin/pages/asvc/AsvcLeadsPage'));
const AsvcFinancePage = lazy(() => import('./admin/pages/asvc/AsvcFinancePage'));
const InvitePage = lazy(() => import('./pages/InvitePage'));
const AdminAccessPage = lazy(() => import('./pages/AdminAccessPage'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AdminLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-neutral-muted text-sm">Chargement...</div>
    </div>
  );
}

const ATLAS_APP_ID = 'atlas-studio';

// Silently swallow AbortError unhandled rejections.
// These happen when a fetch (often from supabase-js) is cancelled because
// the user navigated away mid-request — it's expected, not a real error.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const isAbort =
      (reason instanceof DOMException && reason.name === 'AbortError') ||
      (reason && typeof reason === 'object' &&
        ((reason as { name?: string }).name === 'AbortError' ||
          String((reason as { message?: string }).message || '').includes('signal is aborted')));
    if (isAbort) {
      event.preventDefault();
    }
  });
}

initErrorMonitor(ATLAS_APP_ID);

// ── Service Worker auto-update ─────────────────────────────────────────
// IMPORTANT: l'ancien code (updateSW(true).then(reload)) creait une BOUCLE
// INFINIE de mises a jour combine a skipWaiting+clientsClaim. Versions
// 2807 -> 3442 observees en moins d'1h sur atlas-studio.org.
//
// Nouveau flow (sans boucle):
// - registerType: 'prompt' (vite.config) -> on detecte la nouvelle version
//   sans l'activer automatiquement.
// - On stocke un flag dans sessionStorage pour empecher de retrigger un
//   updateSW() apres un reload (au cas ou la detection se repeterait).
// - On marque l'usage de updateSW manuel: l'utilisateur recupere la nouvelle
//   version au prochain hard-refresh ou a la prochaine session.
if (import.meta.env.PROD) {
  const ALREADY_UPDATED_KEY = 'atlas_sw_updated_at';
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: false,
      onNeedRefresh() {
        // Anti-loop: si on a deja applique un update il y a moins de 5 min,
        // on ne re-déclenche pas (sinon = boucle infinie de reload).
        const last = Number(sessionStorage.getItem(ALREADY_UPDATED_KEY) || 0);
        if (Date.now() - last < 5 * 60 * 1000) {
          console.info('[atlas-sw] Nouvelle version detectee mais cooldown actif (anti-loop).');
          return;
        }
        sessionStorage.setItem(ALREADY_UPDATED_KEY, String(Date.now()));
        console.info('[atlas-sw] Nouvelle version disponible — auto-reload dans 2s...');
        // Auto-reload pour eviter que l'utilisateur reste bloque sur l'ancien
        // bundle (sinon il doit faire Ctrl+Shift+R manuellement et son auth
        // ne marche plus avec les vieilles cles cachees).
        // updateSW(true) = skipWaiting + reload automatique.
        setTimeout(() => {
          updateSW(true).catch((err) => {
            console.warn('[atlas-sw] updateSW failed, fallback reload:', err);
            window.location.reload();
          });
        }, 2000);
      },
      onRegisteredSW(_swUrl, registration) {
        // Check des updates toutes les 30min (plus reactif sans risque de loop
        // grace au sessionStorage cooldown).
        if (registration) {
          setInterval(() => {
            registration.update().catch(() => { /* ignore */ });
          }, 30 * 60 * 1000);
        }
      },
    });
  }).catch(() => { /* SW registration is non-critical */ });
}

const container = document.getElementById('root')!;
const root = (container as any).__root ?? createRoot(container);
(container as any).__root = root;
root.render(
  <StrictMode>
    <AtlasErrorBoundary appId={ATLAS_APP_ID}>
    <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Site vitrine — wrapped in Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/applications/:id" element={<ApplicationDetailPage />} />
            <Route path="/tarifs" element={<PricingPage />} />
            <Route path="/a-propos" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/mentions-legales" element={<LegalNoticePage />} />
            <Route path="/cgu" element={<TermsPage />} />
            <Route path="/confidentialite" element={<PrivacyPage />} />
          </Route>

          {/* Portal — login public, rest protected */}
          <Route path="/portal/*" element={<Portal />} />

          {/* Admin */}
          <Route path="/admin">
            {/* Login — no auth required */}
            <Route path="login" element={<AdminLoginPage />} />

            {/* Protected pages */}
            <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<Suspense fallback={<AdminLoader />}><DashboardPage /></Suspense>} />
              <Route path="content" element={<Suspense fallback={<AdminLoader />}><ContentManagementPage /></Suspense>} />
              <Route path="apps" element={<Suspense fallback={<AdminLoader />}><AdminAppsTable /></Suspense>} />
              <Route path="clients" element={<Suspense fallback={<AdminLoader />}><ClientsPage /></Suspense>} />
              <Route path="subscriptions" element={<Suspense fallback={<AdminLoader />}><SubscriptionsPage /></Suspense>} />
              <Route path="invoices" element={<Suspense fallback={<AdminLoader />}><InvoicesPage /></Suspense>} />
              <Route path="activity" element={<Suspense fallback={<AdminLoader />}><ActivityLogPage /></Suspense>} />
              <Route path="tickets" element={<Suspense fallback={<AdminLoader />}><TicketsPage /></Suspense>} />
              <Route path="analytics" element={<Suspense fallback={<AdminLoader />}><AnalyticsPage /></Suspense>} />
              <Route path="stats" element={<Suspense fallback={<AdminLoader />}><AdminStatsPage /></Suspense>} />
              <Route path="newsletter" element={<Suspense fallback={<AdminLoader />}><NewsletterPage /></Suspense>} />
              <Route path="emails" element={<Suspense fallback={<AdminLoader />}><EmailTemplatesPage /></Suspense>} />
              <Route path="proph3t" element={<Suspense fallback={<AdminLoader />}><Proph3tPage /></Suspense>} />
              <Route path="system" element={<Suspense fallback={<AdminLoader />}><SystemHealthPage /></Suspense>} />
              <Route path="feature-flags" element={<Suspense fallback={<AdminLoader />}><FeatureFlagsPage /></Suspense>} />
              <Route path="alerts" element={<Suspense fallback={<AdminLoader />}><AlertsPage /></Suspense>} />
              <Route path="promo-codes" element={<Suspense fallback={<AdminLoader />}><PromoCodesPage /></Suspense>} />
              <Route path="deployments" element={<Suspense fallback={<AdminLoader />}><DeploymentsPage /></Suspense>} />
              <Route path="knowledge-base" element={<Suspense fallback={<AdminLoader />}><KnowledgeBasePage /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<AdminLoader />}><SettingsPage /></Suspense>} />
              <Route path="roles" element={<Suspense fallback={<AdminLoader />}><RolesPage /></Suspense>} />
              <Route path="campaigns" element={<Suspense fallback={<AdminLoader />}><CampaignsPage /></Suspense>} />
              <Route path="proph3t-memory" element={<Suspense fallback={<AdminLoader />}><Proph3tMemoryPage /></Suspense>} />
              <Route path="proph3t-plans" element={<Suspense fallback={<AdminLoader />}><Proph3tPlansPage /></Suspense>} />
              <Route path="proph3t-knowledge" element={<Suspense fallback={<AdminLoader />}><Proph3tKnowledgePage /></Suspense>} />
              <Route path="licences" element={<Suspense fallback={<AdminLoader />}><LicencesPage /></Suspense>} />
              <Route path="payments" element={<Suspense fallback={<AdminLoader />}><PaymentsPage /></Suspense>} />
              <Route path="plans" element={<Suspense fallback={<AdminLoader />}><PlansPage /></Suspense>} />
              <Route path="admins" element={<RequireSuperAdmin><Suspense fallback={<AdminLoader />}><AdminsPage /></Suspense></RequireSuperAdmin>} />
              <Route path="landing-pages" element={<Suspense fallback={<AdminLoader />}><LandingPagesPage /></Suspense>} />
              <Route path="error-monitor" element={<Suspense fallback={<AdminLoader />}><ErrorMonitorIndexPage /></Suspense>} />
              <Route path="error-monitor/:appSlug" element={<Suspense fallback={<AdminLoader />}><ErrorMonitorAppPage /></Suspense>} />
              <Route path="error-monitor/:appSlug/:errorId" element={<Suspense fallback={<AdminLoader />}><ErrorMonitorDetailPage /></Suspense>} />
              <Route path="asvc" element={<Suspense fallback={<AdminLoader />}><AsvcHubPage /></Suspense>} />
              <Route path="asvc/arbitrations" element={<Suspense fallback={<AdminLoader />}><AsvcArbitrationsPage /></Suspense>} />
              <Route path="asvc/agents" element={<Suspense fallback={<AdminLoader />}><AsvcAgentsPage /></Suspense>} />
              <Route path="asvc/actions" element={<Suspense fallback={<AdminLoader />}><AsvcActionsLogPage /></Suspense>} />
              <Route path="asvc/kill-switch" element={<Suspense fallback={<AdminLoader />}><AsvcKillSwitchPage /></Suspense>} />
              <Route path="asvc/config" element={<Suspense fallback={<AdminLoader />}><AsvcConfigPage /></Suspense>} />
              <Route path="asvc/tickets" element={<Suspense fallback={<AdminLoader />}><AsvcTicketsPage /></Suspense>} />
              <Route path="asvc/customers" element={<Suspense fallback={<AdminLoader />}><AsvcCustomersPage /></Suspense>} />
              <Route path="asvc/content" element={<Suspense fallback={<AdminLoader />}><AsvcContentPage /></Suspense>} />
              <Route path="asvc/leads" element={<Suspense fallback={<AdminLoader />}><AsvcLeadsPage /></Suspense>} />
              <Route path="asvc/finance" element={<Suspense fallback={<AdminLoader />}><AsvcFinancePage /></Suspense>} />
            </Route>
          </Route>

          {/* Public pages — invitation & admin access */}
          <Route path="/invite/:token" element={<Suspense fallback={<div />}><InvitePage /></Suspense>} />
          <Route path="/admin-access/:token" element={<Suspense fallback={<div />}><AdminAccessPage /></Suspense>} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </HelmetProvider>
    </AtlasErrorBoundary>
  </StrictMode>
);
