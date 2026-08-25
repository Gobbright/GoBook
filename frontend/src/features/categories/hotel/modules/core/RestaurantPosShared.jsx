import { Download, Edit2, Eye, Filter, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';

export const menuItems = [];

export const restaurantOrders = [];

export const restaurantBills = [];

export const restaurantTables = [];

export const kotTickets = [];

export const money = (value, decimals = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value) || 0);

export function PosPageHeader({ title, subtitle, actions }) {
  return (
    <section className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="m-0 text-[24px] font-bold leading-tight text-slate-950">{title}</h1>
        <p className="m-0 mt-1 text-[13px] text-slate-500">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </section>
  );
}

export function PosCard({ children, className = '' }) {
  return <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export function PosInput({ icon: Icon, className = '', ...props }) {
  return (
    <div className={`relative ${className}`}>
      {Icon && <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
      <input
        {...props}
        className={`h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition focus:border-blue-500 ${Icon ? 'pl-9' : ''}`}
      />
    </div>
  );
}

export function PosSearch({ value, onChange, placeholder }) {
  return <PosInput icon={Search} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}

export function PosPrimaryButton({ children, className = '', ...props }) {
  return (
    <button type="button" {...props} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border-0 bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>
      {children}
    </button>
  );
}

export function PosSecondaryButton({ children, className = '', ...props }) {
  return (
    <button type="button" {...props} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>
      {children}
    </button>
  );
}

const badgeStyles = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Occupied: 'border-blue-200 bg-blue-50 text-blue-700',
  Reserved: 'border-orange-200 bg-orange-50 text-orange-700',
  Cleaning: 'border-violet-200 bg-violet-50 text-violet-700',
  'Out of Order': 'border-red-200 bg-red-50 text-red-700',
  'In Progress': 'border-orange-200 bg-orange-50 text-orange-700',
  Ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'On the Way': 'border-blue-200 bg-blue-50 text-blue-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Cancelled: 'border-red-200 bg-red-50 text-red-700',
  New: 'border-blue-200 bg-blue-50 text-blue-700',
  High: 'border-red-200 bg-red-50 text-red-700',
  Normal: 'border-orange-200 bg-orange-50 text-orange-700',
  Paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Billed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Cash: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  UPI: 'border-blue-200 bg-blue-50 text-blue-700',
  Card: 'border-orange-200 bg-orange-50 text-orange-700',
  'Room Charge': 'border-violet-200 bg-violet-50 text-violet-700',
  'Dine In': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Take Away': 'border-orange-200 bg-orange-50 text-orange-700',
  Delivery: 'border-blue-200 bg-blue-50 text-blue-700',
  Takeaway: 'border-orange-200 bg-orange-50 text-orange-700',
  'Room Service': 'border-blue-200 bg-blue-50 text-blue-700',
  Veg: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Egg: 'border-amber-200 bg-amber-50 text-amber-700',
  'Non-Veg': 'border-red-200 bg-red-50 text-red-700',
};

export function PosBadge({ children }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeStyles[children] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
      {children}
    </span>
  );
}

export function PosStatCard({ icon: Icon, label, value, note, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-700',
    violet: 'bg-violet-50 text-violet-700',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <PosCard className="p-4">
      <div className="flex items-start gap-3">
        {Icon && <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${tones[tone]}`}><Icon size={20} /></span>}
        <div>
          <div className="text-[12px] font-semibold text-slate-500">{label}</div>
          <div className="mt-2 text-[24px] font-bold leading-none text-slate-950">{value}</div>
          {note && <div className="mt-2 text-[12px] font-semibold text-slate-500">{note}</div>}
        </div>
      </div>
    </PosCard>
  );
}

export function PosTableActions({ destructive = true, item, onAction }) {
  const showAction = (action) => {
    if (onAction) onAction(action, item);
    else window.alert(`${action} ${item?.id || item?.name || 'record'}`);
  };
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => showAction('View')} aria-label="View" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50"><Eye size={15} /></button>
      <button type="button" onClick={() => showAction('Edit')} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50"><Edit2 size={15} /></button>
      {destructive && <button type="button" onClick={() => showAction('Delete')} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>}
    </div>
  );
}

export function AddIcon() {
  return <Plus size={15} />;
}

export function MoreIcon() {
  return <MoreVertical size={15} />;
}

export function FilterIcon() {
  return <Filter size={15} />;
}

export function ExportButton() {
  return (
    <PosSecondaryButton>
      <Download size={15} />
      Export
    </PosSecondaryButton>
  );
}
