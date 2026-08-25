import { Download, Edit2, Eye, Search, Trash2, UserCircle2 } from 'lucide-react';

export const guestRows = [];

export const guestDocuments = [];

export const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

export function GuestPageHeader({ title, subtitle, actions }) {
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

export function GuestCard({ children, className = '' }) {
  return <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export function GuestField({ label, required, children }) {
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

export function GuestInput({ icon: Icon, className = '', ...props }) {
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

export function GuestSearch({ value, onChange, placeholder }) {
  return <GuestInput icon={Search} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}

export function GuestPrimaryButton({ children, className = '', ...props }) {
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

export function GuestSecondaryButton({ children, className = '', ...props }) {
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

const badgeStyles = {
  'In-House': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Checked-out': 'border-slate-200 bg-slate-100 text-slate-700',
  VIP: 'border-amber-200 bg-amber-50 text-amber-700',
  Verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Active: 'border-blue-200 bg-blue-50 text-blue-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
};

export function GuestBadge({ children }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeStyles[children] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
      {children}
    </span>
  );
}

export function GuestAvatar({ size = 'md' }) {
  const sizes = {
    sm: 'h-9 w-9',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };
  return (
    <span className={`grid ${sizes[size]} place-items-center rounded-full bg-blue-100 text-blue-700`}>
      <UserCircle2 size={size === 'lg' ? 36 : size === 'md' ? 28 : 22} />
    </span>
  );
}

export function GuestStatCard({ label, value, note = 'View', tone = 'blue' }) {
  const tones = {
    blue: 'text-blue-700',
    green: 'text-emerald-700',
    amber: 'text-amber-700',
    purple: 'text-violet-700',
  };
  return (
    <GuestCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold text-slate-500">{label}</div>
          <div className={`mt-2 text-[26px] font-bold leading-none ${tones[tone]}`}>{value}</div>
          <button type="button" className="mt-2 border-0 bg-transparent p-0 text-[12px] font-semibold text-blue-700">{note}</button>
        </div>
        <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-400">i</span>
      </div>
    </GuestCard>
  );
}

export function GuestTableActions({ document = false, item, onAction }) {
  const openAction = (action) => {
    if (onAction) onAction(action, item);
    else window.alert(`${action} ${item?.id || item?.name || item?.documentNo || 'record'}`);
  };
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => openAction('View')} aria-label="View" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50">
        <Eye size={15} />
      </button>
      {document ? (
        <>
          <button type="button" onClick={() => openAction('Download')} aria-label="Download" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50">
            <Download size={15} />
          </button>
          <button type="button" onClick={() => openAction('Delete')} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-red-600 hover:bg-red-50">
            <Trash2 size={15} />
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => openAction('Edit')} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50">
            <Edit2 size={15} />
          </button>
          <button type="button" onClick={() => openAction('Delete')} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-red-600 hover:bg-red-50">
            <Trash2 size={15} />
          </button>
        </>
      )}
    </div>
  );
}
