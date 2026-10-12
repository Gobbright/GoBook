import { CalendarDays, X } from 'lucide-react';

const INPUT =
  'h-11 w-full min-w-0 border border-[#dbe4ef] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white text-[#111827] sm:h-auto sm:rounded-md';

export function DateRangeFilter({ from, to, onFromChange, onToChange, onClear, className = '' }) {
  const hasValue = Boolean(from || to);

  return (
    <div className={`grid w-full grid-cols-2 items-center gap-2 sm:flex sm:w-auto sm:flex-wrap ${className}`}>
      <div className="relative min-w-0">
        <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
        <input
          aria-label="From date"
          className={`${INPUT} pl-8 sm:w-36`}
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>
      <span className="hidden text-[12px] text-[#536173] sm:inline">to</span>
      <input
        aria-label="To date"
        className={`${INPUT} sm:w-36`}
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
      />
      {hasValue && (
        <button
          type="button"
          className="col-span-2 inline-flex h-10 w-full items-center justify-center rounded-lg border border-[#dbe4ef] bg-white text-[#536173] hover:bg-gray-50 cursor-pointer sm:col-span-1 sm:h-8 sm:w-8 sm:rounded-md"
          onClick={onClear}
          title="Clear date range"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
