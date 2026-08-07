import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { safeNavigate } from '../../../routes/navigation.js';
import { LogOut, BarChart3, Building2, CreditCard, ChevronDown, Bell, Settings, HardDrive } from 'lucide-react';

const MENU_SECTIONS = [
  { title: 'Overview', items: [{ label: 'Dashboard', icon: BarChart3, path: '/admin' }] },
  {
    title: 'Management',
    items: [
      { label: 'Users & Businesses', icon: Building2, path: '/admin/users' },
      { label: 'Subscription', icon: CreditCard, path: '/admin/subscription/plans' },
    ],
  },
  { title: 'Finance', items: [{ label: 'Payments', icon: CreditCard, path: '/admin/payments/all' }] },
  {
    title: 'Admin Tools',
    items: [
      { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
      { label: 'Reports', icon: BarChart3, path: '/admin/reports/user-report' },
      { label: 'Settings', icon: Settings, path: '/admin/settings/subscription-plans' },
    ],
  },
  {
    title: 'Storage Management',
    items: [
      { label: 'Storage', icon: HardDrive, path: '/admin/storage/overview' },
    ],
  },
];

const USER_MANAGEMENT_LINKS = [
  ['All Users', '/admin/users/all'],
  ['Active Users', '/admin/users/active'],
  ['Trial Users', '/admin/users/trial'],
  ['Expired Users', '/admin/users/expired'],
  ['Business, Owner & Login', '/admin/user-details/business'],
  ['Subscription & Expiry', '/admin/user-details/subscription'],
  ['Payment History', '/admin/user-details/payments'],
];
const SUBSCRIPTION_LINKS = [
  ['Plans', '/admin/subscription/plans'],
  ['Active Subscriptions', '/admin/subscription/active'],
  ['Expired Subscriptions', '/admin/subscription/expired'],
  ['Renewal Requests', '/admin/subscription/requests'],
  ['Renewal History', '/admin/subscription/history'],
];
const PAYMENT_LINKS = [
  ['All Payments', '/admin/payments/all'],
  ['Pending Payments', '/admin/payments/pending'],
  ['Successful Payments', '/admin/payments/successful'],
  ['Failed Payments', '/admin/payments/failed'],
  ['Payment Reports', '/admin/payments/reports'],
];
const REPORT_LINKS = [
  ['User Report', '/admin/reports/user-report'],
  ['Renewal Report', '/admin/reports/renewal-report'],
  ['Expiry Report', '/admin/reports/expiry-report'],
  ['Payment Report', '/admin/reports/payment-report'],
  ['Revenue Report', '/admin/reports/revenue-report'],
];
const SETTINGS_LINKS = [
  ['Subscription Plans', '/admin/settings/subscription-plans'],
  ['Trial Days', '/admin/settings/trial-days'],
  ['Grace Period', '/admin/settings/grace-period'],
  ['Auto Block After Expiry', '/admin/settings/auto-block-after-expiry'],
  ['Payment Settings', '/admin/settings/payment-settings'],
];
const STORAGE_LINKS = [
  ['Overview', '/admin/storage/overview'],
  ['Files (GridFS)', '/admin/storage/files'],
  ['All User Size', '/admin/storage/users'],
  ['DB Collections', '/admin/storage/collections'],
  ['Daily Reports', '/admin/storage/daily-reports'],
];

function getDropdownForPath(path = window.location.pathname) {
  if (path === '/admin/users' || path.startsWith('/admin/users/') || path.startsWith('/admin/user-details/')) return 'users';
  if (path.startsWith('/admin/subscription/')) return 'subscription';
  if (path === '/admin/payments' || path.startsWith('/admin/payments/')) return 'payments';
  if (path === '/admin/notifications' || path.startsWith('/admin/notifications/')) return 'notifications';
  if (path.startsWith('/admin/reports/')) return 'reports';
  if (path.startsWith('/admin/settings/')) return 'settings';
  if (path.startsWith('/admin/storage/')) return 'storage';
  return '';
}

function CountBadge({ count }) {
  const value = Number(count || 0);
  if (!value) return null;
  return <span className="ml-auto min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-[10px] font-black leading-4 text-white">{value > 99 ? '99+' : value}</span>;
}

function SubNavButton({ label, path, onClose, navigate }) {
  return (
    <li>
      <button
        onClick={() => {
          safeNavigate(navigate, path);
          onClose?.();
        }}
        className="block w-full rounded-md border-0 bg-transparent px-3 py-1.5 text-left text-[12.5px] font-semibold leading-5 text-slate-600 transition hover:bg-white hover:text-blue-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-300 whitespace-normal break-words cursor-pointer"
      >
        <span className="inline-block align-top">-</span> <span>{label}</span>
      </button>
    </li>
  );
}

function CollapsibleNav({ icon: Icon, title, open, onToggle, links, onClose, navigate, count = 0 }) {
  return (
    <div>
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors text-left border-0 bg-transparent cursor-pointer">
        <span className="min-w-0 inline-flex flex-1 items-center gap-3 whitespace-normal break-words"><Icon size={16} className="flex-shrink-0" /> <span>{title}</span></span>
        <CountBadge count={count} />
        <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="m-0 p-0 pl-5 pr-1 mt-1 space-y-0.5">
          {links.map(([label, path]) => <SubNavButton key={path} label={label} path={path} onClose={onClose} navigate={navigate} />)}
        </ul>
      )}
    </div>
  );
}

