import { CalendarDays, X } from 'lucide-react';

const INPUT =
  'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white text-[#111827]';

export function DateRangeFilter({ from, to, onFromChange, onToChange, onClear, className = '' }) {
  const hasValue = Boolean(from || to);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="relative">
        <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
        <input
          aria-label="From date"
          className={`${INPUT} pl-8 w-36`}
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>
      <span className="text-[12px] text-[#536173]">to</span>
      <input
        aria-label="To date"
        className={`${INPUT} w-36`}
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
      />
      {hasValue && (
        <button
          type="button"
          className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#536173] hover:bg-gray-50 cursor-pointer"
          onClick={onClear}
          title="Clear date range"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
