import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import '../features/employee-management/employeeManagement.css';

import { AdminLoginPage } from '../features/admin/AdminLoginPage.jsx';
import { AdminPanelPage } from '../features/admin/AdminPanelPage.jsx';
import { UsersManagementPage } from '../features/admin/pages/UsersManagementPage.jsx';
import { InvoicesPage } from '../features/admin/pages/InvoicesPage.jsx';
import { PaymentsPage } from '../features/admin/pages/PaymentsPage.jsx';
import { AdminNotificationsPage } from '../features/admin/pages/AdminNotificationsPage.jsx';
import { AdminStoragePage } from '../features/admin/pages/AdminStoragePage.jsx';
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
import { EmployeeLoginRoute, EmployeePortalRoutes } from '../features/employee-management/EmployeePortalRoutes.jsx';
import EmployeeAdminDashboard from '../features/employee-management/pages/admin/Dashboard.jsx';
import EmployeeList from '../features/employee-management/pages/admin/employees/EmployeeList.jsx';
import AddEmployee from '../features/employee-management/pages/admin/employees/AddEmployee.jsx';
import TodayAttendance from '../features/employee-management/pages/admin/attendance/TodayAttendance.jsx';
import LeaveRequests from '../features/employee-management/pages/admin/leave/LeaveRequests.jsx';
import Salary from '../features/employee-management/pages/admin/payroll/Salary.jsx';
import AllNotices from '../features/employee-management/pages/admin/notices/AllNotices.jsx';
import AdminMonthlyAttendance from '../features/employee-management/pages/admin/attendance/MonthlyAttendance.jsx';
import CorrectionRequests from '../features/employee-management/pages/admin/attendance/CorrectionRequests.jsx';
import LeaveBalance from '../features/employee-management/pages/admin/leave/LeaveBalance.jsx';
import LeaveTypes from '../features/employee-management/pages/admin/leave/LeaveTypes.jsx';
import AdminPayslips from '../features/employee-management/pages/admin/payroll/Payslips.jsx';
import AddNotice from '../features/employee-management/pages/admin/notices/AddNotice.jsx';
import HolidayList from '../features/employee-management/pages/admin/holidays/HolidayList.jsx';
import AddHoliday from '../features/employee-management/pages/admin/holidays/AddHoliday.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { isAuthenticated, refreshCurrentUser } from '../services/authService.js';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import {
  billingRoutes,
  eWayBillRoutes,
  GenericBillingRoute,
  InvoiceEditRoute,
  InvoiceViewRoute,
  pharmacyBillRoutes,
  receivablesRoute,
} from './billingRoutes.jsx';
import { automobileRoutes } from './automobileRoutes.jsx';
import { constructionRoutes } from './constructionRoutes.jsx';
import { financeRoutes } from '../features/categories/finance/routes.jsx';
import { hospitalRoutes } from './hospitalRoutes.jsx';
import { hotelRoutes } from './hotelRoutes.jsx';
import { ngoRoutes } from './ngoRoutes.jsx';
import { commonRoutes, retailRoutes } from './retailRoutes.jsx';
import { schoolRoutes } from './schoolRoutes.jsx';
import { AdminProtectedRoute, AdminPublicRoute, GlobalErrorReporter, LegacyHashRedirect, ProtectedRoute, ProtectedShell, PublicRoute } from './RouteGuards.jsx';
import { getLastRoute } from './routeStorage.js';

