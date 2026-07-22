import { useEffect, useState } from 'react';

import { api } from '../../../../../services/api.js';
import { gstService } from '../../../../../services/gstService.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const STAT_CARD_CONFIG = [
  {
    key: 'outputTax',
    label: (period) => `Output Tax — ${period}`,
    color: '#2563eb', bg: '#eff6ff',
    deltaKey: 'outputTaxDelta', deltaPos: true, sub: 'vs prev month',
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
        <line x1="12" x2="12" y1="1" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    key: 'itcAvailable',
    label: () => 'ITC Available',
    color: '#16a34a', bg: '#f0fdf4',
    sub: 'After reversals',
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    key: 'netTaxPayable',
    label: () => 'Net Tax Payable',
    color: '#d97706', bg: '#fffbeb',
    sub: 'Cash outflow needed',
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
        <rect height="16" rx="2" ry="2" width="22" x="1" y="4" />
        <line x1="1" x2="23" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    key: 'pendingFilings',
    label: () => 'Pending Filings',
    color: '#dc2626', bg: '#fef2f2',
    sub: 'Returns awaiting filing',
    display: true,
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
    ),
  },
];

const EMPTY_STATS = { outputTax: 0, itcAvailable: 0, netTaxPayable: 0, pendingFilings: 0 };

const WORKFLOW_STEPS = [
  {
    num: 1,
    title: 'Prepare Sales Invoices',
    desc: 'Record all outward supplies for the month. Verify each invoice has the correct GSTIN, HSN code, and tax rate.',
    due: 'Throughout the month',
    color: '#2563eb', bg: '#eff6ff',
    href: null,
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    num: 2,
    title: 'File GSTR-1',
    desc: 'Report B2B invoices (invoice-wise to GST-registered buyers) and B2CS sales (summary for consumers/unregistered buyers).',
    due: '11th of next month',
    color: '#7c3aed', bg: '#f5f3ff',
    href: '/gstr-1',
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
        <line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
  {
    num: 3,
    title: 'Reconcile GSTR-2B',
    desc: 'GSTR-2B is auto-drafted by GSTN from your suppliers\' filings. Match it with your purchase register to verify ITC eligibility.',
    due: '14th of next month',
    color: '#16a34a', bg: '#f0fdf4',
    href: '/gst-reconciliation',
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
        <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
      </svg>
    ),
  },
  {
    num: 4,
    title: 'File GSTR-3B & Pay Tax',
    desc: 'Declare outward tax liability, claim eligible ITC from GSTR-2B, and pay the net tax in cash to the GST Electronic Cash Ledger.',
    due: '20th of next month',
    color: '#d97706', bg: '#fffbeb',
    href: '/gstr-3b',
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
        <rect height="16" rx="2" ry="2" width="22" x="1" y="4" />
        <line x1="1" x2="23" y1="10" y2="10" />
      </svg>
    ),
  },
];

