import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Menu, Moon, Search, Settings, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { useTheme } from '../../app/ThemeContext.jsx';
import { useKeyboardMode } from '../../app/KeyboardModeContext.jsx';
import { CATEGORY_LABELS } from '../../constants/categories.js';
import { getSidebarSections } from '../../constants/navigation.js';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import { normalizeAppPath } from '../../routes/navigation.js';
import { api, SERVER_ORIGIN } from '../../services/api.js';

function todayTimeLabel(date) {
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

function flattenNavItems(sections) {
  const items = [];
  for (const section of sections) {
    for (const item of section.items) {
      if (item.href) items.push({ label: item.label, href: normalizeAppPath(item.href) });
      for (const child of item.children || []) {
        if (child.href) items.push({ label: child.label, href: normalizeAppPath(child.href) });
      }
    }
  }
  return items;
}

function getPageTitle(path, sections) {
  const items = flattenNavItems(sections);
  const exact = items.find((i) => i.href === path);
  if (exact) return exact.label;

  // Routes like /billing/invoice, /billing/invoice/:id/edit, /billing/invoice/:id/view
  // share a base with their "new" nav target (/billing/invoice/new) — match on that.
  const byBase = items.find((i) => {
    const base = i.href.replace(/\/new$/, '');
    return base && (path === base || path.startsWith(`${base}/`));
  });
  if (byBase) return byBase.label;

  const segment = path.split('/').filter(Boolean)[0] || '';
  return segment ? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'GoBook';
}

export function Topbar({ onMenuClick, onOpenSearch }) {
  const user = useCurrentUser();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { keyboardMode, toggleKeyboardMode } = useKeyboardMode();
  const [now, setNow] = useState(() => new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    let active = true;
    function loadLogo() {
      api.getSettings()
        .then((settings) => { if (active) setLogoUrl(settings?.logoUrl || ''); })
        .catch(() => {});
    }
    loadLogo();
    window.addEventListener('gobook:settings-updated', loadLogo);
    return () => {
      active = false;
      window.removeEventListener('gobook:settings-updated', loadLogo);
    };
  }, []);

  const pageTitle = useMemo(() => {
    const sections = getSidebarSections((user || {}).category || 'other', user || {});
    return getPageTitle(normalizeAppPath(location.pathname || '/dashboard'), sections);
  }, [location.pathname, user]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const categoryLabel = CATEGORY_LABELS[user?.category] || user?.category || 'Category';

  return (
    <header className="app-topbar bg-white dark:bg-slate-900 border-b border-[#dde6f2] dark:border-slate-800 flex items-center gap-4 h-18 px-7">
      <button
        className="w-9 h-9 bg-white dark:bg-slate-800 border border-[#dbe4ef] dark:border-slate-700 rounded-md cursor-pointer text-[#536173] dark:text-slate-300 flex items-center justify-center md:hidden flex-none"
        type="button"
        aria-label="Open menu"
        onClick={onMenuClick}
      >
        <Menu size={18} />
      </button>

      <span className="md:hidden flex-1 text-white text-[16px] font-extrabold truncate">{pageTitle}</span>

      <button
        type="button"
        onClick={onOpenSearch}
        title="Open command palette&#10;Type any command and hit Enter&#10;Example: quotation, purchase, stock, customer"
        className="flex-1 max-w-md flex items-center gap-2.5 h-10 px-3.5 rounded-lg border border-[#dbe4ef] dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800 cursor-pointer font-[inherit]"
      >
        <Search size={15} className="text-[#94a3b8] flex-none" />
        <span className="text-[13px] text-[#94a3b8] truncate">Search menu / customers / products / reports...</span>
        <kbd className="hidden md:inline-block ml-auto flex-none text-[11px] font-semibold text-[#64748b] dark:text-slate-400 border border-[#dbe4ef] dark:border-slate-600 rounded px-1.5 py-0.5">Alt+Q</kbd>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-4 ml-auto max-md:hidden">
        <button
          type="button"
          onClick={toggleKeyboardMode}
          className={`inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-full px-3 py-1 cursor-pointer border font-[inherit]
            ${keyboardMode
              ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              : 'bg-[#f1f5f9] dark:bg-slate-800 border-[#dbe4ef] dark:border-slate-700 text-[#64748b] dark:text-slate-400'}`}
          title="Toggle keyboard shortcuts"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${keyboardMode ? 'bg-green-500' : 'bg-[#94a3b8]'}`} />
          Keyboard Mode {keyboardMode ? 'ON' : 'OFF'}
        </button>

        <span className="text-[13px] text-[#536173] dark:text-slate-400 whitespace-nowrap">{todayTimeLabel(now)}</span>

        <span className="w-px h-5 bg-[#dde6f2] dark:bg-slate-700" aria-hidden="true" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0 font-[inherit]"
          >
            {logoUrl ? (
              <img
                src={`${SERVER_ORIGIN}${logoUrl}`}
                alt={user?.name || 'Business logo'}
                className="w-8 h-8 rounded-full object-cover flex-none border border-[#dde6f2] dark:border-slate-700"
                onError={() => setLogoUrl('')}
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-[12px] font-semibold flex items-center justify-center flex-none">
                {getInitials(user?.name)}
              </span>
            )}
            {user?.name && (
              <span className="flex flex-col items-start leading-tight max-w-40">
                <span className="text-[13px] font-semibold text-[#111827] dark:text-slate-100 truncate max-w-full">{user.name}</span>
                <span className="text-[11px] text-[#64748b] dark:text-slate-400 truncate max-w-full">{categoryLabel}</span>
              </span>
            )}
            <ChevronDown size={14} className={`text-[#94a3b8] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-[#dde6f2] dark:border-slate-700 rounded-lg shadow-lg py-1.5 z-50">
              <a
                href="/business-settings"
                className="flex items-center gap-2 px-3.5 py-2 text-[13px] text-[#111827] dark:text-slate-100 no-underline hover:bg-[#f8fafc] dark:hover:bg-slate-800"
              >
                <Settings size={14} className="text-[#64748b]" />
                Business Settings
              </a>
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-[13px] text-[#111827] dark:text-slate-100 cursor-pointer bg-transparent border-0 font-[inherit] hover:bg-[#f8fafc] dark:hover:bg-slate-800"
              >
                {theme === 'dark' ? <Sun size={14} className="text-[#64748b]" /> : <Moon size={14} className="text-[#64748b]" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
