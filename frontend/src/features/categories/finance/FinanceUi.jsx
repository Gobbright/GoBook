import { AlertCircle, LoaderCircle } from 'lucide-react';

export function formatMoney(value = 0) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function indiaToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function FinancePage({ title, description, action, children }) {
  return (
    <div className="min-h-full bg-[#f6f9fd] p-4 md:p-7 dark:bg-slate-950">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#4f90ff]">Finance</p>
            <h1 className="m-0 text-2xl font-black text-slate-900 dark:text-white">{title}</h1>
            {description && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

export function FinanceCard({ children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </section>
  );
}

export function StatusBadge({ status }) {
  const active = status === 'Active';
  const label = status === 'Finished' ? 'Closed' : status;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
      active
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
    }`}>
      {label}
    </span>
  );
}

export function TypeBadge({ type }) {
  const colors = {
    Loan: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    Chit: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    Deposit: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  };
  return <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ${colors[type] || colors.Loan}`}>{type}</span>;
}

export function LoadingState() {
  return (
    <div className="flex min-h-52 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
      <LoaderCircle className="animate-spin" size={19} /> Loading finance data...
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/30">
      <AlertCircle className="text-red-500" size={28} />
      <p className="m-0 text-sm font-semibold text-red-700 dark:text-red-300">{message || 'Unable to load finance data'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="rounded-lg border-0 bg-red-600 px-4 py-2 text-xs font-bold text-white">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center p-6 text-center">
      <p className="m-0 text-sm font-extrabold text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="mt-1.5 max-w-md text-xs text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  );
}

export const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#4f90ff] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-950';
export const primaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border-0 bg-[#4f90ff] px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#3f7fe8] disabled:cursor-not-allowed disabled:opacity-60';


