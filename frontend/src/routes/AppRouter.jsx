import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { AdminLoginPage } from '../features/admin/AdminLoginPage.jsx';
import { AdminPanelPage } from '../features/admin/AdminPanelPage.jsx';
import { adminPageRoutes } from '../features/admin/routes.jsx';
import { UsersManagementPage } from '../features/admin/pages/UsersManagementPage.jsx';
import { InvoicesPage } from '../features/admin/pages/InvoicesPage.jsx';
import { ProductsPage } from '../features/admin/pages/ProductsPage.jsx';
import { PaymentsPage } from '../features/admin/pages/PaymentsPage.jsx';
import { AdminSectionPage } from '../features/admin/pages/AdminSectionPage.jsx';
import { AdminUserListPage } from '../features/admin/pages/AdminUserListPage.jsx';
import { AdminUserDetailsPage } from '../features/admin/pages/AdminUserDetailsPage.jsx';
import { AdminSubscriptionPage } from '../features/admin/pages/AdminSubscriptionPage.jsx';
import { AdminRecordPage } from '../features/admin/pages/AdminRecordPage.jsx';
import { CategoryBusinessPage } from '../features/admin/pages/CategoryBusinessPage.jsx';
import { CategoryHospitalPage } from '../features/admin/pages/CategoryHospitalPage.jsx';
import { CategoryHotelPage } from '../features/admin/pages/CategoryHotelPage.jsx';
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

// Rendered inside <HashRouter>, so useLocation() re-runs this on every hash navigation
// (including the redirect straight after login/register), keeping `category` fresh
// without needing a full page reload.
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
      <Route path="/admin/users" element={<AdminSectionPage group="usersBusinesses" />} />
      <Route path="/admin/users/all" element={<AdminUserListPage type="all" />} />
      <Route path="/admin/users/active" element={<AdminUserListPage type="active" />} />
      <Route path="/admin/users/trial" element={<AdminUserListPage type="trial" />} />
      <Route path="/admin/users/expired" element={<AdminUserListPage type="expired" />} />
      <Route path="/admin/users/blocked" element={<AdminUserListPage type="blocked" />} />
      <Route path="/admin/users/deleted" element={<AdminUserListPage type="deleted" />} />
      <Route path="/admin/user-details/business" element={<AdminUserDetailsPage type="business" />} />
      <Route path="/admin/user-details/owner" element={<AdminUserDetailsPage type="owner" />} />
      <Route path="/admin/user-details/category" element={<AdminUserDetailsPage type="category" />} />
      <Route path="/admin/user-details/subscription" element={<AdminUserDetailsPage type="subscription" />} />
      <Route path="/admin/user-details/registration" element={<AdminUserDetailsPage type="registration" />} />
      <Route path="/admin/user-details/expiry" element={<AdminUserDetailsPage type="expiry" />} />
      <Route path="/admin/user-details/payments" element={<AdminUserDetailsPage type="payments" />} />
      <Route path="/admin/user-details/login" element={<AdminUserDetailsPage type="login" />} />
      <Route path="/admin/subscription/plans" element={<AdminSubscriptionPage type="plans" />} />
      <Route path="/admin/subscription/active" element={<AdminSubscriptionPage type="active" />} />
      <Route path="/admin/subscription/expired" element={<AdminSubscriptionPage type="expired" />} />
      <Route path="/admin/subscription/requests" element={<AdminSubscriptionPage type="requests" />} />
      <Route path="/admin/subscription/history" element={<AdminSubscriptionPage type="history" />} />
      <Route path="/admin/invoices" element={<InvoicesPage />} />
      <Route path="/admin/products" element={<AdminSectionPage group="inventory" />} />
      <Route path="/admin/payments" element={<PaymentsPage type="all" />} />
      <Route path="/admin/payments/all" element={<PaymentsPage type="all" />} />
      <Route path="/admin/payments/pending" element={<PaymentsPage type="pending" />} />
      <Route path="/admin/payments/successful" element={<PaymentsPage type="successful" />} />
      <Route path="/admin/payments/failed" element={<PaymentsPage type="failed" />} />
      <Route path="/admin/payments/reports" element={<PaymentsPage type="reports" />} />
      <Route path="/admin/notifications/renewal-reminder" element={<AdminRecordPage kind="renewalReminder" />} />
      <Route path="/admin/notifications/expiry-reminder" element={<AdminRecordPage kind="expiryReminder" />} />
      <Route path="/admin/notifications/payment-reminder" element={<AdminRecordPage kind="paymentReminder" />} />
      <Route path="/admin/notifications/send-notification" element={<AdminRecordPage kind="sendNotification" />} />
      <Route path="/admin/reports/user-report" element={<AdminRecordPage kind="userReport" />} />
      <Route path="/admin/reports/renewal-report" element={<AdminRecordPage kind="renewalReport" />} />
      <Route path="/admin/reports/expiry-report" element={<AdminRecordPage kind="expiryReport" />} />
      <Route path="/admin/reports/payment-report" element={<AdminRecordPage kind="paymentReport" />} />
      <Route path="/admin/reports/revenue-report" element={<AdminRecordPage kind="revenueReport" />} />
      <Route path="/admin/settings/subscription-plans" element={<AdminRecordPage kind="subscriptionPlans" />} />
      <Route path="/admin/settings/trial-days" element={<AdminRecordPage kind="trialDays" />} />
      <Route path="/admin/settings/grace-period" element={<AdminRecordPage kind="gracePeriod" />} />
      <Route path="/admin/settings/auto-block-after-expiry" element={<AdminRecordPage kind="autoBlockAfterExpiry" />} />
      <Route path="/admin/settings/payment-settings" element={<AdminRecordPage kind="paymentSettings" />} />
      <Route path="/admin/customers" element={<AdminSectionPage group="customers" />} />
      <Route path="/admin/accounting" element={<AdminSectionPage group="accounting" />} />
      <Route path="/admin/hr" element={<AdminSectionPage group="hr" />} />
      <Route path="/admin/inventory" element={<AdminSectionPage group="inventory" />} />
      <Route path="/admin/reports" element={<AdminSectionPage group="reports" />} />
      <Route path="/admin/category/business" element={<CategoryBusinessPage />} />
      <Route path="/admin/category/hospital" element={<CategoryHospitalPage />} />
      <Route path="/admin/category/hotel" element={<CategoryHotelPage />} />
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
    <HashRouter>
      <LegacyHashRedirect />
      <AppRoutes />
    </HashRouter>
  );
}











