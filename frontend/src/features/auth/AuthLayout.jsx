import { BarChart3, BookOpen, Building2, FileText, Mail, Moon, Package, ShieldCheck, Star, Sun, Users } from 'lucide-react';

import { useTheme } from '../../app/ThemeContext.jsx';

const DECISION_GUIDE = [
  { icon: FileText, label: 'Billing & Invoices', desc: 'Create professional invoices in seconds' },
  { icon: Package, label: 'Inventory Control', desc: 'Track stock, manage inventory & avoid shortages' },
  { icon: BarChart3, label: 'Reports & Insights', desc: 'Get real-time insights and grow your business' },
  { icon: ShieldCheck, label: 'Secure & Reliable', desc: 'Your data is protected with enterprise security' },
];

const LIGHT_FEATURES = [
  { icon: FileText, label: 'Billing & Invoicing', desc: 'Create professional invoices in seconds' },
  { icon: Package, label: 'Inventory Management', desc: 'Track stock, manage inventory in real-time' },
  { icon: Users, label: 'CRM & Customers', desc: 'Manage leads, customers & build strong relationships' },
  { icon: BookOpen, label: 'Accounting', desc: 'Track income, expenses & get clear insights' },
  { icon: Building2, label: 'Multi-branch', desc: 'Manage multiple branches from one place' },
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
  { label: 'WhatsApp', href: 'https://wa.me/918925550775', icon: WhatsAppIcon, className: 'text-white bg-[#25D366] hover:bg-[#1fbd5a] shadow-[0_8px_18px_-10px_rgba(37,211,102,0.9)]' },
  { label: 'Facebook', href: 'https://www.facebook.com/share/18xYZv2Hqy/?mibextid=wwXIfr', icon: FacebookIcon, className: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
  { label: 'Instagram', href: 'https://www.instagram.com/gobook_?igsh=MTZrZ29kdmozMmlqdA%3D%3D&utm_source=qr', icon: InstagramIcon, className: 'text-pink-500 bg-pink-50 hover:bg-pink-100' },
];

function CyberFeatures() {
  return (
    <div className="auth-cyber-feature-grid">
      {DECISION_GUIDE.map(({ icon: Icon, label, desc }) => (
        <section key={label} className="auth-cyber-feature-card">
          <span className="auth-cyber-feature-icon">
            <Icon size={26} />
          </span>
          <strong>{label}</strong>
          <span>{desc}</span>
        </section>
      ))}
    </div>
  );
}

function DecorativeBackdrop() {
  return (
    <>
      <div className="auth-cyber-star auth-cyber-star-one" />
      <div className="auth-cyber-star auth-cyber-star-two" />
      <div className="auth-cyber-star auth-cyber-star-three" />
      <div className="auth-cyber-rings" />
      <div className="auth-cyber-panel-lines" />
    </>
  );
}

function LightLayout({ children, cardMaxWidth, compact, theme, toggleTheme }) {
  return (
    <div className={`${compact ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'} auth-shell auth-light-shell`}>
      <section className="auth-light-left">
        <div className="auth-light-logo">
          <img src="/gobook-logo-full.png" alt="GoBook" />
        </div>

        <div className="auth-light-main">
          <div className="auth-light-copy">
            <h1>Manage More.</h1>
            <h2>Grow Faster.</h2>
            <p>GoBook is your all-in-one business management platform to streamline, automate and scale your business operations seamlessly.</p>
          </div>

          <div className="auth-light-hero" aria-hidden="true">
            <img src="/auth-light-hero.png" alt="" />
          </div>
        </div>

        <section className="auth-light-features">
          <h3>Everything you need to run your business</h3>
          <div className="auth-light-feature-grid">
            {LIGHT_FEATURES.map(({ icon: Icon, label, desc }) => (
              <article key={label} className="auth-light-feature-card">
                <span><Icon size={22} /></span>
                <strong>{label}</strong>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="auth-light-footer">
          <div className="auth-light-socials" aria-label="Social links">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
                <Icon size={21} strokeWidth={2.2} />
              </a>
            ))}
            <a href="mailto:support@gobook.app" aria-label="Email" title="Email"><Mail size={20} /></a>
          </div>

          <p>&copy; 2026 GoBook Business Management. All rights reserved.</p>
        </div>
      </section>

      <section className={`${compact ? 'h-[100dvh] overflow-hidden' : 'min-h-screen overflow-y-auto'} auth-panel auth-light-right`}>
        <button type="button" onClick={toggleTheme} className="auth-theme-toggle auth-light-toggle">
          <Sun size={14} />
          Light Mode
        </button>

        <div className="auth-card-wrap auth-light-card-wrap" style={{ maxWidth: cardMaxWidth }}>
          <div className={`${compact ? 'px-8 py-9' : 'px-9 py-10'} auth-card auth-light-card`}>
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}

function DarkLayout({ children, cardMaxWidth, compact, theme, toggleTheme }) {
  return (
    <div className={`${compact ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'} auth-shell auth-dark-shell`}>
      <section className="auth-dark-left">
        <DecorativeBackdrop />
        <div className="auth-dark-logo">
          <img src="/gobook-logo-full.png" alt="GoBook" />
        </div>

        <div className="auth-dark-main">
          <div className="auth-dark-copy">
            <h1>Manage More.</h1>
            <h2>Grow Faster.</h2>
            <p>GoBook is your all-in-one business management platform to streamline, automate and scale your business operations seamlessly.</p>
          </div>

          <div className="auth-dark-hero" aria-hidden="true">
            <img src="/auth-light-hero.png" alt="" />
          </div>
        </div>

        <section className="auth-dark-features">
          <h3>Everything you need to run your business</h3>
          <div className="auth-dark-feature-grid">
            {LIGHT_FEATURES.map(({ icon: Icon, label, desc }) => (
              <article key={label} className="auth-dark-feature-card">
                <span><Icon size={22} /></span>
                <strong>{label}</strong>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="auth-dark-footer">
          <div className="auth-dark-socials" aria-label="Social links">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
                <Icon size={21} strokeWidth={2.2} />
              </a>
            ))}
            <a href="mailto:support@gobook.app" aria-label="Email" title="Email"><Mail size={20} /></a>
          </div>

          <p>&copy; 2026 GoBook Business Management. All rights reserved.</p>
        </div>
      </section>

      <section className={`${compact ? 'h-[100dvh] overflow-hidden' : 'min-h-screen overflow-y-auto'} auth-panel auth-dark-right`}>
        <DecorativeBackdrop />
        <button type="button" onClick={toggleTheme} className="auth-theme-toggle auth-dark-toggle">
          <Moon size={14} />
          Dark Mode
        </button>

        <div className="auth-card-wrap auth-dark-card-wrap" style={{ maxWidth: cardMaxWidth }}>
          <div className={`${compact ? 'px-8 py-9' : 'px-9 py-10'} auth-card auth-dark-card`}>
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}

function CyberDarkLayout({ children, cardMaxWidth, compact, theme, toggleTheme }) {
  return (
    <div className={`${compact ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'} auth-shell auth-cyber-shell`}>
      <section className="auth-cyber-left">
        <DecorativeBackdrop />
        <div className="auth-cyber-left-content">
          <div className="auth-cyber-logo">
            <img src="/gobook-logo-full.png" alt="GoBook" />
          </div>

          <div className="auth-cyber-badge">
            <Star size={15} fill="currentColor" />
            <span>Trusted by 10,000+ Businesses</span>
          </div>

          <div className="auth-cyber-copy">
            <h1>Smart Billing.</h1>
            <h2>Better Business.</h2>
            <p>Create invoices, manage customers, track payments and grow your business with ease.</p>
          </div>

          <CyberFeatures />
        </div>

        <div className="auth-cyber-hero" aria-hidden="true">
          <img src="/auth-billing-hero.png" alt="" />
        </div>

        <div className="auth-cyber-left-footer">
          <div className="auth-cyber-socials" aria-label="Social links">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
                <Icon size={22} strokeWidth={2.2} />
              </a>
            ))}
            <a href="mailto:support@gobook.app" aria-label="Email" title="Email"><Mail size={20} /></a>
          </div>
          <p>&copy; 2026 GoBook Billing App. All rights reserved.</p>
        </div>
      </section>

      <section className={`${compact ? 'h-[100dvh] overflow-hidden' : 'min-h-screen overflow-y-auto'} auth-panel auth-cyber-right`}>
        <DecorativeBackdrop />
        <button type="button" onClick={toggleTheme} className="auth-theme-toggle auth-cyber-toggle">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <div className="auth-card-wrap auth-cyber-card-wrap" style={{ maxWidth: cardMaxWidth }}>
          <div className={`${compact ? 'px-7 py-8 sm:px-8 sm:py-9' : 'px-8 py-9'} auth-card auth-cyber-card`}>
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}

export function AuthLayout({ children, cardMaxWidth = 430, compact = false }) {
  const { theme, toggleTheme } = useTheme();

  if (theme === 'dark') {
    return <DarkLayout cardMaxWidth={cardMaxWidth} compact={compact} theme={theme} toggleTheme={toggleTheme}>{children}</DarkLayout>;
  }

  return <LightLayout cardMaxWidth={cardMaxWidth} compact={compact} theme={theme} toggleTheme={toggleTheme}>{children}</LightLayout>;
}
