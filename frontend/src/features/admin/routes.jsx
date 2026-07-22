import { UsersManagementPage } from './pages/UsersManagementPage.jsx';
import { InvoicesPage } from './pages/InvoicesPage.jsx';
import { ProductsPage } from './pages/ProductsPage.jsx';
import { PaymentsPage } from './pages/PaymentsPage.jsx';
import { AdminNotificationsPage } from './pages/AdminNotificationsPage.jsx';

export const adminPageRoutes = [
  { path: '/admin/users', element: <UsersManagementPage /> },
  { path: '/admin/invoices', element: <InvoicesPage /> },
  { path: '/admin/products', element: <ProductsPage /> },
  { path: '/admin/payments', element: <PaymentsPage /> },
  { path: '/admin/notifications', element: <AdminNotificationsPage /> },
];

export const adminNavigation = {
  overview: [
    { label: 'Dashboard', key: 'dashboard', path: '/admin' },
  ],
  management: [
    { label: 'Users & Businesses', key: 'users', path: '/admin/users' },
    { label: 'Customers', key: 'customers', path: '/admin/customers' },
    { label: 'Products & Inventory', key: 'products', path: '/admin/products' },
  ],
  finance: [
    { label: 'Invoices & Billing', key: 'invoices', path: '/admin/invoices' },
    { label: 'Payments & Transactions', key: 'payments', path: '/admin/payments' },
    { label: 'Accounting', key: 'accounting', path: '/admin/accounting' },
  ],
  operations: [
    { label: 'HR & Payroll', key: 'hr', path: '/admin/hr' },
    { label: 'Inventory & Stock', key: 'inventory', path: '/admin/inventory' },
    { label: 'Reports & Analytics', key: 'reports', path: '/admin/reports' },
  ],
};
