import {
  BedDouble,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  HeartPulse,
  Home,
  IndianRupee,
  LayoutGrid,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useCurrentUser } from '../../hooks/useCurrentUser.js';

export const MOBILE_ADD_ITEM_EVENT = 'gobook:mobile-add-item';

const BILLING_CREATE_ROUTE = /^\/billing\/[^/]+\/(new|[^/]+\/edit)$/;

const CATEGORY_NAV_ITEMS = {
  retail: {
    left: { label: 'Customers', href: '/customers', icon: User },
    right: { label: 'Products', href: '/products', icon: Package },
    createHref: '/billing/invoice/new',
  },
  hospital: {
    left: { label: 'Patients', href: '/hospital/patients', icon: HeartPulse },
    right: { label: 'Appointments', href: '/hospital/book-appointment', icon: CalendarCheck },
    createHref: '/hospital/patient-registration',
  },
  school: {
    left: { label: 'Students', href: '/school/students/list', icon: GraduationCap },
    right: { label: 'Fees', href: '/school/fees/collect-fees', icon: Wallet },
    createHref: '/school/admissions/new-admission',
  },
  hotel: {
    left: { label: 'Guests', href: '/hotel/guests/list', icon: Users },
    right: { label: 'Rooms', href: '/hotel/rooms-availability/room-status', icon: BedDouble },
    createHref: '/hotel/reservations/new',
  },
  construction: {
    left: { label: 'Clients', href: '/construction/clients-tenders/clients', icon: Users },
    right: { label: 'Projects', href: '/construction/projects/site-progress', icon: LayoutGrid },
    createHref: '/construction/clients-tenders/tender-management',
  },
  ngo: {
    left: { label: 'Donors', href: '/ngo/donors/donors', icon: Users },
    right: { label: 'Donations', href: '/ngo/donations/entry', icon: IndianRupee },
    createHref: '/ngo/donations/entry',
  },
  automobile: {
    left: { label: 'Customers', href: '/automobile/customers-vehicles/customers', icon: Users },
    right: { label: 'Job Cards', href: '/automobile/job-cards/create', icon: ClipboardList },
    createHref: '/automobile/job-cards/create',
  },
  finance: {
    left: { label: 'Customers', href: '/finance/customers/all', icon: Users },
    right: { label: 'Collections', href: '/finance/collections', icon: IndianRupee },
    createHref: '/finance/customers/add',
    homeHref: '/finance/dashboard',
    settingsHref: '/finance/profile-settings',
  },
  restaurant: {
    left: { label: 'Customers', href: '/customers', icon: User },
    right: { label: 'Products', href: '/products', icon: Package },
    createHref: '/billing/purchase-order/new',
  },
  manufacturing: {
    left: { label: 'Inventory', href: '/stock-summary', icon: Package },
    right: { label: 'Purchase', href: '/billing/purchase-order/new', icon: ShoppingCart },
    createHref: '/billing/purchase-order/new',
  },
  transport: {
    left: { label: 'Customers', href: '/customers', icon: User },
    right: { label: 'Reports', href: '/reports', icon: BookOpen },
    createHref: '/billing/purchase-order/new',
  },
  other: {
    left: { label: 'Customers', href: '/customers', icon: User },
    right: { label: 'Products', href: '/products', icon: Package },
    createHref: '/billing/purchase-order/new',
  },
};

function isActivePath(path, href) {
  return path === href || path.startsWith(`${href}/`);
}

function BottomNavButton({ active, icon: Icon, label, onClick }) {
  return (
    <button type="button" className={active ? 'active' : ''} onClick={onClick}>
      <Icon size={16} /><span>{label}</span>
    </button>
  );
}

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useCurrentUser();
  const path = location.pathname;
  const category = user?.category || 'other';
  const categoryNav = CATEGORY_NAV_ITEMS[category] || CATEGORY_NAV_ITEMS.other;
  const homeHref = categoryNav.homeHref || '/dashboard';
  const settingsHref = categoryNav.settingsHref || '/business-settings';

  function handlePlusClick() {
    if (BILLING_CREATE_ROUTE.test(path)) {
      window.dispatchEvent(new CustomEvent(MOBILE_ADD_ITEM_EVENT));
      return;
    }
    navigate(categoryNav.createHref);
  }

  return (
    <div className="billing-mobile-bottom-nav" aria-label="Mobile navigation">
      <BottomNavButton active={isActivePath(path, homeHref)} icon={Home} label="Home" onClick={() => navigate(homeHref)} />
      <BottomNavButton active={isActivePath(path, categoryNav.left.href)} icon={categoryNav.left.icon} label={categoryNav.left.label} onClick={() => navigate(categoryNav.left.href)} />
      <button type="button" className="primary" onClick={handlePlusClick} aria-label="Add">
        <Plus size={22} />
      </button>
      <BottomNavButton active={isActivePath(path, categoryNav.right.href)} icon={categoryNav.right.icon} label={categoryNav.right.label} onClick={() => navigate(categoryNav.right.href)} />
      <BottomNavButton active={isActivePath(path, settingsHref)} icon={Settings} label="Settings" onClick={() => navigate(settingsHref)} />
    </div>
  );
}
