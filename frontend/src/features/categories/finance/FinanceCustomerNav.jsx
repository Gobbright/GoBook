import { NavLink } from 'react-router-dom';
import { ListChecks, UserPlus, XCircle } from 'lucide-react';

const links = [
  { label: 'Add Customers', href: '/finance/customers/add', icon: UserPlus },
  { label: 'All Customers', href: '/finance/customers/all', icon: ListChecks },
  { label: 'Closed Customers', href: '/finance/customers/closed', icon: XCircle },
];

export function FinanceCustomerNav() {
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
