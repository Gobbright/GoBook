import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { AdminLoginPage } from '../features/admin/AdminLoginPage.jsx';
import { AdminPanelPage } from '../features/admin/AdminPanelPage.jsx';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage.jsx';
import { GoogleOnboardingPage } from '../features/auth/GoogleOnboardingPage.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage.jsx';
import { PlatformAdminPage } from '../features/platform-admin/PlatformAdminPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { getCurrentUser } from '../services/authService.js';
import {
  billingRoutes,
  eWayBillRoutes,
  GenericBillingRoute,
  InvoiceEditRoute,
  InvoiceViewRoute,
  receivablesRoute,
} from './billingRoutes.jsx';
import { automobileRoutes } from './automobileRoutes.jsx';
import { constructionRoutes } from './constructionRoutes.jsx';
import { hospitalRoutes } from './hospitalRoutes.jsx';
import { hotelRoutes } from './hotelRoutes.jsx';
import { ngoRoutes } from './ngoRoutes.jsx';
import { commonRoutes, retailRoutes } from './retailRoutes.jsx';
import { schoolRoutes } from './schoolRoutes.jsx';
import { LegacyHashRedirect, ProtectedRoute, ProtectedShell, PublicRoute } from './RouteGuards.jsx';
import { getLastRoute } from './routeStorage.js';

// useLocation() re-runs this after navigation, keeping `category` fresh without
// needing a full page reload.
function AppRoutes() {
  useLocation();
  const category = getCurrentUser()?.category || 'retail';

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminPanelPage />} />
      <Route path="/google-onboarding" element={<ProtectedRoute><GoogleOnboardingPage /></ProtectedRoute>} />
      <Route path="/verify-email" element={<ProtectedRoute><VerifyEmailPage /></ProtectedRoute>} />
      <Route path="/platform-admin" element={<ProtectedRoute><PlatformAdminPage /></ProtectedRoute>} />

      <Route element={<ProtectedShell />}>
        <Route index element={<Navigate to={getLastRoute()} replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {category === 'retail' && billingRoutes.map(({ slug, documentType, list, form }) => (
          <Route key={slug} path={`/billing/${slug}`}>
            <Route index element={list} />
            <Route path="new" element={form} />
            <Route path=":id/edit" element={<InvoiceEditRoute documentType={documentType} />} />
            <Route path=":id/view" element={<InvoiceViewRoute documentType={documentType} />} />
          </Route>
        ))}

        {category === 'retail' && (
          <>
            <Route path="/billing/e-way-bill" element={eWayBillRoutes.list} />
            <Route path="/billing/e-way-bill/new" element={eWayBillRoutes.form} />
            <Route path="/billing/e-way-bill/:id/edit" element={eWayBillRoutes.edit} />
            <Route path="/billing/e-way-bill/:id/view" element={eWayBillRoutes.view} />
            <Route path="/billing/receivables" element={receivablesRoute} />
            <Route path="/billing/:documentType" element={<GenericBillingRoute />} />
          </>
        )}

        {commonRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}

        {category === 'retail' && retailRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}

        {category === 'hospital' && hospitalRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}

        {category === 'school' && schoolRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}

        {category === 'hotel' && hotelRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}

        {category === 'construction' && constructionRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}

        {category === 'ngo' && ngoRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}

        {category === 'automobile' && automobileRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}

        <Route path="*" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <LegacyHashRedirect />
      <AppRoutes />
    </BrowserRouter>
  );
}
