import { BarChart3, CheckCircle2, Cloud, FileText, Moon, Star, Sun } from 'lucide-react';

import { useTheme } from '../../app/ThemeContext.jsx';

const DECISION_GUIDE = [
  { icon: FileText, label: 'Billing first', desc: 'GST, non-GST, invoices and returns' },
  { icon: BarChart3, label: 'Control stock', desc: 'Inventory, alerts and movement reports' },
  { icon: Cloud, label: 'Grow modules', desc: 'CRM, HR, accounting and branch tools' },
];

function DecisionGuide() {
  return (
    <div className="w-full max-w-[500px] min-w-0 text-left mb-4">
      <section className="rounded-[22px] border border-blue-100/80 dark:border-blue-500/20 bg-white/90 dark:bg-slate-900/80 px-4 py-3.5 shadow-[0_18px_42px_-28px_rgba(30,64,175,0.45)]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-500">Decision Guide</p>
            <h2 className="m-0 mt-1 text-[15px] font-black text-slate-900 dark:text-white">Choose the right start</h2>
          </div>
          <span className="inline-flex h-8 w-8 min-[1180px]:h-9 min-[1180px]:w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
            <CheckCircle2 className="h-4 w-4 min-[1180px]:h-[18px] min-[1180px]:w-[18px]" />
          </span>
        </div>
        <div className="grid grid-cols-1 min-[1180px]:grid-cols-3 gap-2.5">
          {DECISION_GUIDE.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="min-w-0 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-[0_14px_26px_-22px_rgba(37,99,235,0.8)] dark:hover:bg-slate-900">
              <span className="mb-2 inline-flex h-7 w-7 min-[1180px]:h-8 min-[1180px]:w-8 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400">
                <Icon className="h-3.5 w-3.5 min-[1180px]:h-4 min-[1180px]:w-4" />
              </span>
              <strong className="block text-[12px] leading-tight text-slate-900 dark:text-slate-100">{label}</strong>
              <span className="mt-1 block text-[10.5px] leading-snug text-slate-500 dark:text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

function FacebookIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 8.6V7.1c0-.7.5-.9 1-.9h1.9V3.1L14.2 3c-3 0-4.4 1.8-4.4 4.1v1.5H7v3.5h2.8V21h3.5v-8.9h2.9l.5-3.5H14Z" />
    </svg>
  );
}

function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 3.4a8.47 8.47 0 0 0-7.28 12.8L3.7 20.6l4.52-1.03a8.48 8.48 0 1 0 3.82-16.17Zm0 1.65a6.82 6.82 0 0 1 5.8 10.4 6.8 6.8 0 0 1-8.98 2.48l-.36-.18-2.7.61.63-2.6-.22-.39A6.82 6.82 0 0 1 12.04 5.05Zm-2.86 3.5c-.15 0-.4.05-.61.3-.22.25-.8.78-.8 1.9 0 1.13.82 2.22.93 2.37.12.15 1.6 2.56 3.96 3.49 1.96.77 2.36.62 2.78.58.43-.04 1.37-.56 1.56-1.1.2-.54.2-1 .14-1.1-.06-.1-.22-.16-.46-.28-.24-.12-1.38-.68-1.6-.76-.21-.08-.37-.12-.53.12-.15.24-.61.76-.75.91-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.95-1.2-.72-.64-1.2-1.44-1.35-1.68-.14-.24-.02-.37.11-.49.12-.11.25-.28.37-.42.12-.15.16-.25.24-.41.08-.16.04-.3-.02-.42-.06-.12-.53-1.28-.73-1.75-.19-.46-.38-.4-.53-.41h-.45Z" />
    </svg>
  );
}

function InstagramIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.3" y="4.3" width="15.4" height="15.4" rx="4.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="2" />
      <circle cx="16.8" cy="7.2" r="1.1" fill="currentColor" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { label: 'WhatsApp',  href: 'https://wa.me/918925550775', icon: WhatsAppIcon, className: 'text-white bg-[#25D366] hover:bg-[#1fbd5a] shadow-[0_8px_18px_-10px_rgba(37,211,102,0.9)]' },
  { label: 'Facebook',  href: 'https://www.facebook.com/share/18xYZv2Hqy/?mibextid=wwXIfr', icon: FacebookIcon, className: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
  { label: 'Instagram', href: 'https://www.instagram.com/gobook_?igsh=MTZrZ29kdmozMmlqdA%3D%3D&utm_source=qr', icon: InstagramIcon, className: 'text-pink-500 bg-pink-50 hover:bg-pink-100' },
];

