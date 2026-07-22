import { Building2, LayoutDashboard, LogOut, Shield, Users } from 'lucide-react';

import { logout } from '../../services/authService.js';

const NAV_ITEMS = [
  { key: 'overview',   label: 'Overview',   icon: LayoutDashboard },
  { key: 'businesses', label: 'Businesses', icon: Building2 },
  { key: 'users',       label: 'Users',       icon: Users },
];

export function PlatformAdminSidebar({ view, onNavigate }) {
  return (
    <aside className="bg-black text-white flex-none w-60 h-screen px-3 py-4 flex flex-col">
      <div className="px-2 mb-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-none">
          <Shield size={16} className="text-red-400" />
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-extrabold tracking-tight text-white leading-tight">Platform Admin</div>
          <div className="text-[10.5px] text-slate-500 leading-tight">GoBright internal</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(key)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent border-0 font-[inherit] text-left transition-colors
              ${view === key ? 'bg-red-500/15 text-red-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Icon size={15} strokeWidth={1.75} className="flex-none" />
            {label}
          </button>
        ))}
      </nav>

      <div className="flex-none px-3 pt-3 mt-2 border-t border-white/10 flex flex-col gap-1">
        <a
          href="//dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium no-underline text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          ← Back to app
        </a>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-transparent border-0 font-[inherit] text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut size={15} strokeWidth={1.75} className="flex-none" />
          Logout
        </button>
      </div>
    </aside>
  );
}
