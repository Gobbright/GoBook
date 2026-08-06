import { useEffect, useState } from 'react';
import { IndianRupee } from 'lucide-react';

import { api } from '../../../../../services/api.js';
import { gstService } from '../../../../../services/gstService.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const REPORT_TYPES = [
  { id: 'hsn-summary', label: 'HSN / SAC Summary', icon: (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><rect height="18" rx="2" ry="2" width="18" x="3" y="3" /><line x1="3" x2="21" y1="9" y2="9" /><line x1="9" x2="9" y1="21" y2="9" /></svg>
  ) },
  { id: 'tax-rate', label: 'Tax Rate-wise Summary', icon: <IndianRupee size={16} /> },
  { id: 'state-wise', label: 'State-wise Supplies', icon: (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ) },
  { id: 'customer', label: 'Customer-wise Sales', icon: (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
  ) },
  { id: 'supplier', label: 'Supplier-wise Purchases', icon: (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" x2="21" y1="6" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
  ) },
  { id: 'itc', label: 'ITC Utilisation', icon: (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
  ) },
];

function generateReportPeriods() {
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  });
  // Add current FY
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return [...monthly, `FY ${fyStart}-${String(fyStart + 1).slice(-2)}`];
}

const PERIOD_OPTIONS = generateReportPeriods();

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD = 'px-4 py-3.5 border-b border-[#f3f4f6] text-[13px]';

function sumArr(arr, f) { return arr.reduce((a, r) => a + (r[f] ?? 0), 0); }