export function Sidebar({ open, onClose, onLogout, counts = {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(() => getDropdownForPath(window.location.pathname));
  const toggleDropdown = (key) => setOpenDropdown((current) => (current === key ? '' : key));

  useEffect(() => {
    const activeDropdown = getDropdownForPath(location.pathname);
    if (activeDropdown) setOpenDropdown(activeDropdown);
  }, [location.pathname]);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 lg:hidden z-30" onClick={onClose} />}
      <aside className={`fixed left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-40 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="h-12 w-full rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden">
            <img src="/gobook-logo-full.png" alt="GoBook" className="h-9 w-auto object-contain" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
          {MENU_SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="m-0 mb-3 text-[12px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide px-3">{section.title}</h2>
              <ul className="m-0 p-0 space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path || item.key}>
                      {item.label === 'Users & Businesses' ? <CollapsibleNav icon={Icon} title="User Management" open={openDropdown === 'users'} onToggle={() => toggleDropdown('users')} links={USER_MANAGEMENT_LINKS} onClose={onClose} navigate={navigate} count={counts.newUsers} />
                        : item.label === 'Subscription' ? <CollapsibleNav icon={Icon} title="Subscription" open={openDropdown === 'subscription'} onToggle={() => toggleDropdown('subscription')} links={SUBSCRIPTION_LINKS} onClose={onClose} navigate={navigate} />
                        : item.label === 'Payments' ? <CollapsibleNav icon={Icon} title="Payments" open={openDropdown === 'payments'} onToggle={() => toggleDropdown('payments')} links={PAYMENT_LINKS} onClose={onClose} navigate={navigate} />
                        : item.label === 'Reports' ? <CollapsibleNav icon={Icon} title="Reports" open={openDropdown === 'reports'} onToggle={() => toggleDropdown('reports')} links={REPORT_LINKS} onClose={onClose} navigate={navigate} />
                        : item.label === 'Settings' ? <CollapsibleNav icon={Icon} title="Settings" open={openDropdown === 'settings'} onToggle={() => toggleDropdown('settings')} links={SETTINGS_LINKS} onClose={onClose} navigate={navigate} />
                        : item.label === 'Storage' ? <CollapsibleNav icon={Icon} title="Storage" open={openDropdown === 'storage'} onToggle={() => toggleDropdown('storage')} links={STORAGE_LINKS} onClose={onClose} navigate={navigate} />
                        : <button onClick={() => { safeNavigate(navigate, item.path); onClose?.(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors text-left border-0 bg-transparent cursor-pointer"><Icon size={16} className="flex-shrink-0" /><span className="min-w-0 flex-1">{item.label}</span>{item.label === 'Notifications' ? <CountBadge count={counts.unreadNotifications} /> : null}</button>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onLogout} className="w-full h-10 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
