import { BedDouble, CalendarDays, CheckCircle2, Clock3, Edit2, Eye, Search, Trash2, UserCircle2 } from 'lucide-react';

export const frontDeskGuests = [];

export const frontDeskRequests = [];

export const roomChoices = [];

export const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);

export function PageHeader({ title, subtitle, actions }) {
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

export function Card({ children, className = '' }) {
  return <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput({ icon: Icon, className = '', ...props }) {
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

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border-0 bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

const badgeTone = {
  'In-House': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  'In Progress': 'border-blue-200 bg-blue-50 text-blue-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  High: 'border-pink-200 bg-pink-50 text-pink-700',
  Medium: 'border-orange-200 bg-orange-50 text-orange-700',
  Normal: 'border-slate-200 bg-slate-50 text-slate-700',
  Available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Occupied: 'border-blue-200 bg-blue-50 text-blue-700',
};

export function Badge({ children }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeTone[children] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
      {children}
    </span>
  );
}

export function MetricCard({ icon: Icon, label, value, note, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-violet-50 text-violet-700',
    orange: 'bg-orange-50 text-orange-700',
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-md ${tones[tone]}`}>
          <Icon size={19} />
        </span>
        <div>
          <div className="text-[11px] font-semibold text-slate-500">{label}</div>
          <div className="mt-0.5 text-[22px] font-bold leading-none text-slate-950">{value}</div>
        </div>
      </div>
      {note && <div className="mt-2 text-[11px] text-slate-500">{note}</div>}
    </Card>
  );
}

export function GuestMiniCard({ guest, selected = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition ${selected ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-white hover:border-blue-200'}`}
    >
      <div className="flex gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-blue-700">
          <UserCircle2 size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-bold text-slate-950">{guest.name}</span>
            <Badge>{guest.status || 'Pending'}</Badge>
          </div>
          <div className="mt-1 text-[12px] text-slate-500">{guest.id}</div>
          <div className="mt-2 grid gap-1 text-[12px] text-slate-600">
            <span>{guest.mobile}</span>
            <span className="truncate">{guest.email}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function TableActions({ item, onAction }) {
  const runAction = (action) => {
    if (onAction) onAction(action, item);
    else window.alert(`${action} ${item?.id || item?.name || 'record'}`);
  };
  return (
    <div className="flex items-center gap-1 text-slate-500">
      <button type="button" onClick={() => runAction('View')} className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50" aria-label="View">
        <Eye size={15} />
      </button>
      <button type="button" onClick={() => runAction('Edit')} className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50" aria-label="Edit">
        <Edit2 size={15} />
      </button>
      <button type="button" onClick={() => runAction('Delete')} className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-red-600 hover:bg-red-50" aria-label="Delete">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export function EmptySearch({ value, onChange, placeholder }) {
  return <TextInput icon={Search} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}

export const summaryIcons = { BedDouble, CalendarDays, CheckCircle2, Clock3 };
