import { useEffect, useState } from 'react';

import { gstService } from '../../../../../services/gstService.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function generatePeriods(count = 12) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  });
}

const PERIODS = generatePeriods(12);

const EMPTY_OUTWARD = [
  { key: 'a', label: 'Outward taxable supplies (other than zero rated, nil rated and exempted)', taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'b', label: 'Outward taxable supplies (zero rated)',                                    taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'c', label: 'Other outward supplies (nil rated, exempted)',                             taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'd', label: 'Inward supplies liable to reverse charge',                                 taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'e', label: 'Non-GST outward supplies',                                                 taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
];

const EMPTY_ITC_AVAILABLE = [
  { key: 'A(1)', label: 'Import of goods',                       cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'A(2)', label: 'Import of services',                    cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'A(3)', label: 'Inward supplies from ISD',              cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'A(5)', label: 'All other ITC (incl. from GSTR-2B)',    cgst: 0, sgst: 0, igst: 0, cess: 0 },
];

const EMPTY_ITC_REVERSED = [
  { key: 'B(1)', label: 'As per Rule 42 & 43 of CGST Rules', cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'B(2)', label: 'Other reversals',                    cgst: 0, sgst: 0, igst: 0, cess: 0 },
];

const SECTIONS = [
  { id: '3.1', label: '3.1 Outward Supplies' },
  { id: '3.2', label: '3.2 Inter-state Supplies' },
  { id: '4',   label: '4. Eligible ITC' },
  { id: '5',   label: '5. Exempt / Nil Inward' },
  { id: '5.1', label: '5.1 Interest & Late Fee' },
  { id: '6',   label: '6. Tax Payment Summary' },
];

const TH_R = 'text-right text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TH_L = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD_L = 'px-5 py-3 border-b border-[#f3f4f6] text-[13px]';

const INPUT_NUM = 'w-full text-right font-mono bg-transparent border-0 outline-none p-0 disabled:text-[#536173] focus:bg-blue-50 focus:rounded';

function sum(arr, field) { return arr.reduce((a, r) => a + (Number(r[field]) || 0), 0); }

function NumInput({ value, onChange, disabled }) {
  return (
    <input
      className={INPUT_NUM}
      disabled={disabled}
      min="0"
      step="0.01"
      type="number"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function TaxTableHeader({ hasEditing }) {
  return (
    <thead>
      <tr className="bg-[#f8fafc]">
        <th className={TH_L}>Nature / Description</th>
        <th className={TH_R}>Taxable Value (₹)</th>
        <th className={TH_R}>CGST (₹)</th>
        <th className={TH_R}>SGST / UTGST (₹)</th>
        <th className={TH_R}>IGST (₹)</th>
        <th className={TH_R}>Cess (₹)</th>
      </tr>
      {hasEditing && (
        <tr>
          <td className="px-5 py-1.5 bg-blue-50 text-[11px] text-blue-700 border-b border-blue-100" colSpan={6}>
            Click any value to edit. Changes are saved when you click <strong>Save Draft</strong>.
          </td>
        </tr>
      )}
    </thead>
  );
}

export function Gstr3bPage() {
  const [period, setPeriod]               = useState(PERIODS[0]);
  const [activeSection, setActiveSection] = useState('3.1');

  const [outwardRows,  setOutwardRows]  = useState(EMPTY_OUTWARD);
  const [itcAvailable, setItcAvailable] = useState(EMPTY_ITC_AVAILABLE);
  const [itcReversed,  setItcReversed]  = useState(EMPTY_ITC_REVERSED);
  const [lateFeeCgst,  setLateFeeCgst]  = useState('');
  const [lateFeeSgst,  setLateFeeSgst]  = useState('');
  const [status, setStatus]             = useState('draft');

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [filing,    setFiling]    = useState(false);
  const [filling,   setFilling]   = useState(false);
  const [postingAccounting, setPostingAccounting] = useState(false);
  const [accounting, setAccounting] = useState({ voucherNo: '', voucherId: null, postedAt: null });
  const [toast,     setToast]     = useState(null);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    setLoading(true);
    gstService.getGstr3b(period)
      .then((data) => {
        if (data) {
          setOutwardRows(data.outwardRows?.length  ? data.outwardRows  : EMPTY_OUTWARD.map(r => ({ ...r })));
          setItcAvailable(data.itcAvailable?.length ? data.itcAvailable : EMPTY_ITC_AVAILABLE.map(r => ({ ...r })));
          setItcReversed(data.itcReversed?.length  ? data.itcReversed  : EMPTY_ITC_REVERSED.map(r => ({ ...r })));
          setLateFeeCgst(data.lateFeeCgst ? String(data.lateFeeCgst) : '');
          setLateFeeSgst(data.lateFeeSgst ? String(data.lateFeeSgst) : '');
          setStatus(data.status ?? 'draft');
          setAccounting({
            voucherNo: data.accountingVoucherNo || '',
            voucherId: data.accountingVoucherId || null,
            postedAt: data.accountingPostedAt || null,
          });
        } else {
          setOutwardRows(EMPTY_OUTWARD.map(r => ({ ...r })));
          setItcAvailable(EMPTY_ITC_AVAILABLE.map(r => ({ ...r })));
          setItcReversed(EMPTY_ITC_REVERSED.map(r => ({ ...r })));
          setLateFeeCgst('');
          setLateFeeSgst('');
          setStatus('draft');
          setAccounting({ voucherNo: '', voucherId: null, postedAt: null });
        }
      })
      .catch(() => showToast('Failed to load data', false))
      .finally(() => setLoading(false));
  }, [period]);

  function updateOutwardRow(key, field, value) {
    setOutwardRows(prev => prev.map(r => r.key === key ? { ...r, [field]: parseFloat(value) || 0 } : r));
  }

  function updateItcAvailRow(key, field, value) {
    setItcAvailable(prev => prev.map(r => r.key === key ? { ...r, [field]: parseFloat(value) || 0 } : r));
  }

  function updateItcRevRow(key, field, value) {
    setItcReversed(prev => prev.map(r => r.key === key ? { ...r, [field]: parseFloat(value) || 0 } : r));
  }

  async function handleFillFromGstr1() {
    setFilling(true);
    try {
      const data = await gstService.getGstr1(period);
      if (!data) { showToast('No GSTR-1 data found for this period. File GSTR-1 first.', false); return; }

      const b2b = data.b2b ?? [];
      const b2cs = data.b2cs ?? [];
      const all = [...b2b, ...b2cs];

      const taxable = all.reduce((s, r) => s + (r.taxable ?? 0), 0);
      const cgst    = all.reduce((s, r) => s + (r.cgst ?? 0), 0);
      const sgst    = all.reduce((s, r) => s + (r.sgst ?? 0), 0);
      const igst    = all.reduce((s, r) => s + (r.igst ?? 0), 0);

      setOutwardRows(prev => prev.map(r =>
        r.key === 'a'
          ? { ...r, taxable: Math.round(taxable * 100) / 100, cgst: Math.round(cgst * 100) / 100, sgst: Math.round(sgst * 100) / 100, igst: Math.round(igst * 100) / 100 }
          : r,
      ));
      showToast('Outward tax (row a) filled from GSTR-1 data. Verify and save draft.');
    } catch {
      showToast('Failed to load GSTR-1 data', false);
    } finally {
      setFilling(false);
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      await gstService.saveGstr3b({
        period, status: 'draft',
        outwardRows, itcAvailable, itcReversed,
        lateFeeCgst: Number(lateFeeCgst) || 0,
        lateFeeSgst: Number(lateFeeSgst) || 0,
      });
      setStatus('draft');
      showToast('Draft saved successfully');
    } catch {
      showToast('Failed to save draft', false);
    } finally {
      setSaving(false);
    }
  }

  async function handleFile() {
    setFiling(true);
    try {
      await gstService.saveGstr3b({
        period, status: 'draft',
        outwardRows, itcAvailable, itcReversed,
        lateFeeCgst: Number(lateFeeCgst) || 0,
        lateFeeSgst: Number(lateFeeSgst) || 0,
      });
      const data = await gstService.fileGstr3b(period);
      setStatus('filed');
      showToast(`GSTR-3B filed! ARN: ${data.arn}`);
    } catch {
      showToast('Failed to file GSTR-3B', false);
    } finally {
      setFiling(false);
    }
  }

  async function handlePostAccounting() {
    setPostingAccounting(true);
    try {
      await gstService.saveGstr3b({
        period, status,
        outwardRows, itcAvailable, itcReversed,
        lateFeeCgst: Number(lateFeeCgst) || 0,
        lateFeeSgst: Number(lateFeeSgst) || 0,
      });
      const data = await gstService.postGstr3bAccountingAdjustment(period);
      const voucherNo = data.voucher?.voucherNo || data.record?.accountingVoucherNo || '';
      setAccounting({
        voucherNo,
        voucherId: data.voucher?._id || data.record?.accountingVoucherId || null,
        postedAt: data.record?.accountingPostedAt || new Date().toISOString(),
      });
      showToast(`Accounting voucher posted${voucherNo ? `: ${voucherNo}` : ''}`);
    } catch (err) {
      showToast(err.message || 'Failed to post accounting voucher', false);
    } finally {
      setPostingAccounting(false);
    }
  }

  const outwardTotals  = { taxable: sum(outwardRows,'taxable'), cgst: sum(outwardRows,'cgst'), sgst: sum(outwardRows,'sgst'), igst: sum(outwardRows,'igst'), cess: sum(outwardRows,'cess') };
  const itcAvailTotals = { cgst: sum(itcAvailable,'cgst'), sgst: sum(itcAvailable,'sgst'), igst: sum(itcAvailable,'igst'), cess: sum(itcAvailable,'cess') };
  const itcRevTotals   = { cgst: sum(itcReversed,'cgst'),  sgst: sum(itcReversed,'sgst'),  igst: sum(itcReversed,'igst'),  cess: sum(itcReversed,'cess') };
  const netItc = {
    cgst: Math.max(0, itcAvailTotals.cgst - itcRevTotals.cgst),
    sgst: Math.max(0, itcAvailTotals.sgst - itcRevTotals.sgst),
    igst: Math.max(0, itcAvailTotals.igst - itcRevTotals.igst),
    cess: Math.max(0, itcAvailTotals.cess - itcRevTotals.cess),
  };
  const taxPayable = { cgst: outwardTotals.cgst, sgst: outwardTotals.sgst, igst: outwardTotals.igst };
  const netCash = {
    cgst: Math.max(0, taxPayable.cgst - netItc.cgst),
    sgst: Math.max(0, taxPayable.sgst - netItc.sgst),
    igst: Math.max(0, taxPayable.igst - netItc.igst),
  };
  const totalCashDue = netCash.cgst + netCash.sgst + netCash.igst;
  const lateFeeTotal = (Number(lateFeeCgst) || 0) + (Number(lateFeeSgst) || 0);
  const hasGstLiability = (taxPayable.cgst + taxPayable.sgst + taxPayable.igst + lateFeeTotal) > 0;
  const locked = status === 'filed';
  const workflowSteps = [
    { label: 'Sales auto-fill', done: outwardTotals.taxable > 0 || outwardTotals.cgst + outwardTotals.sgst + outwardTotals.igst > 0 },
    { label: 'ITC reviewed', done: netItc.cgst + netItc.sgst + netItc.igst > 0 },
    { label: 'Accounting posted', done: Boolean(accounting.voucherNo) },
    { label: 'Return filed', done: locked },
  ];

  const tdNumCls = (extra = '') => `px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-right ${locked ? '' : 'hover:bg-blue-50/50 cursor-text'} ${extra}`;

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
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span>
            <a className="text-blue-600 no-underline hover:underline" href="/gst-dashboard">GST</a>
            <span>›</span>
            <span>GSTR-3B</span>
          </nav>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="m-0 text-[22px] font-bold">GSTR-3B</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide ${locked ? 'text-green-700 bg-green-100' : 'text-amber-700 bg-amber-100'}`}>
              {locked ? 'Filed' : 'Draft'}
            </span>
            {loading && <span className="text-xs text-[#536173]">Loading…</span>}
          </div>
          <div className="text-[13px] text-[#536173] mt-0.5">Monthly Self-Assessed Summary Return — enter values and pay net tax</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {!locked && (
            <button
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md cursor-pointer hover:bg-purple-100 font-[inherit] disabled:opacity-50"
              disabled={filling}
              title="Auto-fill outward tax from your saved GSTR-1 for this period"
              type="button"
              onClick={handleFillFromGstr1}
            >
              <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              {filling ? 'Filling…' : 'Fill from GSTR-1'}
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
            disabled={filing || locked}
            type="button"
            onClick={handleFile}
          >
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {filing ? 'Filing…' : locked ? 'Filed ✓' : 'File GSTR-3B'}
          </button>
        </div>
      </div>

      {/* ── Info Banner ── */}
      {!locked && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3.5 mb-5 flex items-center gap-3">
          <svg fill="none" height="16" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24" width="16" className="flex-none">
            <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <span className="text-[13px] text-blue-800">
            <strong>How to use:</strong> First file GSTR-1, then click <strong>Fill from GSTR-1</strong> to auto-populate Section 3.1(a). Enter ITC in Section 4 from GSTR-2B. The tax payment summary in Section 6 is auto-calculated.
          </span>
        </div>
      )}

      {/* ── Tax Summary Cards ── */}
      <div className="bg-white border border-[#dfe7f1] rounded-lg px-4 py-3 mb-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {workflowSteps.map((step, index) => (
            <div key={step.label} className="flex items-center gap-2 text-[13px]">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step.done ? 'bg-green-100 text-green-700' : 'bg-[#f1f5f9] text-[#64748b]'}`}>
                {step.done ? '✓' : index + 1}
              </span>
              <span className={step.done ? 'text-[#111827] font-medium' : 'text-[#536173]'}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Output Tax Liability',   value: outwardTotals.cgst + outwardTotals.sgst + outwardTotals.igst, color: '#dc2626', sub: 'CGST + SGST + IGST' },
          { label: 'ITC Available (Net)',     value: netItc.cgst + netItc.sgst + netItc.igst,                      color: '#16a34a', sub: 'After reversals' },
          { label: 'Net Tax Payable in Cash', value: totalCashDue,                                                  color: '#d97706', sub: 'Deposit to Cash Ledger' },
          { label: 'Total Taxable Turnover',  value: outwardTotals.taxable,                                         color: '#2563eb', sub: 'Including RCM inward' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-lg p-4">
            <div className="text-xs text-[#536173] mb-1.5">{s.label}</div>
            <div className="text-xl font-bold" style={{ color: s.color }}>{formatCurrency(s.value)}</div>
            <div className="text-xs text-[#536173] mt-0.5">{s.sub}</div>
          </div>
        ))}
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

        {/* Section Content */}
        <div className="bg-white border border-[#dfe7f1] rounded-lg overflow-hidden">

          {/* 3.1 Outward Supplies */}
          {activeSection === '3.1' && (
            <>
              <div className="px-5 py-4 border-b border-[#edf2f7] flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-[15px]">3.1 Details of Outward Supplies and Inward Supplies liable to Reverse Charge</div>
                  <div className="text-[12px] text-[#536173] mt-0.5">Enter tax amounts directly or use <strong>Fill from GSTR-1</strong> to auto-populate row (a).</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[750px]">
                  <TaxTableHeader hasEditing={!locked} />
                  <tbody>
                    {outwardRows.map((row) => (
                      <tr key={row.key} className="hover:bg-gray-50/50">
                        <td className={TD_L}>
                          <span className="font-semibold text-[#374151]">({row.key})</span>{' '}{row.label}
                        </td>
                        <td className={tdNumCls()}>
                          <NumInput disabled={locked} value={row.taxable} onChange={v => updateOutwardRow(row.key, 'taxable', v)} />
                        </td>
                        <td className={tdNumCls()}>
                          <NumInput disabled={locked} value={row.cgst} onChange={v => updateOutwardRow(row.key, 'cgst', v)} />
                        </td>
                        <td className={tdNumCls()}>
                          <NumInput disabled={locked} value={row.sgst} onChange={v => updateOutwardRow(row.key, 'sgst', v)} />
                        </td>
                        <td className={tdNumCls()}>
                          <NumInput disabled={locked} value={row.igst} onChange={v => updateOutwardRow(row.key, 'igst', v)} />
                        </td>
                        <td className={tdNumCls()}>
                          <NumInput disabled={locked} value={row.cess} onChange={v => updateOutwardRow(row.key, 'cess', v)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#f0f9ff] font-bold">
                      <td className={`${TD_L} font-bold`}>Total Outward Tax Liability</td>
                      <td className="px-4 py-3.5 border-b border-[#edf2f7] text-[13px] text-right font-bold font-mono text-blue-700">{formatCurrency(outwardTotals.taxable)}</td>
                      <td className="px-4 py-3.5 border-b border-[#edf2f7] text-[13px] text-right font-bold font-mono text-blue-700">{formatCurrency(outwardTotals.cgst)}</td>
                      <td className="px-4 py-3.5 border-b border-[#edf2f7] text-[13px] text-right font-bold font-mono text-blue-700">{formatCurrency(outwardTotals.sgst)}</td>
                      <td className="px-4 py-3.5 border-b border-[#edf2f7] text-[13px] text-right font-bold font-mono text-blue-700">{formatCurrency(outwardTotals.igst)}</td>
                      <td className="px-4 py-3.5 border-b border-[#edf2f7] text-[13px] text-right font-bold font-mono text-blue-700">{formatCurrency(outwardTotals.cess)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {/* 3.2 Inter-state Supplies */}
          {activeSection === '3.2' && (
            <>
              <div className="px-5 py-4 border-b border-[#edf2f7]">
                <div className="font-semibold text-[15px]">3.2 Details of inter-state supplies made to unregistered, composition, and UIN holders</div>
                <div className="text-[12px] text-[#536173] mt-0.5">Breakup of inter-state outward supplies shown in Section 3.1(a). Only IGST applies here.</div>
              </div>
              <div className="p-5">
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4 text-[13px] text-blue-800">
                  Fill this section only if you made inter-state supplies to <strong>unregistered persons</strong>, <strong>composition dealers</strong>, or <strong>UIN holders</strong>. Leave at 0 if not applicable.
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-[#edf2f7] rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-[#f8fafc]">
                        <th className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]">Category</th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]">Taxable Value (₹)</th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]">IGST (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { cat: 'Supplies to unregistered persons',         taxable: 0, igst: 0 },
                        { cat: 'Supplies to composition taxable persons',  taxable: 0, igst: 0 },
                        { cat: 'Supplies to UIN holders',                  taxable: 0, igst: 0 },
                      ].map((r) => (
                        <tr key={r.cat} className="hover:bg-gray-50">
                          <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px]">{r.cat}</td>
                          <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px] text-right font-mono">{formatCurrency(r.taxable)}</td>
                          <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px] text-right font-mono">{formatCurrency(r.igst)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* 4. Eligible ITC */}
          {activeSection === '4' && (
            <>
              <div className="px-5 py-4 border-b border-[#edf2f7]">
                <div className="font-semibold text-[15px]">4. Eligible Input Tax Credit (ITC)</div>
                <div className="text-[12px] text-[#536173] mt-0.5">Enter ITC as per GSTR-2B for row A(5). Other rows apply only if you import goods/services or receive from ISD.</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-[#f8fafc]">
                      <th className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]">Details</th>
                      <th className={TH_R}>CGST (₹)</th>
                      <th className={TH_R}>SGST / UTGST (₹)</th>
                      <th className={TH_R}>IGST (₹)</th>
                      <th className={TH_R}>Cess (₹)</th>
                    </tr>
                    {!locked && (
                      <tr>
                        <td className="px-5 py-1.5 bg-blue-50 text-[11px] text-blue-700 border-b border-blue-100" colSpan={5}>
                          Click any cell to enter ITC amounts. Row A(5) is the most common — enter ITC from GSTR-2B here.
                        </td>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-5 py-2 border-b border-[#edf2f7] bg-[#f8fafc] text-xs font-semibold uppercase tracking-wide text-[#536173]" colSpan={5}>
                        A) ITC Available (whether in full or part)
                      </td>
                    </tr>
                    {itcAvailable.map((row) => (
                      <tr key={row.key} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px] pl-10">({row.key}) {row.label}</td>
                        <td className={tdNumCls()}>
                          <NumInput disabled={locked} value={row.cgst} onChange={v => updateItcAvailRow(row.key, 'cgst', v)} />
                        </td>
                        <td className={tdNumCls()}>
                          <NumInput disabled={locked} value={row.sgst} onChange={v => updateItcAvailRow(row.key, 'sgst', v)} />
                        </td>
                        <td className={tdNumCls()}>
                          <NumInput disabled={locked} value={row.igst} onChange={v => updateItcAvailRow(row.key, 'igst', v)} />
                        </td>
                        <td className={tdNumCls()}>
                          <NumInput disabled={locked} value={row.cess} onChange={v => updateItcAvailRow(row.key, 'cess', v)} />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#f0fdf4]">
                      <td className="px-5 py-3.5 border-b border-[#edf2f7] text-[13px] font-semibold text-green-800">ITC Available — Total (A)</td>
                      <td className="px-4 py-3.5 border-b border-[#edf2f7] text-[13px] text-right font-bold font-mono text-green-700">{formatCurrency(itcAvailTotals.cgst)}</td>
                      <td className="px-4 py-3.5 border-b border-[#edf2f7] text-[13px] text-right font-bold font-mono text-green-700">{formatCurrency(itcAvailTotals.sgst)}</td>
                      <td className="px-4 py-3.5 border-b border-[#edf2f7] text-[13px] text-right font-bold font-mono text-green-700">{formatCurrency(itcAvailTotals.igst)}</td>
                      <td className="px-4 py-3.5 border-b border-[#edf2f7] text-[13px] text-right font-bold font-mono text-green-700">{formatCurrency(itcAvailTotals.cess)}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-2 border-b border-[#edf2f7] bg-[#f8fafc] text-xs font-semibold uppercase tracking-wide text-[#536173]" colSpan={5}>
                        B) ITC Reversed (as per Rules 42, 43, Section 17(5) etc.)
                      </td>
                    </tr>
                    {itcReversed.map((row) => (
                      <tr key={row.key} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px] pl-10">({row.key}) {row.label}</td>
                        <td className={tdNumCls()}>
                          <NumInput disabled={locked} value={row.cgst} onChange={v => updateItcRevRow(row.key, 'cgst', v)} />
                        </td>
                        <td className={tdNumCls()}>
                          <NumInput disabled={locked} value={row.sgst} onChange={v => updateItcRevRow(row.key, 'sgst', v)} />
                        </td>
                        <td className={tdNumCls()}>
                          <NumInput disabled={locked} value={row.igst} onChange={v => updateItcRevRow(row.key, 'igst', v)} />
                        </td>
                        <td className={tdNumCls()}>
                          <NumInput disabled={locked} value={row.cess} onChange={v => updateItcRevRow(row.key, 'cess', v)} />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#fef9ee]">
                      <td className="px-5 py-3.5 border-b border-[#edf2f7] text-[13px] font-semibold text-amber-800">ITC Reversed — Total (B)</td>
                      <td className="px-4 py-3.5 border-b border-[#edf2f7] text-[13px] text-right font-bold font-mono text-amber-700">{formatCurrency(itcRevTotals.cgst)}</td>
                      <td className="px-4 py-3.5 border-b border-[#edf2f7] text-[13px] text-right font-bold font-mono text-amber-700">{formatCurrency(itcRevTotals.sgst)}</td>
                      <td className="px-4 py-3.5 border-b border-[#edf2f7] text-[13px] text-right font-bold font-mono text-amber-700">{formatCurrency(itcRevTotals.igst)}</td>
                      <td className="px-4 py-3.5 border-b border-[#edf2f7] text-[13px] text-right font-bold font-mono text-amber-700">{formatCurrency(itcRevTotals.cess)}</td>
                    </tr>
                    <tr className="bg-[#eff6ff]">
                      <td className="px-5 py-3.5 text-[13px] font-bold text-blue-800">C) Net ITC Available (A − B)</td>
                      <td className="px-4 py-3.5 text-[13px] text-right font-bold font-mono text-blue-700">{formatCurrency(netItc.cgst)}</td>
                      <td className="px-4 py-3.5 text-[13px] text-right font-bold font-mono text-blue-700">{formatCurrency(netItc.sgst)}</td>
                      <td className="px-4 py-3.5 text-[13px] text-right font-bold font-mono text-blue-700">{formatCurrency(netItc.igst)}</td>
                      <td className="px-4 py-3.5 text-[13px] text-right font-bold font-mono text-blue-700">{formatCurrency(netItc.cess)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* 5. Exempt Inward Supplies */}
          {activeSection === '5' && (
            <>
              <div className="px-5 py-4 border-b border-[#edf2f7]">
                <div className="font-semibold text-[15px]">5. Values of Exempt, Nil-rated and Non-GST Inward Supplies</div>
                <div className="text-[12px] text-[#536173] mt-0.5">Declaration of inward supplies received from composition dealers, nil-rated, and non-GST suppliers.</div>
              </div>
              <div className="overflow-x-auto p-5">
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 mb-4 text-[13px] text-amber-800">
                  Fill this only if you received inward supplies from composition dealers or non-GST sources. Most businesses can leave this at 0.
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc]">
                      <th className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]">Nature of Supply</th>
                      <th className="text-right text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]">Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { desc: 'From a composition taxable person',   value: 0 },
                      { desc: 'From non-resident taxable person',    value: 0 },
                      { desc: 'From exempt/nil-rated suppliers',     value: 0 },
                      { desc: 'Non-GST inward supplies',             value: 0 },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3.5 border-b border-[#f3f4f6] text-[13px]">{row.desc}</td>
                        <td className="px-4 py-3.5 border-b border-[#f3f4f6] text-[13px] text-right font-mono">{formatCurrency(row.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* 5.1 Interest & Late Fee */}
          {activeSection === '5.1' && (
            <>
              <div className="px-5 py-4 border-b border-[#edf2f7]">
                <div className="font-semibold text-[15px]">5.1 Interest and Late Fee</div>
                <div className="text-[13px] text-[#536173] mt-1">Applicable only if GSTR-3B is filed after the due date (20th of next month).</div>
              </div>
              <div className="p-5">
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
                  <svg fill="none" height="16" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24" width="16"><polyline points="20 6 9 17 4 12" /></svg>
                  <span className="text-[13px] text-green-800 font-medium">No late fee or interest if filed on or before the 20th of the next month.</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {[
                    { label: 'Late Fee — CGST (₹)', value: lateFeeCgst, set: setLateFeeCgst },
                    { label: 'Late Fee — SGST (₹)', value: lateFeeSgst, set: setLateFeeSgst },
                  ].map((f) => (
                    <div key={f.label} className="flex flex-col gap-1">
                      <label className="text-xs text-[#536173] font-medium">{f.label}</label>
                      <input
                        className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]"
                        disabled={locked}
                        min="0" placeholder="0" type="number"
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[12px] text-[#536173]">
                  Late fee: ₹50/day per return (₹25 CGST + ₹25 SGST) for returns with tax liability. ₹20/day for nil returns. Interest: 18% p.a. on unpaid tax.
                </p>
              </div>
            </>
          )}

          {/* 6. Tax Payment Summary */}
          {activeSection === '6' && (
            <>
              <div className="px-5 py-4 border-b border-[#edf2f7]">
                <div className="font-semibold text-[15px]">6. Payment of Tax — Summary</div>
                <div className="text-[12px] text-[#536173] mt-0.5">Auto-calculated from Sections 3.1 and 4. Deposit the net cash amount to the GST Electronic Cash Ledger before filing.</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-[#f8fafc]">
                      <th className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]">Description</th>
                      <th className={TH_R}>CGST (₹)</th>
                      <th className={TH_R}>SGST / UTGST (₹)</th>
                      <th className={TH_R}>IGST (₹)</th>
                      <th className={TH_R}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Tax Payable (from Sec. 3.1)',         cgst: taxPayable.cgst,   sgst: taxPayable.sgst,   igst: taxPayable.igst,   rowCls: '' },
                      { label: 'Paid through ITC (from Sec. 4)',      cgst: netItc.cgst,       sgst: netItc.sgst,       igst: netItc.igst,       rowCls: 'text-green-700' },
                      { label: 'Net Tax Payable in Cash',             cgst: netCash.cgst,      sgst: netCash.sgst,      igst: netCash.igst,      rowCls: 'font-bold text-amber-700 bg-[#fffbeb]' },
                    ].map(({ label, cgst, sgst, igst, rowCls }) => (
                      <tr key={label} className={rowCls || 'hover:bg-gray-50'}>
                        <td className={`px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] ${rowCls}`}>{label}</td>
                        <td className={`px-4 py-3.5 border-b border-[#f3f4f6] text-[13px] text-right font-mono ${rowCls}`}>{formatCurrency(cgst)}</td>
                        <td className={`px-4 py-3.5 border-b border-[#f3f4f6] text-[13px] text-right font-mono ${rowCls}`}>{formatCurrency(sgst)}</td>
                        <td className={`px-4 py-3.5 border-b border-[#f3f4f6] text-[13px] text-right font-mono ${rowCls}`}>{formatCurrency(igst)}</td>
                        <td className={`px-4 py-3.5 border-b border-[#f3f4f6] text-[13px] text-right font-mono ${rowCls}`}>{formatCurrency(cgst + sgst + igst)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-4 bg-blue-50 border-t border-blue-100 flex flex-wrap gap-2 justify-between items-center">
                <div className="text-[13px] text-blue-800 font-medium">Total cash to deposit to GST Electronic Cash Ledger</div>
                <div className="text-[22px] font-bold text-blue-700">{formatCurrency(totalCashDue)}</div>
              </div>
              {totalCashDue > 0 && !locked && (
                <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-[12px] text-amber-800">
                  Pay this amount at <strong>gstin.gov.in → Services → Payments → Create Challan (PMT-06)</strong> before filing GSTR-3B.
                </div>
              )}
              <div className="px-5 py-4 border-t border-[#edf2f7] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-[#1f2937]">Accounting GST Adjustment</div>
                  <div className="text-[12px] text-[#536173] mt-0.5">
                    Posts output GST, ITC utilization, bank payment, and late fee to accounting.
                  </div>
                  {accounting.voucherNo && (
                    <div className="mt-2 text-[12px] text-green-700">
                      Posted as <a className="font-semibold text-green-700 underline" href="/vouchers">{accounting.voucherNo}</a>
                      {accounting.postedAt ? ` on ${new Date(accounting.postedAt).toLocaleDateString()}` : ''}
                    </div>
                  )}
                </div>
                <button
                  className="px-4 py-2 rounded-md border border-blue-600 bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={postingAccounting || !hasGstLiability}
                  type="button"
                  onClick={handlePostAccounting}
                >
                  {postingAccounting ? 'Posting...' : accounting.voucherNo ? 'Repost Accounting Voucher' : 'Post to Accounting'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
