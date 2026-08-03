import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowRightLeft, Award, BarChart2, BarChart3, BedDouble, Bell, BookOpen,
  Building2, Bus, CalendarCheck, CalendarClock, CalendarOff, Car, CheckSquare, ChevronDown, Contact,
  ClipboardList, CreditCard, Database, FileCheck, FileMinus, FilePlus,
  FileSpreadsheet, FileText, FlaskConical, FolderOpen, GitBranch, GraduationCap, Grid3x3,
  HeartPulse, History, Home, IndianRupee, LayoutDashboard,
  LayoutGrid, LogIn, LogOut, Mail, MessageCircle, Microscope, Package, PackageMinus, PackagePlus,
  PenLine, Pill, PieChart, QrCode, Receipt, ReceiptText, RefreshCw, Route, Scale, Settings,
  Shield, ShoppingCart, Sparkles, Stethoscope, Truck, TrendingUp, UserCheck, UserPlus, UserRound,
  Users, UtensilsCrossed, Wallet, Warehouse, Wrench, XCircle, Zap,
} from 'lucide-react';

import { getSidebarSections } from '../../constants/navigation.js';
import { logout } from '../../services/authService.js';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import { getToken } from '../../services/authToken.js';
import sidebarLogo from '../../assets/images/logo/logo.png';
import { normalizeAppPath } from '../../routes/navigation.js';

const ICON_MAP = {
  Activity, AlertTriangle, ArrowRightLeft, Award, BarChart2, BarChart3, BedDouble, Bell, BookOpen,
  Building2, Bus, CalendarCheck, CalendarClock, CalendarOff, Car, CheckSquare, Contact, ClipboardList, CreditCard, Database,
  FileCheck, FileMinus, FilePlus, FileSpreadsheet,
  FileText, FlaskConical, FolderOpen, GitBranch, GraduationCap, Grid3x3, HeartPulse, History, Home, LayoutDashboard, LayoutGrid,
  LogIn, Mail, MessageCircle, Microscope, Package, PackageMinus, PackagePlus, PenLine,
  Pill, PieChart, QrCode, Receipt, ReceiptText, RefreshCw, Route, Scale, Settings, Shield,
  IndianRupee, ShoppingCart, Sparkles, Stethoscope, Truck, TrendingUp, UserCheck, UserPlus, UserRound, Users,
  UtensilsCrossed, Wallet, Warehouse, Wrench, XCircle, Zap,
};

function NavIcon({ name }) {
  const Icon = ICON_MAP[name];
  return Icon ? <Icon size={15} strokeWidth={1.75} /> : null;
}

function findOpenNavItem(sidebarSections, path) {
  for (const section of sidebarSections) {
    for (const item of section.items) {
      if (item.children?.some((c) => normalizeAppPath(c.href) === path || (item.href && path === normalizeAppPath(item.href)))) return item.label;
    }
  }
  return null;
}

function findActiveSection(sidebarSections, path) {
  for (const section of sidebarSections) {
    for (const item of section.items) {
      if (item.href && normalizeAppPath(item.href) === path) return section.title;
      if (item.children?.some((c) => normalizeAppPath(c.href) === path)) return section.title;
    }
  }
  return null;
}

function getExternalHref(item) {
  if (!item.sso) return item.externalUrl;
  const token = getToken();
  const url = new URL('/login', item.externalUrl);
  if (token) url.searchParams.set('token', token);
  if (item.ssoTarget) url.searchParams.set('target', item.ssoTarget);
  return url.toString();
}
const SECTION_KEY = 'gobook.openSection';

