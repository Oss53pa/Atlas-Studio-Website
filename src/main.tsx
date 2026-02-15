import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './lib/auth';
import { Layout } from './components/layout/Layout';
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
import NotFoundPage from './pages/NotFoundPage';
import Portal from './portal/Portal';
import './index.css';

// Lazy load admin pages
const DashboardPage = lazy(() => import('./admin/pages/DashboardPage'));
const ContentManagementPage = lazy(() => import('./admin/pages/ContentManagementPage'));
const AppsManagementPage = lazy(() => import('./admin/pages/AppsManagementPage'));
const ClientsPage = lazy(() => import('./admin/pages/ClientsPage'));
const SubscriptionsPage = lazy(() => import('./admin/pages/SubscriptionsPage'));
const InvoicesPage = lazy(() => import('./admin/pages/InvoicesPage'));

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
            <Route path="/mentions-legales" element={<LegalNoticePage />} />
            <Route path="/cgu" element={<TermsPage />} />
            <Route path="/confidentialite" element={<PrivacyPage />} />
          </Route>

          {/* Portal — own layout */}
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
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
