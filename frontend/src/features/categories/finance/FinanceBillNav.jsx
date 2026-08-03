import { NavLink } from 'react-router-dom';
import { FileText, ReceiptText } from 'lucide-react';

const links = [
  { label: 'Auto Bill', href: '/finance/bills/auto', icon: ReceiptText },
  { label: 'Manual Bill', href: '/finance/bills/manual', icon: FileText },
];

export function FinanceBillNav() {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {links.map(({ label, href, icon: Icon }) => (
        <NavLink
          key={href}
          to={href}
          className={({ isActive }) => `inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition ${
            isActive
              ? 'border-[#4f90ff] bg-[#4f90ff] text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-blue-950'
          }`}
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </div>
  );
}
