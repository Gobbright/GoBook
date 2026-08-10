import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CalendarDays, Menu, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';

import { Sidebar } from './components/Sidebar.jsx';
import { NotificationCenter } from './components/NotificationCenter.jsx';
import { archiveAdminNotification, clearAdminSession, fetchAdminDashboard, fetchAdminNotifications, updateAdminNotification } from './adminService.js';
import { safeNavigate } from '../../routes/navigation.js';

const PAGE_TITLES = [
  ['/admin', 'Dashboard'],
  ['/admin/users/all', 'All Users'],
  ['/admin/users/active', 'Active Users'],
  ['/admin/users/trial', 'Trial Users'],
  ['/admin/users/expired', 'Expired Users'],
  ['/admin/users/blocked', 'Blocked Users'],
  ['/admin/users/deleted', 'Deleted Users'],
  ['/admin/users', 'User Management'],
  ['/admin/user-details/business', 'Business, Owner & Login'],
  ['/admin/user-details/owner', 'Owner & Login'],
  ['/admin/user-details/category', 'Category'],
  ['/admin/user-details/subscription', 'Subscription & Expiry'],
  ['/admin/user-details/registration', 'Registration Date'],
  ['/admin/user-details/expiry', 'Expiry Date'],
  ['/admin/user-details/payments', 'Payment History'],
  ['/admin/user-details/login', 'Login History'],
  ['/admin/user-details', 'User Details'],
  ['/admin/subscription/plans', 'Plans'],
  ['/admin/subscription/active', 'Active Subscriptions'],
  ['/admin/subscription/expired', 'Expired Subscriptions'],
  ['/admin/subscription/requests', 'Renewal Requests'],
  ['/admin/subscription/history', 'Renewal History'],
  ['/admin/subscription', 'Subscription'],
  ['/admin/payments/all', 'All Payments'],
  ['/admin/payments/pending', 'Pending Payments'],
  ['/admin/payments/successful', 'Successful Payments'],
  ['/admin/payments/failed', 'Failed Payments'],
  ['/admin/payments/reports', 'Payment Reports'],
  ['/admin/payments', 'Payments'],
  ['/admin/notifications', 'Notifications'],
  ['/admin/storage/overview', 'Storage Overview'],
  ['/admin/storage/files', 'GridFS Files'],
  ['/admin/storage/users', 'All User Storage Size'],
  ['/admin/storage/businesses', 'All User Storage Size'],
  ['/admin/storage/collections', 'Database Collections'],
  ['/admin/storage/daily-reports', 'Daily Reports'],
  ['/admin/storage', 'Storage'],
  ['/admin/reports/user-report', 'User Report'],
  ['/admin/reports/renewal-report', 'Renewal Report'],
  ['/admin/reports/expiry-report', 'Expiry Report'],
  ['/admin/reports/payment-report', 'Payment Report'],
  ['/admin/reports/revenue-report', 'Revenue Report'],
  ['/admin/reports', 'Reports'],
  ['/admin/settings/subscription-plans', 'Subscription Plans'],
  ['/admin/settings/trial-days', 'Trial Days'],
  ['/admin/settings/grace-period', 'Grace Period'],
  ['/admin/settings/auto-block-after-expiry', 'Auto Block After Expiry'],
  ['/admin/settings/payment-settings', 'Payment Settings'],
  ['/admin/settings', 'Settings'],
  ['/admin/customers', 'Customers & Vendors'],
  ['/admin/accounting', 'Accounting'],
  ['/admin/hr', 'HR & Payroll'],
  ['/admin/inventory', 'Inventory'],
  ['/admin/category/business', 'Business Category'],
  ['/admin/category/hospital', 'Hospital Category'],
  ['/admin/category/hotel', 'Hotel Category'],
  ['/admin/invoices', 'Invoices'],
  ['/admin/products', 'Products'],
];

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'expiry-alert',
    title: 'Expiry Alert',
    message: 'Review expired and near-expiry users from the admin panel.',
    read: false,
    createdAt: new Date(),
  },
  {
    id: 'system-ready',
    title: 'Admin System Ready',
    message: 'Dashboard, reports and settings data are connected.',
    read: true,
    createdAt: new Date(Date.now() - 3600000),
  },
];

