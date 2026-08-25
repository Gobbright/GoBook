import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BarChart3, Bot, CalendarDays, CheckCircle2, ChevronDown, ChevronRight,
  Edit3, Eye, FileText, Gauge, Mail, MailCheck, MousePointer2, MoreVertical, Plus,
  Search, Send, Settings, Trash2, XCircle,
} from 'lucide-react';

import { apiClient } from '../../../../../services/apiClient.js';

const EMPTY = { name: '', subject: '', body: '', recipientsText: '', scheduledAt: '' };
const EMPTY_LIST = { name: '', contacts: '' };
const TABS = ['Overview', 'Campaigns', 'Templates', 'Lists', 'Automations', 'Reports', 'Settings'];

const STATUS_STYLES = {
  Draft: 'bg-slate-100 text-slate-600',
  Scheduled: 'bg-amber-50 text-amber-700',
  Sent: 'bg-emerald-50 text-emerald-700',
};

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function number(value) {
  return Number(value || 0).toLocaleString();
}

function pct(n, d, digits = 1) {
  if (!d) return '0%';
  return `${((Number(n || 0) / Number(d || 0)) * 100).toFixed(digits)}%`;
}

function Card({ children, className = '' }) {
  return <section className={`min-w-0 rounded-lg border border-[#dfe7f1] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${className}`}>{children}</section>;
}

