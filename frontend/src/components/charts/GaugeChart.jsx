export function GaugeChart({ score = 0, growthPct = 0 }) {
  const size = 220;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const progress = (clamped / 100) * circumference;

  const color = clamped >= 70 ? '#22c55e' : clamped >= 40 ? '#f59e0b' : '#ef4444';
  const midY = size / 2;

  return (
    <div className="flex flex-col items-center pt-2">
      <svg width={size} height={midY + strokeWidth / 2 + 4} viewBox={`0 0 ${size} ${midY + strokeWidth / 2 + 4}`}>
        <path
          d={`M ${strokeWidth / 2} ${midY} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${midY}`}
          fill="none" strokeWidth={strokeWidth} strokeLinecap="round"
          className="stroke-slate-100 dark:stroke-slate-800"
        />
        <path
          d={`M ${strokeWidth / 2} ${midY} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${midY}`}
          fill="none" strokeWidth={strokeWidth} strokeLinecap="round"
          stroke={color}
          strokeDasharray={`${progress} ${circumference}`}
        />
      </svg>
      <div className="text-center -mt-7">
        <div className="text-3xl font-bold text-[#111827] dark:text-white">
          {clamped}<span className="text-base font-normal text-[#536173] dark:text-slate-400">/100</span>
        </div>
        <div className="text-xs mt-1 font-semibold" style={{ color }}>
          {growthPct >= 0 ? '+' : ''}{growthPct}% vs last month
        </div>
      </div>
    </div>
  );
}
