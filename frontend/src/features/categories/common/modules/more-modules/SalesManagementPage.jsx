import { useEffect, useState } from 'react';

import { apiClient } from '../../../../../services/apiClient.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';

const TABS    = ['Quotations', 'Orders', 'Invoices', 'All'];
const TAB_TYPE = { Quotations: 'quotation', Orders: 'order', Invoices: 'invoice', All: 'all' };
const STATUSES = ['All Status', 'Converted', 'Pending', 'Confirmed', 'Paid', 'Partially Paid', 'Cancelled'];

const TYPE_LABELS = {
  quotation: {
    newTitle: 'New Quotation',
    editTitle: 'Edit Quotation',
    number: 'Quotation No.',
    numberPlaceholder: 'Quotation no. (auto if blank)',
    party: 'Customer / Lead',
    partyPlaceholder: 'Customer or lead name *',
    owner: 'Prepared By',
    ownerPlaceholder: 'Prepared by',
    amount: 'Quoted Amount',
    date: 'Quote Date',
  },
  order: {
    newTitle: 'New Sales Order',
    editTitle: 'Edit Sales Order',
    number: 'Order No.',
    numberPlaceholder: 'Order no. (auto if blank)',
    party: 'Buyer / Customer',
    partyPlaceholder: 'Buyer or customer name *',
    owner: 'Order Owner',
    ownerPlaceholder: 'Order owner',
    amount: 'Order Value',
    date: 'Order Date',
  },
  invoice: {
    newTitle: 'New Invoice',
    editTitle: 'Edit Invoice',
    number: 'Invoice No.',
    numberPlaceholder: 'Invoice no. (auto if blank)',
    party: 'Bill To',
    partyPlaceholder: 'Billing customer name *',
    owner: 'Sales Person',
    ownerPlaceholder: 'Sales person',
    amount: 'Invoice Amount',
    date: 'Invoice Date',
  },
  all: {
    newTitle: 'New Sales Record',
    editTitle: 'Edit Record',
    number: 'Record No.',
    numberPlaceholder: 'Number (auto if blank)',
    party: 'Party',
    partyPlaceholder: 'Party name *',
    owner: 'Owner',
    ownerPlaceholder: 'Owner',
    amount: 'Value',
    date: 'Date',
  },
};

const STATUS_STYLES = {
  Converted:       'bg-green-100 text-green-700',
  Paid:            'bg-green-100 text-green-700',
  Pending:         'bg-yellow-100 text-yellow-700',
  Confirmed:       'bg-blue-100 text-blue-700',
  'Partially Paid':'bg-orange-100 text-orange-600',
  Cancelled:       'bg-red-100 text-red-600',
};

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#e11d48', '#65a30d'];
const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';

const EMPTY = { date: '', number: '', customer: '', person: '', amount: 0, status: 'Pending', type: 'quotation' };

