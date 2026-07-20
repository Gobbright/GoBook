import { useEffect, useState } from 'react';

import { gstService } from '../../../../../services/gstService.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

function generateFYOptions(count = 3) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed; April = 3
  const currentFYStart = currentMonth >= 3 ? currentYear : currentYear - 1;
  return Array.from({ length: count }, (_, i) => {
    const start = currentFYStart - i;
    return `${start}-${String(start + 1).slice(-2)}`;
  });
}

const FY_OPTIONS = generateFYOptions(3);

const OVERVIEW_CONFIG = [
  { key: 'turnover', label: 'Annual Taxable Turnover', color: '#2563eb' },
  { key: 'outputTax', label: 'Total Output Tax', color: '#dc2626' },
  { key: 'itcClaimed', label: 'Total ITC Claimed', color: '#16a34a' },
  { key: 'cashPaid', label: 'Net Tax Paid in Cash', color: '#d97706' },
];

const EMPTY_OVERVIEW = { turnover: 0, outputTax: 0, itcClaimed: 0, cashPaid: 0 };

const SECTIONS = [
  { id: '4', label: 'Table 4: Outward Supplies' },
  { id: '5', label: 'Table 5: Taxable Supplies Breakup' },
  { id: '6', label: 'Table 6: ITC Claimed' },
  { id: '7', label: 'Table 7: ITC Reversals' },
  { id: '9', label: 'Table 9: Tax Paid' },
  { id: '10', label: 'Table 10–13: Amendments' },
];

const TH_R = 'text-right text-xs font-semibold uppercase tracking-wide text-[#536173] px-3 py-3 border-b border-[#edf2f7]';
const TH_L = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD_R = 'px-3 py-3.5 border-b border-[#f3f4f6] text-[13px] text-right font-mono';
const TD_L = 'px-4 py-3.5 border-b border-[#f3f4f6] text-[13px]';

function sum(arr, field) {
  return arr.reduce((a, r) => a + (r[field] ?? 0), 0);
}

