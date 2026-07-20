import { BarChart3, Cloud, FileText, Moon, ShieldCheck, Star, Sun } from 'lucide-react';

import { useTheme } from '../../app/ThemeContext.jsx';

const FEATURES = [
  { icon: ShieldCheck, label: 'Secure',    desc: 'Enterprise-grade\ndata security'   },
  { icon: BarChart3,   label: 'Insights',  desc: 'Real-time reports\n& analytics'     },
  { icon: FileText,    label: 'Invoicing', desc: 'GST & Non-GST\nbilling made easy'   },
  { icon: Cloud,       label: 'Anywhere',  desc: 'Access your business\nfrom anywhere' },
];

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
      <div className="hidden lg:flex lg:w-[46%] relative flex-col items-center justify-center text-center px-16 py-10 overflow-hidden">
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

          {/* Feature cards */}
          <div className="grid grid-cols-4 gap-3 mb-5 max-w-[460px]">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-2xl bg-white dark:bg-slate-900 border border-[#eef1f6] dark:border-slate-800 px-2.5 py-4 flex flex-col items-center text-center"
                   style={{ boxShadow: '0 8px 20px -12px rgba(30,41,59,0.15)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 bg-blue-500/10">
                  <Icon size={17} style={{ color: '#3b6dff' }} />
                </div>
                <span className="text-slate-800 dark:text-slate-100 text-[12.5px] font-bold mb-1">{label}</span>
                <span className="text-slate-400 dark:text-slate-500 text-[10.5px] leading-snug whitespace-pre-line">{desc}</span>
              </div>
            ))}
          </div>

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
          <div className={`${compact ? 'hidden' : 'flex'} auth-mobile-logo justify-center mb-6 lg:hidden`}>
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
