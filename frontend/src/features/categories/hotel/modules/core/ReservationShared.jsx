import { Link } from 'react-router-dom';

export const ROOM_TYPES = ['All', 'Deluxe Room', 'Executive Room', 'Suite Room', 'Premium Suite', 'Standard Room'];
export const RATE_PLANS = ['Best Available Rate', 'Breakfast Included', 'Advance Purchase', 'Weekend Special', 'Long Stay Saver', 'Corporate Plan'];
export const SOURCES = ['All', 'Walk-in', 'Website', 'Phone', 'OTA', 'Corporate', 'Travel Agent'];
export const STATUSES = ['All Status', 'Confirmed', 'Pending', 'Checked-in', 'Checked-out', 'Cancelled'];

export const ROOM_AVAILABILITY = [];

export function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <section className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="m-0 text-[26px] font-bold text-slate-950">{title}</h1>
        <p className="m-0 mt-1 text-[13px] text-slate-500">{subtitle}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </section>
  );
}

export function ReservationShell({ children }) {
  return <div className="min-h-full bg-slate-50 px-5 py-5 text-slate-900 md:px-8">{children}</div>;
}

export function StatusBadge({ status }) {
  const tone = {
    Confirmed: 'bg-green-100 text-green-700',
    Pending: 'bg-orange-100 text-orange-700',
    'Checked-in': 'bg-violet-100 text-violet-700',
    'Checked-out': 'bg-slate-100 text-slate-700',
    Cancelled: 'bg-red-100 text-red-700',
    Active: 'bg-green-100 text-green-700',
    Available: 'bg-green-100 text-green-700',
    Booked: 'bg-orange-100 text-orange-700',
    Blocked: 'bg-red-100 text-red-700',
  };
  return <span className={`inline-flex rounded px-2.5 py-1 text-[11px] font-bold ${tone[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
}

export function StatCard({ label, value, tone = 'blue', sub, onClick }) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    slate: 'border-slate-200 bg-white text-slate-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`rounded-lg border p-4 text-left ${tones[tone]} ${onClick ? 'hover:shadow-sm' : ''}`}>
      <div className="text-[12px] font-semibold">{label}</div>
      <div className="mt-1 text-[24px] font-bold leading-none text-slate-950">{value}</div>
      {sub && <div className="mt-2 text-[11px] font-medium opacity-80">{sub}</div>}
    </Tag>
  );
}

export function PrimaryLink({ to, children }) {
  return <Link to={to} className="inline-flex h-10 items-center gap-2 rounded bg-blue-600 px-4 text-[13px] font-semibold text-white no-underline hover:bg-blue-700">{children}</Link>;
}