function MetricCard({ icon: Icon, label, value, sub, trend, color }) {
  return (
    <Card className="min-h-[110px] p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${color}18`, color }}>
          <Icon size={23} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <div className="text-[12px] font-bold text-[#536173]">{label}</div>
          <div className="mt-1 text-[25px] font-black leading-tight text-[#071936]">{value}</div>
          <div className="mt-1 text-[12px] text-[#536173]">
            {trend ? <span className={trend.startsWith('-') ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>{trend}</span> : sub}
            {trend && <span> vs last 7 days</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

function IconButton({ title, children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function MiniChart({ totals }) {
  const base = Math.max(1, totals.sent);
  const bars = [
    ['Emails Sent', totals.sent, '#2563eb'],
    ['Delivered', Math.max(0, totals.sent - totals.failed), '#059669'],
    ['Opened', totals.opened, '#6d28d9'],
    ['Clicked', totals.clicked, '#f97316'],
  ];
  return (
    <div className="relative min-h-[240px] rounded-md border border-[#edf2f7] bg-white px-5 py-4">
      <div className="mb-4 flex flex-wrap gap-6 text-[12px] font-bold text-[#536173]">
        {bars.map(([label, , color]) => (
          <span key={label} className="inline-flex items-center gap-2"><span className="h-1.5 w-4 rounded-full" style={{ background: color }} />{label}</span>
        ))}
      </div>
      <div className="grid h-36 grid-cols-4 items-end gap-4 border-b border-[#e7eef7]">
        {bars.map(([label, value, color]) => (
          <div key={label} className="flex h-full flex-col justify-end gap-2">
            <div className="mx-auto w-full max-w-[76px] rounded-t-md" style={{ height: `${Math.max(6, (value / base) * 100)}%`, background: `${color}24`, borderTop: `3px solid ${color}` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-4 text-center text-[11px] text-[#536173]">
        {bars.map(([label]) => <span key={label}>{label.split(' ')[0]}</span>)}
      </div>
    </div>
  );
}

export function EmailMarketingPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ totalSent: 0, totalOpened: 0, totalClicked: 0, totalBounced: 0 });
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [showForm, setShowForm] = useState(false);
  const [showListForm, setShowListForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [listForm, setListForm] = useState(EMPTY_LIST);
  const [emailLists, setEmailLists] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [sendingId, setSendingId] = useState(null);
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      const data = await apiClient('/more-modules/email-campaigns');
      setCampaigns(data.campaigns ?? []);
      setStats(data.stats ?? {});
    } catch (err) {
      setNotice(err.message || 'Unable to load email campaigns.');
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = campaigns.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [c.name, c.subject, c.status].some((value) => String(value ?? '').toLowerCase().includes(q));
  });

  const totals = useMemo(() => {
    const totalSent = Number(stats.totalSent || 0) || campaigns.reduce((sum, c) => sum + Number(c.sent || 0), 0);
    const totalOpened = Number(stats.totalOpened || 0) || campaigns.reduce((sum, c) => sum + Number(c.opened || 0), 0);
    const totalClicked = Number(stats.totalClicked || 0) || campaigns.reduce((sum, c) => sum + Number(c.clicked || 0), 0);
    const totalBounced = Number(stats.totalBounced || 0) || campaigns.reduce((sum, c) => sum + Number(c.bounced || 0), 0);
    return {
      campaignsSent: campaigns.filter((c) => c.status === 'Sent').length,
      sent: totalSent,
      delivered: Math.max(0, totalSent - totalBounced),
      opened: totalOpened,
      clicked: totalClicked,
      failed: totalBounced,
    };
  }, [campaigns, stats]);

  const topCampaigns = [...campaigns]
    .sort((a, b) => (Number(b.opened || 0) / Math.max(1, Number(b.sent || 0))) - (Number(a.opened || 0) / Math.max(1, Number(a.sent || 0))))
    .slice(0, 5);

  function updateForm(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function updateListForm(k, v) { setListForm((f) => ({ ...f, [k]: v })); }

  function resetForm() {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(false);
  }

  function openNewCampaign() {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(true);
  }

  function openTemplateCampaign() {
    setForm({ ...EMPTY, subject: 'Your update from GoBook', body: 'Hi {{customer_name}},\n\n' });
    setEditingId(null);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, scheduledAt: form.scheduledAt || null };
    let saved;
    if (editingId) {
      saved = await apiClient(`/more-modules/email-campaigns/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      setCampaigns((current) => current.map((row) => (row._id === editingId ? saved : row)));
      setNotice('Campaign updated.');
    } else {
      saved = await apiClient('/more-modules/email-campaigns', { method: 'POST', body: JSON.stringify(payload) });
      setCampaigns((current) => [saved, ...current.filter((row) => row._id !== saved._id)]);
      setNotice('Campaign created.');
    }
    setActiveTab('Campaigns');
    await load();
    resetForm();
  }

  function handleEdit(c) {
    setForm({
      name: c.name,
      subject: c.subject ?? '',
      body: c.body ?? '',
      recipientsText: (c.recipients ?? []).map((r) => r.email).join('\n'),
      scheduledAt: toDatetimeLocal(c.scheduledAt),
    });
    setEditingId(c._id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this campaign?')) return;
    await apiClient(`/more-modules/email-campaigns/${id}`, { method: 'DELETE' });
    setNotice('Campaign deleted.');
    await load();
  }

  async function handleSendNow(c) {
    if (!window.confirm(`Send "${c.name}" to ${(c.recipients ?? []).length} recipient(s) now?`)) return;
    setSendingId(c._id);
    try {
      const res = await apiClient(`/more-modules/email-campaigns/${c._id}/send`, { method: 'POST' });
      setNotice(res.message || 'Campaign sent.');
    } catch (err) {
      setNotice(err.message || 'Failed to send campaign.');
    } finally {
      setSendingId(null);
      await load();
    }
  }

  function createList(e) {
    e.preventDefault();
    const contacts = Number(listForm.contacts) || 0;
    setEmailLists((current) => [{ id: crypto.randomUUID(), name: listForm.name, contacts, createdAt: new Date().toISOString(), status: 'Active' }, ...current]);
    setListForm(EMPTY_LIST);
    setShowListForm(false);
    setActiveTab('Lists');
    setNotice('Email list created locally.');
  }

  function createAutomation() {
    setAutomations((current) => [{ id: crypto.randomUUID(), name: `Automation ${current.length + 1}`, trigger: 'Manual trigger', enabled: true, lastRun: '-' }, ...current]);
    setActiveTab('Automations');
    setNotice('Automation workflow created locally.');
  }

  function renderCampaignRows(limit) {
    const rows = limit ? filtered.slice(0, limit) : filtered;
    if (rows.length === 0) {
      return <tr><td colSpan={7} className="py-8 text-center text-[13px] text-[#536173]">No campaigns yet. Create a campaign to see it here.</td></tr>;
    }
    return rows.map((row) => (
      <tr key={row._id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
        <td className="py-3 pr-3 font-bold text-blue-800">{row.name}</td>
        <td className="pr-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[row.status] ?? STATUS_STYLES.Draft}`}>{row.status}</span></td>
        <td className="pr-3 text-[#536173]">{row.status === 'Scheduled' ? fmtDate(row.scheduledAt) : fmtDate(row.sentOn || row.createdAt)}</td>
        <td className="pr-3 text-[#0f2f5f]">{number((row.recipients ?? []).length)}</td>
        <td className="pr-3 text-[#0f2f5f]">{pct(row.opened, row.sent)}</td>
        <td className="pr-3 text-[#0f2f5f]">{pct(row.clicked, row.sent)}</td>
        <td className="text-right">
          <IconButton title="Send Now" disabled={sendingId === row._id} onClick={() => handleSendNow(row)}><Send size={14} /></IconButton>
          <IconButton title="Edit" onClick={() => handleEdit(row)}><Edit3 size={14} /></IconButton>
          <IconButton title="Delete" onClick={() => handleDelete(row._id)}><Trash2 size={14} className="text-red-500" /></IconButton>
        </td>
      </tr>
    ));
  }

  return (
    <div className="email-marketing-page min-h-full overflow-x-hidden bg-[#f7faff] p-4 md:p-6">
      <div className="mx-auto w-full max-w-[1720px] overflow-x-hidden">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="m-0 text-[24px] font-black tracking-tight text-[#071936]">Email Marketing</h1>
            <p className="m-0 mt-1 text-[13px] text-[#536173]">Create, send and track email campaigns</p>
          </div>
          <div className="flex flex-1 items-center gap-3 lg:max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7b8da8]" size={16} />
              <input
                className="h-11 w-full rounded-md border border-[#dbe4ef] bg-white pl-11 pr-4 text-[13px] outline-none focus:border-blue-500"
                placeholder="Search guest, room, booking, invoice..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <button type="button" onClick={openNewCampaign} className="inline-flex h-10 items-center gap-2 rounded-md border-0 bg-blue-600 px-5 text-[13px] font-bold text-white hover:bg-blue-700">
              <Plus size={16} /> Create Campaign
            </button>
          </div>
        </div>

        {notice && (
          <div className="mb-4 flex items-center justify-between rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] text-blue-800">
            <span>{notice}</span>
            <button type="button" className="border-0 bg-transparent text-blue-700" onClick={() => setNotice('')}>Dismiss</button>
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard icon={Send} label="Campaigns Sent" value={number(totals.campaignsSent)} color="#7c3aed" />
          <MetricCard icon={Mail} label="Emails Sent" value={number(totals.sent)} color="#2563eb" />
          <MetricCard icon={MailCheck} label="Delivered" value={number(totals.delivered)} sub={`${pct(totals.delivered, totals.sent)} Delivery Rate`} color="#059669" />
          <MetricCard icon={Eye} label="Open Rate" value={pct(totals.opened, totals.sent)} color="#f97316" />
          <MetricCard icon={MousePointer2} label="Click Rate" value={pct(totals.clicked, totals.sent)} color="#16a34a" />
          <MetricCard icon={XCircle} label="Bounce Rate" value={pct(totals.failed, totals.sent)} color="#ef4444" />
        </div>

        <div className="mb-4 flex gap-7 overflow-x-auto border-b border-[#dbe4ef]">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative border-0 bg-transparent px-1 pb-3 text-[13px] font-bold ${activeTab === tab ? 'text-blue-700' : 'text-[#0f2f5f] hover:text-blue-700'}`}
            >
              {tab}
              {activeTab === tab && <span className="absolute bottom-[-1px] left-0 h-0.5 w-full rounded-full bg-blue-600" />}
            </button>
          ))}
        </div>

        {activeTab === 'Campaigns' && (
          <Card className="mb-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-[16px] font-black text-[#071936]">Campaigns</h2>
              <button type="button" onClick={openNewCampaign} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-blue-700 hover:bg-blue-50"><Plus size={15} /> New Campaign</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead><tr className="text-[#536173]"><th className="py-2">Campaign Name</th><th>Status</th><th>Sent On</th><th>Recipients</th><th>Open Rate</th><th>Click Rate</th><th /></tr></thead>
                <tbody>{renderCampaignRows()}</tbody>
              </table>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)_minmax(280px,0.72fr)]">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-[15px] font-black text-[#071936]">Recent Campaigns</h2>
              <button type="button" onClick={() => setActiveTab('Campaigns')} className="border-0 bg-transparent text-[12px] font-bold text-blue-700">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead><tr className="text-[#536173]"><th className="py-2">Campaign Name</th><th>Status</th><th>Sent On</th><th>Recipients</th><th>Open Rate</th><th>Click Rate</th><th /></tr></thead>
                <tbody>{renderCampaignRows(5)}</tbody>
              </table>
            </div>
            <button type="button" onClick={openNewCampaign} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-blue-700 hover:bg-blue-50"><Plus size={15} /> New Campaign</button>
          </Card>

          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="m-0 text-[15px] font-black text-[#071936]">Email Performance Overview</h2>
              <button type="button" className="inline-flex items-center gap-1 rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0f2f5f]">This Month <ChevronDown size={13} /></button>
            </div>
            <MiniChart totals={totals} />
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['Emails Sent', totals.sent, '#2563eb'],
                ['Delivered', totals.delivered, '#059669'],
                ['Opened', totals.opened, '#6d28d9'],
                ['Clicked', totals.clicked, '#f97316'],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-md border border-[#dbe4ef] p-3 text-center" style={{ background: `${color}08` }}>
                  <strong className="block text-[18px]" style={{ color }}>{number(value)}</strong>
                  <span className="text-[11px] text-[#536173]">{label}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex min-w-0 flex-col gap-4 xl:col-span-2 2xl:col-span-1">
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="m-0 text-[15px] font-black text-[#071936]">Top Performing Campaign</h2>
                <button type="button" className="inline-flex items-center gap-1 rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] text-[#0f2f5f]">This Month <ChevronDown size={13} /></button>
              </div>
              <div className="rounded-md border border-[#edf2f7]">
                {topCampaigns.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-[#536173]">No sent campaign data yet.</div>
                ) : topCampaigns.map((campaign) => (
                  <div key={campaign._id} className="flex items-center justify-between border-b border-[#edf2f7] px-4 py-3 text-[12px] last:border-b-0">
                    <span className="font-bold text-blue-800">{campaign.name}</span>
                    <strong className="text-[#071936]">{pct(campaign.opened, campaign.sent)}</strong>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setActiveTab('Reports')} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white text-[13px] font-bold text-blue-700 hover:bg-blue-50">View Campaign Report <ArrowRight size={15} /></button>
            </Card>

            <Card className="p-4">
              <h2 className="m-0 mb-3 text-[15px] font-black text-[#071936]">Quick Actions</h2>
              {[
                [Send, 'Create Campaign', openNewCampaign],
                [FileText, 'Create Email Template', openTemplateCampaign],
                [CalendarDays, 'Create Email List', () => setShowListForm(true)],
                [Bot, 'Create Automation', createAutomation],
                [BarChart3, 'View Reports', () => setActiveTab('Reports')],
                [Settings, 'Email Settings', () => setActiveTab('Settings')],
              ].map(([Icon, label, action]) => (
                <button key={label} type="button" onClick={action} className="flex w-full items-center gap-3 border-0 border-b border-[#edf2f7] bg-white px-2 py-3 text-left text-[12px] font-bold text-[#071936] hover:bg-blue-50 last:border-b-0">
                  <Icon size={15} className="text-blue-700" /><span className="flex-1">{label}</span><ChevronRight size={14} className="text-[#7b8da8]" />
                </button>
              ))}
            </Card>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.95fr)_minmax(280px,0.74fr)]">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-[15px] font-black text-[#071936]">Email Lists</h2>
              <button type="button" onClick={() => setActiveTab('Lists')} className="border-0 bg-transparent text-[12px] font-bold text-blue-700">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead><tr className="text-[#536173]"><th className="py-2">List Name</th><th>Contacts</th><th>Created On</th><th>Status</th></tr></thead>
                <tbody>
                  {emailLists.length === 0 ? (
                    <tr className="border-t border-[#edf2f7]"><td colSpan={4} className="py-8 text-center text-[#536173]">No email lists created.</td></tr>
                  ) : emailLists.map((list) => (
                    <tr key={list.id} className="border-t border-[#edf2f7]">
                      <td className="py-3 font-bold text-blue-800">{list.name}</td>
                      <td>{number(list.contacts)}</td>
                      <td>{fmtDate(list.createdAt)}</td>
                      <td><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{list.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => setShowListForm(true)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-blue-700 hover:bg-blue-50"><Plus size={15} /> Create List</button>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-[15px] font-black text-[#071936]">Automation Workflows</h2>
              <button type="button" onClick={() => setActiveTab('Automations')} className="border-0 bg-transparent text-[12px] font-bold text-blue-700">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead><tr className="text-[#536173]"><th className="py-2">Workflow Name</th><th>Trigger</th><th>Status</th><th>Last Run</th></tr></thead>
                <tbody>
                  {automations.length === 0 ? (
                    <tr className="border-t border-[#edf2f7]"><td colSpan={4} className="py-8 text-center text-[#536173]">No automation workflows configured.</td></tr>
                  ) : automations.map((workflow) => (
                    <tr key={workflow.id} className="border-t border-[#edf2f7]">
                      <td className="py-3 font-bold text-blue-800">{workflow.name}</td>
                      <td>{workflow.trigger}</td>
                      <td><button type="button" onClick={() => setAutomations((current) => current.map((item) => item.id === workflow.id ? { ...item, enabled: !item.enabled } : item))} className={`h-4 w-8 rounded-full border-0 ${workflow.enabled ? 'bg-emerald-600' : 'bg-slate-300'}`} /></td>
                      <td>{workflow.lastRun}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={createAutomation} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-blue-700 hover:bg-blue-50"><Plus size={15} /> Create Automation</button>
          </Card>

          <Card className="p-4">
            <h2 className="m-0 mb-4 text-[15px] font-black text-[#071936]">Email Account Status</h2>
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[12px] font-bold text-slate-600"><CheckCircle2 size={15} /> Configure SMTP</span>
              <span className="text-[12px] text-[#536173]">Settings required</span>
            </div>
            <div className="mb-2 flex justify-between text-[12px]"><span className="text-[#536173]">Daily Email Limit</span><strong>{number(totals.sent)} sent</strong></div>
            <div className="h-2 overflow-hidden rounded-full bg-[#e5edf7]"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, totals.sent / 100)}%` }} /></div>
            <div className="mt-3 flex justify-between text-[12px]"><span className="text-[#536173]">Reset Time</span><strong>12:00 AM (Daily)</strong></div>
            <button type="button" onClick={() => setActiveTab('Settings')} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white text-[13px] font-bold text-blue-700 hover:bg-blue-50"><Gauge size={15} /> Manage Email Settings</button>
          </Card>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="w-full max-w-3xl rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl" onSubmit={handleSubmit}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-[17px] font-black text-[#071936]">{editingId ? 'Edit Campaign' : 'New Email Campaign'}</h3>
              <button type="button" onClick={resetForm} className="border-0 bg-transparent text-[#536173] hover:text-[#071936]"><XCircle size={20} /></button>
            </div>
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Campaign name *" required value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
              <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Subject line" value={form.subject} onChange={(e) => updateForm('subject', e.target.value)} />
            </div>
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <textarea className="min-h-40 rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Email body / template" value={form.body} onChange={(e) => updateForm('body', e.target.value)} />
              <textarea className="min-h-40 rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Recipients: one email per line, or comma-separated" value={form.recipientsText} onChange={(e) => updateForm('recipientsText', e.target.value)} />
            </div>
            <label className="mb-5 block text-[12px] font-bold text-[#536173]">
              Schedule send
              <input type="datetime-local" className="mt-1 block rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={form.scheduledAt} onChange={(e) => updateForm('scheduledAt', e.target.value)} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={resetForm} className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-[#536173] hover:bg-slate-50">Cancel</button>
              <button type="submit" className="rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-blue-700">{editingId ? 'Update Campaign' : 'Save Campaign'}</button>
            </div>
          </form>
        </div>
      )}

      {showListForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="w-full max-w-md rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl" onSubmit={createList}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-[17px] font-black text-[#071936]">Create Email List</h3>
              <button type="button" onClick={() => setShowListForm(false)} className="border-0 bg-transparent text-[#536173] hover:text-[#071936]"><XCircle size={20} /></button>
            </div>
            <input className="mb-3 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="List name *" required value={listForm.name} onChange={(e) => updateListForm('name', e.target.value)} />
            <input className="mb-5 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Contacts count" type="number" min="0" value={listForm.contacts} onChange={(e) => updateListForm('contacts', e.target.value)} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowListForm(false)} className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-[#536173] hover:bg-slate-50">Cancel</button>
              <button type="submit" className="rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-blue-700">Create List</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