export function AuthLayout({ children, cardMaxWidth = 430, compact = false }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`${compact ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'} auth-shell relative flex bg-white dark:bg-slate-950`}>
      {/* Left brand panel */}
      <div className="hidden xl:flex xl:w-[46%] relative flex-col items-center justify-center text-center px-12 2xl:px-16 py-10 overflow-hidden">
        {/* Dot grid (top-left) */}
        <div className="absolute left-0 top-0 pointer-events-none" style={{ width: 260, height: 260, backgroundImage: 'radial-gradient(circle, rgba(79,144,255,0.35) 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }} />
        {/* Decorative blob (bottom-left) */}
        <div className="absolute pointer-events-none" style={{ left: -180, bottom: -300, width: 380, height: 380, borderRadius: '50%', background: 'linear-gradient(135deg, #4f90ff 0%, #2f6bff 100%)' }} />

        <div className="relative flex flex-col items-center">
          {/* Logo */}
          <div className="bg-white rounded-2xl px-5 py-3 mb-6" style={{ boxShadow: '0 8px 20px -12px rgba(30,41,59,0.15)' }}>
            <img src="/gobook-logo-full.png" alt="GoBook" className="h-12 w-auto object-contain" />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 mb-4 bg-blue-500/10">
            <Star size={13} fill="#3b6dff" style={{ color: '#3b6dff' }} />
            <span className="text-[12.5px] font-semibold" style={{ color: '#3b6dff' }}>Smart. Simple. Secure.</span>
          </div>

          {/* Headline */}
          <h1 className="text-slate-900 dark:text-white text-[38px] font-extrabold leading-[1.1] m-0">Smart Billing.</h1>
          <h1 className="text-[38px] font-extrabold leading-[1.1] m-0 mb-3" style={{ color: '#3b6dff' }}>Better Business.</h1>
          <p className="text-slate-500 dark:text-slate-400 text-[14px] leading-relaxed m-0 mb-6 max-w-[420px]">
            GoBook helps you create invoices, manage customers, track payments and grow your business with ease.
          </p>

          <DecisionGuide />

          <div className="flex items-center justify-center gap-3 mt-1 mb-3" aria-label="Social links">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon, className }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className={`w-11 h-11 rounded-full inline-flex items-center justify-center transition-colors ${className}`}
              >
                <Icon size={21} strokeWidth={2.2} />
              </a>
            ))}
          </div>

          <p className="text-slate-400 dark:text-slate-600 text-[11.5px] mt-0 mb-0">&copy; 2026 GoBook Billing App. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className={`${compact ? 'h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-4' : 'min-h-screen overflow-y-auto px-6 py-10'} auth-panel relative flex-1 flex items-center justify-center bg-[linear-gradient(160deg,#eef2ff_0%,#e4e9fb_100%)] dark:bg-[linear-gradient(160deg,#0f172a_0%,#0b1120_100%)]`}>
        <button type="button" onClick={toggleTheme}
                className={`${compact ? 'top-3 right-3 px-3 py-1.5 text-[11px]' : 'top-6 right-6 px-4 py-2 text-[12.5px]'} auth-theme-toggle absolute inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300 cursor-pointer border-0 transition-colors hover:text-slate-900 dark:hover:text-white`}
                style={{ boxShadow: '0 4px 14px -4px rgba(30,41,59,0.18)' }}>
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <div className="auth-card-wrap w-full flex-none" style={{ maxWidth: cardMaxWidth }}>
          {/* Mobile-only logo */}
          <div className={`${compact ? 'hidden' : 'flex'} auth-mobile-logo justify-center mb-6 xl:hidden`}>
            <div className="inline-flex bg-white rounded-xl px-4 py-2.5">
              <img src="/gobook-logo-full.png" alt="GoBook" className="h-8 w-auto object-contain" />
            </div>
          </div>

          <div className={`${compact ? 'rounded-2xl px-5 py-5 sm:px-6 sm:py-6' : 'rounded-[28px] px-8 py-9'} auth-card bg-white dark:bg-slate-900`} style={{ boxShadow: '0 30px 70px -20px rgba(30,41,59,0.25)' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
