import { CheckCircle2, Edit2, Eye, Plus, Search, Trash2 } from 'lucide-react';

export const housekeepingRooms = [];

export const cleaningTasks = [];

export const schedules = [];

export const lostFoundItems = [];

export function HkPageHeader({ title, subtitle, actions }) {
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

export function HkCard({ children, className = '' }) {
  return <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export function HkInput({ icon: Icon, className = '', ...props }) {
  return (
    <div className={`relative ${className}`}>
      {Icon && <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
      <input {...props} className={`h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-blue-500 ${Icon ? 'pl-9' : ''}`} />
    </div>
  );
}

export function HkSearch({ value, onChange, placeholder }) {
  return <HkInput icon={Search} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}

export function HkPrimaryButton({ children, className = '', ...props }) {
  return <button type="button" {...props} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border-0 bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700 ${className}`}>{children}</button>;
}

export function HkSecondaryButton({ children, className = '', ...props }) {
  return <button type="button" {...props} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 ${className}`}>{children}</button>;
}

const badgeStyles = {
  Available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Occupied: 'border-blue-200 bg-blue-50 text-blue-700',
  Dirty: 'border-orange-200 bg-orange-50 text-orange-700',
  Cleaning: 'border-amber-200 bg-amber-50 text-amber-700',
  Inspection: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  Maintenance: 'border-slate-300 bg-slate-100 text-slate-700',
  Reserved: 'border-violet-200 bg-violet-50 text-violet-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  High: 'border-red-200 bg-red-50 text-red-700',
  Normal: 'border-slate-200 bg-slate-50 text-slate-700',
  'On Duty': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  Stored: 'border-amber-200 bg-amber-50 text-amber-700',
  Returned: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Claimed: 'border-blue-200 bg-blue-50 text-blue-700',
  Disposed: 'border-red-200 bg-red-50 text-red-700',
};

export const statusColors = {
  Available: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  Occupied: 'border-blue-300 bg-blue-50 text-blue-700',
  Dirty: 'border-orange-300 bg-orange-50 text-orange-700',
  Cleaning: 'border-amber-300 bg-amber-50 text-amber-700',
  Inspection: 'border-indigo-300 bg-indigo-50 text-indigo-700',
  Maintenance: 'border-slate-300 bg-slate-100 text-slate-700',
  Reserved: 'border-violet-300 bg-violet-50 text-violet-700',
};

export const dotColors = {
  Available: 'bg-emerald-500',
  Occupied: 'bg-blue-600',
  Dirty: 'bg-orange-500',
  Cleaning: 'bg-amber-500',
  Inspection: 'bg-indigo-600',
  Maintenance: 'bg-slate-700',
  Reserved: 'bg-violet-600',
};

export function HkBadge({ children }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeStyles[children] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>{children}</span>;
}

export function HkStatCard({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-950',
    blue: 'text-blue-700',
    green: 'text-emerald-700',
    amber: 'text-amber-700',
    orange: 'text-orange-700',
    red: 'text-red-600',
    purple: 'text-violet-700',
  };
  return (
    <HkCard className="p-4">
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
      <div className={`mt-2 text-[26px] font-bold leading-none ${tones[tone]}`}>{value}</div>
    </HkCard>
  );
}

export function HkTableActions({ destructive = false, item, onAction }) {
  const runAction = (action) => {
    if (onAction) onAction(action, item);
    else window.alert(`${action} ${item?.id || item?.number || item?.staff || 'record'}`);
  };
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => runAction('View')} aria-label="View" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50"><Eye size={15} /></button>
      <button type="button" onClick={() => runAction('Edit')} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50"><Edit2 size={15} /></button>
      <button type="button" onClick={() => runAction(destructive ? 'Delete' : 'Complete')} aria-label={destructive ? 'Delete' : 'Complete'} className={`grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent ${destructive ? 'text-red-600 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'}`}>{destructive ? <Trash2 size={15} /> : <CheckCircle2 size={15} />}</button>
    </div>
  );
}

export function AddIcon() {
  return <Plus size={15} />;
}
