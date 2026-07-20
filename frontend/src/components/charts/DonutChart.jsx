const SEGMENTS = [
  { key: 'paid',    color: '#22c55e', label: 'Paid' },
  { key: 'pending', color: '#f59e0b', label: 'Pending' },
  { key: 'overdue', color: '#ef4444', label: 'Overdue' },
];

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function DonutChart({ data = { paid: 0, pending: 0, overdue: 0 } }) {
  const total = (data.paid || 0) + (data.pending || 0) + (data.overdue || 0);
  const size = 220;
  const strokeWidth = 34;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offsetAcc = 0;
  const arcs = total > 0 ? SEGMENTS.filter((seg) => data[seg.key] > 0).map((seg) => {
    const value = data[seg.key] || 0;
    const dash = (value / total) * circumference;
    const arc = { ...seg, value, dasharray: `${dash} ${circumference - dash}`, dashoffset: -offsetAcc };
    offsetAcc += dash;
    return arc;
  }) : [];

  return (
    <div>
      <div className="relative mx-auto mt-4" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth={strokeWidth}
          />
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke={arc.color} strokeWidth={strokeWidth}
              strokeDasharray={arc.dasharray} strokeDashoffset={arc.dashoffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            >
              <title>{`${arc.label}: ${fmt(arc.value)}`}</title>
            </circle>
          ))}
        </svg>
        {total === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[#536173] dark:text-slate-400 text-center px-6">
            No invoices yet
          </div>
        )}
      </div>
      {total > 0 && (
        <div className="flex justify-center gap-4 mt-4 flex-wrap">
          {SEGMENTS.map((seg) => (
            <div key={seg.key} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: seg.color }} />
              <span className="text-[#536173] dark:text-slate-400">{seg.label}</span>
              <span className="font-semibold text-[#111827] dark:text-slate-100">{fmt(data[seg.key])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
