import { useEffect, useState } from 'react';

import { api } from '../../../../../services/api.js';
import { gstService } from '../../../../../services/gstService.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const GST_RATES = [0, 5, 12, 18, 28];
const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman & Nicobar Islands','Chandigarh','Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry'];

function generatePeriods(count = 12) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  });
}

const PERIODS = generatePeriods(12);

const TABS = [
  { id: 'b2b',     label: 'B2B' },
  { id: 'b2cs',    label: 'B2CS' },
  { id: 'cdnr',    label: 'CDNR' },
  { id: 'exports', label: 'Exports' },
  { id: 'hsn',     label: 'HSN Summary' },
  { id: 'docs',    label: 'Documents' },
];

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD = 'px-4 py-3 border-b border-[#f3f4f6] text-[13px]';
const INPUT_CLS = 'border border-[#dbe4ef] rounded px-2.5 py-1.5 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit] bg-white';

const EMPTY_B2B = { gstin: '', name: '', invoiceNo: '', date: '', taxable: '', rate: 18, supplyType: 'Intrastate' };
const EMPTY_B2CS = { state: 'Maharashtra', supplyType: 'Intrastate', taxable: '', rate: 18 };

function calcB2bTax(row) {
  const taxable = parseFloat(row.taxable) || 0;
  const rate = parseFloat(row.rate) || 0;
  const totalTax = (taxable * rate) / 100;
  const isIntra = row.supplyType === 'Intrastate';
  return {
    value: Math.round((taxable + totalTax) * 100) / 100,
    taxable: Math.round(taxable * 100) / 100,
    cgst: isIntra ? Math.round((totalTax / 2) * 100) / 100 : 0,
    sgst: isIntra ? Math.round((totalTax / 2) * 100) / 100 : 0,
    igst: isIntra ? 0 : Math.round(totalTax * 100) / 100,
  };
}

function calcB2csTax(row) {
  const taxable = parseFloat(row.taxable) || 0;
  const rate = parseFloat(row.rate) || 0;
  const totalTax = (taxable * rate) / 100;
  const isIntra = row.supplyType === 'Intrastate';
  return {
    taxable: Math.round(taxable * 100) / 100,
    cgst: isIntra ? Math.round((totalTax / 2) * 100) / 100 : 0,
    sgst: isIntra ? Math.round((totalTax / 2) * 100) / 100 : 0,
    igst: isIntra ? 0 : Math.round(totalTax * 100) / 100,
  };
}

function sum(arr, key) { return arr.reduce((a, r) => a + (r[key] ?? 0), 0); }