function getPageTitle(pathname) {
  const cleanPath = String(pathname || '/admin').replace(/\/+$/, '') || '/admin';
  const exact = PAGE_TITLES.find(([path]) => cleanPath === path);
  if (exact) return exact[1];
  const parent = PAGE_TITLES.find(([path]) => path !== '/admin' && cleanPath.startsWith(`${path}/`));
  return parent?.[1] || 'Admin Panel';
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [navCounts, setNavCounts] = useState({ newUsers: 0, expiredUsers: 0, unreadNotifications: 0 });
  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const unreadCount = notifications.filter((item) => !item.read).length;


  async function loadAdminShellData() {
    try {
      const dashboard = await fetchAdminDashboard();
      const notificationData = await fetchAdminNotifications(dashboard);
      const nextNotifications = notificationData?.notifications || [];
      setNotifications(nextNotifications);
      setNavCounts({
        newUsers: Number(notificationData?.newUserCount ?? dashboard?.panel?.todayRegistrations ?? 0),
        expiredUsers: Number(notificationData?.expiringCount ?? dashboard?.panel?.expiredUsers ?? 0),
        unreadNotifications: Number(notificationData?.unreadCount ?? nextNotifications.filter((item) => !item.read).length),
      });
    } catch (error) {
      console.error('[AdminShellDataError]', error);
      setNotifications((current) => (current.length ? current : DEFAULT_NOTIFICATIONS));
    }
  }

  useEffect(() => {
    loadAdminShellData();

    function handleRefresh() {
      loadAdminShellData();
    }

    window.addEventListener('gobook:admin-refresh', handleRefresh);
    return () => window.removeEventListener('gobook:admin-refresh', handleRefresh);
  }, []);

  const handleLogout = () => {
    clearAdminSession();
    safeNavigate(navigate, '/admin-login');
  };

  const markNotificationRead = async (id) => {
    const current = notifications.find((item) => item.id === id);
    await updateAdminNotification(id, !current?.read);
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: !current?.read } : item)));
    setNavCounts((counts) => ({ ...counts, unreadNotifications: Math.max(0, counts.unreadNotifications + (current?.read ? 1 : -1)) }));
  };

  const deleteNotification = async (id) => {
    await archiveAdminNotification(id);
    setNotifications((current) => current.filter((item) => item.id !== id));
  };

  const refreshCurrentPage = () => {
    setRefreshing(true);
    window.dispatchEvent(new CustomEvent('gobook:admin-refresh'));
    loadAdminShellData();
    setTimeout(() => {
      window.location.reload();
    }, 120);
  };

  const refreshNotifications = () => {
    loadAdminShellData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex">
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 w-[280px] z-40">
        <Sidebar open={true} onClose={() => {}} onLogout={handleLogout} counts={navCounts} />
      </div>

      <div className="lg:hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} counts={navCounts} />
      </div>

      <div className="flex-1 lg:ml-[280px] min-w-0">
        <header className="fixed left-0 right-0 top-0 z-30 h-16 border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:left-[280px] md:px-6">
          <div className="flex h-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:hidden"
                title="Open menu"
              >
                <Menu size={18} />
              </button>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 max-sm:hidden">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0">
                <p className="m-0 text-[11px] font-black uppercase tracking-wide text-blue-600 dark:text-blue-400">Admin Panel</p>
                <h1 className="m-0 truncate text-[16px] font-extrabold text-slate-900 dark:text-slate-100 md:text-[18px]">{pageTitle}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={refreshCurrentPage}
                disabled={refreshing}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-[12px] font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                title="Refresh page"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:flex">
                <CalendarDays size={14} />
                {todayLabel()}
              </div>
              <div className="hidden items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[12px] font-bold text-blue-600 dark:bg-blue-950/30 dark:text-blue-300 md:flex">
                <UserPlus size={14} />
                {navCounts.newUsers} new
              </div>
              <div className="hidden items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 md:flex">
                <AlertTriangle size={14} />
                {navCounts.expiredUsers} expiry
              </div>
              <div className="hidden items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600 dark:bg-red-950/30 dark:text-red-300 lg:flex">
                <Bell size={14} />
                {unreadCount} unread
              </div>
              <NotificationCenter
                notifications={notifications}
                onMarkRead={markNotificationRead}
                onDelete={deleteNotification}
                onRefresh={refreshNotifications}
              />
            </div>
          </div>
        </header>

        <main className="admin-main-content min-h-screen pt-16">
          <style>{`
            [data-admin-hide] {
              display: none !important;
            }
          `}</style>
          {children}
        </main>
      </div>
    </div>
  );
}