export function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const storedUser = useCurrentUser();
  const sidebarSections = useMemo(() => {
    const currentUser = storedUser || {};
    return getSidebarSections(currentUser.category || 'other', currentUser);
  }, [storedUser]);
  const [openSection, setOpenSection] = useState(() => {
    // Active section from current URL takes priority; otherwise restore last saved; Sales is the default
    const fromPath = findActiveSection(sidebarSections, normalizeAppPath(window.location.pathname || '/dashboard'));
    if (fromPath) {
      sessionStorage.setItem(SECTION_KEY, fromPath);
      return fromPath;
    }
    return sessionStorage.getItem(SECTION_KEY) ?? 'Dashboard';
  });
  const [openNavItem, setOpenNavItem] = useState(
    () => findOpenNavItem(sidebarSections, normalizeAppPath(window.location.pathname || '/dashboard')),
  );

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const currentPath = normalizeAppPath(location.pathname || '/dashboard');

  useEffect(() => {
    setOpenNavItem(findOpenNavItem(sidebarSections, currentPath));
    const section = findActiveSection(sidebarSections, currentPath);
    if (section) {
      setOpenSection(section);
      sessionStorage.setItem(SECTION_KEY, section);
    }
    onCloseRef.current();
  }, [currentPath, sidebarSections]);

  function toggleSection(title) {
    setOpenSection((s) => {
      const next = s === title ? '' : title;
      sessionStorage.setItem(SECTION_KEY, next);
      return next;
    });
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`app-sidebar bg-[#062844] text-white flex-none w-60 h-screen py-4 flex flex-col
          fixed inset-y-0 left-0 z-50 transition-transform duration-200
          md:static md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="px-6 mb-6 flex-none flex justify-start">
          <img src={sidebarLogo} alt="GoBook" className="h-16 w-auto object-contain" />
        </div>

        {/* Nav sections */}
        <nav className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto scrollbar-hide px-3">
          {sidebarSections.map((section) => (
            <div key={section.title}>
              {section.items.length === 1 && !section.forceGroup ? (
                /* Single-item section - render as direct link */
                section.items[0].externalUrl ? (
                  <a
                    href={getExternalHref(section.items[0])}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium no-underline transition-colors text-[#c8dff2] hover:text-white hover:bg-white/8"
                  >
                    <span className="text-[#7ab4d8]">
                      <NavIcon name={section.items[0].icon} />
                    </span>
                    {section.items[0].label}
                  </a>
                ) : (
                  <Link
                    to={normalizeAppPath(section.items[0].href)}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium no-underline transition-colors
                      ${currentPath === normalizeAppPath(section.items[0].href)
                        ? 'bg-blue-600 text-white'
                        : 'text-[#c8dff2] hover:text-white hover:bg-white/8'}`}
                  >
                    <span className={currentPath === normalizeAppPath(section.items[0].href) ? 'text-white' : 'text-[#7ab4d8]'}>
                      <NavIcon name={section.items[0].icon} />
                    </span>
                    {section.items[0].label}
                  </Link>
                )
              ) : (
                /* Multi-item section - collapsible group */
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide cursor-pointer font-[inherit] bg-transparent border-0 transition-colors
                      ${openSection === section.title ? 'text-[#90caf9]' : 'text-[#7ab4d8] hover:text-[#b0d8f0]'}`}
                    aria-expanded={openSection === section.title}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 truncate whitespace-nowrap text-left">
                      {section.icon && <NavIcon name={section.icon} />}
                      <span className="min-w-0 truncate">{section.title}</span>
                    </span>
                    <ChevronDown
                      size={13}
                      strokeWidth={2.5}
                      className={`transition-transform duration-200 ${openSection === section.title ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {openSection === section.title && (
                    <div className="mt-0.5 flex flex-col gap-1 animate-fade-slide-down">
                      {section.items.map((item) => {
                        if (item.children) {
                          const hasActiveChild = item.children.some((c) => currentPath === normalizeAppPath(c.href));
                          const isOpen = item.alwaysOpen || openNavItem === item.label || hasActiveChild;
                          const activeParent = item.href && currentPath === normalizeAppPath(item.href);
                          const highlighted = activeParent || hasActiveChild;
                          return (
                            <div key={item.label}>
                              <div className={`flex items-center rounded-lg transition-colors ${highlighted ? '' : 'hover:bg-white/8'}`}>
                                {item.href ? (
                                  <Link
                                    to={normalizeAppPath(item.href)}
                                    onClick={onClose}
                                    className={`flex items-center gap-3 flex-1 px-3 py-2 text-[13px] no-underline transition-colors rounded-l-lg
                                      ${highlighted ? 'bg-blue-600 text-white' : 'text-[#c8dff2] hover:text-white'}`}
                                  >
                                    <span className="flex-none text-white">
                                      <NavIcon name={item.icon} />
                                    </span>
                                    {item.label}
                                  </Link>
                                ) : (
                                  <span className={`flex items-center gap-3 flex-1 px-3 py-2 text-[13px] ${highlighted ? 'text-white' : 'text-[#c8dff2]'}`}>
                                    <span className={`flex-none ${highlighted ? 'text-white' : 'text-[#7ab4d8]'}`}>
                                      <NavIcon name={item.icon} />
                                    </span>
                                    {item.label}
                                  </span>
                                )}
                                {!item.alwaysOpen && (
                                  <button
                                    type="button"
                                    onClick={() => setOpenNavItem(isOpen ? null : item.label)}
                                    className={`flex-none px-2 py-2 cursor-pointer bg-transparent border-0 font-[inherit] transition-colors rounded-r-lg
                                      ${highlighted ? 'text-white' : 'text-[#7ab4d8] hover:text-white'}`}
                                    aria-label="toggle sub-items"
                                  >
                                    <ChevronDown size={12} strokeWidth={2.5} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                )}
                              </div>
                              {isOpen && (
                                <div className="ml-7 mt-0.5 flex flex-col gap-0.5">
                                  {item.children.map((child) => {
                                    const active = currentPath === normalizeAppPath(child.href);
                                    return (
                                      <Link
                                        key={child.label}
                                        to={normalizeAppPath(child.href)}
                                        className={`flex items-center px-3 py-1.5 rounded-md text-[12.5px] no-underline transition-colors
                                          ${active ? 'bg-blue-600 text-white font-semibold' : 'text-[#c8dff2] hover:text-white hover:bg-white/8'}`}
                                      >
                                        {child.label}
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }

                        if (item.externalUrl) {
                          return (
                            <a
                              key={item.label}
                              href={getExternalHref(item)}
                              onClick={onClose}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] no-underline transition-colors text-[#c8dff2] hover:text-white hover:bg-white/8"
                            >
                              <span className="flex-none text-[#7ab4d8]">
                                <NavIcon name={item.icon} />
                              </span>
                              {item.label}
                            </a>
                          );
                        }

                        const active = currentPath === normalizeAppPath(item.href);
                        return (
                          <Link
                            key={item.label}
                            to={normalizeAppPath(item.href)}
                            onClick={onClose}
                            className={active ? 'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] no-underline transition-colors bg-blue-600 text-white' : 'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] no-underline transition-colors text-[#c8dff2] hover:text-white hover:bg-white/8'}>
                            <span className={active ? 'flex-none text-white' : 'flex-none text-[#7ab4d8]'}>
                              <NavIcon name={item.icon} />
                            </span>
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="flex-none px-3 pt-3 mt-2 border-t border-white/10">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent border-0 font-[inherit] text-[#c8dff2] hover:text-white hover:bg-white/8 transition-colors"
          >
            <span className="flex-none text-[#7ab4d8]">
              <LogOut size={15} strokeWidth={1.75} />
            </span>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