export function Gstr9Page() {
  const [fy, setFy] = useState(FY_OPTIONS[0]);
  const [activeSection, setActiveSection] = useState('4');
  const [gstin, setGstin] = useState('');
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [table4, setTable4] = useState([]);
  const [table5, setTable5] = useState([]);
  const [table6, setTable6] = useState([]);
  const [table7, setTable7] = useState([]);
  const [table9, setTable9] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    gstService.getGstr9(fy)
      .then((data) => {
        setGstin(data?.gstin ?? '');
        setOverview(data?.overview ?? EMPTY_OVERVIEW);
        setTable4(data?.table4 ?? []);
        setTable5(data?.table5 ?? []);
        setTable6(data?.table6 ?? []);
        setTable7(data?.table7 ?? []);
        setTable9(data?.table9 ?? []);
      })
      .catch(() => {
        setGstin('');
        setOverview(EMPTY_OVERVIEW);
        setTable4([]);
        setTable5([]);
        setTable6([]);
        setTable7([]);
        setTable9([]);
      })
      .finally(() => setLoading(false));
  }, [fy]);

  const t4Totals = { taxable: sum(table4, 'taxable'), cgst: sum(table4, 'cgst'), sgst: sum(table4, 'sgst'), igst: sum(table4, 'igst') };
  const t7HasReversals = table7.some((r) => (r.cgst ?? 0) + (r.sgst ?? 0) + (r.igst ?? 0) + (r.cess ?? 0) !== 0);
  const dueYear = Number(fy.split('-')[0]) + 1;

  return (
    <div className="p-4 md:p-7">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-1 text-[13px] text-[#536173]">
            <a className="text-blue-600 no-underline hover:underline" href="#/dashboard">Home</a>
            <span>›</span>
            <a className="text-blue-600 no-underline hover:underline" href="#gst-dashboard">GST</a>
            <span>›</span>
            <span>GSTR-9</span>
          </nav>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="m-0 text-[22px] font-bold">GSTR-9</h1>
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide text-green-700 bg-green-100">
              FY {fy}
            </span>
            {loading && <span className="text-xs text-[#536173]">Loading…</span>}
          </div>
          <div className="text-[13px] text-[#536173] mt-0.5">Annual Return — Consolidation of GSTR-1 and GSTR-3B · GSTIN: {gstin || '—'}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={fy} onChange={(e) => setFy(e.target.value)}>
            {FY_OPTIONS.map((f) => <option key={f} value={f}>FY {f}</option>)}
          </select>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Download GSTR-9
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-white bg-blue-600 border border-blue-600 rounded-md cursor-pointer hover:bg-blue-700 font-[inherit]" type="button">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            File GSTR-9
          </button>
        </div>
      </div>

      {/* ── Annual Overview ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {OVERVIEW_CONFIG.map((s) => (
          <div key={s.key} className="bg-white border border-[#dfe7f1] rounded-lg p-4">
            <div className="text-xs text-[#536173] mb-1.5">{s.label}</div>
            <div className="text-xl font-bold" style={{ color: s.color }}>{formatCurrency(overview[s.key] ?? 0)}</div>
            <div className="text-xs text-[#536173] mt-0.5">FY {fy} (Apr–Mar)</div>
          </div>
        ))}
      </div>

      {/* ── Info Banner ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3.5 mb-5 flex items-center gap-3">
        <svg fill="none" height="16" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24" width="16" className="flex-none">
          <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
        <div className="text-[13px] text-blue-800">
          GSTR-9 is auto-compiled from your GSTR-1 and GSTR-3B filings for FY {fy}. Verify each table and correct any discrepancies before filing.
          Due date: <strong>31 December {dueYear}</strong>
        </div>
      </div>

      {/* ── Section Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">

        {/* Section Nav */}
        <div className="bg-white border border-[#dfe7f1] rounded-lg p-2 flex flex-col gap-0.5 h-fit">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              className={`w-full text-left px-3.5 py-2.5 rounded-md text-[13px] font-medium cursor-pointer border-0 font-[inherit] transition-colors ${activeSection === sec.id ? 'bg-blue-600 text-white' : 'text-[#374151] bg-transparent hover:bg-gray-50'}`}
              type="button"
              onClick={() => setActiveSection(sec.id)}
            >
              {sec.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white border border-[#dfe7f1] rounded-lg overflow-hidden">

          {/* Table 4 */}
          {activeSection === '4' && (
            <>
              <div className="px-5 py-4 border-b border-[#edf2f7]">
                <div className="font-semibold text-[15px]">Table 4: Details of advances, inward and outward supplies made during the FY</div>
                <div className="text-[13px] text-[#536173] mt-1">Auto-compiled from your 12 monthly GSTR-1 returns for FY {fy}.</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-[#f8fafc]">
                      <th className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]" style={{ width: 60 }}>Sl.</th>
                      <th className={TH_L}>Nature of Supplies</th>
                      <th className={TH_R}>Taxable Value (₹)</th>
                      <th className={TH_R}>CGST (₹)</th>
                      <th className={TH_R}>SGST (₹)</th>
                      <th className={TH_R}>IGST (₹)</th>
                      <th className={TH_R}>Cess (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table4.map((row) => {
                      const neg = row.taxable < 0;
                      return (
                        <tr key={row.sno} className="hover:bg-gray-50">
                          <td className="px-4 py-3.5 border-b border-[#f3f4f6] text-[13px] font-semibold text-[#374151]">{row.sno}</td>
                          <td className={TD_L}>{row.desc}</td>
                          <td className={`${TD_R} ${neg ? 'text-red-600' : ''}`}>{row.taxable !== 0 ? formatCurrency(Math.abs(row.taxable)) : '—'}{neg && ' (CR)'}</td>
                          <td className={`${TD_R} ${neg ? 'text-red-600' : ''}`}>{row.cgst !== 0 ? formatCurrency(Math.abs(row.cgst)) : '—'}</td>
                          <td className={`${TD_R} ${neg ? 'text-red-600' : ''}`}>{row.sgst !== 0 ? formatCurrency(Math.abs(row.sgst)) : '—'}</td>
                          <td className={`${TD_R} ${neg ? 'text-red-600' : ''}`}>{row.igst !== 0 ? formatCurrency(Math.abs(row.igst)) : '—'}</td>
                          <td className={TD_R}>{formatCurrency(row.cess)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#f0f9ff]">
                      <td className="px-4 py-3.5 text-[13px] font-bold" colSpan={2}>Net Total</td>
                      <td className="px-3 py-3.5 text-[13px] text-right font-bold font-mono text-blue-700">{formatCurrency(t4Totals.taxable)}</td>
                      <td className="px-3 py-3.5 text-[13px] text-right font-bold font-mono text-blue-700">{formatCurrency(t4Totals.cgst)}</td>
                      <td className="px-3 py-3.5 text-[13px] text-right font-bold font-mono text-blue-700">{formatCurrency(t4Totals.sgst)}</td>
                      <td className="px-3 py-3.5 text-[13px] text-right font-bold font-mono text-blue-700">{formatCurrency(t4Totals.igst)}</td>
                      <td className="px-3 py-3.5 text-[13px] text-right font-bold font-mono text-blue-700">—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {/* Table 5 */}
          {activeSection === '5' && (
            <>
              <div className="px-5 py-4 border-b border-[#edf2f7]">
                <div className="font-semibold text-[15px]">Table 5: Particulars of the transactions for the FY declared in returns of FY</div>
              </div>
              <div className="p-5 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc]">
                      <th className={TH_L}>Category</th>
                      <th className={TH_R}>Taxable Value (₹)</th>
                      <th className={TH_R}>Central Tax (₹)</th>
                      <th className={TH_R}>State Tax (₹)</th>
                      <th className={TH_R}>Integrated Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table5.map((r) => (
                      <tr key={r.cat} className="hover:bg-gray-50">
                        <td className={TD_L}>{r.cat}</td>
                        <td className={TD_R}>{formatCurrency(r.taxable)}</td>
                        <td className={TD_R}>{r.cgst > 0 ? formatCurrency(r.cgst) : '—'}</td>
                        <td className={TD_R}>{r.sgst > 0 ? formatCurrency(r.sgst) : '—'}</td>
                        <td className={TD_R}>{r.igst > 0 ? formatCurrency(r.igst) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Table 6 */}
          {activeSection === '6' && (
            <>
              <div className="px-5 py-4 border-b border-[#edf2f7]">
                <div className="font-semibold text-[15px]">Table 6: Details of ITC availed as declared in returns filed during the FY</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc]">
                      <th className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]" style={{ width: 60 }}>Sl.</th>
                      <th className={TH_L}>Details</th>
                      <th className={TH_R}>CGST (₹)</th>
                      <th className={TH_R}>SGST (₹)</th>
                      <th className={TH_R}>IGST (₹)</th>
                      <th className={TH_R}>Cess (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table6.map((row) => (
                      <tr key={row.sno} className="hover:bg-gray-50">
                        <td className="px-4 py-3.5 border-b border-[#f3f4f6] text-[13px] font-semibold text-[#374151]">{row.sno}</td>
                        <td className={TD_L}>{row.desc}</td>
                        <td className={TD_R}>{formatCurrency(row.cgst)}</td>
                        <td className={TD_R}>{formatCurrency(row.sgst)}</td>
                        <td className={TD_R}>{formatCurrency(row.igst)}</td>
                        <td className={TD_R}>{formatCurrency(row.cess)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Table 7 */}
          {activeSection === '7' && (
            <>
              <div className="px-5 py-4 border-b border-[#edf2f7]">
                <div className="font-semibold text-[15px]">Table 7: Details of ITC Reversed and Ineligible ITC</div>
              </div>
              {t7HasReversals ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#f8fafc]">
                        <th className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]" style={{ width: 60 }}>Sl.</th>
                        <th className={TH_L}>Details</th>
                        <th className={TH_R}>CGST (₹)</th>
                        <th className={TH_R}>SGST (₹)</th>
                        <th className={TH_R}>IGST (₹)</th>
                        <th className={TH_R}>Cess (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table7.map((row) => (
                        <tr key={row.sno} className="hover:bg-gray-50">
                          <td className="px-4 py-3.5 border-b border-[#f3f4f6] text-[13px] font-semibold text-[#374151]">{row.sno}</td>
                          <td className={TD_L}>{row.desc}</td>
                          <td className={TD_R}>{formatCurrency(row.cgst)}</td>
                          <td className={TD_R}>{formatCurrency(row.sgst)}</td>
                          <td className={TD_R}>{formatCurrency(row.igst)}</td>
                          <td className={TD_R}>{formatCurrency(row.cess)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5 text-center text-[#536173]">
                  <div className="text-[15px] font-medium">No ITC reversals for FY {fy}</div>
                  <div className="text-[13px] mt-1">Rule 42/43 reversals, blocked credits (Section 17(5)) will appear here if applicable.</div>
                </div>
              )}
            </>
          )}

          {/* Table 9 */}
          {activeSection === '9' && (
            <>
              <div className="px-5 py-4 border-b border-[#edf2f7]">
                <div className="font-semibold text-[15px]">Table 9: Details of Tax Paid as Declared in Returns Filed During the FY</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc]">
                      <th className={TH_L}>Description</th>
                      <th className={TH_R}>CGST (₹)</th>
                      <th className={TH_R}>SGST (₹)</th>
                      <th className={TH_R}>IGST (₹)</th>
                      <th className={TH_R}>Cess (₹)</th>
                      <th className={TH_R}>Interest (₹)</th>
                      <th className={TH_R}>Late Fee (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table9.map((row, i) => (
                      <tr key={i} className={i === 2 ? 'bg-[#fffbeb]' : 'hover:bg-gray-50'}>
                        <td className={`${TD_L} ${i === 2 ? 'font-semibold' : ''}`}>{row.desc}</td>
                        <td className={`${TD_R} ${i === 2 ? 'font-bold text-amber-700' : ''}`}>{formatCurrency(row.cgst)}</td>
                        <td className={`${TD_R} ${i === 2 ? 'font-bold text-amber-700' : ''}`}>{formatCurrency(row.sgst)}</td>
                        <td className={`${TD_R} ${i === 2 ? 'font-bold text-amber-700' : ''}`}>{formatCurrency(row.igst)}</td>
                        <td className={TD_R}>{formatCurrency(row.cess)}</td>
                        <td className={TD_R}>{formatCurrency(row.interest)}</td>
                        <td className={TD_R}>{formatCurrency(row.late)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Table 10–13 */}
          {activeSection === '10' && (
            <>
              <div className="px-5 py-4 border-b border-[#edf2f7]">
                <div className="font-semibold text-[15px]">Tables 10–13: Supplies / Tax declared through Amendments</div>
              </div>
              <div className="flex flex-col items-center justify-center py-16 text-[#536173]">
                <svg fill="none" height="48" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24" width="48">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <div className="text-[15px] font-medium mt-4">No amendments for FY {fy}</div>
                <div className="text-[13px] mt-1">Amendments to outward supplies, debit/credit notes will appear here.</div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
