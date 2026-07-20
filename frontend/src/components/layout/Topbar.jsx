import { useEffect, useState } from 'react';
import { Menu, Moon, Settings, Sun } from 'lucide-react';

import { useTheme } from '../../app/ThemeContext.jsx';
import { getCurrentUser } from '../../services/authService.js';
import { api } from '../../services/api.js';

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Topbar({ onMenuClick }) {
  const user = getCurrentUser();
  const { theme, toggleTheme } = useTheme();
  const [business, setBusiness] = useState({});

  useEffect(() => {
    function applySettings(settings = {}) {
      setBusiness(settings || {});
    }

    api.getSettings()
      .then(applySettings)
      .catch(() => {});

    function handleSettingsUpdated(event) {
      applySettings(event.detail?.settings || {});
    }

    window.addEventListener('gobook:settings-updated', handleSettingsUpdated);
    return () => window.removeEventListener('gobook:settings-updated', handleSettingsUpdated);
  }, []);

  const businessMeta = [
    business.gstin ? `GSTIN: ${business.gstin}` : '',
    business.phone || '',
    business.city || business.state || '',
  ].filter(Boolean).join(' · ');

  return (
    <header className="app-topbar bg-white dark:bg-slate-900 border-b border-[#dde6f2] dark:border-slate-800 flex items-center gap-4 h-18 px-7">
      <button
        className="w-9 h-9 bg-white dark:bg-slate-800 border border-[#dbe4ef] dark:border-slate-700 rounded-md cursor-pointer text-[#536173] dark:text-slate-300 flex items-center justify-center md:hidden"
        type="button"
        aria-label="Open menu"
        onClick={onMenuClick}
      >
        <Menu size={18} />
      </button>

      <div className="app-business-meta hidden sm:flex flex-col min-w-0 sm:min-w-48 xl:min-w-64 max-w-110">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">Current Business</span>
        <span className="text-[14px] font-bold text-[#111827] dark:text-slate-100 truncate">{business.businessName || 'Business Details'}</span>
        {businessMeta && <span className="text-[11.5px] text-[#536173] dark:text-slate-400 truncate">{businessMeta}</span>}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-4 ml-auto max-md:hidden">
        <span className="text-[13px] text-[#536173] dark:text-slate-400">{todayLabel()}</span>
        <a
          href="#business-settings"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#536173] dark:text-slate-400 no-underline hover:text-blue-600 dark:hover:text-blue-400"
          title="Business settings"
        >
          <Settings size={14} />
          Customize
        </a>
        <span className="w-px h-5 bg-[#dde6f2] dark:bg-slate-700" aria-hidden="true" />
        {user?.name && <span className="text-[13px] text-[#536173] dark:text-slate-400">{user.name}</span>}
        <span className="w-px h-5 bg-[#dde6f2] dark:bg-slate-700" aria-hidden="true" />
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#536173] dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer bg-transparent border-0 p-0 font-[inherit]"
          title="Toggle dark mode"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </header>
  );
}
