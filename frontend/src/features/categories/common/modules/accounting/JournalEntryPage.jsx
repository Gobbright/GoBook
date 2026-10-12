import { useEffect, useRef, useState } from 'react';

import {
  createJournalEntry,
  deleteJournalEntry,
  getJournalEntries,
  importJournalEntries,
  updateJournalEntry,
} from '../../../../../services/accountingService.js';
import { DateRangeFilter } from '../../../../../components/forms/DateRangeFilter.jsx';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';
import { isWithinDateRange } from '../../../../../utils/dateRange.js';

const EMPTY_ENTRY = { date: '', entryNo: '', particulars: '', debit: 0, credit: 0, status: 'Posted' };

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';

const PAGE_SIZE = 5;

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export function JournalEntryPage() {
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_ENTRY);
  const [formError, setFormError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  function loadJournalEntries() {
    return getJournalEntries()
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => setEntries([]));
  }

  useEffect(() => {
    let isMounted = true;

    getJournalEntries()
      .then((data) => {
        if (isMounted) setEntries(data.entries ?? []);
      })
      .catch(() => {
        if (isMounted) setEntries([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totalDebit  = entries.reduce((a, r) => a + r.debit, 0);
  const totalCredit = entries.reduce((a, r) => a + r.credit, 0);
  const diff = totalDebit - totalCredit;

  const filtered = entries.filter((r) => {
    if (filterStatus !== 'All' && r.status !== filterStatus) return false;
    return isWithinDateRange(r.date, dateFrom, dateTo);
  });

  useEffect(() => { setPage(1); }, [dateFrom, dateTo, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const exportColumns = [
    { label: 'Date', value: (row) => row.date },
    { label: 'Entry No.', value: (row) => row.entryNo },
    { label: 'Particulars', value: (row) => row.particulars },
    { label: 'Debit', value: (row) => formatCurrency(row.debit) },
    { label: 'Credit', value: (row) => formatCurrency(row.credit) },
    { label: 'Status', value: (row) => row.status },
  ];
  function updateForm(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function resetForm() {
    setForm(EMPTY_ENTRY);
    setEditingId(null);
    setShowForm(false);
    setFormError('');
  }
  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const payload = { ...form, debit: Number(form.debit), credit: Number(form.credit) };
    try {
      if (editingId) await updateJournalEntry(editingId, payload);
      else await createJournalEntry(payload);
      await loadJournalEntries();
      resetForm();
    } catch (err) {
      setFormError(err.message);
    }
  }
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    try {
      const result = await importJournalEntries(formData);
      setDateFrom(''); setDateTo('');
      await loadJournalEntries();
      setImportResult(result);
    } catch (err) {
      setImportResult({ error: err.message || 'Import failed' });
    } finally {
      setImporting(false);
    }
  }
  function handleEdit(row) {
    setForm({
      date: row.date,
      entryNo: row.entryNo,
      particulars: row.particulars,
      debit: row.debit,
      credit: row.credit,
      status: row.status,
    });
    setEditingId(row._id);
    setShowForm(true);
  }
  async function handleDelete(id) {
    await deleteJournalEntry(id);
    await loadJournalEntries();
  }

  return (
    <div className="p-4 md:p-7">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>Accounting</span><span>›</span><span>Journal Entry</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Journal Entry</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Create and manage journal entries</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter
            className="w-full sm:w-auto"
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
            onClear={() => { setDateFrom(''); setDateTo(''); }}
          />
          <SelectDropdown className="w-32 flex-none" value={filterStatus} onChange={setFilterStatus} options={['All', 'Posted', 'Draft']} />
          <ExportButtons title="Journal Entries" filename="journal-entries" rows={filtered} columns={exportColumns} />
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
          <button type="button" disabled={importing} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-60">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            {importing ? 'Importing...' : 'Import Excel'}
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]"
            type="button"
            onClick={() => setShowForm(true)}
          >
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
            New Journal Entry
          </button>
        </div>
      </div>

      {importResult && (
        <div className={`mt-4 mb-0 px-4 py-3 rounded-lg text-[13px] border ${importResult.error ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
          {importResult.error ? importResult.error : `Import complete: ${importResult.imported ?? 0} added, ${importResult.updated ?? 0} updated${(importResult.skipped ?? 0) > 0 ? `, ${importResult.skipped} skipped` : ''}.`}
          {importResult.errors?.length > 0 && <ul className="mt-1 list-disc pl-5 text-[12px]">{importResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}{importResult.errors.length > 5 && <li>...and {importResult.errors.length - 5} more</li>}</ul>}
          <button type="button" onClick={() => setImportResult(null)} className="mt-1 text-[12px] underline bg-transparent border-0 cursor-pointer p-0 text-inherit font-[inherit]">Dismiss</button>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-5">
        {[
          { label: 'Total Entries', value: String(entries.length), sub: 'This period', icon: '📝', bg: '#eff6ff', color: '#2563eb' },
          { label: 'Total Debit', value: formatCurrency(totalDebit), sub: 'Sum of debits', icon: '🔴', bg: '#fef2f2', color: '#dc2626' },
          { label: 'Total Credit', value: formatCurrency(totalCredit), sub: 'Sum of credits', icon: '🟢', bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Difference', value: formatCurrency(Math.abs(diff)), sub: diff === 0 ? 'Balanced ✓' : 'Unbalanced', icon: diff === 0 ? '⚖️' : '⚠️', bg: diff === 0 ? '#f0fdf4' : '#fffbeb', color: diff === 0 ? '#16a34a' : '#d97706' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-none" style={{ background: s.bg }}>
              {s.icon}
            </div>
            <div>
              <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
              <div className="text-[17px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: s.color }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── New Entry Form ── */}
      {showForm && (
        <>
        <button type="button" className="fixed inset-0 z-40 cursor-default border-0 bg-black/45" aria-label="Close journal entry form" onClick={resetForm} />
        <form className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#dfe7f1] bg-white shadow-2xl md:inset-x-4 md:bottom-auto md:top-1/2 md:max-w-3xl md:-translate-y-1/2 md:rounded-2xl" onSubmit={handleSubmit}>
          <div className="sticky top-0 z-10 flex justify-between items-center border-b border-[#edf2f7] bg-white px-4 py-3 md:px-5 md:py-4">
            <div>
              <h3 className="m-0 text-[16px] font-bold text-[#111827]">{editingId ? 'Edit Journal Entry' : 'Add Journal Entry'}</h3>
              <p className="m-0 mt-0.5 text-[12px] font-medium text-[#64748b]">Enter debit and credit details with proper posting status.</p>
            </div>
            <button className="h-9 w-9 inline-flex items-center justify-center rounded-md text-[#536173] hover:text-[#111827] hover:bg-gray-100 bg-transparent border-0 cursor-pointer text-xl font-[inherit]" type="button" onClick={resetForm}>x</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Entry No.</label>
              <input className="h-11 border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="JE/26-27/001" required value={form.entryNo} onChange={(e) => updateForm('entryNo', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Date</label>
              <input className="h-11 border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" required type="date" value={form.date} onChange={(e) => updateForm('date', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Status</label>
              <SelectDropdown buttonClassName="h-11" value={form.status} onChange={(v) => updateForm('status', v)} options={['Posted', 'Draft']} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Particulars</label>
              <input className="h-11 border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="To Cash A/c" required value={form.particulars} onChange={(e) => updateForm('particulars', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Debit</label>
              <input className="h-11 border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-right outline-none focus:border-blue-500 font-[inherit]" min="0" type="number" value={form.debit} onChange={(e) => updateForm('debit', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Credit</label>
              <input className="h-11 border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-right outline-none focus:border-blue-500 font-[inherit]" min="0" type="number" value={form.credit} onChange={(e) => updateForm('credit', e.target.value)} />
            </div>
          </div>
          {formError && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{formError}</p>}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <span className="text-[13px] text-[#536173]">Debit and credit should match before posting.</span>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button className="h-10 px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button" onClick={resetForm}>Cancel</button>
              <button className="h-10 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="submit">{editingId ? 'Update Entry' : 'Post Entry'}</button>
            </div>
          </div>
          </div>
        </form>
        </>
      )}

      {/* ── Table ── */}
      <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Date</th>
                <th className={TH}>Entry No.</th>
                <th className={TH}>Particulars</th>
                <th className={`${TH} text-right`}>Debit (₹)</th>
                <th className={`${TH} text-right`}>Credit (₹)</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={`${TD} text-[#536173]`}>{row.date}</td>
                  <td className={`${TD} font-mono font-semibold text-[#111827]`}>{row.entryNo}</td>
                  <td className={`${TD} font-medium text-[#374151]`}>{row.particulars}</td>
                  <td className={`${TD} text-right text-[#dc2626] font-medium`}>{formatCurrency(row.debit)}</td>
                  <td className={`${TD} text-right text-[#16a34a] font-medium`}>{formatCurrency(row.credit)}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${row.status === 'Posted' ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className={TD}>
                    <div className="flex gap-1">
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-blue-50 text-blue-500 bg-transparent border-0 cursor-pointer" type="button" title="Edit" onClick={() => handleEdit(row)}>
                        <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer" type="button" title="Delete" onClick={() => handleDelete(row._id)}>
                        <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#edf2f7] flex items-center justify-between text-[13px] text-[#536173]">
          <span>Showing {paginated.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">←</button>
            {pageNumbers(page, totalPages).map((p, i) => p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 py-1 text-[12px] text-[#536173]">…</span>
            ) : (
              <button key={p} onClick={() => setPage(p)} className={`px-2 py-1 text-[12px] border rounded font-[inherit] cursor-pointer ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`}>{p}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
