import { useEffect, useState } from 'react';

import { apiClient } from '../../../../../services/apiClient.js';

const STATUSES = ['Draft', 'Scheduled', 'Sent'];
const EMPTY    = { name: '', subject: '', body: '', sentOn: '', sent: 0, opened: 0, clicked: 0, bounced: 0, status: 'Draft' };

const STATUS_STYLES = {
  Draft:     'bg-gray-100 text-gray-600',
  Scheduled: 'bg-yellow-100 text-yellow-700',
  Sent:      'bg-green-100 text-green-700',
};

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD = 'px-4 py-3 border-b border-[#f3f4f6] text-[13px]';

export function EmailMarketingPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats]         = useState({ totalSent: 0, totalOpened: 0, totalClicked: 0, totalBounced: 0 });
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY);

  async function load() {
    try {
      const data = await apiClient('/more-modules/email-campaigns');
      setCampaigns(data.campaigns ?? []);
      setStats(data.stats ?? {});
    } catch {}
  }

  useEffect(() => { load(); }, []);

  const filtered = campaigns.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.subject ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  function updateForm(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function resetForm() { setForm(EMPTY); setEditingId(null); setShowForm(false); }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      sent: Number(form.sent), opened: Number(form.opened),
      clicked: Number(form.clicked), bounced: Number(form.bounced),
    };
    if (editingId) await apiClient(`/more-modules/email-campaigns/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await apiClient('/more-modules/email-campaigns', { method: 'POST', body: JSON.stringify(payload) });
    await load();
    resetForm();
  }

  function handleEdit(c) {
    setForm({ name: c.name, subject: c.subject ?? '', body: c.body ?? '', sentOn: c.sentOn ?? '', sent: c.sent, opened: c.opened, clicked: c.clicked, bounced: c.bounced, status: c.status });
    setEditingId(c._id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this campaign?')) return;
    await apiClient(`/more-modules/email-campaigns/${id}`, { method: 'DELETE' });
    await load();
  }

  const pct = (n, d) => d ? `${Math.round((n / d) * 100)}%` : '0%';

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>More Modules</span><span>›</span><span>Email Marketing</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Email Marketing</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Create and manage email campaigns</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button" onClick={() => setShowForm(true)}>
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          New Campaign
        </button>
      </div>

      {showForm && (
        <form className="app-form-modal bg-white border border-[#dfe7f1] rounded-xl p-5 mt-5" onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-[15px] font-semibold">{editingId ? 'Edit Campaign' : 'New Email Campaign'}</h3>
            <button className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-xl font-[inherit]" type="button" onClick={resetForm}>×</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Campaign name *" required value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Subject line" value={form.subject} onChange={(e) => updateForm('subject', e.target.value)} />
            <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <textarea
              className="w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] resize-y"
              placeholder="Email body / template"
              rows={4}
              value={form.body}
              onChange={(e) => updateForm('body', e.target.value)}
            />
            <div className="flex flex-col gap-2">
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Sent on (e.g. 2024-06-01)" value={form.sentOn} onChange={(e) => updateForm('sentOn', e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                {[['sent','Sent'],['opened','Opened'],['clicked','Clicked'],['bounced','Bounced']].map(([k, lbl]) => (
                  <input key={k} className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-right outline-none focus:border-blue-500 font-[inherit]" min="0" placeholder={lbl} type="number" value={form[k]} onChange={(e) => updateForm(k, e.target.value)} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button" onClick={resetForm}>Cancel</button>
            <button className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="submit">{editingId ? 'Update Campaign' : 'Save Campaign'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-5">
        {[
          { label: 'Emails Sent', value: stats.totalSent.toLocaleString(),    sub: 'Total',                                         color: '#2563eb' },
          { label: 'Opened',      value: stats.totalOpened.toLocaleString(),  sub: pct(stats.totalOpened, stats.totalSent),         color: '#0891b2' },
          { label: 'Clicked',     value: stats.totalClicked.toLocaleString(), sub: pct(stats.totalClicked, stats.totalSent),        color: '#7c3aed' },
          { label: 'Bounced',     value: stats.totalBounced.toLocaleString(), sub: pct(stats.totalBounced, stats.totalSent),        color: '#dc2626' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
            <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
            <div className="text-[17px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5 text-[#536173]">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="px-5 py-3.5 border-b border-[#edf2f7] flex items-center gap-3 flex-wrap">
          <span className="text-[14px] font-semibold text-[#111827] flex-1">Campaigns</span>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-1.5 text-[13px] w-52 outline-none focus:border-blue-500 font-[inherit]" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Campaign Name</th>
                <th className={TH}>Subject</th>
                <th className={TH}>Sent On</th>
                <th className={`${TH} text-right`}>Sent</th>
                <th className={`${TH} text-right`}>Opened</th>
                <th className={`${TH} text-right`}>Clicked</th>
                <th className={`${TH} text-right`}>Bounced</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="9" className="text-center py-8 text-[#536173] text-[13px]">No campaigns yet. Click "New Campaign" to create one.</td></tr>
              )}
              {filtered.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-[#111827]`}>{row.name}</td>
                  <td className={`${TD} text-[#536173] max-w-xs truncate`} title={row.subject}>{row.subject || '—'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.sentOn || '—'}</td>
                  <td className={`${TD} text-right text-[#536173]`}>{row.sent.toLocaleString()}</td>
                  <td className={`${TD} text-right text-[#536173]`}>{row.opened.toLocaleString()}</td>
                  <td className={`${TD} text-right text-[#536173]`}>{row.clicked.toLocaleString()}</td>
                  <td className={`${TD} text-right text-[#536173]`}>{row.bounced.toLocaleString()}</td>
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
        <div className="px-5 py-3 border-t border-[#edf2f7] text-[13px] text-[#536173]">
          Showing {filtered.length} of {campaigns.length} campaigns
        </div>
      </div>
    </div>
  );
}