// Rendered inside <BrowserRouter>, so useLocation() re-runs this on clean URL navigation,
// keeping category-specific route branches fresh without needing a full page reload.
function AppRoutes() {
  useLocation();
  const currentUser = useCurrentUser();

  useEffect(() => {
    if (isAuthenticated()) refreshCurrentUser().catch(() => {});
  }, []);

  const category = currentUser?.category || 'other';
  const adminRoute = (element) => <AdminProtectedRoute>{element}</AdminProtectedRoute>;
  const adminRedirect = (to) => adminRoute(<Navigate to={to} replace />);
  const employeeManagementPage = (element) => <div className="employee-management">{element}</div>;

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/employee-login" element={<EmployeeLoginRoute />} />
      <Route path="/employee/*" element={<EmployeePortalRoutes />} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/admin-login" element={<AdminPublicRoute><AdminLoginPage /></AdminPublicRoute>} />
      <Route path="/admin" element={adminRoute(<AdminPanelPage />)} />
      <Route path="/admin/users" element={adminRoute(<AdminSectionPage group="usersBusinesses" />)} />
      <Route path="/admin/users/all" element={adminRoute(<AdminUserListPage type="all" />)} />
      <Route path="/admin/users/active" element={adminRoute(<AdminUserListPage type="active" />)} />
      <Route path="/admin/users/trial" element={adminRoute(<AdminUserListPage type="trial" />)} />
      <Route path="/admin/users/expired" element={adminRoute(<AdminUserListPage type="expired" />)} />
      <Route path="/admin/users/blocked" element={adminRoute(<AdminUserListPage type="blocked" />)} />
      <Route path="/admin/users/deleted" element={adminRoute(<AdminUserListPage type="deleted" />)} />
      <Route path="/admin/user-details" element={adminRedirect('/admin/user-details/business')} />
      <Route path="/admin/user-details/business" element={adminRoute(<AdminUserDetailsPage type="business" />)} />
      <Route path="/admin/user-details/owner" element={adminRoute(<AdminUserDetailsPage type="owner" />)} />
      <Route path="/admin/user-details/category" element={adminRedirect('/admin/user-details/business')} />
      <Route path="/admin/user-details/subscription" element={adminRoute(<AdminUserDetailsPage type="subscription" />)} />
      <Route path="/admin/user-details/registration" element={adminRedirect('/admin/user-details/business')} />
      <Route path="/admin/user-details/expiry" element={adminRedirect('/admin/user-details/subscription')} />
      <Route path="/admin/user-details/payments" element={adminRoute(<AdminUserDetailsPage type="payments" />)} />
      <Route path="/admin/user-details/login" element={adminRedirect('/admin/user-details/owner')} />
      <Route path="/admin/subscription/plans" element={adminRoute(<AdminSubscriptionPage type="plans" />)} />
      <Route path="/admin/subscription/active" element={adminRoute(<AdminSubscriptionPage type="active" />)} />
      <Route path="/admin/subscription/expired" element={adminRoute(<AdminSubscriptionPage type="expired" />)} />
      <Route path="/admin/subscription/requests" element={adminRoute(<AdminSubscriptionPage type="requests" />)} />
      <Route path="/admin/subscription/history" element={adminRoute(<AdminSubscriptionPage type="history" />)} />
      <Route path="/admin/invoices" element={adminRoute(<InvoicesPage />)} />
      <Route path="/admin/products" element={adminRoute(<AdminSectionPage group="inventory" />)} />
      <Route path="/admin/payments" element={adminRoute(<PaymentsPage type="all" />)} />
      <Route path="/admin/payments/all" element={adminRoute(<PaymentsPage type="all" />)} />
      <Route path="/admin/payments/pending" element={adminRoute(<PaymentsPage type="pending" />)} />
      <Route path="/admin/payments/successful" element={adminRoute(<PaymentsPage type="successful" />)} />
      <Route path="/admin/payments/failed" element={adminRoute(<PaymentsPage type="failed" />)} />
      <Route path="/admin/payments/reports" element={adminRoute(<PaymentsPage type="reports" />)} />
      <Route path="/admin/notifications" element={adminRoute(<AdminNotificationsPage />)} />
      <Route path="/admin/notifications/*" element={adminRedirect('/admin/notifications')} />
      <Route path="/admin/storage" element={adminRedirect('/admin/storage/overview')} />
      <Route path="/admin/storage/overview" element={adminRoute(<AdminStoragePage type="overview" />)} />
      <Route path="/admin/storage/files" element={adminRoute(<AdminStoragePage type="files" />)} />
      <Route path="/admin/storage/users" element={adminRoute(<AdminStoragePage type="businesses" />)} />
      <Route path="/admin/storage/businesses" element={adminRedirect('/admin/storage/users')} />
      <Route path="/admin/storage/collections" element={adminRoute(<AdminStoragePage type="collections" />)} />
      <Route path="/admin/storage/daily-reports" element={adminRoute(<AdminStoragePage type="daily-reports" />)} />
      <Route path="/admin/reports/user-report" element={adminRoute(<AdminRecordPage kind="userReport" />)} />
      <Route path="/admin/reports/renewal-report" element={adminRoute(<AdminRecordPage kind="renewalReport" />)} />
      <Route path="/admin/reports/expiry-report" element={adminRoute(<AdminRecordPage kind="expiryReport" />)} />
      <Route path="/admin/reports/payment-report" element={adminRoute(<AdminRecordPage kind="paymentReport" />)} />
      <Route path="/admin/reports/revenue-report" element={adminRoute(<AdminRecordPage kind="revenueReport" />)} />
      <Route path="/admin/settings/subscription-plans" element={adminRoute(<AdminRecordPage kind="subscriptionPlans" />)} />
      <Route path="/admin/settings/trial-days" element={adminRoute(<AdminRecordPage kind="trialDays" />)} />
      <Route path="/admin/settings/grace-period" element={adminRoute(<AdminRecordPage kind="gracePeriod" />)} />
      <Route path="/admin/settings/auto-block-after-expiry" element={adminRoute(<AdminRecordPage kind="autoBlockAfterExpiry" />)} />
      <Route path="/admin/settings/payment-settings" element={adminRoute(<AdminRecordPage kind="paymentSettings" />)} />
      <Route path="/admin/customers" element={adminRoute(<AdminSectionPage group="customers" />)} />
      <Route path="/admin/accounting" element={adminRoute(<AdminSectionPage group="accounting" />)} />
      <Route path="/admin/hr" element={adminRoute(<AdminSectionPage group="hr" />)} />
      <Route path="/admin/inventory" element={adminRoute(<AdminSectionPage group="inventory" />)} />
      <Route path="/admin/reports" element={adminRoute(<AdminSectionPage group="reports" />)} />
      <Route path="/admin/category/business" element={adminRoute(<CategoryBusinessPage />)} />
      <Route path="/admin/category/hospital" element={adminRoute(<CategoryHospitalPage />)} />
      <Route path="/admin/category/hotel" element={adminRoute(<CategoryHotelPage />)} />
      <Route path="/admin/subscription" element={adminRedirect('/admin/subscription/plans')} />
      <Route path="/admin/settings" element={adminRedirect('/admin/settings/subscription-plans')} />
      <Route path="/admin/*" element={adminRedirect('/admin')} />
      <Route path="/google-onboarding" element={<ProtectedRoute><GoogleOnboardingPage /></ProtectedRoute>} />
      <Route path="/verify-email" element={<ProtectedRoute><VerifyEmailPage /></ProtectedRoute>} />
      <Route path="/platform-admin" element={<ProtectedRoute><PlatformAdminPage /></ProtectedRoute>} />

      <Route element={<ProtectedShell />}>
        <Route index element={<Navigate to={getLastRoute()} replace />} />
        <Route path="/dashboard" element={category === 'finance' ? <Navigate to="/finance/dashboard" replace /> : <DashboardPage />} />

        <Route path="/employee-management/dashboard" element={employeeManagementPage(<EmployeeAdminDashboard />)} />
        <Route path="/employee-management/employees" element={employeeManagementPage(<EmployeeList />)} />
        <Route path="/employee-management/employees/add" element={employeeManagementPage(<AddEmployee />)} />
        <Route path="/employee-management/attendance" element={employeeManagementPage(<TodayAttendance />)} />
        <Route path="/employee-management/leave" element={employeeManagementPage(<LeaveRequests />)} />
        <Route path="/employee-management/payroll" element={employeeManagementPage(<Salary />)} />
        <Route path="/employee-management/notices" element={employeeManagementPage(<AllNotices />)} />
        <Route path="/employee-management/reports" element={<Navigate to="/employee-management/dashboard" replace />} />
        <Route path="/employee-management/settings" element={<Navigate to="/employee-management/dashboard" replace />} />
        <Route path="/employee-management/attendance/monthly" element={employeeManagementPage(<AdminMonthlyAttendance />)} />
        <Route path="/employee-management/attendance/corrections" element={employeeManagementPage(<CorrectionRequests />)} />
        <Route path="/employee-management/leave/balance" element={employeeManagementPage(<LeaveBalance />)} />
        <Route path="/employee-management/leave/types" element={employeeManagementPage(<LeaveTypes />)} />
        <Route path="/employee-management/payroll/payslips" element={employeeManagementPage(<AdminPayslips />)} />
        <Route path="/employee-management/notices/add" element={employeeManagementPage(<AddNotice />)} />
        <Route path="/employee-management/holidays" element={employeeManagementPage(<HolidayList />)} />
        <Route path="/employee-management/holidays/add" element={employeeManagementPage(<AddHoliday />)} />

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

        {category === 'hospital' && (
          <Route path="/billing/pharmacy-bill">
            <Route index element={pharmacyBillRoutes.list} />
            <Route path="new" element={pharmacyBillRoutes.form} />
            <Route path=":id/edit" element={pharmacyBillRoutes.edit} />
            <Route path=":id/view" element={pharmacyBillRoutes.view} />
          </Route>
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

        {category === 'finance' && financeRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}

        <Route path="*" element={category === 'finance' ? <Navigate to="/finance/dashboard" replace /> : <DashboardPage />} />
      </Route>
    </Routes>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <GlobalErrorReporter />
      <LegacyHashRedirect />
      <AppRoutes />
    </BrowserRouter>
  );
}
