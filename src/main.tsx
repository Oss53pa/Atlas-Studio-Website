import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './lib/auth';
import { Layout } from './components/layout/Layout';
import { RequireAuth } from './components/guards/RequireAuth';
import { RequireAdmin } from './components/guards/RequireAdmin';
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
const AppsManagementPage = lazy(() => import('./admin/pages/AppsManagementPage'));
const ClientsPage = lazy(() => import('./admin/pages/ClientsPage'));
const SubscriptionsPage = lazy(() => import('./admin/pages/SubscriptionsPage'));
const InvoicesPage = lazy(() => import('./admin/pages/InvoicesPage'));
const ActivityLogPage = lazy(() => import('./admin/pages/ActivityLogPage'));
const TicketsPage = lazy(() => import('./admin/pages/TicketsPage'));
const NewsletterPage = lazy(() => import('./admin/pages/NewsletterPage'));
const EmailTemplatesPage = lazy(() => import('./admin/pages/EmailTemplatesPage'));
const AnalyticsPage = lazy(() => import('./admin/pages/AnalyticsPage'));
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

const container = document.getElementById('root')!;
const root = (container as any).__root ?? createRoot(container);
(container as any).__root = root;
root.render(
  <StrictMode>
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
              <Route path="apps" element={<Suspense fallback={<AdminLoader />}><AppsManagementPage /></Suspense>} />
              <Route path="clients" element={<Suspense fallback={<AdminLoader />}><ClientsPage /></Suspense>} />
              <Route path="subscriptions" element={<Suspense fallback={<AdminLoader />}><SubscriptionsPage /></Suspense>} />
              <Route path="invoices" element={<Suspense fallback={<AdminLoader />}><InvoicesPage /></Suspense>} />
              <Route path="activity" element={<Suspense fallback={<AdminLoader />}><ActivityLogPage /></Suspense>} />
              <Route path="tickets" element={<Suspense fallback={<AdminLoader />}><TicketsPage /></Suspense>} />
              <Route path="analytics" element={<Suspense fallback={<AdminLoader />}><AnalyticsPage /></Suspense>} />
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
              <Route path="landing-pages" element={<Suspense fallback={<AdminLoader />}><LandingPagesPage /></Suspense>} />
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
  </StrictMode>
);
