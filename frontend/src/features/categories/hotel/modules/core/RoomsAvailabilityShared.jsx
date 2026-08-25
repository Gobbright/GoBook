import { Download, Edit2, Eye, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';

export const roomTypes = [];

export const rooms = [];

export const floors = [];

export const money = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);

export function RoomsPageHeader({ title, subtitle, actions }) {
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

export function RoomsCard({ children, className = '' }) {
  return <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export function RoomsInput({ icon: Icon, className = '', ...props }) {
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

export function RoomsSearch({ value, onChange, placeholder }) {
  return <RoomsInput icon={Search} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}

export function RoomsPrimaryButton({ children, className = '', ...props }) {
  return (
    <button type="button" {...props} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border-0 bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700 ${className}`}>
      {children}
    </button>
  );
}

export function RoomsSecondaryButton({ children, className = '', ...props }) {
  return (
    <button type="button" {...props} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 ${className}`}>
      {children}
    </button>
  );
}

const badgeStyles = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Inactive: 'border-red-200 bg-red-50 text-red-700',
  Vacant: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Occupied: 'border-blue-200 bg-blue-50 text-blue-700',
  Reserved: 'border-orange-200 bg-orange-50 text-orange-700',
  'Out of Order': 'border-red-200 bg-red-50 text-red-700',
};

export function RoomsBadge({ children }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeStyles[children] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>{children}</span>;
}

export function RoomsStatCard({ label, value, note, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-950',
    blue: 'text-blue-700',
    green: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-600',
  };
  return (
    <RoomsCard className="p-4">
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
      <div className={`mt-2 text-[26px] font-bold leading-none ${tones[tone]}`}>{value}</div>
      {note && <div className="mt-2 text-[12px] text-slate-500">{note}</div>}
    </RoomsCard>
  );
}

export function RoomsTableActions({ exportButton = false, item, onAction }) {
  if (exportButton) {
    return (
      <RoomsSecondaryButton>
        <Download size={15} />
        Export
      </RoomsSecondaryButton>
    );
  }
  const openAction = (action) => {
    if (onAction) onAction(action, item);
    else window.alert(`${action} ${item?.number || item?.name || 'record'}`);
  };
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => openAction('View')} aria-label="View" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50"><Eye size={15} /></button>
      <button type="button" onClick={() => openAction('Edit')} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50"><Edit2 size={15} /></button>
      <button type="button" onClick={() => openAction('Delete')} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
    </div>
  );
}

export function AddIcon() {
  return <Plus size={15} />;
}

export function MoreIcon() {
  return <MoreVertical size={15} />;
}