export function SalesManagementPage() {
  const [records, setRecords]   = useState([]);
  const [stats, setStats]       = useState({ total: 0, quotations: 0, orders: 0, invoices: 0, totalAmount: 0, outstanding: 0 });
  const [tab, setTab]           = useState('Quotations');
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('All Status');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]         = useState(EMPTY);

  async function load() {
    try {
      const data = await apiClient('/more-modules/sales-records');
      setRecords(data.records ?? []);
      setStats(data.stats ?? {});
    } catch {}
  }

  useEffect(() => { load(); }, []);

  const filtered = records.filter((r) => {
    const type = TAB_TYPE[tab];
    const matchTab    = type === 'all' || r.type === type;
    const matchSearch = !search || r.customer.toLowerCase().includes(search.toLowerCase()) || r.number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === 'All Status' || r.status === status;
    return matchTab && matchSearch && matchStatus;
  });

  const activeType = TAB_TYPE[tab] === 'all' ? 'all' : TAB_TYPE[tab];
  const tableLabels = TYPE_LABELS[activeType] ?? TYPE_LABELS.all;
  const formLabels = TYPE_LABELS[form.type] ?? TYPE_LABELS.all;
  const newButtonLabel = TYPE_LABELS[activeType]?.newTitle ?? TYPE_LABELS.all.newTitle;

  function updateForm(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function resetForm() { setForm(EMPTY); setEditingId(null); setShowForm(false); }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, amount: Number(form.amount) };
    if (editingId) {
      await apiClient(`/more-modules/sales-records/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      if (!payload.number) {
        const { number } = await apiClient(`/more-modules/sales-records/next-number?type=${payload.type}`);
        payload.number = number;
      }
      await apiClient('/more-modules/sales-records', { method: 'POST', body: JSON.stringify(payload) });
    }
    await load();
    resetForm();
  }

  function handleEdit(r) {
    setForm({ date: r.date, number: r.number, customer: r.customer, person: r.person, amount: r.amount, status: r.status, type: r.type });
    setEditingId(r._id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this record?')) return;
    await apiClient(`/more-modules/sales-records/${id}`, { method: 'DELETE' });
    await load();
  }

  const statCards = [
    { label: 'Total Quotations',  value: String(stats.quotations ?? 0),         sub: 'This Month',  color: '#2563eb', bg: '#eff6ff' },
    { label: 'Converted Orders',  value: String(stats.orders ?? 0),              sub: 'This Month',  color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Total Invoices',    value: String(stats.invoices ?? 0),            sub: 'This Month',  color: '#d97706', bg: '#fffbeb' },
    { label: 'Total Sales',       value: formatCurrency(stats.totalAmount ?? 0), sub: 'All Records', color: '#0891b2', bg: '#ecfeff' },
    { label: 'Outstanding',       value: formatCurrency(stats.outstanding ?? 0), sub: 'Pending',     color: '#dc2626', bg: '#fef2f2' },
  ];

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>More Modules</span><span>›</span><span>Sales Management</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Sales Management</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Manage quotations, orders, invoices and sales activities</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button" onClick={() => { setForm({ ...EMPTY, type: TAB_TYPE[tab] === 'all' ? 'quotation' : TAB_TYPE[tab] }); setShowForm(true); }}>
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          {newButtonLabel}
        </button>
      </div>

      {showForm && (
        <form className="app-form-modal bg-white border border-[#dfe7f1] rounded-xl p-5 mt-5" onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-[15px] font-semibold">{editingId ? formLabels.editTitle : formLabels.newTitle}</h3>
            <button className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-xl font-[inherit]" type="button" onClick={resetForm}>×</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <SelectDropdown
              buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none"
              value={form.type}
              onChange={(v) => updateForm('type', v)}
              options={[{ value: 'quotation', label: 'Quotation' }, { value: 'order', label: 'Order' }, { value: 'invoice', label: 'Invoice' }]}
            />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder={formLabels.numberPlaceholder} value={form.number} onChange={(e) => updateForm('number', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder={formLabels.partyPlaceholder} required value={form.customer} onChange={(e) => updateForm('customer', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder={formLabels.ownerPlaceholder} value={form.person} onChange={(e) => updateForm('person', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" aria-label={formLabels.date} placeholder={formLabels.date} type="date" required value={form.date} onChange={(e) => updateForm('date', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-right outline-none focus:border-blue-500 font-[inherit]" min="0" placeholder={`${formLabels.amount} (₹)`} type="number" value={form.amount} onChange={(e) => updateForm('amount', e.target.value)} />
            <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={form.status} onChange={(v) => updateForm('status', v)} options={STATUSES.filter((s) => s !== 'All Status')} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button" onClick={resetForm}>Cancel</button>
            <button className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="submit">{editingId ? 'Update' : 'Save'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 my-5">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-center gap-4">
            <div>
              <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
              <div className="text-[15px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5 text-[#536173]">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="flex items-center gap-0 border-b border-[#edf2f7] flex-wrap">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-5 py-3 text-[13px] font-medium border-0 bg-transparent cursor-pointer border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-[#536173] hover:text-[#111827]'}`}>
              {t}
            </button>
          ))}
          <div className="flex items-center gap-3 ml-auto px-4 py-2 flex-wrap">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
              <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-1.5 text-[13px] w-52 outline-none focus:border-blue-500 font-[inherit]" placeholder="Search by customer, number..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-1.5 text-[13px] outline-none focus:border-blue-500 font-[inherit] text-[#536173] bg-white cursor-pointer" value={status} onChange={setStatus} options={STATUSES} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>{tableLabels.date}</th>
                <th className={TH}>{tableLabels.number}</th>
                <th className={TH}>{tableLabels.party}</th>
                <th className={TH}>{tableLabels.owner}</th>
                <th className={`${TH} text-right`}>{tableLabels.amount} (₹)</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="7" className="text-center py-8 text-[#536173] text-[13px]">No records found. Click "New Record" to get started.</td></tr>
              )}
              {filtered.map((row, i) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={`${TD} text-[#536173]`}>{row.date}</td>
                  <td className={`${TD} font-medium text-blue-600`}>{row.number}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-none" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                        {row.customer[0]}
                      </div>
                      <span className="font-medium text-[#111827]">{row.customer}</span>
                    </div>
                  </td>
                  <td className={`${TD} text-[#536173]`}>{row.person || '—'}</td>
                  <td className={`${TD} text-right font-medium`}>{formatCurrency(row.amount)}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[row.status] ?? 'bg-gray-100 text-gray-600'}`}>{row.status}</span>
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-1">
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-yellow-50 text-yellow-500 bg-transparent border-0 cursor-pointer" title="Edit" type="button" onClick={() => handleEdit(row)}>
                        <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer" title="Delete" type="button" onClick={() => handleDelete(row._id)}>
                        <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#edf2f7] flex justify-between text-[13px] text-[#536173]">
          <span>Showing {filtered.length} of {records.length} records</span>
        </div>
      </div>
    </div>
  );
}
