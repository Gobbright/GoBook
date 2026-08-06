import { useEffect, useState } from 'react';

import { apiClient } from '../../../../../services/apiClient.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';

const TYPES    = ['Promotional', 'Transactional', 'Utility'];
const STATUSES = ['Draft', 'Active', 'Completed', 'Paused'];
const EMPTY    = { name: '', type: 'Promotional', message: '', sent: 0, delivered: 0, read: 0, replied: 0, status: 'Draft' };

const TYPE_STYLES = {
  Promotional:   'bg-purple-100 text-purple-700',
  Transactional: 'bg-blue-100 text-blue-700',
  Utility:       'bg-gray-100 text-gray-600',
};
const STATUS_STYLES = {
  Draft:     'bg-gray-100 text-gray-600',
  Active:    'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Paused:    'bg-yellow-100 text-yellow-700',
};

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD = 'px-4 py-3 border-b border-[#f3f4f6] text-[13px]';

export function WhatsAppBusinessPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats]         = useState({ totalSent: 0, totalDelivered: 0, totalRead: 0, totalReplied: 0, totalBounced: 0 });
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [preview, setPreview]     = useState('Hi {{customer_name}}, Check out our new offers just for you!\n\nShop now and get exclusive discounts.\n\nThank you,\nYour Business');

  async function load() {
    try {
      const data = await apiClient('/more-modules/whatsapp-campaigns');
      setCampaigns(data.campaigns ?? []);
      setStats(data.stats ?? {});
    } catch {}
  }

  useEffect(() => { load(); }, []);

  const filtered = campaigns.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  function updateForm(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function resetForm() { setForm(EMPTY); setEditingId(null); setShowForm(false); }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      sent: Number(form.sent), delivered: Number(form.delivered),
      read: Number(form.read), replied: Number(form.replied),
    };
    if (editingId) await apiClient(`/more-modules/whatsapp-campaigns/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await apiClient('/more-modules/whatsapp-campaigns', { method: 'POST', body: JSON.stringify(payload) });
    await load();
    resetForm();
  }

  function handleEdit(c) {
    setForm({ name: c.name, type: c.type, message: c.message, sent: c.sent, delivered: c.delivered, read: c.read, replied: c.replied, status: c.status });
    setEditingId(c._id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this campaign?')) return;
    await apiClient(`/more-modules/whatsapp-campaigns/${id}`, { method: 'DELETE' });
    await load();
  }

  const pct = (n, d) => d ? `${Math.round((n / d) * 100)}%` : '0%';

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>More Modules</span><span>›</span><span>WhatsApp Business</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">WhatsApp Business</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Send messages and manage WhatsApp campaigns</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button" onClick={() => setShowForm(true)}>
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          New Campaign
        </button>
      </div>

      {showForm && (
        <form className="app-form-modal bg-white border border-[#dfe7f1] rounded-xl p-5 mt-5" onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-[15px] font-semibold">{editingId ? 'Edit Campaign' : 'New WhatsApp Campaign'}</h3>
            <button className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-xl font-[inherit]" type="button" onClick={resetForm}>×</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Campaign name *" required value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
            <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={form.type} onChange={(v) => updateForm('type', v)} options={TYPES} />
            <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={form.status} onChange={(v) => updateForm('status', v)} options={STATUSES} />
          </div>
          <textarea
            className="w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] resize-y mb-3"
            placeholder="Message template (use {{customer_name}} for personalisation)"
            rows={3}
            value={form.message}
            onChange={(e) => { updateForm('message', e.target.value); setPreview(e.target.value || 'Hi {{customer_name}}, Check out our new offers just for you!'); }}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[['sent','Sent'],['delivered','Delivered'],['read','Read'],['replied','Replied']].map(([k, lbl]) => (
              <input key={k} className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-right outline-none focus:border-blue-500 font-[inherit]" min="0" placeholder={lbl} type="number" value={form[k]} onChange={(e) => updateForm(k, e.target.value)} />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button" onClick={resetForm}>Cancel</button>
            <button className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="submit">{editingId ? 'Update Campaign' : 'Save Campaign'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 my-5">
        {[
          { label: 'Messages Sent', value: stats.totalSent.toLocaleString(),      sub: 'Total',                                           color: '#25d366' },
          { label: 'Delivered',     value: stats.totalDelivered.toLocaleString(), sub: pct(stats.totalDelivered, stats.totalSent),        color: '#2563eb' },
          { label: 'Read',          value: stats.totalRead.toLocaleString(),      sub: pct(stats.totalRead, stats.totalSent),             color: '#0891b2' },
          { label: 'Replied',       value: stats.totalReplied.toLocaleString(),   sub: pct(stats.totalReplied, stats.totalSent),          color: '#7c3aed' },
          { label: 'Bounced',       value: stats.totalBounced.toLocaleString(),   sub: pct(stats.totalBounced, stats.totalSent),          color: '#dc2626' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
            <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
            <div className="text-[17px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5 text-[#536173]">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Campaign list */}
        <div className="bg-white border border-[#dfe7f1] rounded-xl">
          <div className="px-5 py-3.5 border-b border-[#edf2f7] flex items-center gap-3 flex-wrap">
            <span className="text-[14px] font-semibold text-[#111827] flex-1">Campaigns</span>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
              <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-1.5 text-[13px] w-48 outline-none focus:border-blue-500 font-[inherit]" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Campaign Name</th>
                  <th className={TH}>Type</th>
                  <th className={`${TH} text-right`}>Sent</th>
                  <th className={`${TH} text-right`}>Delivered</th>
                  <th className={`${TH} text-right`}>Read</th>
                  <th className={`${TH} text-right`}>Replied</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan="8" className="text-center py-8 text-[#536173] text-[13px]">No campaigns yet. Click "New Campaign" to create one.</td></tr>
                )}
                {filtered.map((row) => (
                  <tr key={row._id} className="hover:bg-gray-50">
                    <td className={`${TD} font-medium text-[#111827]`}>{row.name}</td>
                    <td className={TD}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${TYPE_STYLES[row.type] ?? 'bg-gray-100 text-gray-600'}`}>{row.type}</span>
                    </td>
                    <td className={`${TD} text-right text-[#536173]`}>{row.sent.toLocaleString()}</td>
                    <td className={`${TD} text-right text-[#536173]`}>{row.delivered.toLocaleString()}</td>
                    <td className={`${TD} text-right text-[#536173]`}>{row.read.toLocaleString()}</td>
                    <td className={`${TD} text-right text-[#536173]`}>{row.replied.toLocaleString()}</td>
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

        {/* Message Preview */}
        <div className="bg-white border border-[#dfe7f1] rounded-xl flex flex-col">
          <div className="px-5 py-3.5 border-b border-[#edf2f7]">
            <span className="text-[14px] font-semibold text-[#111827]">Message Preview</span>
          </div>
          <div className="flex-1 p-4" style={{ background: '#e5ddd5' }}>
            <div className="max-w-60 ml-auto">
              <div className="bg-[#dcf8c6] rounded-lg rounded-br-sm p-3 shadow-sm">
                <p className="m-0 text-[13px] text-[#111827] leading-relaxed whitespace-pre-wrap">{preview}</p>
                <div className="flex justify-end mt-1">
                  <span className="text-[11px] text-[#536173]">10:30 AM ✓✓</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-3 border-t border-[#edf2f7]">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 border border-[#dbe4ef] rounded-full px-4 py-2 text-[13px] outline-none focus:border-green-500 font-[inherit]"
                placeholder="Type a message..."
                value={preview}
                onChange={(e) => setPreview(e.target.value)}
              />
              <button className="w-9 h-9 rounded-full bg-[#25d366] flex items-center justify-center border-0 cursor-pointer flex-none" type="button">
                <svg fill="none" height="16" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24" width="16"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
