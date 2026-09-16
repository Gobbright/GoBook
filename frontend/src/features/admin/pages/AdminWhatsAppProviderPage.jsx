import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, MessageCircle, PlugZap, RefreshCw, Search, Send, ShieldCheck } from 'lucide-react';

import { AdminLayout } from '../AdminLayout.jsx';
import { fetchAdminWhatsAppProvider, updateAdminWhatsAppProviderStatus } from '../adminService.js';

const STATUS_OPTIONS = {
  onboardingStatus: ['Not Started', 'In Progress', 'Completed', 'Needs Attention'],
  metaVerificationStatus: ['Not Started', 'Pending', 'Verified', 'Rejected'],
  accountStatus: ['Pending', 'Active', 'Suspended', 'Disconnected'],
};

function statusTone(value) {
  const text = String(value || '').toLowerCase();
  if (['active', 'verified', 'connected', 'completed', 'authorized'].includes(text)) return 'bg-emerald-50 text-emerald-700';
  if (['rejected', 'failed', 'suspended', 'error', 'expired', 'disconnected', 'not connected'].includes(text)) return 'bg-red-50 text-red-700';
  return 'bg-amber-50 text-amber-700';
}

function Badge({ value }) {
  return <span className={`rounded-full px-2 py-1 text-[10px] font-black ${statusTone(value)}`}>{value || 'Not started'}</span>;
}

function Stat({ icon: Icon, label, value, color = 'text-blue-600 bg-blue-50' }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-3"><span className={`rounded-lg p-2.5 ${color}`}><Icon size={19} /></span><div><p className="m-0 text-[11px] font-bold text-slate-500">{label}</p><strong className="text-[21px] text-slate-900">{Number(value || 0).toLocaleString('en-IN')}</strong></div></div></div>;
}

function StatusSelect({ profile, field, onChange, saving }) {
  return <select value={profile[field] || ''} disabled={saving || !profile.canManage} onChange={(event) => onChange(profile, field, event.target.value)} className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
    {STATUS_OPTIONS[field].map((option) => <option key={option}>{option}</option>)}
  </select>;
}

export function AdminWhatsAppProviderPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function load({ keepLoading = false } = {}) {
    if (!keepLoading) setLoading(true);
    setError('');
    try { setData(await fetchAdminWhatsAppProvider()); }
    catch (err) { setError(err.message || 'Unable to load WhatsApp provider data.'); }
    finally { if (!keepLoading) setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function setStatus(profile, field, value) {
    const key = `${profile.businessId}:${field}`;
    setSavingKey(key); setError('');
    try {
      await updateAdminWhatsAppProviderStatus(profile.businessId, { [field]: value, expectedUpdatedAt: profile.updatedAt || null });
      await load({ keepLoading: true });
    } catch (err) {
      setError(err.message || 'Could not update provider status.');
    } finally { setSavingKey(''); }
  }

  const stats = data?.stats || {};
  const profiles = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data?.profiles || [];
    return (data?.profiles || []).filter((profile) => [profile.customer, profile.businessId, profile.waba?.name, profile.waba?.wabaId, profile.connectionStatus].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [data?.profiles, query]);

  return <AdminLayout><div className="p-4 md:p-6"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="m-0 text-[11px] font-black uppercase tracking-wider text-emerald-600">Main Admin - WhatsApp Business API</p><h2 className="m-0 mt-1 text-[22px] font-black text-slate-900">WhatsApp API Provider</h2><p className="m-0 mt-1 text-[12px] text-slate-500">Manage customer onboarding, admin review status, real Meta authorization and message usage.</p></div><button type="button" onClick={() => load()} disabled={loading || Boolean(savingKey)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60"><RefreshCw size={14} />Refresh</button></div>{error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}{loading ? <p className="py-16 text-center text-[13px] text-slate-500">Loading WhatsApp provider administration...</p> : <><div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={Building2} label="Provider customers" value={stats.customers} /><Stat icon={CheckCircle2} label="Active accounts" value={stats.active} color="text-emerald-600 bg-emerald-50" /><Stat icon={PlugZap} label="Meta connected" value={stats.connected} color="text-violet-600 bg-violet-50" /><Stat icon={MessageCircle} label="Messages sent" value={data?.totals?.sent} color="text-cyan-600 bg-cyan-50" /></div><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h3 className="m-0 text-[15px] font-black text-slate-900">Customer WhatsApp accounts</h3><p className="m-0 mt-1 text-[12px] text-slate-500">Admin review fields are separate from the real Meta connection state.</p></div><div className="flex flex-wrap items-center gap-2"><label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[12px] text-slate-500"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer or WABA" className="w-44 border-0 p-0 text-[12px] outline-none" /></label><Badge value={`${stats.pendingOnboarding || 0} pending`} /></div></div><div className="overflow-x-auto"><table className="min-w-[1180px] w-full text-left text-[12px]"><thead className="bg-slate-50 text-slate-500"><tr>{['Customer', 'Onboarding', 'Admin review', 'Meta connection', 'WABA', 'Numbers', 'API', 'Account status'].map((head) => <th key={head} className="px-4 py-3 font-bold">{head}</th>)}</tr></thead><tbody>{profiles.length ? profiles.map((profile) => <tr key={profile.businessId} className="border-t border-slate-100"><td className="px-4 py-3"><div className="font-bold text-slate-800">{profile.customer}</div><div className="mt-1 text-[10px] text-slate-400">{profile.businessId}</div></td><td className="px-4 py-3"><StatusSelect profile={profile} field="onboardingStatus" onChange={setStatus} saving={savingKey === `${profile.businessId}:onboardingStatus`} /></td><td className="px-4 py-3"><StatusSelect profile={profile} field="metaVerificationStatus" onChange={setStatus} saving={savingKey === `${profile.businessId}:metaVerificationStatus`} /></td><td className="px-4 py-3"><Badge value={profile.connectionStatus} />{profile.connectedAt && <div className="mt-1 text-[10px] text-slate-400">Connected {new Date(profile.connectedAt).toLocaleDateString('en-IN')}</div>}</td><td className="px-4 py-3"><div className="font-semibold text-slate-700">{profile.waba?.name || '-'}</div><div className="mt-1 text-[10px] text-slate-500">{profile.waba?.wabaId || ''}</div><div className="mt-1 text-[10px] font-bold text-slate-400">{profile.waba?.source || 'Manual record'}</div></td><td className="px-4 py-3"><span className="font-bold">{profile.phoneNumbers?.length || 0}</span>{profile.phoneNumbers?.[0] && <span className="ml-2"><Badge value={profile.phoneNumbers[0].verificationStatus} /></span>}</td><td className="px-4 py-3"><Badge value={profile.apiStatus} /><div className="mt-1 text-[10px] text-slate-400">{profile.webhookStatus}</div></td><td className="px-4 py-3"><StatusSelect profile={profile} field="accountStatus" onChange={setStatus} saving={savingKey === `${profile.businessId}:accountStatus`} /></td></tr>) : <tr><td colSpan="8" className="px-4 py-12 text-center text-[13px] text-slate-500">No WhatsApp provider customer profiles found.</td></tr>}</tbody></table></div></section><div className="mt-5 grid gap-5 xl:grid-cols-2"><section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="m-0 text-[15px] font-black text-slate-900">Campaign oversight</h3><p className="mt-1 text-[12px] text-slate-500">Showing latest {data?.campaigns?.length || 0} of {stats.campaigns || 0} campaigns.</p></div><Badge value={`${stats.campaigns || 0} total`} /></div><div className="mt-4 space-y-2">{(data?.campaigns || []).slice(0, 8).map((item) => <div key={item._id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[12px]"><span><span className="font-bold text-slate-700">{item.name}</span><span className="ml-2 text-[10px] text-slate-500">{item.customer}</span></span><span><Send size={12} className="mr-1 inline text-emerald-600" />{item.sent || 0} sent</span></div>)}</div></section><section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="m-0 text-[15px] font-black text-slate-900">Delivery usage</h3><div className="mt-4 grid grid-cols-2 gap-3">{[['Delivered', data?.totals?.delivered], ['Read', data?.totals?.read], ['Failed', data?.totals?.failed], ['Templates', stats.templates]].map(([name, value]) => <div key={name} className="rounded-lg bg-slate-50 p-3"><span className="text-[11px] font-bold text-slate-500">{name}</span><strong className="mt-1 block text-[18px] text-slate-900">{Number(value || 0).toLocaleString('en-IN')}</strong></div>)}</div><div className="mt-4 flex flex-wrap gap-2">{Object.entries(data?.messageStatus || {}).map(([name, value]) => <Badge key={name} value={`${name}: ${value}`} />)}</div></section></div></>}</div></AdminLayout>;
}