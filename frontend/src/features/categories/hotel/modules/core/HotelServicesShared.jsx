import { Download, Edit2, Eye, Filter, Plus, Search, Settings, Trash2 } from 'lucide-react';

export const roomServiceOrders = [];

export const popularRoomItems = [];

export const laundryRequests = [];

export const spaBookings = [];

export const transportBookings = [];

export const otherServiceTiles = [
  { name: 'Doctor On Call', count: '0 Requests', tone: 'green' },
  { name: 'Wake-up Call', count: '0 Requests', tone: 'blue' },
  { name: 'Baby Sitting', count: '0 Requests', tone: 'violet' },
  { name: 'Decorations', count: '0 Requests', tone: 'pink' },
  { name: 'Lost & Found', count: '0 Items', tone: 'orange' },
  { name: 'Business Center', count: '0 Requests', tone: 'blue' },
  { name: 'Maintenance', count: '0 Requests', tone: 'slate' },
  { name: 'Guest Amenities', count: '0 Requests', tone: 'green' },
];

export const otherRequests = [];

export const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export function ServicePageHeader({ title, subtitle, actions }) {
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

export function ServiceCard({ children, className = '' }) {
  return <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export function ServicePrimaryButton({ children, className = '', ...props }) {
  return (
    <button type="button" {...props} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border-0 bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700 ${className}`}>
      {children}
    </button>
  );
}

export function ServiceSecondaryButton({ children, className = '', ...props }) {
  return (
    <button type="button" {...props} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 ${className}`}>
      {children}
    </button>
  );
}

export function ServiceSearch({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500" />
    </div>
  );
}

const badgeStyles = {
  'In Progress': 'border-blue-200 bg-blue-50 text-blue-700',
  Delivered: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Pending: 'border-orange-200 bg-orange-50 text-orange-700',
  Ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Upcoming: 'border-violet-200 bg-violet-50 text-violet-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Scheduled: 'border-violet-200 bg-violet-50 text-violet-700',
};

export function ServiceBadge({ children }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeStyles[children] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>{children}</span>;
}

export function ServiceStatCard({ label, value, note, tone = 'blue' }) {
  const tones = {
    blue: 'text-blue-700',
    green: 'text-emerald-700',
    red: 'text-red-600',
    orange: 'text-orange-600',
    slate: 'text-slate-950',
  };

  return (
    <ServiceCard className="p-4">
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
      <div className={`mt-2 text-[24px] font-bold leading-none ${tones[tone]}`}>{value}</div>
      {note && <div className="mt-2 text-[12px] font-semibold text-emerald-600">{note}</div>}
    </ServiceCard>
  );
}

export function ServiceTabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-100 px-4 pt-4">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`h-9 border-b-2 px-3 text-[12px] font-semibold transition ${active === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-blue-700'}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export function RowAction({ item, onAction }) {
  const openAction = (action) => {
    if (onAction) onAction(action, item);
    else window.alert(`${action} ${item?.id || item?.name || 'record'}`);
  };
  return (
    <div className="flex items-center justify-end gap-1">
      <button type="button" onClick={() => openAction('View')} aria-label="View" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50"><Eye size={15} /></button>
      <button type="button" onClick={() => openAction('Edit')} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50"><Edit2 size={15} /></button>
      <button type="button" onClick={() => openAction('Delete')} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
    </div>
  );
}

export function AddIcon() {
  return <Plus size={15} />;
}

export function FilterIcon() {
  return <Filter size={15} />;
}

export function ExportIcon() {
  return <Download size={15} />;
}

export function SettingsIcon() {
  return <Settings size={15} />;
}
