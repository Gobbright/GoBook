import { useEffect, useState } from 'react';

import { getCustomerLifecycle } from '../../../../../services/crmService.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD = 'px-4 py-3 border-b border-[#f3f4f6] text-[13px]';
const STAGE_COLORS = ['#2563eb', '#16a34a', '#7c3aed', '#f97316', '#ef4444'];

function DonutChart({ segments }) {
  const size = 120;
  const r = 42;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.pct, 0) || 1;
  let offset = 0;
  return (
    <svg height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
      {segments.map((seg, i) => {
        const dash = (seg.pct / total) * circ;
        const gap  = circ - dash;
        const el   = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            fill="none"
            r={r}
            stroke={seg.color}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeWidth="18"
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

export function CustomerLifecyclePage() {
  const [stages, setStages] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);

  useEffect(() => {
    let isMounted = true;
    getCustomerLifecycle()
      .then((data) => {
        if (!isMounted) return;
        setStages(data.stages ?? []);
        setTopCustomers(data.topCustomers ?? []);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const maxCount = stages.reduce((a, s) => Math.max(a, s.count), 1);

  const donutSegments = stages.map((s, i) => ({
    color: STAGE_COLORS[i % STAGE_COLORS.length],
    pct:   s.count,
    label: `${s.stage} (${((s.count / maxCount) * 100).toFixed(1)}%)`,
  }));

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="#/dashboard">Home</a>
            <span>›</span><span>CRM</span><span>›</span><span>Customer Lifecycle</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Customer Lifecycle</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Track customer journey and lifecycle stages</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button">
          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          Export
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 my-5">
        {stages.map((s, i) => (
          <div key={s.stage} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
            <div className="text-xs text-[#536173] mb-1">{s.stage}</div>
            <div className="text-[20px] font-bold leading-tight" style={{ color: STAGE_COLORS[i % STAGE_COLORS.length] }}>
              {s.count.toLocaleString()}
            </div>
            {s.change && (
              <div className="text-xs mt-1 font-medium" style={{ color: s.change.startsWith('-') ? '#ef4444' : '#16a34a' }}>
                {s.change}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Lifecycle Overview + Details ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="bg-white border border-[#dfe7f1] rounded-xl p-5">
          <h2 className="m-0 mb-4 text-[15px] font-bold">Lifecycle Overview</h2>
          <div className="flex flex-col gap-3">
            {stages.map((s, i) => {
              const widthPct = `${((s.count / maxCount) * 100).toFixed(0)}%`;
              return (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className="w-20 text-[13px] text-[#536173] flex-none">{s.stage}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                    <div className="h-full rounded-full flex items-center justify-end pr-2" style={{ width: widthPct, background: STAGE_COLORS[i % STAGE_COLORS.length] }}>
                      <span className="text-[11px] text-white font-semibold">{s.count.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-[#dfe7f1] rounded-xl p-5">
          <h2 className="m-0 mb-4 text-[15px] font-bold">Lifecycle Details</h2>
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Stage</th>
                <th className={`${TH} text-right`}>Customers</th>
                <th className={`${TH} text-right`}>Percentage</th>
                <th className={`${TH} text-right`}>Change</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s, i) => (
                <tr key={s.stage} className="hover:bg-gray-50">
                  <td className={TD}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: STAGE_COLORS[i % STAGE_COLORS.length] }} />
                      <span className="font-medium text-[#111827]">{s.stage}</span>
                    </div>
                  </td>
                  <td className={`${TD} text-right`}>{s.count.toLocaleString()}</td>
                  <td className={`${TD} text-right text-[#536173]`}>{((s.count / maxCount) * 100).toFixed(1)}%</td>
                  <td className={`${TD} text-right font-medium`} style={{ color: s.change?.startsWith('-') ? '#ef4444' : '#16a34a' }}>
                    {s.change ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* ── Top Customers + Donut ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-[#dfe7f1] rounded-xl p-5">
          <h2 className="m-0 mb-4 text-[15px] font-bold">Top Customers by Lifetime Value</h2>
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Customer Name</th>
                <th className={`${TH} text-right`}>Total Orders</th>
                <th className={`${TH} text-right`}>Total Revenue</th>
                <th className={`${TH} text-right`}>Lifetime Value</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-[#111827]`}>{c.name}</td>
                  <td className={`${TD} text-right text-[#536173]`}>{c.orders}</td>
                  <td className={`${TD} text-right`}>{formatCurrency(c.revenue)}</td>
                  <td className={`${TD} text-right font-semibold text-blue-600`}>{formatCurrency(c.ltv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div className="bg-white border border-[#dfe7f1] rounded-xl p-5">
          <h2 className="m-0 mb-4 text-[15px] font-bold">Customers by Lifecycle Stage</h2>
          <div className="flex items-center gap-8 justify-center mt-4">
            <DonutChart segments={donutSegments} />
            <div className="flex flex-col gap-2.5">
              {donutSegments.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-[13px]">
                  <div className="w-3 h-3 rounded-sm flex-none" style={{ background: s.color }} />
                  <span className="text-[#536173]">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