export function GstReports() {
  const [activeReport, setActiveReport] = useState('hsn-summary');
  const [period, setPeriod]             = useState(PERIOD_OPTIONS[0]);
  const [reportData, setReportData]     = useState({});
  const [loading, setLoading]           = useState(false);
  const [bizSettings, setBizSettings]   = useState({});

  useEffect(() => {
    api.getSettings().then(setBizSettings).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeReport === 'supplier') return;
    setLoading(true);
    gstService.getReport(activeReport, period)
      .then(({ data }) => {
        setReportData((prev) => ({
          ...prev,
          [`${activeReport}:${period}`]: data ?? [],
        }));
      })
      .catch(() => {
        setReportData((prev) => ({
          ...prev,
          [`${activeReport}:${period}`]: [],
        }));
      })
      .finally(() => setLoading(false));
  }, [activeReport, period]);

  function getData() {
    return reportData[`${activeReport}:${period}`] ?? [];
  }

  const data = getData();
  const currentReport = REPORT_TYPES.find((r) => r.id === activeReport);

  // Quick stats derived from tax-rate report data
  const trData = reportData[`tax-rate:${period}`] ?? [];
  const qStats = {
    outputTax:  sumArr(trData, 'cgst') * 2 + sumArr(trData, 'igst'),
    taxable:    sumArr(trData, 'taxable'),
    customers:  (reportData[`customer:${period}`] ?? []).length,
    states:     (reportData[`state-wise:${period}`] ?? []).length,
  };

  return (
    <div className="p-4 md:p-7">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-1 text-[13px] text-[#536173]">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span>
            <a className="text-blue-600 no-underline hover:underline" href="/gst-dashboard">GST</a>
            <span>›</span>
            <span>Reports</span>
          </nav>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="m-0 text-[22px] font-bold">GST Reports</h1>
            {loading && <span className="text-xs text-[#536173]">Loading…</span>}
          </div>
          <div className="text-[13px] text-[#536173] mt-0.5">Detailed tax analytics and compliance reports for your business</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SelectDropdown className="w-36 flex-none" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Export Excel
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-white bg-blue-600 border border-blue-600 rounded-md cursor-pointer hover:bg-blue-700 font-[inherit]" type="button">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Output Tax',              value: formatCurrency(qStats.outputTax),   sub: `All rate slabs · ${period}` },
          { label: 'Total Taxable Turnover',  value: formatCurrency(qStats.taxable),     sub: 'Excl. exempt / nil' },
          { label: 'Unique Customers',        value: `${qStats.customers}+`,             sub: 'With GST invoices' },
          { label: 'States Covered',          value: String(qStats.states),              sub: 'Inter + intra-state' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-lg p-4">
            <div className="text-xs text-[#536173] mb-1.5">{s.label}</div>
            <div className="text-xl font-bold text-[#111827]">{s.value}</div>
            <div className="text-xs text-[#536173] mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main: Sidebar + Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">

        {/* Report Type Selector */}
        <div className="bg-white border border-[#dfe7f1] rounded-lg p-2 flex flex-col gap-0.5 h-fit">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#536173] px-3 py-2">Report Type</div>
          {REPORT_TYPES.map((rpt) => (
            <button
              key={rpt.id}
              className={`flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 rounded-md text-[13px] font-medium cursor-pointer border-0 font-[inherit] transition-colors ${activeReport === rpt.id ? 'bg-blue-600 text-white' : 'text-[#374151] bg-transparent hover:bg-gray-50'}`}
              type="button"
              onClick={() => setActiveReport(rpt.id)}
            >
              <span className="flex-none">{rpt.icon}</span>
              {rpt.label}
            </button>
          ))}
        </div>

        {/* Report Content */}
        <div className="bg-white border border-[#dfe7f1] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#edf2f7] flex flex-wrap gap-2 justify-between items-center">
            <div>
              <div className="font-semibold text-[15px]">{currentReport?.label}</div>
              <div className="text-[13px] text-[#536173] mt-0.5">Period: {period} · GSTIN: {bizSettings.gstin || '—'}</div>
            </div>
          </div>

          {/* HSN Summary */}
          {activeReport === 'hsn-summary' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-225">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    {['HSN / SAC', 'Description', 'UQC', 'Quantity', 'Taxable Value', 'Rate', 'CGST', 'SGST', 'IGST', 'Total Tax'].map((h) => (
                      <th key={h} className={`${TH} ${['Quantity', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax'].includes(h) ? 'text-right' : h === 'Rate' ? 'text-center' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td className="text-center py-12 text-[#536173] text-[13px]" colSpan={10}>
                        No HSN summary data for {period}.
                      </td>
                    </tr>
                  ) : (
                  data.map((row, i) => {
                    const tax = row.cgst + row.sgst + row.igst;
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className={`${TD} font-mono font-semibold text-[#111827]`}>{row.hsn}</td>
                        <td className={TD}>{row.desc}</td>
                        <td className={TD}>{row.uqc}</td>
                        <td className={`${TD} text-right`}>{row.qty?.toLocaleString('en-IN')}</td>
                        <td className={`${TD} text-right font-medium`}>{formatCurrency(row.taxable)}</td>
                        <td className={`${TD} text-center`}>
                          <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">{row.rate}%</span>
                        </td>
                        <td className={`${TD} text-right`}>{row.cgst > 0 ? formatCurrency(row.cgst) : <span className="text-[#cbd5e1]">—</span>}</td>
                        <td className={`${TD} text-right`}>{row.sgst > 0 ? formatCurrency(row.sgst) : <span className="text-[#cbd5e1]">—</span>}</td>
                        <td className={`${TD} text-right`}>{row.igst > 0 ? formatCurrency(row.igst) : <span className="text-[#cbd5e1]">—</span>}</td>
                        <td className={`${TD} text-right font-semibold text-[#111827]`}>{formatCurrency(tax)}</td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#f0f9ff]">
                    <td className="px-4 py-3.5 font-bold text-[13px]" colSpan={4}>Total</td>
                    <td className="px-4 py-3.5 text-right font-bold text-[13px]">{formatCurrency(sumArr(data,'taxable'))}</td>
                    <td />
                    <td className="px-4 py-3.5 text-right font-bold text-[13px] text-blue-700">{formatCurrency(sumArr(data,'cgst'))}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-[13px] text-blue-700">{formatCurrency(sumArr(data,'sgst'))}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-[13px] text-blue-700">{formatCurrency(sumArr(data,'igst'))}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-[13px] text-blue-700">{formatCurrency(sumArr(data,'cgst')+sumArr(data,'sgst')+sumArr(data,'igst'))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Tax Rate-wise */}
          {activeReport === 'tax-rate' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    {['GST Rate', 'No. of Invoices', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax', '% of Total Tax'].map((h) => (
                      <th key={h} className={`${TH} ${h !== 'GST Rate' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td className="text-center py-12 text-[#536173] text-[13px]" colSpan={8}>
                        No tax rate-wise data for {period}.
                      </td>
                    </tr>
                  ) : (
                  data.map((row) => {
                    const totalTax = sumArr(data,'cgst') + sumArr(data,'sgst') + sumArr(data,'igst');
                    const rowTax   = row.cgst + row.sgst + row.igst;
                    const pct      = totalTax > 0 ? Math.round((rowTax / totalTax) * 100) : 0;
                    return (
                      <tr key={row.rate} className="hover:bg-gray-50">
                        <td className={TD}>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${row.rate === 0 ? 'bg-gray-100 text-gray-600' : row.rate <= 12 ? 'bg-green-50 text-green-700' : row.rate === 18 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                            {row.rate}%
                          </span>
                        </td>
                        <td className={`${TD} text-right`}>{row.invoices}</td>
                        <td className={`${TD} text-right font-medium`}>{formatCurrency(row.taxable)}</td>
                        <td className={`${TD} text-right`}>{row.cgst > 0 ? formatCurrency(row.cgst) : '—'}</td>
                        <td className={`${TD} text-right`}>{row.sgst > 0 ? formatCurrency(row.sgst) : '—'}</td>
                        <td className={`${TD} text-right`}>{row.igst > 0 ? formatCurrency(row.igst) : '—'}</td>
                        <td className={`${TD} text-right font-semibold`}>{formatCurrency(rowTax)}</td>
                        <td className={`${TD} text-right`}>
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden w-16">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[#536173] w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#f0f9ff]">
                    <td className={`${TD} font-bold`}>Total</td>
                    <td className={`${TD} text-right font-bold`}>{sumArr(data,'invoices')}</td>
                    <td className={`${TD} text-right font-bold`}>{formatCurrency(sumArr(data,'taxable'))}</td>
                    <td className={`${TD} text-right font-bold text-blue-700`}>{formatCurrency(sumArr(data,'cgst'))}</td>
                    <td className={`${TD} text-right font-bold text-blue-700`}>{formatCurrency(sumArr(data,'sgst'))}</td>
                    <td className={`${TD} text-right font-bold text-blue-700`}>{formatCurrency(sumArr(data,'igst'))}</td>
                    <td className={`${TD} text-right font-bold text-blue-700`}>{formatCurrency(sumArr(data,'cgst')+sumArr(data,'sgst')+sumArr(data,'igst'))}</td>
                    <td className={TD} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* State-wise */}
          {activeReport === 'state-wise' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    {['State / UT', 'Supply Type', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax'].map((h) => (
                      <th key={h} className={`${TH} ${'Taxable Value|CGST|SGST|IGST|Total Tax'.includes(h) ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td className="text-center py-12 text-[#536173] text-[13px]" colSpan={7}>
                        No state-wise data for {period}.
                      </td>
                    </tr>
                  ) : (
                  data.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className={`${TD} font-medium`}>{row.state}</td>
                      <td className={TD}>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${row.type === 'Intrastate' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                          {row.type}
                        </span>
                      </td>
                      <td className={`${TD} text-right font-medium`}>{formatCurrency(row.taxable)}</td>
                      <td className={`${TD} text-right`}>{row.cgst > 0 ? formatCurrency(row.cgst) : <span className="text-[#cbd5e1]">—</span>}</td>
                      <td className={`${TD} text-right`}>{row.sgst > 0 ? formatCurrency(row.sgst) : <span className="text-[#cbd5e1]">—</span>}</td>
                      <td className={`${TD} text-right`}>{row.igst > 0 ? formatCurrency(row.igst) : <span className="text-[#cbd5e1]">—</span>}</td>
                      <td className={`${TD} text-right font-semibold`}>{formatCurrency(row.cgst + row.sgst + row.igst)}</td>
                    </tr>
                  ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#f0f9ff]">
                    <td className={`${TD} font-bold`} colSpan={2}>Total</td>
                    <td className={`${TD} text-right font-bold`}>{formatCurrency(sumArr(data,'taxable'))}</td>
                    <td className={`${TD} text-right font-bold text-blue-700`}>{formatCurrency(sumArr(data,'cgst'))}</td>
                    <td className={`${TD} text-right font-bold text-blue-700`}>{formatCurrency(sumArr(data,'sgst'))}</td>
                    <td className={`${TD} text-right font-bold text-blue-700`}>{formatCurrency(sumArr(data,'igst'))}</td>
                    <td className={`${TD} text-right font-bold text-blue-700`}>{formatCurrency(sumArr(data,'cgst')+sumArr(data,'sgst')+sumArr(data,'igst'))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Customer-wise */}
          {activeReport === 'customer' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    {['Customer Name', 'GSTIN', 'Invoices', 'Taxable Value', 'Total Tax', 'Last Invoice'].map((h) => (
                      <th key={h} className={`${TH} ${'Invoices|Taxable Value|Total Tax'.includes(h) ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td className="text-center py-12 text-[#536173] text-[13px]" colSpan={6}>
                        No customer-wise data for {period}.
                      </td>
                    </tr>
                  ) : (
                  data.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className={`${TD} font-medium text-[#111827]`}>{row.name}</td>
                      <td className={`${TD} font-mono text-xs text-[#374151]`}>{row.gstin}</td>
                      <td className={`${TD} text-right`}>{row.invoices}</td>
                      <td className={`${TD} text-right font-medium`}>{formatCurrency(row.taxable)}</td>
                      <td className={`${TD} text-right font-semibold text-[#111827]`}>{formatCurrency(row.tax)}</td>
                      <td className={`${TD} text-[#536173]`}>{row.lastInv}</td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ITC Utilisation */}
          {activeReport === 'itc' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    {['Month', 'ITC Available', 'ITC Utilised', 'ITC Reversed', 'Net ITC', 'Utilisation %'].map((h) => (
                      <th key={h} className={`${TH} ${h !== 'Month' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td className="text-center py-12 text-[#536173] text-[13px]" colSpan={6}>
                        No ITC utilisation data for {period}.
                      </td>
                    </tr>
                  ) : (
                  data.map((row, i) => {
                    const pct = row.available > 0 ? Math.round((row.utilised / row.available) * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className={`${TD} font-medium`}>{row.month} 2026</td>
                        <td className={`${TD} text-right`}>{formatCurrency(row.available)}</td>
                        <td className={`${TD} text-right font-medium text-green-700`}>{formatCurrency(row.utilised)}</td>
                        <td className={`${TD} text-right ${row.reversal > 0 ? 'text-red-600' : 'text-[#536173]'}`}>{row.reversal > 0 ? formatCurrency(row.reversal) : '—'}</td>
                        <td className={`${TD} text-right font-semibold`}>{formatCurrency(row.net)}</td>
                        <td className={`${TD} text-right`}>
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden w-16">
                              <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[13px] font-medium w-8">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#f0fdf4]">
                    <td className={`${TD} font-bold`}>Total (YTD)</td>
                    <td className={`${TD} text-right font-bold text-green-700`}>{formatCurrency(sumArr(data,'available'))}</td>
                    <td className={`${TD} text-right font-bold text-green-700`}>{formatCurrency(sumArr(data,'utilised'))}</td>
                    <td className={`${TD} text-right font-bold text-red-600`}>{formatCurrency(sumArr(data,'reversal'))}</td>
                    <td className={`${TD} text-right font-bold text-green-700`}>{formatCurrency(sumArr(data,'net'))}</td>
                    <td className={TD} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Supplier-wise (placeholder) */}
          {activeReport === 'supplier' && (
            <div className="flex flex-col items-center justify-center py-16 text-[#536173]">
              <svg fill="none" height="48" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24" width="48">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" x2="21" y1="6" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <div className="text-[15px] font-medium mt-4">Supplier-wise Purchase Report</div>
              <div className="text-[13px] mt-1 text-center max-w-xs">
                Consolidated view of all purchase invoices grouped by supplier. Sync your purchase ledger to generate this report.
              </div>
              <button className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md cursor-pointer hover:bg-blue-100 font-[inherit]" type="button">
                Sync Purchases →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