export function Gstr1Page() {
  const [period, setPeriod]       = useState(PERIODS[0]);
  const [filing, setFiling]       = useState('monthly');
  const [activeTab, setActiveTab] = useState('b2b');

  const [b2b, setB2b]   = useState([]);
  const [b2cs, setB2cs] = useState([]);
  const [hsn, setHsn]   = useState([]);
  const [status, setStatus] = useState('draft');

  const [bizSettings, setBizSettings] = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [filing2, setFiling2]   = useState(false);
  const [populating, setPopulating] = useState(false);
  const [toast, setToast]       = useState(null);

  // Add-row state
  const [addingB2b, setAddingB2b]   = useState(false);
  const [newB2b, setNewB2b]         = useState(EMPTY_B2B);
  const [addingB2cs, setAddingB2cs] = useState(false);
  const [newB2cs, setNewB2cs]       = useState(EMPTY_B2CS);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    api.getSettings().then(setBizSettings).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    gstService.getGstr1(period, filing)
      .then((data) => {
        setB2b(data?.b2b ?? []);
        setB2cs(data?.b2cs ?? []);
        setHsn(data?.hsn ?? []);
        setStatus(data?.status ?? 'draft');
      })
      .catch(() => showToast('Failed to load data', false))
      .finally(() => setLoading(false));
  }, [period, filing]);

  async function handleSaveDraft() {
    setSaving(true);
    try {
      await gstService.saveGstr1({ period, filingType: filing, b2b, b2cs, hsn, status: 'draft' });
      setStatus('draft');
      showToast('Draft saved successfully');
    } catch {
      showToast('Failed to save draft', false);
    } finally {
      setSaving(false);
    }
  }

  async function handleFile() {
    if (b2b.length === 0 && b2cs.length === 0) {
      showToast('Add at least one invoice before filing', false);
      return;
    }
    setFiling2(true);
    try {
      // Save latest data first, then file
      await gstService.saveGstr1({ period, filingType: filing, b2b, b2cs, hsn, status: 'draft' });
      const data = await gstService.fileGstr1(period, filing);
      setStatus('filed');
      showToast(`GSTR-1 filed! ARN: ${data.arn}`);
    } catch {
      showToast('Failed to file GSTR-1', false);
    } finally {
      setFiling2(false);
    }
  }

  async function handleAutoPopulate() {
    setPopulating(true);
    try {
      const data = await gstService.autoPopulateGstr1(period, filing);
      if (!data || (data.b2b.length === 0 && data.b2cs.length === 0)) {
        showToast('No sales invoices found for this period', false);
        return;
      }
      setB2b(data.b2b ?? []);
      setB2cs(data.b2cs ?? []);
      setHsn(data.hsn ?? []);
      showToast(`Pulled ${data.b2b.length} B2B and ${data.b2cs.length} B2CS entries from invoices`);
    } catch {
      showToast('Failed to pull from invoices', false);
    } finally {
      setPopulating(false);
    }
  }

  function handleAddB2b() {
    if (!newB2b.taxable || parseFloat(newB2b.taxable) <= 0) {
      showToast('Enter a valid taxable amount', false);
      return;
    }
    const taxes = calcB2bTax(newB2b);
    setB2b(prev => [...prev, { ...newB2b, ...taxes }]);
    setNewB2b(EMPTY_B2B);
    setAddingB2b(false);
    showToast('Invoice added');
  }

  function handleAddB2cs() {
    if (!newB2cs.taxable || parseFloat(newB2cs.taxable) <= 0) {
      showToast('Enter a valid taxable amount', false);
      return;
    }
    const taxes = calcB2csTax(newB2cs);
    setB2cs(prev => [...prev, { ...newB2cs, rate: parseFloat(newB2cs.rate), ...taxes }]);
    setNewB2cs(EMPTY_B2CS);
    setAddingB2cs(false);
    showToast('B2CS entry added');
  }

  const b2bTotals  = { value: sum(b2b,'value'), taxable: sum(b2b,'taxable'), cgst: sum(b2b,'cgst'), sgst: sum(b2b,'sgst'), igst: sum(b2b,'igst') };
  const b2csTotals = { taxable: sum(b2cs,'taxable'), cgst: sum(b2cs,'cgst'), sgst: sum(b2cs,'sgst'), igst: sum(b2cs,'igst') };
  const grandTaxable = b2bTotals.taxable + b2csTotals.taxable;
  const grandTax     = b2bTotals.cgst + b2bTotals.sgst + b2bTotals.igst + b2csTotals.cgst + b2csTotals.sgst + b2csTotals.igst;

  const tabsWithCount = TABS.map((t) => ({
    ...t,
    count: t.id === 'b2b' ? b2b.length : t.id === 'b2cs' ? b2cs.length : t.id === 'hsn' ? hsn.length : 0,
  }));

  const locked = status === 'filed';

  return (
    <div className="p-4 md:p-7">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-1 text-[13px] text-[#536173]">
            <a className="text-blue-600 no-underline hover:underline" href="//dashboard">Home</a>
            <span>›</span>
            <a className="text-blue-600 no-underline hover:underline" href="/gst-dashboard">GST</a>
            <span>›</span>
            <span>GSTR-1</span>
          </nav>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="m-0 text-[22px] font-bold">GSTR-1</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide ${locked ? 'text-green-700 bg-green-100' : 'text-amber-700 bg-amber-100'}`}>
              {locked ? 'Filed' : 'Draft'}
            </span>
            {loading && <span className="text-xs text-[#536173]">Loading…</span>}
          </div>
          <div className="text-[13px] text-[#536173] mt-0.5">Details of Outward Supplies — B2B (invoice-wise) and B2CS (summary)</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border border-[#dbe4ef] overflow-hidden text-[13px]">
            {['monthly', 'quarterly'].map((f) => (
              <button
                key={f}
                className={`px-3 py-2 border-0 cursor-pointer font-[inherit] capitalize ${filing === f ? 'text-white bg-blue-600' : 'text-[#536173] bg-white hover:bg-gray-50'}`}
                type="button"
                onClick={() => setFiling(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <select
            className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {!locked && (
            <button
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md cursor-pointer hover:bg-purple-100 font-[inherit] disabled:opacity-50"
              disabled={populating}
              title="Pull data from your sales invoices for this period"
              type="button"
              onClick={handleAutoPopulate}
            >
              <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              {populating ? 'Pulling…' : 'Pull from Invoices'}
            </button>
          )}
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-50"
            disabled={saving || locked}
            type="button"
            onClick={handleSaveDraft}
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-white bg-blue-600 border border-blue-600 rounded-md cursor-pointer hover:bg-blue-700 font-[inherit] disabled:opacity-50"
            disabled={filing2 || locked}
            type="button"
            onClick={handleFile}
          >
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {filing2 ? 'Filing…' : locked ? 'Filed ✓' : 'File GSTR-1'}
          </button>
        </div>
      </div>

      {/* ── Info Banner ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3.5 mb-5 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-3">
          <svg fill="none" height="16" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24" width="16" className="flex-none">
            <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <span className="text-[13px] text-blue-800">
            <strong>Period: {period}</strong> · GSTIN: {bizSettings.gstin || '—'} · {bizSettings.businessName || 'Your Business'}
          </span>
        </div>
        {!locked && (
          <span className="text-[12px] text-blue-700">
            Tip: Use <strong>Pull from Invoices</strong> to auto-fill B2B &amp; B2CS data from your sales records.
          </span>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'B2B Invoices',              value: String(b2b.length),         sub: 'GST-registered buyers' },
          { label: 'B2CS Entries',              value: String(b2cs.length),        sub: 'Consumers / unregistered' },
          { label: 'Total Taxable Value',       value: formatCurrency(grandTaxable), sub: 'All supplies' },
          { label: 'Total Output Tax',          value: formatCurrency(grandTax),   sub: 'CGST + SGST + IGST' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-lg p-4">
            <div className="text-xs text-[#536173] mb-1.5">{s.label}</div>
            <div className="text-xl font-bold text-[#111827]">{s.value}</div>
            <div className="text-xs text-[#536173] mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs + Content ── */}
      <div className="bg-white border border-[#dfe7f1] rounded-lg">
        <div className="flex overflow-x-auto border-b border-[#edf2f7] px-5">
          {tabsWithCount.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-[13px] font-medium border-b-2 cursor-pointer bg-transparent border-0 whitespace-nowrap font-[inherit] transition-colors ${activeTab === tab.id ? 'text-blue-600 border-blue-600' : 'text-[#536173] border-transparent hover:text-[#111827]'}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[11px] font-bold rounded-full px-1.5 py-0.5 ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-[#536173]'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* B2B Table */}
        {activeTab === 'b2b' && (
          <div>
            <div className="px-5 py-3 border-b border-[#edf2f7] flex flex-wrap gap-2 justify-between items-center">
              <span className="text-[13px] text-[#536173]">B2B — Taxable outward supplies to <strong>GST-registered</strong> buyers (invoice-wise reporting)</span>
              {!locked && (
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100 font-[inherit]"
                  type="button"
                  onClick={() => { setAddingB2b(true); setNewB2b(EMPTY_B2B); }}
                >
                  <svg fill="none" height="13" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="13">
                    <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
                  </svg>
                  Add Invoice
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[1000px]">
                <thead>
                  <tr>
                    <th className={TH}>GSTIN / UIN</th>
                    <th className={TH}>Party Name</th>
                    <th className={TH}>Invoice No.</th>
                    <th className={TH}>Date</th>
                    <th className={`${TH} text-right`}>Invoice Value</th>
                    <th className={`${TH} text-right`}>Taxable Amt</th>
                    <th className={`${TH} text-center`}>Rate</th>
                    <th className={`${TH} text-right`}>CGST</th>
                    <th className={`${TH} text-right`}>SGST</th>
                    <th className={`${TH} text-right`}>IGST</th>
                    <th className={TH} style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {/* Add-row form */}
                  {addingB2b && (
                    <tr className="bg-blue-50">
                      <td className="px-4 py-2">
                        <input className={INPUT_CLS} placeholder="29AABCT1332L1ZB" type="text" value={newB2b.gstin} onChange={e => setNewB2b(p => ({ ...p, gstin: e.target.value.toUpperCase() }))} />
                      </td>
                      <td className="px-4 py-2">
                        <input className={INPUT_CLS} placeholder="Party name" type="text" value={newB2b.name} onChange={e => setNewB2b(p => ({ ...p, name: e.target.value }))} />
                      </td>
                      <td className="px-4 py-2">
                        <input className={INPUT_CLS} placeholder="INV-001" type="text" value={newB2b.invoiceNo} onChange={e => setNewB2b(p => ({ ...p, invoiceNo: e.target.value }))} />
                      </td>
                      <td className="px-4 py-2">
                        <input className={INPUT_CLS} type="date" value={newB2b.date} onChange={e => setNewB2b(p => ({ ...p, date: e.target.value }))} />
                      </td>
                      <td className="px-4 py-2" colSpan={2}>
                        <input className={INPUT_CLS} min="0" placeholder="Taxable amount" step="0.01" type="number" value={newB2b.taxable} onChange={e => setNewB2b(p => ({ ...p, taxable: e.target.value }))} />
                      </td>
                      <td className="px-4 py-2">
                        <select className={INPUT_CLS} value={newB2b.rate} onChange={e => setNewB2b(p => ({ ...p, rate: e.target.value }))}>
                          {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2" colSpan={3}>
                        <select className={INPUT_CLS} value={newB2b.supplyType} onChange={e => setNewB2b(p => ({ ...p, supplyType: e.target.value }))}>
                          <option value="Intrastate">Intrastate (CGST+SGST)</option>
                          <option value="Interstate">Interstate (IGST)</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button className="text-[12px] text-white bg-blue-600 px-2.5 py-1 rounded cursor-pointer font-[inherit] border-0 hover:bg-blue-700" type="button" onClick={handleAddB2b}>Add</button>
                          <button className="text-[12px] text-[#536173] bg-gray-100 px-2 py-1 rounded cursor-pointer font-[inherit] border-0 hover:bg-gray-200" type="button" onClick={() => setAddingB2b(false)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {b2b.length === 0 && !addingB2b ? (
                    <tr>
                      <td className="text-center py-12 text-[#536173] text-[13px]" colSpan={11}>
                        <div className="flex flex-col items-center gap-2">
                          <svg fill="none" height="36" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24" width="36">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                          </svg>
                          <div className="font-medium text-[#374151]">No B2B invoices for {period}</div>
                          <div className="text-[12px]">Click <strong>Add Invoice</strong> to add manually, or <strong>Pull from Invoices</strong> to auto-fill from sales records.</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    b2b.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className={`${TD} font-mono text-xs text-[#374151]`}>{row.gstin || '—'}</td>
                        <td className={`${TD} font-medium text-[#111827]`}>{row.name}</td>
                        <td className={TD}>{row.invoiceNo}</td>
                        <td className={`${TD} text-[#536173]`}>{row.date}</td>
                        <td className={`${TD} text-right font-medium`}>{formatCurrency(row.value)}</td>
                        <td className={`${TD} text-right`}>{formatCurrency(row.taxable)}</td>
                        <td className={`${TD} text-center`}>
                          <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">{row.rate}%</span>
                        </td>
                        <td className={`${TD} text-right`}>{row.cgst > 0 ? formatCurrency(row.cgst) : <span className="text-[#536173]">—</span>}</td>
                        <td className={`${TD} text-right`}>{row.sgst > 0 ? formatCurrency(row.sgst) : <span className="text-[#536173]">—</span>}</td>
                        <td className={`${TD} text-right`}>{row.igst > 0 ? formatCurrency(row.igst) : <span className="text-[#536173]">—</span>}</td>
                        <td className={TD}>
                          {!locked && (
                            <button
                              className="text-red-400 hover:text-red-600 bg-transparent border-0 cursor-pointer text-lg font-[inherit]"
                              type="button"
                              onClick={() => setB2b(prev => prev.filter((_, j) => j !== i))}
                            >×</button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#f8fafc] font-semibold">
                    <td className={`${TD} font-bold`} colSpan={4}>Total</td>
                    <td className={`${TD} text-right font-bold`}>{formatCurrency(b2bTotals.value)}</td>
                    <td className={`${TD} text-right font-bold`}>{formatCurrency(b2bTotals.taxable)}</td>
                    <td className={TD} />
                    <td className={`${TD} text-right font-bold`}>{formatCurrency(b2bTotals.cgst)}</td>
                    <td className={`${TD} text-right font-bold`}>{formatCurrency(b2bTotals.sgst)}</td>
                    <td className={`${TD} text-right font-bold`}>{formatCurrency(b2bTotals.igst)}</td>
                    <td className={TD} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* B2CS Table */}
        {activeTab === 'b2cs' && (
          <div>
            <div className="px-5 py-3 border-b border-[#edf2f7] flex flex-wrap gap-2 justify-between items-center">
              <span className="text-[13px] text-[#536173]">B2CS — Outward supplies to <strong>consumers/unregistered</strong> buyers (summary reporting per state/rate)</span>
              {!locked && (
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100 font-[inherit]"
                  type="button"
                  onClick={() => { setAddingB2cs(true); setNewB2cs(EMPTY_B2CS); }}
                >
                  <svg fill="none" height="13" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="13">
                    <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
                  </svg>
                  Add Entry
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr>
                    <th className={TH}>State / UT</th>
                    <th className={TH}>Supply Type</th>
                    <th className={`${TH} text-right`}>Taxable Value</th>
                    <th className={`${TH} text-center`}>Rate</th>
                    <th className={`${TH} text-right`}>CGST</th>
                    <th className={`${TH} text-right`}>SGST</th>
                    <th className={`${TH} text-right`}>IGST</th>
                    {!locked && <th className={TH} style={{ width: 40 }} />}
                  </tr>
                </thead>
                <tbody>
                  {/* Add-row form */}
                  {addingB2cs && (
                    <tr className="bg-blue-50">
                      <td className="px-4 py-2">
                        <select className={INPUT_CLS} value={newB2cs.state} onChange={e => setNewB2cs(p => ({ ...p, state: e.target.value }))}>
                          {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select className={INPUT_CLS} value={newB2cs.supplyType} onChange={e => setNewB2cs(p => ({ ...p, supplyType: e.target.value }))}>
                          <option value="Intrastate">Intrastate</option>
                          <option value="Interstate">Interstate</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input className={INPUT_CLS} min="0" placeholder="Taxable amount" step="0.01" type="number" value={newB2cs.taxable} onChange={e => setNewB2cs(p => ({ ...p, taxable: e.target.value }))} />
                      </td>
                      <td className="px-4 py-2">
                        <select className={INPUT_CLS} value={newB2cs.rate} onChange={e => setNewB2cs(p => ({ ...p, rate: e.target.value }))}>
                          {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-[13px] text-right text-[#536173]" colSpan={3}>
                        {newB2cs.taxable ? (
                          (() => {
                            const t = calcB2csTax(newB2cs);
                            return `CGST: ${formatCurrency(t.cgst)} | SGST: ${formatCurrency(t.sgst)} | IGST: ${formatCurrency(t.igst)}`;
                          })()
                        ) : 'Auto-calculated'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button className="text-[12px] text-white bg-blue-600 px-2.5 py-1 rounded cursor-pointer font-[inherit] border-0 hover:bg-blue-700" type="button" onClick={handleAddB2cs}>Add</button>
                          <button className="text-[12px] text-[#536173] bg-gray-100 px-2 py-1 rounded cursor-pointer font-[inherit] border-0 hover:bg-gray-200" type="button" onClick={() => setAddingB2cs(false)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {b2cs.length === 0 && !addingB2cs ? (
                    <tr>
                      <td className="text-center py-12 text-[#536173] text-[13px]" colSpan={locked ? 7 : 8}>
                        <div className="flex flex-col items-center gap-2">
                          <svg fill="none" height="36" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24" width="36">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                          </svg>
                          <div className="font-medium text-[#374151]">No B2CS entries for {period}</div>
                          <div className="text-[12px]">B2CS covers sales to consumers or GST-unregistered buyers. Add one entry per state per tax rate.</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    b2cs.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className={`${TD} font-medium`}>{row.state}</td>
                        <td className={TD}>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${row.supplyType === 'Intrastate' || row.type === 'Intrastate' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                            {row.supplyType || row.type}
                          </span>
                        </td>
                        <td className={`${TD} text-right`}>{formatCurrency(row.taxable)}</td>
                        <td className={`${TD} text-center`}>
                          <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">{row.rate}%</span>
                        </td>
                        <td className={`${TD} text-right`}>{row.cgst > 0 ? formatCurrency(row.cgst) : <span className="text-[#536173]">—</span>}</td>
                        <td className={`${TD} text-right`}>{row.sgst > 0 ? formatCurrency(row.sgst) : <span className="text-[#536173]">—</span>}</td>
                        <td className={`${TD} text-right`}>{row.igst > 0 ? formatCurrency(row.igst) : <span className="text-[#536173]">—</span>}</td>
                        {!locked && (
                          <td className={TD}>
                            <button
                              className="text-red-400 hover:text-red-600 bg-transparent border-0 cursor-pointer text-lg font-[inherit]"
                              type="button"
                              onClick={() => setB2cs(prev => prev.filter((_, j) => j !== i))}
                            >×</button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#f8fafc]">
                    <td className={`${TD} font-bold`} colSpan={2}>Total</td>
                    <td className={`${TD} text-right font-bold`}>{formatCurrency(b2csTotals.taxable)}</td>
                    <td className={TD} />
                    <td className={`${TD} text-right font-bold`}>{formatCurrency(b2csTotals.cgst)}</td>
                    <td className={`${TD} text-right font-bold`}>{formatCurrency(b2csTotals.sgst)}</td>
                    <td className={`${TD} text-right font-bold`}>{formatCurrency(b2csTotals.igst)}</td>
                    {!locked && <td className={TD} />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* HSN Summary */}
        {activeTab === 'hsn' && (
          <div>
            <div className="px-5 py-3 border-b border-[#edf2f7]">
              <span className="text-[13px] text-[#536173]">HSN-wise summary of outward supplies — mandatory when turnover exceeds ₹5 Cr; auto-filled when pulling from invoices</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[900px]">
                <thead>
                  <tr>
                    {['HSN / SAC', 'Description', 'UQC', 'Qty', 'Total Value', 'Taxable Value', 'Rate', 'CGST', 'SGST', 'IGST'].map((h) => (
                      <th key={h} className={`${TH} ${['Total Value', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Qty'].includes(h) ? 'text-right' : h === 'Rate' ? 'text-center' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hsn.length === 0 ? (
                    <tr>
                      <td className="text-center py-12 text-[#536173] text-[13px]" colSpan={10}>
                        No HSN summary for {period}. HSN data is auto-populated when you use <strong>Pull from Invoices</strong>.
                      </td>
                    </tr>
                  ) : (
                    hsn.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className={`${TD} font-mono font-semibold text-[#111827]`}>{row.hsn}</td>
                        <td className={TD}>{row.desc}</td>
                        <td className={TD}>{row.uqc}</td>
                        <td className={`${TD} text-right`}>{row.qty}</td>
                        <td className={`${TD} text-right`}>{formatCurrency(row.value)}</td>
                        <td className={`${TD} text-right font-medium`}>{formatCurrency(row.taxable)}</td>
                        <td className={`${TD} text-center`}>{row.rate}%</td>
                        <td className={`${TD} text-right`}>{row.cgst > 0 ? formatCurrency(row.cgst) : <span className="text-[#536173]">—</span>}</td>
                        <td className={`${TD} text-right`}>{row.sgst > 0 ? formatCurrency(row.sgst) : <span className="text-[#536173]">—</span>}</td>
                        <td className={`${TD} text-right`}>{row.igst > 0 ? formatCurrency(row.igst) : <span className="text-[#536173]">—</span>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty tabs */}
        {['cdnr', 'exports', 'docs'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center py-16 text-[#536173]">
            <svg fill="none" height="48" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24" width="48">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
              <line x1="12" x2="12" y1="18" y2="12" /><line x1="9" x2="15" y1="15" y2="15" />
            </svg>
            <div className="text-[15px] font-medium mt-4">No entries for {period}</div>
            <div className="text-[13px] mt-1 text-center max-w-xs">
              {activeTab === 'cdnr'    && 'Credit / Debit Notes issued to GST-registered parties will appear here.'}
              {activeTab === 'exports' && 'Export invoices (zero-rated supplies with LUT/bond) will appear here.'}
              {activeTab === 'docs'    && 'Acknowledgements and ARN will appear here after GSTR-1 is filed.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
