function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function LineChart({ data = [] }) {
  const width = 600;
  const height = 220;
  const padX = 24;
  const padY = 20;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2 - 16;

  const values = data.map((d) => d.total);
  const max = Math.max(1, ...values);
  const hasData = data.length > 0 && values.some((v) => v > 0);

  const points = data.map((d, i) => ({
    x: padX + (data.length === 1 ? innerW / 2 : (innerW * i) / (data.length - 1)),
    y: padY + innerH - (d.total / max) * innerH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${padY + innerH} L ${points[0].x} ${padY + innerH} Z`
    : '';

  return (
    <div className="rounded-lg bg-[#eef5ff] dark:bg-slate-800/60 min-h-55 p-4">
      {!hasData ? (
        <div className="h-47 flex items-center justify-center text-sm text-[#536173] dark:text-slate-400">
          No sales in the last 7 days.
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          <defs>
            <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#salesTrendFill)" stroke="none" />
          <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#2563eb" />
              <title>{`${p.label}: ${fmt(p.total)}`}</title>
              <text x={p.x} y={height - 4} textAnchor="middle" fontSize="11" className="fill-[#536173] dark:fill-slate-400">
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