function FilingStatusBadge({ status, daysLeft }) {
  if (status === 'filed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-green-700 bg-green-50">
        <svg fill="none" height="10" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="10">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Filed
      </span>
    );
  }
  const urgent = daysLeft <= 5;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${urgent ? 'text-red-700 bg-red-50' : 'text-amber-700 bg-amber-50'}`}>
      <svg fill="none" height="10" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="10">
        <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
      {urgent ? `Due in ${daysLeft}d` : 'Pending'}
    </span>
  );
}

export function GstDashboard() {
  const [stats, setStats]           = useState(EMPTY_STATS);
  const [calendar, setCalendar]     = useState([]);
  const [trend, setTrend]           = useState([]);
  const [currentPeriod, setPeriod]  = useState('');
  const [gstin, setGstin]           = useState('');
  const [bizSettings, setBizSettings] = useState({});
  const [loading, setLoading]       = useState(true);
  const [showWorkflow, setShowWorkflow] = useState(false);

  useEffect(() => {
    api.getSettings().then(setBizSettings).catch(() => {});
  }, []);

  useEffect(() => {
    gstService.getDashboard()
      .then((data) => {
        if (data) {
          setStats(data.stats ?? EMPTY_STATS);
          setCalendar(data.filingCalendar ?? []);
          setTrend(data.monthlyTrend ?? []);
          setPeriod(data.currentPeriod ?? '');
          setGstin(data.gstin ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxTrend = Math.max(...trend.map((r) => r.output), 1);
  const pendingFilings = calendar.filter((r) => r.status === 'pending');
  const nextFiling = pendingFilings[0];

  const dynamicActions = [
    { label: `File GSTR-1${currentPeriod ? ` for ${currentPeriod}` : ''}`, href: '/gstr-1', urgent: true },
    { label: `File GSTR-3B${currentPeriod ? ` for ${currentPeriod}` : ''}`, href: '/gstr-3b', urgent: true },
    { label: 'Reconcile GSTR-2B', href: '/gst-reconciliation', urgent: false },
    { label: 'Download GST Reports', href: '/gst-reports', urgent: false },
  ];

  return (
    <div className="p-4 md:p-7">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-1 text-[13px] text-[#536173]">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span>
            <span>GST</span>
            <span>›</span>
            <span>Dashboard</span>
          </nav>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="m-0 text-[22px] font-bold">GST Dashboard</h1>
            {currentPeriod && (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold text-blue-700 bg-blue-50">
                {currentPeriod}
              </span>
            )}
            {loading && <span className="text-xs text-[#536173]">Loading…</span>}
          </div>
          <div className="text-[13px] text-[#536173]">GSTIN: {gstin || '—'} · {bizSettings.businessName || 'GoBook Enterprises'}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]"
            type="button"
            onClick={() => setShowWorkflow(v => !v)}
          >
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            {showWorkflow ? 'Hide Guide' : 'Show Guide'}
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Export
          </button>
          <a className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-white bg-blue-600 border border-blue-600 rounded-md cursor-pointer hover:bg-blue-700 no-underline" href="/gstr-1">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            File Returns
          </a>
        </div>
      </div>

      {/* ── Alert Banner ── */}
      {pendingFilings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-3.5 mb-5 flex items-center gap-3">
          <svg fill="none" height="16" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24" width="16" className="flex-none">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
          <div className="text-[13px] text-amber-800">
            <strong>{pendingFilings.length} return{pendingFilings.length > 1 ? 's' : ''} pending.</strong>{' '}
            <a className="font-semibold underline" href="/gstr-1">File GSTR-1 now →</a>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-lg px-5 py-4 mb-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wide text-[#536173]">Recommended next step</div>
          <div className="text-[15px] font-semibold text-[#111827] mt-1">
            {nextFiling ? `${nextFiling.return} for ${nextFiling.period}` : 'All GST returns are up to date'}
          </div>
          <div className="text-[13px] text-[#536173] mt-0.5">
            {nextFiling
              ? `Due date: ${nextFiling.dueDate}. Review values, post accounting if needed, then file.`
              : 'Review reports or reconcile purchases when new data is available.'}
          </div>
        </div>
        <a
          className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-semibold text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 no-underline"
          href={nextFiling?.href || '#gst-reports'}
        >
          {nextFiling ? 'Open Return' : 'View Reports'}
        </a>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STAT_CARD_CONFIG.map((cfg) => (
          <div key={cfg.key} className="bg-white border border-[#dfe7f1] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-[#536173] font-medium leading-snug">{cfg.label(currentPeriod)}</div>
              <div className="rounded-lg p-2 flex-none" style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.icon}
              </div>
            </div>
            <div className="text-[26px] font-bold leading-none mb-1.5" style={{ color: cfg.color }}>
              {cfg.display ? String(stats[cfg.key]) : formatCurrency(stats[cfg.key] ?? 0)}
            </div>
            <div className="text-xs text-[#536173]">{cfg.sub}</div>
          </div>
        ))}
      </div>

      {/* ── GST Filing Workflow Guide ── */}
      {showWorkflow && (
        <div className="bg-white border border-[#dfe7f1] rounded-lg mb-6">
          <div className="px-5 py-4 border-b border-[#edf2f7] flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold m-0">How GST Filing Works — Monthly Workflow</h2>
              <p className="text-[12px] text-[#536173] m-0 mt-0.5">Follow these 4 steps every month to stay GST-compliant</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-[#edf2f7]">
            {WORKFLOW_STEPS.map((step) => (
              <div key={step.num} className="p-5 relative">
                {/* Step connector arrow (desktop only) */}
                {step.num < 4 && (
                  <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10">
                    <svg fill="none" height="16" stroke="#cbd5e1" strokeWidth="2" viewBox="0 0 24 24" width="16">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-none text-sm font-bold"
                    style={{ background: step.bg, color: step.color }}
                  >
                    {step.num}
                  </div>
                  <div className="font-semibold text-[13px] text-[#111827]">{step.title}</div>
                </div>
                <p className="text-[12px] text-[#536173] m-0 mb-3 leading-relaxed">{step.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: step.bg, color: step.color }}>
                    Due: {step.due}
                  </span>
                  {step.href && (
                    <a className="text-[12px] font-medium no-underline hover:underline" href={step.href} style={{ color: step.color }}>
                      Go →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-[#f8fafc] border-t border-[#edf2f7] rounded-b-lg">
            <p className="text-[12px] text-[#536173] m-0">
              <strong>Key terms:</strong>{' '}
              <strong>B2B</strong> = Sales to GST-registered businesses (invoice-wise) ·{' '}
              <strong>B2CS</strong> = Sales to consumers/unregistered buyers (summary) ·{' '}
              <strong>ITC</strong> = Input Tax Credit (GST paid on purchases, offset against output tax) ·{' '}
              <strong>GSTR-2B</strong> = Auto-statement of ITC available based on your suppliers' filings
            </p>
          </div>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">

        {/* Filing Calendar */}
        <div className="bg-white border border-[#dfe7f1] rounded-lg">
          <div className="px-5 py-4 border-b border-[#edf2f7] flex flex-wrap gap-2 justify-between items-center">
            <h2 className="text-[15px] font-semibold m-0">Filing Calendar</h2>
            <span className="text-xs text-[#536173]">Current & upcoming due dates</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Return', 'Period', 'Due Date', 'Status', 'ARN / Action'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calendar.length === 0 ? (
                  <tr>
                    <td className="text-center py-10 text-[#536173] text-[13px]" colSpan={5}>
                      No filings found.
                    </td>
                  </tr>
                ) : (
                  calendar.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px] font-semibold text-[#111827]">{row.return}</td>
                      <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{row.period}</td>
                      <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{row.dueDate}</td>
                      <td className="px-5 py-3 border-b border-[#f3f4f6]">
                        <FilingStatusBadge daysLeft={row.daysLeft} status={row.status} />
                      </td>
                      <td className="px-5 py-3 border-b border-[#f3f4f6]">
                        {row.status === 'filed' ? (
                          <span className="text-xs text-[#536173] font-mono">{row.arn}</span>
                        ) : (
                          <a className="text-[13px] text-blue-600 font-medium hover:underline no-underline" href={row.href}>
                            File Now →
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-5">

          {/* Monthly Trend */}
          <div className="bg-white border border-[#dfe7f1] rounded-lg p-5">
            <h2 className="text-[15px] font-semibold m-0 mb-4">Monthly Tax Trend</h2>
            <div className="flex flex-col gap-3">
              {trend.length === 0 ? (
                <div className="text-center py-6 text-[#536173] text-[13px]">No data yet.</div>
              ) : (
                trend.map((row) => {
                  const outPct = Math.round((row.output / maxTrend) * 100);
                  const itcPct = Math.round((row.itc / maxTrend) * 100);
                  return (
                    <div key={row.month}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-[#374151]">{row.month}</span>
                        <span className="text-[#536173]">{formatCurrency(row.output)}</span>
                      </div>
                      <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden mb-0.5">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${outPct}%` }} />
                      </div>
                      <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${itcPct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
              <div className="flex items-center gap-4 pt-1 text-xs text-[#536173]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-2 bg-blue-500 rounded-sm" />Output Tax
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-1.5 bg-green-400 rounded-sm" />ITC
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-[#dfe7f1] rounded-lg p-5">
            <h2 className="text-[15px] font-semibold m-0 mb-3">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              {dynamicActions.map((action) => (
                <a
                  key={action.label}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-[13px] font-medium no-underline hover:opacity-90 transition-opacity"
                  href={action.href}
                  style={{
                    borderColor: action.urgent ? '#bfdbfe' : '#e5e7eb',
                    background:  action.urgent ? '#eff6ff' : 'white',
                    color:       action.urgent ? '#1d4ed8' : '#374151',
                  }}
                >
                  {action.label}
                  <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* GST Key Info */}
          <div className="bg-white border border-[#dfe7f1] rounded-lg p-5">
            <h2 className="text-[15px] font-semibold m-0 mb-3">Due Date Reference</h2>
            <div className="flex flex-col gap-2">
              {[
                { label: 'GSTR-1 (Monthly)', due: '11th of next month', color: '#7c3aed' },
                { label: 'GSTR-1 (Quarterly – QRMP)', due: '13th of month after quarter', color: '#7c3aed' },
                { label: 'GSTR-3B', due: '20th of next month', color: '#d97706' },
                { label: 'GSTR-9 (Annual)', due: '31st December', color: '#dc2626' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-[12px] py-1.5 border-b border-[#f3f4f6] last:border-0">
                  <span className="text-[#374151] font-medium">{item.label}</span>
                  <span className="font-semibold" style={{ color: item.color }}>{item.due}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
