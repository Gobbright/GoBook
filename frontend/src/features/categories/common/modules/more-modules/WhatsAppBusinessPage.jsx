import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, BarChart3, Bell, Bot, Boxes, Calendar, CheckCircle2, ChevronDown, Circle, Clock, Copy, Edit3, FileText, Filter,
  Eye, GitBranch, Globe2, Grid3X3, ImageIcon, Inbox, LayoutDashboard, List, Mail, Megaphone, MessageCircle, Mic, MoreVertical, MousePointerClick, Package, Paperclip,
  Ban, Headphones, Phone, Play, Plus, RefreshCw, Search, Send, Settings, ShieldCheck, ShoppingBag, Tag, Trash2, Undo2, UserCheck, UserPlus, Users, X,
  XCircle, Zap, ZoomIn, ZoomOut, Share2,
} from 'lucide-react';

import { api } from '../../../../../services/api.js';
import { apiClient } from '../../../../../services/apiClient.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const SIDEBAR = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['inbox', 'Inbox', Inbox],
  ['contacts', 'Contacts', Users],
  ['campaigns', 'Campaigns', Send],
  ['templates', 'Templates', FileText],
  ['automation', 'Automation', Zap],
  ['chatbot', 'Chatbot', Bot],
  ['flows', 'WhatsApp Flows', GitBranch],
  ['catalog', 'Catalog', ShoppingBag],
  ['notifications', 'Notifications', Bell],
  ['assistant', 'AI Assistant', ShieldCheck],
  ['analytics', 'Analytics & Reports', BarChart3],
  ['settings', 'Settings', Settings],
];

const FILTERS = ['All', 'Unread', 'Assigned', 'Pending', 'Resolved', 'Spam'];

function number(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

function cleanPhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('91') || digits.length > 10 ? digits : `91${digits}`;
}

function responseList(response, keys = []) {
  if (Array.isArray(response)) return response;
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  return [];
}

function nextNodeId(nodes = [], prefix = 'node') {
  const used = new Set(nodes.map((node) => node.nodeId).filter(Boolean));
  let index = used.size + 1;
  let id = `${prefix}-${index}`;
  while (used.has(id)) {
    index += 1;
    id = `${prefix}-${index}`;
  }
  return id;
}

function dateLabel(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusTone(status = '') {
  const value = status.toLowerCase();
  if (value.includes('active') || value.includes('approved') || value.includes('running')) return 'green';
  if (value.includes('scheduled') || value.includes('draft')) return 'amber';
  return 'slate';
}

function Card({ children, className = '' }) {
  return <section className={`rounded-lg border border-[#dfe7f1] bg-white ${className}`}>{children}</section>;
}

function StatusPill({ children, tone = 'green' }) {
  const styles = {
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${styles[tone] || styles.slate}`}>{children}</span>;
}

function IconButton({ children, label, onClick, disabled = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#536173] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function ActionMenu({ id, openId, setOpenId, actions = [], label = 'Actions' }) {
  const isOpen = openId === id;
  return (
    <div className="relative inline-flex" onClick={(event) => event.stopPropagation()}>
      <IconButton label={label} onClick={() => setOpenId(isOpen ? '' : id)}>
        <MoreVertical size={15} />
      </IconButton>
      {isOpen && (
        <div className="absolute right-0 top-10 z-30 min-w-40 overflow-hidden rounded-md border border-[#dbe4ef] bg-white py-1 text-left shadow-lg">
          {actions.filter(Boolean).map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={action.disabled}
              onClick={async () => {
                setOpenId('');
                await action.onClick?.();
              }}
              className={`flex h-9 w-full items-center gap-2 border-0 bg-white px-3 text-left text-[12px] font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${action.danger ? 'text-red-600' : 'text-[#334155]'}`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled = false, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border-0 bg-emerald-600 px-4 text-[13px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function EmptyPanel({ title, message, action }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-[#d8e2ee] bg-[#f8fbff] px-6 py-12 text-center">
      <MessageCircle size={34} className="mb-3 text-emerald-600" />
      <h3 className="m-0 text-[17px] font-black text-[#17233c]">{title}</h3>
      <p className="m-0 mt-2 max-w-md text-[13px] leading-relaxed text-[#64748b]">{message}</p>
      {action}
    </div>
  );
}

function SimpleTable({ columns, rows, emptyText }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="text-left text-[#64748b]">
            {columns.map((column) => <th key={column} className="border-b border-[#edf2f7] px-4 py-3 font-bold">{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={row.key || rowIndex} className="border-b border-[#f3f6fa] hover:bg-slate-50">
              {row.cells.map((cell, index) => <td key={`${row.key || rowIndex}-${index}`} className="px-4 py-3 text-[#1f2f46]">{cell}</td>)}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] text-[#64748b]">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ContactAvatar({ name }) {
  return (
    <span className="relative flex h-11 w-11 flex-none items-center justify-center rounded-full bg-emerald-100 text-[13px] font-black text-emerald-800">
      {initials(name)}
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-500">
        <MessageCircle size={9} className="text-white" />
      </span>
    </span>
  );
}

function percent(part, total) {
  if (!Number(total)) return '0.0%';
  return `${((Number(part || 0) / Number(total)) * 100).toFixed(1)}%`;
}

function campaignStatusLabel(status = '') {
  return status === 'Active' ? 'Running' : status || '-';
}

function campaignStatusMatches(tab, status = '') {
  if (tab === 'All Campaigns') return true;
  if (tab === 'Running') return status === 'Active';
  return status === tab;
}

function CampaignMetric({ icon: Icon, label, value, note, tone = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-full ${colors[tone] || colors.emerald}`}>
          <Icon size={22} />
        </span>
        <div className="min-w-0">
          <p className="m-0 text-[12px] font-black text-[#17233c]">{label}</p>
          <h3 className="m-0 mt-1 text-[24px] font-black leading-tight text-[#0f172a]">{value}</h3>
          <p className="m-0 mt-2 text-[12px] font-semibold text-emerald-600">{note}</p>
        </div>
      </div>
    </Card>
  );
}

function CampaignPerformance({ sent, delivered, read, replied, failed }) {
  const total = Math.max(Number(sent || 0), 0);
  const deliveredPct = total ? (Number(delivered || 0) / total) * 100 : 0;
  const readPct = total ? (Number(read || 0) / total) * 100 : 0;
  const replyPct = total ? (Number(replied || 0) / total) * 100 : 0;
  const failedPct = total ? (Number(failed || 0) / total) * 100 : 0;
  const deliveredStop = Math.min(62, 34 + deliveredPct * 0.28);
  const readStop = Math.min(84, deliveredStop + readPct * 0.22);
  const replyStop = Math.min(96, readStop + replyPct * 0.16);
  const conic = total ? [
    'conic-gradient(',
    '#2563eb 0 34%, ',
    `#16a34a 34% ${deliveredStop}%, `,
    `#8b5cf6 ${deliveredStop}% ${readStop}%, `,
    `#14b8a6 ${readStop}% ${replyStop}%, `,
    `#ef4444 ${replyStop}% 100%)`,
  ].join('') : 'conic-gradient(#e2e8f0 0 100%)';
  const rows = [
    ['Sent', sent, '100.0%', '#2563eb'],
    ['Delivered', delivered, percent(delivered, sent), '#16a34a'],
    ['Read', read, percent(read, sent), '#8b5cf6'],
    ['Replies', replied, percent(replied, sent), '#14b8a6'],
    ['Failed', failed, `${failedPct.toFixed(1)}%`, '#ef4444'],
  ];

  return (
    <Card className="p-5">
      <h3 className="m-0 text-[15px] font-black text-[#17233c]">Campaign Performance <span className="text-[12px] font-semibold text-[#64748b]">(All Campaigns)</span></h3>
      <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
        <div className="relative h-36 w-36 rounded-full" style={{ background: conic }}>
          <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white text-center">
            <strong className="text-[18px] text-[#17233c]">{number(sent)}</strong>
            <span className="text-[11px] text-[#64748b]">Total Sent</span>
          </div>
        </div>
        <div className="grid flex-1 gap-3 text-[12px] text-[#1f2f46]">
          {rows.map(([label, value, rate, color]) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <span className="min-w-0"><b className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: color }} />{label}</span>
              <strong className="whitespace-nowrap">{number(value)} ({rate})</strong>
            </div>
          ))}
        </div>
      </div>
      <button type="button" onClick={() => {}} className="mt-5 border-0 bg-transparent p-0 text-[12px] font-bold text-blue-600">View detailed analytics</button>
    </Card>
  );
}

function CampaignFormModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', type: 'Promotional', message: '', status: 'Draft' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await apiClient('/more-modules/whatsapp-campaigns', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Campaign could not be created.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <form onSubmit={submit} className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf2f7] px-5 py-4">
          <h3 className="m-0 text-[16px] font-black text-[#17233c]">New Campaign</h3>
          <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Campaign name</span>
            <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Type</span>
              <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                {['Promotional', 'Transactional', 'Utility'].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Status</span>
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                {['Draft', 'Active', 'Completed', 'Paused'].map((status) => <option key={status} value={status}>{campaignStatusLabel(status)}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Message</span>
            <textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} rows={5} className="w-full resize-none rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-emerald-500" />
          </label>
          {error && <p className="m-0 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf2f7] px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-slate-50">Cancel</button>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Campaign'}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}

function ContactFormModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ recordType: 'Customer', name: '', phone: '', email: '', city: '', source: 'WhatsApp', status: 'Active' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isLead = form.recordType === 'Lead';

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const payload = isLead
      ? { name: form.name, phone: form.phone, email: form.email, source: form.source || 'WhatsApp', status: form.status === 'Inactive' ? 'New' : form.status || 'New' }
      : { name: form.name, phone: form.phone, email: form.email, city: form.city, status: ['Active', 'Inactive'].includes(form.status) ? form.status : 'Active' };
    try {
      if (isLead) {
        await apiClient('/crm/leads', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        await api.createCustomer(payload);
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Contact could not be created.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <form onSubmit={submit} className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf2f7] px-5 py-4">
          <h3 className="m-0 text-[16px] font-black text-[#17233c]">Add Contact</h3>
          <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Type</span>
              <select value={form.recordType} onChange={(event) => setForm((current) => ({ ...current, recordType: event.target.value, status: event.target.value === 'Lead' ? 'New' : 'Active' }))} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                {['Customer', 'Lead'].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Status</span>
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                {(isLead ? ['New', 'Contacted', 'In Progress', 'Qualified', 'Converted'] : ['Active', 'Inactive']).map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Name</span>
            <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Phone</span>
              <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Email</span>
              <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">City</span>
              <input disabled={isLead} value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-[#94a3b8]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Source</span>
              <input disabled={!isLead} value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-[#94a3b8]" />
            </label>
          </div>
          {error && <p className="m-0 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf2f7] px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-slate-50">Cancel</button>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Contact'}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}

function extractVariables(body = '') {
  return [...new Set(String(body).match(/\{\{[^}]+\}\}/g) || [])];
}

function TemplateFormModal({ template, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: template?.name || '',
    category: template?.category || 'Utility',
    language: template?.language || 'English',
    status: template?.status || 'Pending',
    header: template?.header || '',
    body: template?.body || '',
    footer: template?.footer || '',
    buttons: template?.buttons?.length ? template.buttons : [],
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateButton(index, field, value) {
    setForm((current) => ({
      ...current,
      buttons: current.buttons.map((button, buttonIndex) => buttonIndex === index ? { ...button, [field]: value } : button),
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await apiClient(template?._id ? `/more-modules/whatsapp-templates/${template._id}` : '/more-modules/whatsapp-templates', {
        method: template?._id ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Template could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf2f7] px-5 py-4">
          <h3 className="m-0 text-[16px] font-black text-[#17233c]">{template ? 'Edit Template' : 'Create Template'}</h3>
          <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>
        <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5">
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Template name</span>
            <input required value={form.name} onChange={(event) => setField('name', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Category</span>
              <select value={form.category} onChange={(event) => setField('category', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                {['Marketing', 'Utility', 'Authentication'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Language</span>
              <input value={form.language} onChange={(event) => setField('language', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Status</span>
              <select value={form.status} onChange={(event) => setField('status', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                {['Pending', 'Approved', 'Rejected', 'Disabled'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Header</span>
            <input value={form.header} onChange={(event) => setField('header', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Body</span>
            <textarea required value={form.body} onChange={(event) => setField('body', event.target.value)} rows={8} className="w-full resize-none rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-emerald-500" placeholder="Hi {{customer_name}}, your invoice {{invoice_number}} is ready." />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Footer</span>
            <input value={form.footer} onChange={(event) => setField('footer', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
          </label>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#536173]">Buttons</span>
              <button type="button" onClick={() => setForm((current) => ({ ...current, buttons: [...current.buttons, { label: '', type: 'Quick Reply' }] }))} className="border-0 bg-transparent text-[12px] font-bold text-blue-600">Add Button</button>
            </div>
            <div className="space-y-2">
              {form.buttons.map((button, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_150px_36px]">
                  <input value={button.label} onChange={(event) => updateButton(index, 'label', event.target.value)} placeholder="Button label" className="h-10 rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
                  <select value={button.type} onChange={(event) => updateButton(index, 'type', event.target.value)} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                    {['Quick Reply', 'URL Button', 'Phone Button'].map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <IconButton label="Remove button" onClick={() => setForm((current) => ({ ...current, buttons: current.buttons.filter((_, buttonIndex) => buttonIndex !== index) }))}><X size={15} /></IconButton>
                </div>
              ))}
              {!form.buttons.length && <p className="m-0 text-[12px] text-[#64748b]">No buttons added.</p>}
            </div>
          </div>
          {error && <p className="m-0 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf2f7] px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-slate-50">Cancel</button>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Template'}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}

function AutomationFormModal({ automation, templates, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: automation?.name || '',
    description: automation?.description || '',
    trigger: automation?.trigger || 'Invoice Created',
    triggerGroup: automation?.triggerGroup || 'Billing',
    action: automation?.action || 'Send WhatsApp',
    templateName: automation?.templateName || templates[0]?.name || '',
    status: automation?.status || 'Draft',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await apiClient(automation?._id ? `/more-modules/whatsapp-automations/${automation._id}` : '/more-modules/whatsapp-automations', {
        method: automation?._id ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Automation could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf2f7] px-5 py-4">
          <h3 className="m-0 text-[16px] font-black text-[#17233c]">{automation ? 'Edit Automation' : 'Create Automation'}</h3>
          <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Automation name</span>
            <input required value={form.name} onChange={(event) => setField('name', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Description</span>
            <input value={form.description} onChange={(event) => setField('description', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Trigger</span>
              <input required value={form.trigger} onChange={(event) => setField('trigger', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Trigger group</span>
              <input value={form.triggerGroup} onChange={(event) => setField('triggerGroup', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Status</span>
              <select value={form.status} onChange={(event) => setField('status', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                {['Draft', 'Active', 'Inactive'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Action</span>
              <input required value={form.action} onChange={(event) => setField('action', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Template</span>
              <select value={form.templateName} onChange={(event) => setField('templateName', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                <option value="">No template selected</option>
                {templates.map((template) => <option key={template._id} value={template.name}>{template.name}</option>)}
              </select>
            </label>
          </div>
          {error && <p className="m-0 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf2f7] px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-slate-50">Cancel</button>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Automation'}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}

function ChatbotFormModal({ bot, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: bot?.name || '',
    description: bot?.description || '',
    language: bot?.language || 'English',
    status: bot?.status || 'Draft',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = bot?._id ? { ...bot, ...form } : form;
      await apiClient(bot?._id ? `/more-modules/whatsapp-chatbots/${bot._id}` : '/more-modules/whatsapp-chatbots', {
        method: bot?._id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Bot could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <form onSubmit={submit} className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf2f7] px-5 py-4">
          <h3 className="m-0 text-[16px] font-black text-[#17233c]">{bot ? 'Edit Bot' : 'Create New Bot'}</h3>
          <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Bot name</span>
            <input required value={form.name} onChange={(event) => setField('name', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Description</span>
            <input value={form.description} onChange={(event) => setField('description', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Language</span>
              <select value={form.language} onChange={(event) => setField('language', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                {['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'].map((language) => <option key={language} value={language}>{language}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Status</span>
              <select value={form.status} onChange={(event) => setField('status', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                {['Draft', 'Active', 'Inactive'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>
          {error && <p className="m-0 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf2f7] px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-slate-50">Cancel</button>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Bot'}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}

function FlowFormModal({ flow, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: flow?.name || '',
    description: flow?.description || '',
    category: flow?.category || 'Lead Generation',
    status: flow?.status || 'Draft',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = flow?._id ? { ...flow, ...form } : form;
      await apiClient(flow?._id ? `/more-modules/whatsapp-flows/${flow._id}` : '/more-modules/whatsapp-flows', {
        method: flow?._id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Flow could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <form onSubmit={submit} className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf2f7] px-5 py-4">
          <h3 className="m-0 text-[16px] font-black text-[#17233c]">{flow ? 'Edit Flow' : 'Create Flow'}</h3>
          <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Flow name</span>
            <input required value={form.name} onChange={(event) => setField('name', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Description</span>
            <input value={form.description} onChange={(event) => setField('description', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Category</span>
              <select value={form.category} onChange={(event) => setField('category', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                {['Lead Generation', 'Customer Support', 'Booking & Appointment', 'Feedback', 'Others'].map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Status</span>
              <select value={form.status} onChange={(event) => setField('status', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                {['Draft', 'Published', 'Inactive'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>
          {error && <p className="m-0 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf2f7] px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-slate-50">Cancel</button>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Flow'}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}

function CatalogProductModal({ product, categories, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    description: product?.description || '',
    productDescription: product?.productDescription || '',
    code: product?.code || '',
    category: product?.category || '',
    brand: product?.brand || '',
    rate: product?.rate ?? '',
    stock: product?.stock ?? 0,
    minStockLevel: product?.minStockLevel ?? 0,
    unit: product?.unit || 'Nos',
    status: product?.status || 'Active',
    itemType: product?.itemType || 'Product',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        rate: Number(form.rate || 0),
        stock: Number(form.stock || 0),
        minStockLevel: Number(form.minStockLevel || 0),
      };
      if (!payload.code) delete payload.code;
      if (product?._id) {
        await api.invUpdateProduct(product._id, payload);
      } else {
        await api.invCreateProduct(payload);
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Product could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf2f7] px-5 py-4">
          <h3 className="m-0 text-[16px] font-black text-[#17233c]">{product ? 'Edit Product' : 'Add Product'}</h3>
          <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Product name</span>
              <input required value={form.description} onChange={(event) => setField('description', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">SKU</span>
              <input value={form.code} onChange={(event) => setField('code', event.target.value.toUpperCase())} placeholder="Auto generated when empty" className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Description</span>
            <textarea value={form.productDescription} onChange={(event) => setField('productDescription', event.target.value)} rows={3} className="w-full resize-none rounded-md border border-[#dbe4ef] p-3 text-[13px] outline-none focus:border-emerald-500" />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Category</span>
              <input list="catalog-categories" value={form.category} onChange={(event) => setField('category', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
              <datalist id="catalog-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Brand</span>
              <input value={form.brand} onChange={(event) => setField('brand', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Status</span>
              <select value={form.status} onChange={(event) => setField('status', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                {['Active', 'Inactive'].map((status) => <option key={status} value={status}>{status === 'Active' ? 'Published' : 'Draft'}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Price</span>
              <input required type="number" min="0" step="0.01" value={form.rate} onChange={(event) => setField('rate', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Stock</span>
              <input type="number" min="0" value={form.stock} onChange={(event) => setField('stock', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Min stock</span>
              <input type="number" min="0" value={form.minStockLevel} onChange={(event) => setField('minStockLevel', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-[#536173]">Unit</span>
              <input value={form.unit} onChange={(event) => setField('unit', event.target.value)} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
            </label>
          </div>
          {error && <p className="m-0 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf2f7] px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-slate-50">Cancel</button>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Product'}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}

function NewMessageModal({ contacts, onClose }) {
  const [selectedId, setSelectedId] = useState(contacts[0]?._id || contacts[0]?.phone || '');
  const [message, setMessage] = useState('');
  const selected = contacts.find((contact) => (contact._id || contact.phone) === selectedId);
  const phone = cleanPhone(selected?.phone);

  function sendMessage() {
    if (!phone) return;
    const text = encodeURIComponent(message.trim());
    window.open(`https://wa.me/${phone}${text ? `?text=${text}` : ''}`, '_blank', 'noopener');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf2f7] px-5 py-4">
          <h3 className="m-0 text-[16px] font-black text-[#17233c]">New WhatsApp Message</h3>
          <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Contact</span>
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500"
            >
              {contacts.map((contact) => (
                <option key={contact._id || contact.phone} value={contact._id || contact.phone}>
                  {contact.name} {contact.phone ? `(${contact.phone})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-[#536173]">Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder="Type your message..."
              className="w-full resize-none rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-emerald-500"
            />
          </label>
          {!phone && <p className="m-0 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-700">This contact does not have a usable phone number.</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf2f7] px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-slate-50">Cancel</button>
          <PrimaryButton onClick={sendMessage} disabled={!phone}><Send size={15} /> Open WhatsApp</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export function WhatsAppBusinessPage() {
  const [active, setActive] = useState('inbox');
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateStats, setTemplateStats] = useState({});
  const [automations, setAutomations] = useState([]);
  const [automationStats, setAutomationStats] = useState({});
  const [chatbots, setChatbots] = useState([]);
  const [chatbotStats, setChatbotStats] = useState({});
  const [flows, setFlows] = useState([]);
  const [flowStats, setFlowStats] = useState({});
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogStats, setCatalogStats] = useState({});
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sortNewest, setSortNewest] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showAutomationForm, setShowAutomationForm] = useState(false);
  const [showChatbotForm, setShowChatbotForm] = useState(false);
  const [showFlowForm, setShowFlowForm] = useState(false);
  const [showCatalogProductForm, setShowCatalogProductForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingChatbot, setEditingChatbot] = useState(null);
  const [editingFlow, setEditingFlow] = useState(null);
  const [editingCatalogProduct, setEditingCatalogProduct] = useState(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateTab, setTemplateTab] = useState('All Templates');
  const [templateCategory, setTemplateCategory] = useState('All Categories');
  const [templateStatus, setTemplateStatus] = useState('All Status');
  const [templatePage, setTemplatePage] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [automationSearch, setAutomationSearch] = useState('');
  const [automationTab, setAutomationTab] = useState('All Automations');
  const [automationTrigger, setAutomationTrigger] = useState('All Triggers');
  const [automationAction, setAutomationAction] = useState('All Actions');
  const [automationStatus, setAutomationStatus] = useState('All Status');
  const [automationPage, setAutomationPage] = useState(1);
  const [selectedAutomationId, setSelectedAutomationId] = useState('');
  const [chatbotTab, setChatbotTab] = useState('Bot Builder');
  const [selectedChatbotId, setSelectedChatbotId] = useState('');
  const [selectedChatbotNodeId, setSelectedChatbotNodeId] = useState('');
  const [savingChatbot, setSavingChatbot] = useState(false);
  const [flowTab, setFlowTab] = useState('All Flows');
  const [flowSearch, setFlowSearch] = useState('');
  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [selectedFlowNodeId, setSelectedFlowNodeId] = useState('');
  const [savingFlow, setSavingFlow] = useState(false);
  const [catalogTab, setCatalogTab] = useState('All Products');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('All Categories');
  const [catalogStatus, setCatalogStatus] = useState('All Status');
  const [catalogPage, setCatalogPage] = useState(1);
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState('');
  const [catalogImporting, setCatalogImporting] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState('');
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantMessages, setAssistantMessages] = useState([]);
  const catalogFileRef = useRef(null);
  const [contactTab, setContactTab] = useState('All Contacts');
  const [contactStatus, setContactStatus] = useState('All Status');
  const [contactSource, setContactSource] = useState('All Source');
  const [contactPage, setContactPage] = useState(1);
  const [selectedContactKey, setSelectedContactKey] = useState('');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignTab, setCampaignTab] = useState('All Campaigns');
  const [campaignType, setCampaignType] = useState('All');
  const [campaignPage, setCampaignPage] = useState(1);
  const [loadError, setLoadError] = useState('');
  const [nowMs, setNowMs] = useState(0);
  const [openActionMenu, setOpenActionMenu] = useState('');

  async function loadWhatsAppData(shouldApply) {
    const requests = [
      apiClient('/more-modules/whatsapp-campaigns'),
      apiClient('/more-modules/whatsapp-templates'),
      apiClient('/more-modules/whatsapp-automations'),
      apiClient('/more-modules/whatsapp-chatbots'),
      apiClient('/more-modules/whatsapp-flows'),
      api.invListProducts({ page: 1, limit: 500 }),
      api.invProductStats(),
      api.invProductCategories(),
      api.listCustomers(),
      apiClient('/crm/leads'),
      api.listVendors(),
      api.listInvoices(),
    ];
    const results = await Promise.allSettled(requests);
    if (shouldApply && !shouldApply()) return;
    const campaignResult = results[0];
    const templateResult = results[1];
    const automationResult = results[2];
    const chatbotResult = results[3];
    const flowResult = results[4];
    const catalogResult = results[5];
    const catalogStatsResult = results[6];
    const catalogCategoriesResult = results[7];
    const customerResult = results[8];
    const leadResult = results[9];
    const vendorResult = results[10];
    const invoiceResult = results[11];
    if (campaignResult.status === 'fulfilled') {
      setCampaigns(campaignResult.value.campaigns || []);
      setStats(campaignResult.value.stats || {});
    }
    if (templateResult.status === 'fulfilled') {
      setTemplates(templateResult.value.templates || []);
      setTemplateStats(templateResult.value.stats || {});
    }
    if (automationResult.status === 'fulfilled') {
      setAutomations(automationResult.value.automations || []);
      setAutomationStats(automationResult.value.stats || {});
    }
    if (chatbotResult.status === 'fulfilled') {
      setChatbots(chatbotResult.value.chatbots || []);
      setChatbotStats(chatbotResult.value.stats || {});
    }
    if (flowResult.status === 'fulfilled') {
      setFlows(flowResult.value.flows || []);
      setFlowStats(flowResult.value.stats || {});
    }
    if (catalogResult.status === 'fulfilled') {
      setCatalogProducts(responseList(catalogResult.value, ['data', 'products']));
      setCatalogTotal(catalogResult.value.total || 0);
    }
    if (catalogStatsResult.status === 'fulfilled') setCatalogStats(catalogStatsResult.value || {});
    if (catalogCategoriesResult.status === 'fulfilled') setCatalogCategories(catalogCategoriesResult.value || []);
    setCustomers(customerResult.status === 'fulfilled' ? responseList(customerResult.value, ['customers', 'data']) : []);
    setLeads(leadResult.status === 'fulfilled' ? responseList(leadResult.value, ['leads', 'data']) : []);
    setVendors(vendorResult.status === 'fulfilled' ? responseList(vendorResult.value, ['vendors', 'data']) : []);
    setInvoices(invoiceResult.status === 'fulfilled' ? responseList(invoiceResult.value, ['invoices', 'data']) : []);
    if ([campaignResult, templateResult, automationResult, chatbotResult, flowResult, catalogResult, catalogStatsResult, catalogCategoriesResult, customerResult, leadResult, vendorResult, invoiceResult].every((result) => result.status === 'rejected')) {
      setLoadError('WhatsApp Business data could not be loaded right now.');
    } else {
      setLoadError('');
    }
  }

  useEffect(() => {
    let activeRequest = true;
    loadWhatsAppData(() => activeRequest);
    return () => { activeRequest = false; };
  }, []);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  const contacts = useMemo(() => {
    const rows = [
      ...customers.map((item) => ({ ...item, type: 'Customer', source: item.source || 'CRM', location: item.city || item.address || '', keyPrefix: 'customer' })),
      ...leads.map((item) => ({ ...item, type: 'Lead', source: item.source || 'CRM', location: item.company || '', keyPrefix: 'lead' })),
      ...vendors.map((item) => ({ ...item, type: 'Vendor', source: item.source || 'Vendor', location: item.category || item.address || '', keyPrefix: 'vendor' })),
    ];
    const seen = new Set();
    return rows.filter((item) => {
      const key = `${item.keyPrefix}:${cleanPhone(item.phone) || String(item.email || item.name || item._id || '').toLowerCase()}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [customers, leads, vendors]);

  const filteredContacts = contacts.filter((contact) => {
    const text = `${contact.name || ''} ${contact.phone || ''} ${contact.email || ''} ${contact.city || ''} ${contact.company || ''} ${contact.source || ''}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesTab = contactTab === 'All Contacts'
      || contact.type === contactTab.replace(/s$/, '')
      || (contactTab === 'Groups' && false)
      || (contactTab === 'Blocked' && false);
    const normalizedStatus = String(contact.status || '').toLowerCase();
    const matchesStatus = contactStatus === 'All Status' || normalizedStatus === contactStatus.replace(' Status', '').toLowerCase();
    const matchesSource = contactSource === 'All Source' || contact.source === contactSource;
    return matchesSearch && matchesTab && matchesStatus && matchesSource;
  });
  const selectedContact = contacts.find((contact) => `${contact.keyPrefix}:${contact._id || contact.phone || contact.email || contact.name}` === selectedContactKey) || filteredContacts[0] || contacts[0] || null;

  const moduleTitle = SIDEBAR.find(([key]) => key === active)?.[1] || 'WhatsApp Business';
  const totalSent = Number(stats.totalSent || 0);
  const totalDelivered = Number(stats.totalDelivered || 0);
  const totalRead = Number(stats.totalRead || 0);
  const failed = Number(stats.totalBounced || 0);
  const totalReplies = Number(stats.totalReplied || campaigns.reduce((sum, campaign) => sum + Number(campaign.replied || campaign.replies || 0), 0));
  const conversationCounts = { All: 0, Unread: 0, Assigned: 0, Pending: 0, Resolved: 0, Spam: 0 };
  const canMessage = contacts.some((contact) => cleanPhone(contact.phone));
  const selectedTemplate = templates.find((template) => template._id === selectedTemplateId) || templates[0] || null;
  const selectedAutomation = automations.find((automation) => automation._id === selectedAutomationId) || automations[0] || null;
  const selectedChatbot = chatbots.find((bot) => bot._id === selectedChatbotId) || chatbots[0] || null;
  const selectedChatbotNode = selectedChatbot?.nodes?.find((node) => node.nodeId === selectedChatbotNodeId) || selectedChatbot?.nodes?.[0] || null;
  const filteredFlows = flows.filter((flow) => {
    const text = `${flow.name || ''} ${flow.description || ''} ${flow.category || ''}`.toLowerCase();
    return (!flowSearch || text.includes(flowSearch.toLowerCase())) && (flowTab === 'All Flows' || flow.category === flowTab);
  });
  const selectedFlow = flows.find((flow) => flow._id === selectedFlowId) || filteredFlows[0] || flows[0] || null;
  const selectedFlowNode = selectedFlow?.nodes?.find((node) => node.nodeId === selectedFlowNodeId) || selectedFlow?.nodes?.[0] || null;
  const filteredCatalogProducts = catalogProducts.filter((product) => {
    const text = `${product.description || ''} ${product.code || ''} ${product.category || ''} ${product.brand || ''}`.toLowerCase();
    const normalizedStatus = product.status === 'Active' ? 'Published' : 'Draft';
    return (!catalogSearch || text.includes(catalogSearch.toLowerCase()))
      && (catalogCategory === 'All Categories' || product.category === catalogCategory)
      && (catalogStatus === 'All Status' || normalizedStatus === catalogStatus)
      && (catalogTab === 'All Products' || (catalogTab === 'Categories' ? product.category : true));
  });
  const selectedCatalogProduct = catalogProducts.find((product) => product._id === selectedCatalogProductId) || filteredCatalogProducts[0] || catalogProducts[0] || null;

  function recentOrdersFor(contact) {
    if (!contact) return [];
    const keys = [contact.name, contact.phone, contact.email].filter(Boolean).map((value) => String(value).toLowerCase());
    return invoices.filter((invoice) => {
      const text = `${invoice.customerName || ''} ${invoice.customer?.name || ''} ${invoice.customerPhone || ''} ${invoice.phone || ''} ${invoice.customerEmail || ''}`.toLowerCase();
      return keys.some((key) => key && text.includes(key));
    }).slice(0, 3);
  }

  function contactKey(contact) {
    return `${contact?.keyPrefix || 'contact'}:${contact?._id || contact?.phone || contact?.email || contact?.name || ''}`;
  }

  function sourceIcon(source = '') {
    const value = source.toLowerCase();
    if (value.includes('campaign')) return <Megaphone size={14} className="text-emerald-600" />;
    if (value.includes('web')) return <Globe2 size={14} className="text-[#334155]" />;
    if (value.includes('vendor')) return <UserCheck size={14} className="text-violet-600" />;
    return <Users size={14} className="text-blue-600" />;
  }

  function renderInbox() {
    const selectedContact = filteredContacts[0] || contacts[0] || null;
    const recentOrders = recentOrdersFor(selectedContact);

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 border-b border-[#dfe7f1] pb-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`inline-flex h-9 items-center gap-2 rounded-md border px-4 text-[12px] font-bold ${filter === item ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-[#dbe4ef] bg-white text-[#334155] hover:bg-slate-50'}`}
              >
                {item}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === item ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-[#64748b]'}`}>{conversationCounts[item]}</span>
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#334155] hover:bg-slate-50">
              <Filter size={14} /> Filter <ChevronDown size={13} />
            </button>
            <button type="button" onClick={() => setSortNewest((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#334155] hover:bg-slate-50">
              Sort by: {sortNewest ? 'Newest' : 'Oldest'} <ChevronDown size={13} />
            </button>
            <label className="relative min-w-[220px] flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversation..."
                className="h-9 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-emerald-500"
              />
            </label>
          </div>
        </div>

        <div className="grid min-h-[620px] grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(420px,1fr)_320px]">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#edf2f7] px-4 py-4">
              <div className="flex items-center gap-2">
                <h2 className="m-0 text-[15px] font-black text-[#17233c]">Conversations</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-[#64748b]">0</span>
              </div>
              <div className="flex gap-2">
                <IconButton label="Filter conversations"><Filter size={15} /></IconButton>
                <ActionMenu
                  id="inbox-more"
                  openId={openActionMenu}
                  setOpenId={setOpenActionMenu}
                  label="Conversation actions"
                  actions={[
                    { label: 'Refresh', icon: <RefreshCw size={14} />, onClick: () => loadWhatsAppData() },
                    { label: 'New Message', icon: <MessageCircle size={14} />, onClick: () => setShowNewMessage(true), disabled: !canMessage },
                    { label: 'Contacts', icon: <Users size={14} />, onClick: () => setActive('contacts') },
                  ]}
                />
              </div>
            </div>
            <EmptyPanel
              title="No conversations yet"
              message="Incoming WhatsApp conversations will appear here after a WhatsApp Business account and webhook inbox are connected."
              action={canMessage && (
                <button type="button" onClick={() => setShowNewMessage(true)} className="mt-4 rounded-md border border-emerald-200 bg-white px-4 py-2 text-[13px] font-bold text-emerald-700 hover:bg-emerald-50">
                  Start from contacts
                </button>
              )}
            />
          </Card>

          <Card className="flex min-h-[620px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#edf2f7] px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <ContactAvatar name={selectedContact?.name || 'WhatsApp'} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="m-0 truncate text-[15px] font-black text-[#17233c]">{selectedContact?.name || 'WhatsApp Inbox'}</h2>
                    {selectedContact && <StatusPill>{selectedContact.type}</StatusPill>}
                  </div>
                  <p className="m-0 mt-1 text-[12px] text-[#64748b]">{selectedContact?.phone || 'No conversation selected'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <IconButton label="Tag" disabled><Tag size={15} /></IconButton>
                <IconButton label="Assign" disabled><UserCheck size={15} /></IconButton>
                <ActionMenu
                  id="selected-conversation-more"
                  openId={openActionMenu}
                  setOpenId={setOpenActionMenu}
                  label="Selected contact actions"
                  actions={[
                    { label: 'Open WhatsApp', icon: <MessageCircle size={14} />, onClick: () => openContactWhatsApp(selectedContact), disabled: !selectedContact || !cleanPhone(selectedContact.phone) },
                    { label: 'Call', icon: <Phone size={14} />, onClick: () => openContactCall(selectedContact), disabled: !selectedContact?.phone },
                    { label: 'Email', icon: <Mail size={14} />, onClick: () => openContactEmail(selectedContact), disabled: !selectedContact?.email },
                  ]}
                />
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center bg-[#fbfcfe] px-6 py-10">
              <EmptyPanel
                title="Conversation history is empty"
                message="This screen is ready for live WhatsApp messages. Until the inbox API/webhook is connected, GoBook will not show sample messages."
              />
            </div>
            <div className="border-t border-[#edf2f7] bg-white p-3">
              <div className="mb-2 flex gap-4 border-b border-[#edf2f7] px-3">
                <button type="button" className="border-0 border-b-2 border-emerald-600 bg-transparent px-0 py-2 text-[12px] font-black text-emerald-700">Message</button>
                <button type="button" className="border-0 bg-transparent px-0 py-2 text-[12px] font-black text-[#64748b]">Note</button>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3 py-2">
                <MessageCircle size={16} className="text-[#94a3b8]" />
                <input disabled placeholder="Connect WhatsApp inbox to reply here..." className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none disabled:text-[#94a3b8]" />
                <Paperclip size={16} className="text-[#94a3b8]" />
                <Mic size={16} className="text-[#94a3b8]" />
                <button type="button" disabled className="flex h-9 w-9 items-center justify-center rounded-md border-0 bg-emerald-100 text-emerald-500">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="m-0 text-[15px] font-black text-[#17233c]">Contact Details</h2>
              <div className="flex gap-2 text-emerald-600">
                <IconButton label="Open contact list" onClick={() => setActive('contacts')}><Edit3 size={15} /></IconButton>
                <ActionMenu
                  id="contact-detail-more"
                  openId={openActionMenu}
                  setOpenId={setOpenActionMenu}
                  label="Contact detail actions"
                  actions={[
                    { label: 'Open WhatsApp', icon: <MessageCircle size={14} />, onClick: () => openContactWhatsApp(selectedContact), disabled: !selectedContact || !cleanPhone(selectedContact.phone) },
                    { label: 'Call', icon: <Phone size={14} />, onClick: () => openContactCall(selectedContact), disabled: !selectedContact?.phone },
                    { label: 'Email', icon: <Mail size={14} />, onClick: () => openContactEmail(selectedContact), disabled: !selectedContact?.email },
                    { label: 'View Contact List', icon: <Users size={14} />, onClick: () => setActive('contacts') },
                  ]}
                />
              </div>
            </div>
            {selectedContact ? (
              <div className="px-5 pb-5">
                <div className="flex items-center gap-3 border-b border-[#edf2f7] pb-4">
                  <ContactAvatar name={selectedContact.name} />
                  <div className="min-w-0">
                    <h3 className="m-0 truncate text-[14px] font-black text-[#17233c]">{selectedContact.name}</h3>
                    <p className="m-0 mt-1 flex items-center gap-1 text-[12px] text-[#334155]"><Phone size={13} /> {selectedContact.phone || '-'}</p>
                  </div>
                </div>
                <div className="space-y-3 border-b border-[#edf2f7] py-4 text-[13px] text-[#334155]">
                  <p className="m-0 flex items-center gap-3"><Mail size={15} className="text-[#64748b]" /> {selectedContact.email || '-'}</p>
                  <p className="m-0 flex items-center gap-3"><Users size={15} className="text-[#64748b]" /> {selectedContact.city || selectedContact.address || '-'}</p>
                </div>
                <div className="border-b border-[#edf2f7] py-4 text-[12px]">
                  <h3 className="m-0 mb-3 text-[13px] font-black text-[#17233c]">About</h3>
                  <div className="space-y-2 text-[#64748b]">
                    <div className="flex justify-between gap-3"><span>Type</span><strong className="text-[#17233c]">{selectedContact.type}</strong></div>
                    <div className="flex justify-between gap-3"><span>Status</span><strong className="text-[#17233c]">{selectedContact.status || '-'}</strong></div>
                    <div className="flex justify-between gap-3"><span>Customer since</span><strong className="text-[#17233c]">{dateLabel(selectedContact.createdAt)}</strong></div>
                    <div className="flex justify-between gap-3"><span>Total sales</span><strong className="text-[#17233c]">{formatCurrency(selectedContact.sales || 0)}</strong></div>
                  </div>
                </div>
                <div className="border-b border-[#edf2f7] py-4">
                  <h3 className="m-0 mb-3 text-[13px] font-black text-[#17233c]">Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <a href="/customers" className="rounded-md border border-[#dbe4ef] px-3 py-2 text-center text-[12px] font-bold text-[#334155] no-underline hover:bg-slate-50">View Profile</a>
                    <a href="/billing/invoice/new" className="rounded-md border border-[#dbe4ef] px-3 py-2 text-center text-[12px] font-bold text-[#334155] no-underline hover:bg-slate-50">Create Invoice</a>
                    <a href="/billing/purchase-order/new" className="rounded-md border border-[#dbe4ef] px-3 py-2 text-center text-[12px] font-bold text-[#334155] no-underline hover:bg-slate-50">Create Order</a>
                    <button type="button" onClick={() => setShowNewMessage(true)} disabled={!cleanPhone(selectedContact.phone)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px] font-bold text-[#334155] hover:bg-slate-50 disabled:opacity-50">Message</button>
                  </div>
                </div>
                <div className="py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="m-0 text-[13px] font-black text-[#17233c]">Recent Orders</h3>
                    <a href="/billing/invoice" className="text-[12px] font-bold text-blue-600 no-underline">View All</a>
                  </div>
                  {recentOrders.length ? recentOrders.map((invoice) => (
                    <div key={invoice._id || invoice.invoiceNumber} className="border-b border-[#f1f5f9] py-2 text-[12px]">
                      <div className="flex justify-between gap-3"><strong className="text-[#17233c]">{invoice.invoiceNumber || invoice.number || '-'}</strong><strong>{formatCurrency(invoice.total || invoice.grandTotal || 0)}</strong></div>
                      <div className="mt-1 flex justify-between text-[#64748b]"><span>{dateLabel(invoice.date || invoice.createdAt)}</span><StatusPill tone="green">{invoice.status || 'Saved'}</StatusPill></div>
                    </div>
                  )) : <p className="m-0 text-[12px] text-[#64748b]">No matching orders found.</p>}
                </div>
              </div>
            ) : (
              <div className="px-5 pb-5">
                <EmptyPanel title="No contact selected" message="Add customers or vendors to start WhatsApp messages from GoBook." />
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  function renderDashboard() {
    const metrics = [
      [MessageCircle, 'Conversations', 0, 'Live inbox not connected'],
      [Send, 'Messages Sent', totalSent, 'From saved campaigns'],
      [CheckCircle2, 'Delivered', totalDelivered, 'From saved campaigns'],
      [ShieldCheck, 'Read', totalRead, 'From saved campaigns'],
      [Users, 'Contacts', contacts.length, 'Customers and vendors'],
      [XCircle, 'Failed', failed, 'From saved campaigns'],
    ];
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {metrics.map(([Icon, label, value, note], index) => (
          <Card key={label} className="p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Icon size={20} /></span>
              <div className="min-w-0">
                <p className="m-0 text-[12px] font-bold text-[#1f2f46]">{label}</p>
                <h3 className="m-0 mt-1 text-[24px] font-black leading-none text-[#17233c]">{number(value)}</h3>
                <p className={`m-0 mt-3 text-[12px] font-semibold ${index === 5 ? 'text-red-500' : 'text-[#64748b]'}`}>{note}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  function renderCampaigns() {
    const tabs = ['All Campaigns', 'Scheduled', 'Running', 'Completed', 'Draft', 'Failed'];
    const typeOptions = ['All', 'Promotional', 'Transactional', 'Utility'];
    const pageSize = 10;
    const filteredCampaigns = campaigns.filter((campaign) => {
      const text = `${campaign.name || ''} ${campaign.type || ''} ${campaign.message || ''}`.toLowerCase();
      const matchesSearch = !campaignSearch || text.includes(campaignSearch.toLowerCase());
      const matchesStatus = campaignStatusMatches(campaignTab, campaign.status);
      const matchesType = campaignType === 'All' || campaign.type === campaignType;
      return matchesSearch && matchesStatus && matchesType;
    });
    const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / pageSize));
    const visibleCampaigns = filteredCampaigns.slice((campaignPage - 1) * pageSize, campaignPage * pageSize);
    const campaignTypes = [...new Set(campaigns.map((campaign) => campaign.type).filter(Boolean))];
    const scheduledCount = campaigns.filter((campaign) => campaign.status === 'Paused').length;
    const totalCampaigns = campaigns.length;
    const replies = Number(stats.totalReplied || campaigns.reduce((sum, campaign) => sum + Number(campaign.replied || 0), 0));

    const metrics = [
      [Send, 'Total Campaigns', totalCampaigns, `${scheduledCount} paused or scheduled`, 'emerald'],
      [Send, 'Messages Sent', totalSent, 'From saved campaign records', 'blue'],
      [CheckCircle2, 'Delivered', totalDelivered, `${percent(totalDelivered, totalSent)} delivery rate`, 'violet'],
      [MessageCircle, 'Read', totalRead, `${percent(totalRead, totalSent)} read rate`, 'amber'],
      [Headphones, 'Replies', replies, `${percent(replies, totalSent)} reply rate`, 'cyan'],
    ];

    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0 space-y-4">
          <div className="flex gap-6 overflow-x-auto border-b border-[#dfe7f1]">
            {tabs.map((tab) => {
              const selected = campaignTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setCampaignTab(tab); setCampaignPage(1); }}
                  className={`h-11 shrink-0 border-0 border-b-2 bg-transparent px-0 text-[13px] font-bold ${selected ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-[#334155] hover:text-emerald-700'}`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-5">
            {metrics.map(([Icon, label, value, note, tone]) => (
              <CampaignMetric key={label} icon={Icon} label={label} value={number(value)} note={note} tone={tone} />
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-[#dfe7f1] bg-white p-3 xl:flex-row xl:items-center">
            <label className="relative min-w-[240px] flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={campaignSearch}
                onChange={(event) => { setCampaignSearch(event.target.value); setCampaignPage(1); }}
                placeholder="Search campaign..."
                className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-emerald-500"
              />
            </label>
            <select value={campaignTab} onChange={(event) => { setCampaignTab(event.target.value); setCampaignPage(1); }} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#334155] outline-none focus:border-emerald-500">
              {tabs.map((tab) => <option key={tab} value={tab}>Status: {tab}</option>)}
            </select>
            <select value={campaignType} onChange={(event) => { setCampaignType(event.target.value); setCampaignPage(1); }} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#334155] outline-none focus:border-emerald-500">
              {typeOptions.map((type) => <option key={type} value={type}>Type: {type}</option>)}
            </select>
            <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-slate-50">
              <Archive size={15} /> Export
            </button>
            <IconButton label="Advanced filters"><Filter size={15} /></IconButton>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#fbfcfe] text-left text-[#64748b]">
                    <th className="border-b border-[#edf2f7] px-4 py-4"><input type="checkbox" disabled /></th>
                    {['Campaign Name', 'Type', 'Audience', 'Sent', 'Delivered', 'Read', 'Replies', 'Status', 'Schedule', 'Created On', 'Actions'].map((heading) => (
                      <th key={heading} className="border-b border-[#edf2f7] px-4 py-4 font-black">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleCampaigns.length ? visibleCampaigns.map((campaign) => {
                    const sent = Number(campaign.sent || 0);
                    const delivered = Number(campaign.delivered || 0);
                    const read = Number(campaign.read || 0);
                    const replied = Number(campaign.replied || 0);
                    return (
                      <tr key={campaign._id || campaign.name} className="border-b border-[#edf2f7] hover:bg-slate-50">
                        <td className="px-4 py-4"><input type="checkbox" /></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Send size={18} /></span>
                            <span className="min-w-0">
                              <strong className="block truncate text-[13px] text-[#17233c]">{campaign.name || '-'}</strong>
                              <span className="block max-w-[220px] truncate text-[11px] text-[#64748b]">{campaign.message || '-'}</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4"><StatusPill tone={campaign.type === 'Utility' ? 'slate' : 'green'}>{campaign.type || '-'}</StatusPill></td>
                        <td className="px-4 py-4 text-[#17233c]">-</td>
                        <td className="px-4 py-4 font-semibold text-[#17233c]">{number(sent)}</td>
                        <td className="px-4 py-4"><strong className="block text-[#17233c]">{number(delivered)}</strong><span className="text-[11px] font-bold text-emerald-600">{percent(delivered, sent)}</span></td>
                        <td className="px-4 py-4"><strong className="block text-[#17233c]">{number(read)}</strong><span className="text-[11px] font-bold text-blue-600">{percent(read, sent)}</span></td>
                        <td className="px-4 py-4"><strong className="block text-[#17233c]">{number(replied)}</strong><span className="text-[11px] font-bold text-violet-600">{percent(replied, sent)}</span></td>
                        <td className="px-4 py-4"><StatusPill tone={statusTone(campaign.status)}>{campaignStatusLabel(campaign.status)}</StatusPill></td>
                        <td className="px-4 py-4 text-[#17233c]">-</td>
                        <td className="px-4 py-4 text-[#17233c]">{dateLabel(campaign.createdAt)}</td>
                        <td className="px-4 py-4">
                          <ActionMenu
                            id={`campaign-${campaign._id}`}
                            openId={openActionMenu}
                            setOpenId={setOpenActionMenu}
                            label="Campaign actions"
                            actions={[
                              { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => duplicateCampaign(campaign) },
                              { label: campaign.status === 'Active' ? 'Pause' : 'Mark Running', icon: <Play size={14} />, onClick: () => updateCampaignStatus(campaign, campaign.status === 'Active' ? 'Paused' : 'Active') },
                              { label: 'Mark Completed', icon: <CheckCircle2 size={14} />, onClick: () => updateCampaignStatus(campaign, 'Completed'), disabled: campaign.status === 'Completed' },
                              { label: 'Delete', icon: <Trash2 size={14} />, danger: true, onClick: () => { if (window.confirm('Delete this campaign?')) return deleteCampaign(campaign); return undefined; } },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-[13px] text-[#64748b]">No WhatsApp campaigns found for the selected filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-[#edf2f7] px-4 py-4 text-[12px] text-[#536173] sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {visibleCampaigns.length ? (campaignPage - 1) * pageSize + 1 : 0} to {Math.min(campaignPage * pageSize, filteredCampaigns.length)} of {filteredCampaigns.length} campaigns</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setCampaignPage((page) => Math.max(1, page - 1))} disabled={campaignPage === 1} className="h-8 rounded-md border border-[#dbe4ef] bg-white px-3 font-bold disabled:opacity-50">Prev</button>
                <span className="rounded-md bg-emerald-600 px-3 py-2 font-bold text-white">{campaignPage}</span>
                <button type="button" onClick={() => setCampaignPage((page) => Math.min(totalPages, page + 1))} disabled={campaignPage === totalPages} className="h-8 rounded-md border border-[#dbe4ef] bg-white px-3 font-bold disabled:opacity-50">Next</button>
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <h3 className="m-0 text-[15px] font-black text-[#17233c]">Create New Campaign</h3>
            <p className="m-0 mt-1 text-[12px] text-[#64748b]">Follow these simple steps</p>
            <div className="mt-5 space-y-5">
              {[
                ['1', Users, 'Select Audience', contacts.length ? `${number(contacts.length)} contacts available` : 'Add customers or vendors first'],
                ['2', FileText, 'Choose Template', 'Use approved template content'],
                ['3', Edit3, 'Customize Message', 'Add variables and content'],
                ['4', Calendar, 'Schedule / Send', 'Save as draft or mark running'],
              ].map(([step, Icon, title, detail]) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white">{step}</span>
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Icon size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-[13px] text-[#17233c]">{title}</strong>
                    <span className="block text-[12px] text-[#64748b]">{detail}</span>
                  </span>
                  <ChevronDown size={14} className="-rotate-90 text-[#64748b]" />
                </div>
              ))}
            </div>
          </Card>
          <CampaignPerformance sent={totalSent} delivered={totalDelivered} read={totalRead} replied={replies} failed={failed} />
          <Card className="p-5">
            <h3 className="m-0 text-[15px] font-black text-[#17233c]">Campaign Data</h3>
            <div className="mt-3 space-y-2 text-[12px] text-[#64748b]">
              <div className="flex justify-between"><span>Types in use</span><strong className="text-[#17233c]">{campaignTypes.length ? campaignTypes.join(', ') : '-'}</strong></div>
              <div className="flex justify-between"><span>Audience source</span><strong className="text-[#17233c]">Contacts</strong></div>
              <div className="flex justify-between"><span>Schedule field</span><strong className="text-[#17233c]">Not configured</strong></div>
            </div>
          </Card>
        </aside>
      </div>
    );
  }

  function renderContacts() {
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize));
    const visibleContacts = filteredContacts.slice((contactPage - 1) * pageSize, contactPage * pageSize);
    const contactSources = ['All Source', ...new Set(contacts.map((contact) => contact.source).filter(Boolean))];
    const customerCount = contacts.filter((contact) => contact.type === 'Customer').length;
    const leadCount = contacts.filter((contact) => contact.type === 'Lead').length;
    const activeCount = contacts.filter((contact) => String(contact.status || '').toLowerCase() === 'active').length;
    const inactiveCount = contacts.filter((contact) => ['inactive', 'blocked'].includes(String(contact.status || '').toLowerCase())).length;
    const recentOrders = recentOrdersFor(selectedContact);
    const tabs = [
      ['All Contacts', contacts.length],
      ['Customers', customerCount],
      ['Leads', leadCount],
      ['Groups', 0],
      ['Blocked', 0],
    ];
    const metrics = [
      [Users, 'Total Contacts', contacts.length, 'Customers, leads, and vendors', 'blue'],
      [Users, 'Customers', customerCount, `${activeCount} active customers`, 'blue'],
      [UserPlus, 'Leads', leadCount, 'From CRM leads', 'violet'],
      [Ban, 'Blocked', 0, 'Blocking workflow not configured', 'red'],
      [Users, 'Groups', 0, 'Groups workflow not configured', 'cyan'],
    ];

    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-5">
            {metrics.map(([Icon, label, value, note, tone]) => (
              <CampaignMetric key={label} icon={Icon} label={label} value={number(value)} note={note} tone={tone} />
            ))}
          </div>

          <div className="flex gap-6 overflow-x-auto border-b border-[#dfe7f1]">
            {tabs.map(([tab, count]) => {
              const selected = contactTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setContactTab(tab); setContactPage(1); }}
                  className={`h-11 shrink-0 border-0 border-b-2 bg-transparent px-0 text-[13px] font-bold ${selected ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-[#334155] hover:text-emerald-700'}`}
                >
                  {tab} <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-[#64748b]">{number(count)}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-[#dfe7f1] bg-white p-3 xl:flex-row xl:items-center">
            <label className="relative min-w-[260px] flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setContactPage(1); }}
                placeholder="Search by name, phone or email..."
                className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-emerald-500"
              />
            </label>
            <select value={contactStatus} onChange={(event) => { setContactStatus(event.target.value); setContactPage(1); }} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#334155] outline-none focus:border-emerald-500">
              {['All Status', 'Active', 'Inactive', 'New', 'Contacted', 'In Progress', 'Qualified', 'Converted'].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select value={contactSource} onChange={(event) => { setContactSource(event.target.value); setContactPage(1); }} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#334155] outline-none focus:border-emerald-500">
              {contactSources.map((source) => <option key={source} value={source}>{source}</option>)}
            </select>
            <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-slate-50">
              <Filter size={15} /> More Filters
            </button>
            <IconButton label="Refresh contacts" onClick={() => loadWhatsAppData()}><RefreshCw size={15} /></IconButton>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#fbfcfe] text-left text-[#64748b]">
                    <th className="border-b border-[#edf2f7] px-4 py-4"><input type="checkbox" disabled /></th>
                    {['Name', 'Phone', 'Type', 'Source', 'Status', 'Last Contact', 'Actions'].map((heading) => (
                      <th key={heading} className="border-b border-[#edf2f7] px-4 py-4 font-black">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleContacts.length ? visibleContacts.map((contact) => {
                    const selected = contactKey(contact) === contactKey(selectedContact);
                    return (
                      <tr key={contactKey(contact)} onClick={() => setSelectedContactKey(contactKey(contact))} className={`cursor-pointer border-b border-[#edf2f7] hover:bg-slate-50 ${selected ? 'bg-emerald-50/40' : ''}`}>
                        <td className="px-4 py-4"><input type="checkbox" onClick={(event) => event.stopPropagation()} /></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <ContactAvatar name={contact.name} />
                            <span className="min-w-0">
                              <strong className="block truncate text-[13px] text-[#17233c]">{contact.name || '-'}</strong>
                              <span className="block truncate text-[11px] text-[#64748b]">{contact.email || contact.company || contact.contact || '-'}</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-[#17233c]">{contact.phone || '-'}</td>
                        <td className="px-4 py-4"><StatusPill tone={contact.type === 'Lead' ? 'slate' : 'green'}>{contact.type}</StatusPill></td>
                        <td className="px-4 py-4"><span className="inline-flex items-center gap-2">{sourceIcon(contact.source)} {contact.source || '-'}</span></td>
                        <td className="px-4 py-4"><StatusPill tone={String(contact.status || '').toLowerCase() === 'inactive' ? 'slate' : 'green'}>{contact.status || '-'}</StatusPill></td>
                        <td className="px-4 py-4 text-[#17233c]">{dateLabel(contact.updatedAt || contact.createdAt)}</td>
                        <td className="px-4 py-4">
                          <ActionMenu
                            id={`contact-${contactKey(contact)}`}
                            openId={openActionMenu}
                            setOpenId={setOpenActionMenu}
                            label="Contact actions"
                            actions={[
                              { label: 'View Details', icon: <Eye size={14} />, onClick: () => setSelectedContactKey(contactKey(contact)) },
                              { label: 'Open WhatsApp', icon: <MessageCircle size={14} />, onClick: () => openContactWhatsApp(contact), disabled: !cleanPhone(contact.phone) },
                              { label: 'Call', icon: <Phone size={14} />, onClick: () => openContactCall(contact), disabled: !contact.phone },
                              { label: 'Email', icon: <Mail size={14} />, onClick: () => openContactEmail(contact), disabled: !contact.email },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[#64748b]">No contacts found for the selected filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-[#edf2f7] px-4 py-4 text-[12px] text-[#536173] sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {visibleContacts.length ? (contactPage - 1) * pageSize + 1 : 0} to {Math.min(contactPage * pageSize, filteredContacts.length)} of {filteredContacts.length} contacts</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setContactPage(1)} disabled={contactPage === 1} className="h-8 rounded-md border border-[#dbe4ef] bg-white px-3 font-bold disabled:opacity-50">First</button>
                <button type="button" onClick={() => setContactPage((page) => Math.max(1, page - 1))} disabled={contactPage === 1} className="h-8 rounded-md border border-[#dbe4ef] bg-white px-3 font-bold disabled:opacity-50">Prev</button>
                <span className="rounded-md bg-emerald-600 px-3 py-2 font-bold text-white">{contactPage}</span>
                <button type="button" onClick={() => setContactPage((page) => Math.min(totalPages, page + 1))} disabled={contactPage === totalPages} className="h-8 rounded-md border border-[#dbe4ef] bg-white px-3 font-bold disabled:opacity-50">Next</button>
              </div>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          {selectedContact ? (
            <div className="p-5">
              <div className="flex justify-end"><IconButton label="Close selection" onClick={() => setSelectedContactKey('')}><X size={15} /></IconButton></div>
              <div className="mt-1 flex flex-col items-center border-b border-[#edf2f7] pb-5 text-center">
                <ContactAvatar name={selectedContact.name} />
                <h3 className="m-0 mt-3 text-[16px] font-black text-[#17233c]">{selectedContact.name}</h3>
                <p className="m-0 mt-1 text-[12px] font-semibold text-emerald-700">{selectedContact.type}</p>
                <div className="mt-4 grid w-full grid-cols-4 gap-2">
                  {[
                    [MessageCircle, 'Message', () => setShowNewMessage(true)],
                    [Phone, 'Call', null],
                    [Mail, 'Email', null],
                    [MoreVertical, 'More', () => setActive('contacts')],
                  ].map(([Icon, label, onClick]) => (
                    <button key={label} type="button" onClick={onClick || undefined} disabled={!onClick} className="flex flex-col items-center gap-1 rounded-md border border-[#edf2f7] bg-white px-2 py-2 text-[11px] font-bold text-[#334155] disabled:opacity-60">
                      <Icon size={15} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-b border-[#edf2f7] py-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="m-0 text-[13px] font-black text-[#17233c]">Contact Information</h3>
                  <a href={selectedContact.type === 'Lead' ? '/leads' : '/customers'} className="text-[12px] font-bold text-blue-600 no-underline">Edit</a>
                </div>
                <div className="space-y-3 text-[13px] text-[#334155]">
                  <p className="m-0 flex items-center gap-3"><Phone size={15} className="text-[#64748b]" /> {selectedContact.phone || '-'}</p>
                  <p className="m-0 flex items-center gap-3"><Mail size={15} className="text-[#64748b]" /> {selectedContact.email || '-'}</p>
                  <p className="m-0 flex items-center gap-3"><Globe2 size={15} className="text-[#64748b]" /> {selectedContact.location || '-'}</p>
                </div>
              </div>
              <div className="border-b border-[#edf2f7] py-5 text-[12px]">
                <h3 className="m-0 mb-3 text-[13px] font-black text-[#17233c]">About</h3>
                <div className="space-y-2 text-[#64748b]">
                  <div className="flex justify-between gap-3"><span>Created On</span><strong className="text-[#17233c]">{dateLabel(selectedContact.createdAt)}</strong></div>
                  <div className="flex justify-between gap-3"><span>Status</span><strong className="text-[#17233c]">{selectedContact.status || '-'}</strong></div>
                  <div className="flex justify-between gap-3"><span>Source</span><strong className="text-[#17233c]">{selectedContact.source || '-'}</strong></div>
                  <div className="flex justify-between gap-3"><span>Total Spent</span><strong className="text-[#17233c]">{formatCurrency(selectedContact.sales || 0)}</strong></div>
                </div>
              </div>
              <div className="border-b border-[#edf2f7] py-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="m-0 text-[13px] font-black text-[#17233c]">Tags</h3>
                  <button type="button" disabled className="border-0 bg-transparent p-0 text-[12px] font-bold text-blue-600 disabled:opacity-60">Add Tag</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[selectedContact.type, selectedContact.source, selectedContact.category].filter(Boolean).map((tag) => <StatusPill key={tag} tone="slate">{tag}</StatusPill>)}
                  {!selectedContact.type && <span className="text-[12px] text-[#64748b]">-</span>}
                </div>
              </div>
              <div className="py-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="m-0 text-[13px] font-black text-[#17233c]">Recent Orders</h3>
                  <a href="/billing/invoice" className="text-[12px] font-bold text-blue-600 no-underline">View All</a>
                </div>
                {recentOrders.length ? recentOrders.map((invoice) => (
                  <div key={invoice._id || invoice.invoiceNumber} className="border-b border-[#f1f5f9] py-2 text-[12px]">
                    <div className="flex justify-between gap-3"><strong className="text-[#17233c]">{invoice.invoiceNumber || invoice.number || '-'}</strong><strong>{formatCurrency(invoice.total || invoice.grandTotal || 0)}</strong></div>
                    <div className="mt-1 text-[#64748b]">{dateLabel(invoice.date || invoice.createdAt)}</div>
                  </div>
                )) : <p className="m-0 text-[12px] text-[#64748b]">No matching orders found.</p>}
              </div>
            </div>
          ) : (
            <div className="p-5"><EmptyPanel title="No contact selected" message="Select a contact to view profile details." /></div>
          )}
        </Card>
      </div>
    );
  }

  async function duplicateTemplate(template) {
    if (!template?._id) return;
    await apiClient(`/more-modules/whatsapp-templates/${template._id}/duplicate`, { method: 'POST' });
    await loadWhatsAppData();
  }

  async function deleteTemplate(template) {
    if (!template?._id) return;
    await apiClient(`/more-modules/whatsapp-templates/${template._id}`, { method: 'DELETE' });
    await loadWhatsAppData();
    if (selectedTemplateId === template._id) setSelectedTemplateId('');
  }

  async function updateTemplateStatus(template, status) {
    if (!template?._id) return;
    await apiClient(`/more-modules/whatsapp-templates/${template._id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...template, status }),
    });
    await loadWhatsAppData();
  }

  async function duplicateCampaign(campaign) {
    if (!campaign?._id) return;
    const { _id, createdAt, updatedAt, ...copy } = campaign;
    await apiClient('/more-modules/whatsapp-campaigns', {
      method: 'POST',
      body: JSON.stringify({
        ...copy,
        name: `${campaign.name || 'Campaign'} Copy`,
        status: 'Draft',
        sent: 0,
        delivered: 0,
        read: 0,
        replied: 0,
      }),
    });
    await loadWhatsAppData();
  }

  async function updateCampaignStatus(campaign, status) {
    if (!campaign?._id) return;
    await apiClient(`/more-modules/whatsapp-campaigns/${campaign._id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...campaign, status }),
    });
    await loadWhatsAppData();
  }

  async function deleteCampaign(campaign) {
    if (!campaign?._id) return;
    await apiClient(`/more-modules/whatsapp-campaigns/${campaign._id}`, { method: 'DELETE' });
    await loadWhatsAppData();
  }

  async function duplicateAutomation(automation) {
    if (!automation?._id) return;
    await apiClient(`/more-modules/whatsapp-automations/${automation._id}/duplicate`, { method: 'POST' });
    await loadWhatsAppData();
  }

  async function deleteAutomation(automation) {
    if (!automation?._id) return;
    await apiClient(`/more-modules/whatsapp-automations/${automation._id}`, { method: 'DELETE' });
    await loadWhatsAppData();
    if (selectedAutomationId === automation._id) setSelectedAutomationId('');
  }

  async function updateAutomationStatus(automation, status) {
    if (!automation?._id) return;
    await apiClient(`/more-modules/whatsapp-automations/${automation._id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...automation, status }),
    });
    await loadWhatsAppData();
  }

  async function saveChatbot(bot, overrides = {}) {
    if (!bot?._id) return;
    setSavingChatbot(true);
    try {
      await apiClient(`/more-modules/whatsapp-chatbots/${bot._id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...bot, ...overrides }),
      });
      await loadWhatsAppData();
    } finally {
      setSavingChatbot(false);
    }
  }

  async function addChatbotNode(type) {
    if (!selectedChatbot?._id) return;
    const count = selectedChatbot.nodes?.length || 0;
    const node = {
      nodeId: nextNodeId(selectedChatbot.nodes, 'bot-node'),
      type,
      title: type === 'Message' ? 'Send Message' : type,
      messageType: 'Text',
      message: '',
      quickReplies: [],
      nextStep: '',
      x: 120 + (count % 3) * 240,
      y: 150 + Math.floor(count / 3) * 130,
    };
    await saveChatbot(selectedChatbot, { nodes: [...(selectedChatbot.nodes || []), node] });
    setSelectedChatbotNodeId(node.nodeId);
  }

  async function updateChatbotNode(updates) {
    if (!selectedChatbot?._id || !selectedChatbotNode) return;
    const nodes = (selectedChatbot.nodes || []).map((node) => (
      node.nodeId === selectedChatbotNode.nodeId ? { ...node, ...updates } : node
    ));
    await saveChatbot(selectedChatbot, { nodes });
  }

  async function duplicateChatbot(bot) {
    if (!bot?._id) return;
    await apiClient(`/more-modules/whatsapp-chatbots/${bot._id}/duplicate`, { method: 'POST' });
    await loadWhatsAppData();
  }

  async function deleteChatbot(bot) {
    if (!bot?._id) return;
    await apiClient(`/more-modules/whatsapp-chatbots/${bot._id}`, { method: 'DELETE' });
    await loadWhatsAppData();
    setSelectedChatbotId('');
    setSelectedChatbotNodeId('');
  }

  async function saveFlow(flow, overrides = {}) {
    if (!flow?._id) return;
    setSavingFlow(true);
    try {
      await apiClient(`/more-modules/whatsapp-flows/${flow._id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...flow, ...overrides }),
      });
      await loadWhatsAppData();
    } finally {
      setSavingFlow(false);
    }
  }

  async function addFlowNode(type) {
    if (!selectedFlow?._id) return;
    const count = selectedFlow.nodes?.length || 0;
    const node = {
      nodeId: nextNodeId(selectedFlow.nodes, 'flow-node'),
      type,
      title: type === 'Question' ? 'Ask Question' : type === 'Message' ? 'Send Message' : type,
      messageType: 'Text',
      message: '',
      variableName: '',
      buttons: [],
      nextStep: '',
      x: 120 + (count % 3) * 260,
      y: 130 + Math.floor(count / 3) * 135,
    };
    await saveFlow(selectedFlow, { nodes: [...(selectedFlow.nodes || []), node] });
    setSelectedFlowNodeId(node.nodeId);
  }

  async function updateFlowNode(updates) {
    if (!selectedFlow?._id || !selectedFlowNode) return;
    const nodes = (selectedFlow.nodes || []).map((node) => (
      node.nodeId === selectedFlowNode.nodeId ? { ...node, ...updates } : node
    ));
    await saveFlow(selectedFlow, { nodes });
  }

  async function duplicateFlow(flow) {
    if (!flow?._id) return;
    await apiClient(`/more-modules/whatsapp-flows/${flow._id}/duplicate`, { method: 'POST' });
    await loadWhatsAppData();
  }

  async function deleteFlow(flow) {
    if (!flow?._id) return;
    await apiClient(`/more-modules/whatsapp-flows/${flow._id}`, { method: 'DELETE' });
    await loadWhatsAppData();
    setSelectedFlowId('');
    setSelectedFlowNodeId('');
  }

  async function refreshCatalog() {
    const [productsResult, statsResult, categoriesResult] = await Promise.allSettled([
      api.invListProducts({ page: 1, limit: 500 }),
      api.invProductStats(),
      api.invProductCategories(),
    ]);
    if (productsResult.status === 'fulfilled') {
      setCatalogProducts(productsResult.value.data || []);
      setCatalogTotal(productsResult.value.total || 0);
    }
    if (statsResult.status === 'fulfilled') setCatalogStats(statsResult.value || {});
    if (categoriesResult.status === 'fulfilled') setCatalogCategories(categoriesResult.value || []);
  }

  async function importCatalogFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setCatalogImporting(true);
    setCatalogMessage('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await api.invImportProducts(formData);
      setCatalogMessage(`Imported ${number(result.imported)} and updated ${number(result.updated)} product(s).`);
      await refreshCatalog();
    } catch (err) {
      setCatalogMessage(err.message || 'Catalog import failed.');
    } finally {
      setCatalogImporting(false);
    }
  }

  async function duplicateCatalogProduct(product) {
    if (!product?._id) return;
    const { _id, createdAt, updatedAt, code, ...copy } = product;
    await api.invCreateProduct({
      ...copy,
      description: `${product.description || 'Product'} Copy`,
      code: '',
      status: 'Inactive',
    });
    await refreshCatalog();
  }

  async function moveCatalogProductToDraft(product) {
    if (!product?._id) return;
    await api.invUpdateProduct(product._id, { ...product, status: 'Inactive' });
    await refreshCatalog();
  }

  async function deleteCatalogProduct(product) {
    if (!product?._id) return;
    await api.invDeleteProduct(product._id);
    await refreshCatalog();
    setSelectedCatalogProductId('');
  }

  function openContactWhatsApp(contact) {
    const phone = cleanPhone(contact?.phone);
    if (!phone) return;
    const text = encodeURIComponent(`Hi ${contact.name || ''}`.trim());
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener');
  }

  function openContactCall(contact) {
    if (!contact?.phone) return;
    window.location.href = `tel:${contact.phone}`;
  }

  function openContactEmail(contact) {
    if (!contact?.email) return;
    window.location.href = `mailto:${contact.email}`;
  }

  function assistantAnswer(question) {
    const query = question.toLowerCase();
    const responseRate = percent(totalReplies, totalSent);
    const deliveryRate = percent(totalDelivered, totalSent);
    const readRate = percent(totalRead, totalSent);
    const inactiveContacts = contacts.filter((contact) => String(contact.status || '').toLowerCase() === 'inactive').length;
    const topCampaign = [...campaigns].sort((a, b) => Number(b.replied || b.replies || b.read || 0) - Number(a.replied || a.replies || a.read || 0))[0];
    const topTemplate = [...templates].sort((a, b) => {
      const aScore = Number(a.replies || a.usedCount || 0);
      const bScore = Number(b.replies || b.usedCount || 0);
      return bScore - aScore;
    })[0];
    const pendingOrders = invoices.filter((invoice) => ['pending', 'unpaid', 'overdue'].includes(String(invoice.status || invoice.paymentStatus || '').toLowerCase())).length;

    if (!campaigns.length && !templates.length && !contacts.length) {
      return 'I do not have WhatsApp Business records to analyze yet. Create campaigns, templates, contacts, or connect inbox data and I will summarize performance from those records.';
    }
    if (query.includes('performance') || query.includes('month')) {
      return `Current WhatsApp performance from saved records: messages sent ${number(totalSent)}, delivered ${number(totalDelivered)} (${deliveryRate}), read ${number(totalRead)} (${readRate}), replies ${number(totalReplies)} (${responseRate}), failed ${number(failed)}.`;
    }
    if (query.includes('top') && query.includes('campaign')) {
      return topCampaign
        ? `Top campaign by engagement is "${topCampaign.name}" with ${number(topCampaign.replied || topCampaign.replies || 0)} replies and ${number(topCampaign.read || 0)} reads.`
        : 'No campaign records are available yet.';
    }
    if (query.includes('template') && query.includes('repl')) {
      return topTemplate
        ? `The strongest template signal is "${topTemplate.name}". This module currently has ${number(templates.length)} saved template(s), with status and category tracked from real records.`
        : 'No template records are available yet.';
    }
    if (query.includes('inactive')) {
      return `You have ${number(inactiveContacts)} inactive contact(s) based on CRM/customer/vendor status records.`;
    }
    if (query.includes('follow')) {
      return pendingOrders
        ? `There are ${number(pendingOrders)} pending or unpaid order/invoice record(s). A follow-up campaign can target those customers if they have phone numbers.`
        : 'I do not see pending or unpaid order records right now, so there is no follow-up audience from invoices.';
    }
    if (query.includes('automation')) {
      const activeAutomations = automations.filter((automation) => automation.status === 'Active').length;
      return `You have ${number(activeAutomations)} active automation(s) out of ${number(automations.length)} saved automation workflow(s).`;
    }
    return `I checked the current WhatsApp Business records: ${number(campaigns.length)} campaign(s), ${number(templates.length)} template(s), ${number(contacts.length)} contact(s), ${number(automations.length)} automation(s), and ${number(catalogProducts.length)} catalog product(s).`;
  }

  function askAssistant(question) {
    const text = String(question || assistantQuestion || '').trim();
    if (!text) return;
    setAssistantMessages((current) => [...current, { role: 'user', text }, { role: 'assistant', text: assistantAnswer(text) }]);
    setAssistantQuestion('');
  }

  function renderTemplates() {
    const tabs = ['All Templates', 'Marketing', 'Utility', 'Authentication'];
    const pageSize = 10;
    const filteredTemplates = templates.filter((template) => {
      const text = `${template.name || ''} ${template.category || ''} ${template.body || ''}`.toLowerCase();
      const matchesSearch = !templateSearch || text.includes(templateSearch.toLowerCase());
      const matchesTab = templateTab === 'All Templates' || template.category === templateTab;
      const matchesCategory = templateCategory === 'All Categories' || template.category === templateCategory;
      const matchesStatus = templateStatus === 'All Status' || template.status === templateStatus;
      return matchesSearch && matchesTab && matchesCategory && matchesStatus;
    });
    const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / pageSize));
    const visibleTemplates = filteredTemplates.slice((templatePage - 1) * pageSize, templatePage * pageSize);
    const total = templateStats.total ?? templates.length;
    const approved = templateStats.approved ?? templates.filter((item) => item.status === 'Approved').length;
    const pending = templateStats.pending ?? templates.filter((item) => item.status === 'Pending').length;
    const rejected = templateStats.rejected ?? templates.filter((item) => item.status === 'Rejected').length;
    const disabled = templateStats.disabled ?? templates.filter((item) => item.status === 'Disabled').length;
    const preview = selectedTemplate;
    const variables = extractVariables(preview?.body);

    const metrics = [
      [FileText, 'Total Templates', total, 'All categories', 'blue'],
      [CheckCircle2, 'Approved', approved, `${percent(approved, total)} of all`, 'emerald'],
      [Clock, 'Pending', pending, `${percent(pending, total)} of all`, 'amber'],
      [XCircle, 'Rejected', rejected, `${percent(rejected, total)} of all`, 'red'],
      [Circle, 'Disabled', disabled, `${percent(disabled, total)} of all`, 'slate'],
    ];

    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          <div className="flex gap-6 overflow-x-auto border-b border-[#dfe7f1]">
            {tabs.map((tab) => {
              const selected = templateTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setTemplateTab(tab); setTemplatePage(1); }}
                  className={`h-11 shrink-0 border-0 border-b-2 bg-transparent px-0 text-[13px] font-bold ${selected ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-[#334155] hover:text-emerald-700'}`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-5">
            {metrics.map(([Icon, label, value, note, tone]) => (
              <CampaignMetric key={label} icon={Icon} label={label} value={number(value)} note={note} tone={tone} />
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-[#dfe7f1] bg-white p-3 xl:flex-row xl:items-center">
            <label className="relative min-w-[260px] flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={templateSearch}
                onChange={(event) => { setTemplateSearch(event.target.value); setTemplatePage(1); }}
                placeholder="Search templates by name or category..."
                className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-emerald-500"
              />
            </label>
            <select value={templateCategory} onChange={(event) => { setTemplateCategory(event.target.value); setTemplatePage(1); }} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#334155] outline-none focus:border-emerald-500">
              {['All Categories', 'Marketing', 'Utility', 'Authentication'].map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select value={templateStatus} onChange={(event) => { setTemplateStatus(event.target.value); setTemplatePage(1); }} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#334155] outline-none focus:border-emerald-500">
              {['All Status', 'Approved', 'Pending', 'Rejected', 'Disabled'].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-slate-50">
              <Filter size={15} /> More Filters
            </button>
            <IconButton label="Refresh templates" onClick={() => loadWhatsAppData()}><RefreshCw size={15} /></IconButton>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#fbfcfe] text-left text-[#64748b]">
                    <th className="border-b border-[#edf2f7] px-4 py-4"><input type="checkbox" disabled /></th>
                    {['Template Name', 'Category', 'Language', 'Status', 'Last Updated', 'Actions'].map((heading) => (
                      <th key={heading} className="border-b border-[#edf2f7] px-4 py-4 font-black">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleTemplates.length ? visibleTemplates.map((template) => (
                    <tr key={template._id} onClick={() => setSelectedTemplateId(template._id)} className={`cursor-pointer border-b border-[#edf2f7] hover:bg-slate-50 ${preview?._id === template._id ? 'bg-emerald-50/40' : ''}`}>
                      <td className="px-4 py-4"><input type="checkbox" onClick={(event) => event.stopPropagation()} /></td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-emerald-50 text-emerald-600"><FileText size={18} /></span>
                          <span className="min-w-0">
                            <strong className="block truncate text-[13px] text-[#17233c]">{template.name}</strong>
                            <span className="block max-w-[260px] truncate text-[11px] text-[#64748b]">{template.body}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4"><StatusPill tone={template.category === 'Authentication' ? 'slate' : template.category === 'Marketing' ? 'green' : 'amber'}>{template.category}</StatusPill></td>
                      <td className="px-4 py-4 text-[#17233c]">{template.language || '-'}</td>
                      <td className="px-4 py-4"><StatusPill tone={statusTone(template.status)}>{template.status}</StatusPill></td>
                      <td className="px-4 py-4 text-[#17233c]">{dateLabel(template.updatedAt || template.createdAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <IconButton label="Edit template" onClick={(event) => { event.stopPropagation(); setEditingTemplate(template); setShowTemplateForm(true); }}><Edit3 size={15} /></IconButton>
                          <ActionMenu
                            id={`template-${template._id}`}
                            openId={openActionMenu}
                            setOpenId={setOpenActionMenu}
                            label="Template actions"
                            actions={[
                              { label: 'Preview', icon: <Eye size={14} />, onClick: () => setSelectedTemplateId(template._id) },
                              { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => duplicateTemplate(template) },
                              { label: template.status === 'Approved' ? 'Disable' : 'Approve', icon: <CheckCircle2 size={14} />, onClick: () => updateTemplateStatus(template, template.status === 'Approved' ? 'Disabled' : 'Approved') },
                              { label: 'Delete', icon: <Trash2 size={14} />, danger: true, onClick: () => { if (window.confirm('Delete this template?')) return deleteTemplate(template); return undefined; } },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-[#64748b]">No WhatsApp templates found. Create a template to start using this workflow.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-[#edf2f7] px-4 py-4 text-[12px] text-[#536173] sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {visibleTemplates.length ? (templatePage - 1) * pageSize + 1 : 0} to {Math.min(templatePage * pageSize, filteredTemplates.length)} of {filteredTemplates.length} templates</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setTemplatePage((page) => Math.max(1, page - 1))} disabled={templatePage === 1} className="h-8 rounded-md border border-[#dbe4ef] bg-white px-3 font-bold disabled:opacity-50">Prev</button>
                <span className="rounded-md bg-emerald-600 px-3 py-2 font-bold text-white">{templatePage}</span>
                <button type="button" onClick={() => setTemplatePage((page) => Math.min(totalPages, page + 1))} disabled={templatePage === totalPages} className="h-8 rounded-md border border-[#dbe4ef] bg-white px-3 font-bold disabled:opacity-50">Next</button>
              </div>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          {preview ? (
            <div className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="m-0 text-[17px] font-black text-[#17233c]">{preview.name}</h3>
                  <StatusPill tone={statusTone(preview.status)}>{preview.status}</StatusPill>
                </div>
                <IconButton label="Close selection" onClick={() => setSelectedTemplateId('')}><X size={15} /></IconButton>
              </div>
              <div className="space-y-4 text-[13px] text-[#17233c]">
                <div className="grid grid-cols-2 gap-3 border-b border-[#edf2f7] pb-4">
                  <div><strong className="block text-[12px] text-[#64748b]">Category</strong><StatusPill tone="slate">{preview.category}</StatusPill></div>
                  <div><strong className="block text-[12px] text-[#64748b]">Language</strong>{preview.language || '-'}</div>
                </div>
                <div>
                  <strong className="block text-[12px] text-[#64748b]">Header</strong>
                  <p className="m-0 mt-1">{preview.header || 'None'}</p>
                </div>
                <div>
                  <strong className="block text-[12px] text-[#64748b]">Body</strong>
                  <div className="mt-2 whitespace-pre-wrap rounded-md border border-[#e5e7eb] bg-[#f7f7f2] p-4 leading-relaxed">{preview.body}</div>
                </div>
                <div>
                  <strong className="block text-[12px] text-[#64748b]">Variables ({variables.length})</strong>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {variables.length ? variables.map((variable) => <StatusPill key={variable} tone="green">{variable}</StatusPill>) : <span className="text-[#64748b]">No variables detected.</span>}
                  </div>
                </div>
                <div>
                  <strong className="block text-[12px] text-[#64748b]">Footer</strong>
                  <p className="m-0 mt-1">{preview.footer || 'None'}</p>
                </div>
                <div>
                  <strong className="block text-[12px] text-[#64748b]">Buttons</strong>
                  <div className="mt-2 space-y-2">
                    {preview.buttons?.length ? preview.buttons.map((button, index) => (
                      <div key={`${button.label}-${index}`} className="flex justify-between rounded-md border border-[#edf2f7] px-3 py-2">
                        <span>{index + 1}. {button.label || '-'}</span>
                        <span className="text-[#64748b]">{button.type || '-'}</span>
                      </div>
                    )) : <span className="text-[#64748b]">No buttons configured.</span>}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-[#edf2f7] pt-4">
                <button type="button" onClick={() => { setEditingTemplate(preview); setShowTemplateForm(true); }} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155]"><Edit3 size={15} /> Edit Template</button>
                <PrimaryButton onClick={() => duplicateTemplate(preview)}><Copy size={15} /> Duplicate Template</PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="p-5"><EmptyPanel title="No template selected" message="Create or select a template to preview details." /></div>
          )}
        </Card>
      </div>
    );
  }

  function renderAutomations() {
    const tabs = ['All Automations', 'Active', 'Inactive', 'Draft', 'Trigger Logs'];
    const pageSize = 10;
    const filteredAutomations = automations.filter((automation) => {
      const text = `${automation.name || ''} ${automation.description || ''} ${automation.trigger || ''} ${automation.action || ''} ${automation.templateName || ''}`.toLowerCase();
      const matchesSearch = !automationSearch || text.includes(automationSearch.toLowerCase());
      const matchesTab = automationTab === 'All Automations' || automationTab === 'Trigger Logs' || automation.status === automationTab;
      const matchesTrigger = automationTrigger === 'All Triggers' || automation.trigger === automationTrigger;
      const matchesAction = automationAction === 'All Actions' || automation.action === automationAction;
      const matchesStatus = automationStatus === 'All Status' || automation.status === automationStatus;
      return matchesSearch && matchesTab && matchesTrigger && matchesAction && matchesStatus;
    });
    const totalPages = Math.max(1, Math.ceil(filteredAutomations.length / pageSize));
    const visibleAutomations = filteredAutomations.slice((automationPage - 1) * pageSize, automationPage * pageSize);
    const triggerOptions = ['All Triggers', ...new Set(automations.map((item) => item.trigger).filter(Boolean))];
    const actionOptions = ['All Actions', ...new Set(automations.map((item) => item.action).filter(Boolean))];
    const total = automationStats.total ?? automations.length;
    const activeCount = automationStats.active ?? automations.filter((item) => item.status === 'Active').length;
    const inactiveCount = automationStats.inactive ?? automations.filter((item) => item.status === 'Inactive').length;
    const draftCount = automationStats.draft ?? automations.filter((item) => item.status === 'Draft').length;
    const workflow = selectedAutomation;
    const successful = Number(workflow?.successful || 0);
    const failedRuns = Number(workflow?.failed || 0);
    const totalRuns = Number(workflow?.runs || 0);
    const metrics = [
      [FileText, 'Total Automations', total, 'All Status', 'blue'],
      [Play, 'Active', activeCount, `${percent(activeCount, total)} of all`, 'emerald'],
      [Circle, 'Inactive', inactiveCount, `${percent(inactiveCount, total)} of all`, 'slate'],
      [FileText, 'Draft', draftCount, `${percent(draftCount, total)} of all`, 'blue'],
    ];

    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          <div className="flex gap-6 overflow-x-auto border-b border-[#dfe7f1]">
            {tabs.map((tab) => {
              const selected = automationTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setAutomationTab(tab); setAutomationPage(1); }}
                  className={`h-11 shrink-0 border-0 border-b-2 bg-transparent px-0 text-[13px] font-bold ${selected ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-[#334155] hover:text-emerald-700'}`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {metrics.map(([Icon, label, value, note, tone]) => (
              <CampaignMetric key={label} icon={Icon} label={label} value={number(value)} note={note} tone={tone} />
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-[#dfe7f1] bg-white p-3 xl:flex-row xl:items-center">
            <label className="relative min-w-[260px] flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={automationSearch}
                onChange={(event) => { setAutomationSearch(event.target.value); setAutomationPage(1); }}
                placeholder="Search automation by name or trigger..."
                className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-emerald-500"
              />
            </label>
            <select value={automationTrigger} onChange={(event) => { setAutomationTrigger(event.target.value); setAutomationPage(1); }} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#334155] outline-none focus:border-emerald-500">
              {triggerOptions.map((trigger) => <option key={trigger} value={trigger}>{trigger}</option>)}
            </select>
            <select value={automationAction} onChange={(event) => { setAutomationAction(event.target.value); setAutomationPage(1); }} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#334155] outline-none focus:border-emerald-500">
              {actionOptions.map((action) => <option key={action} value={action}>{action}</option>)}
            </select>
            <select value={automationStatus} onChange={(event) => { setAutomationStatus(event.target.value); setAutomationPage(1); }} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#334155] outline-none focus:border-emerald-500">
              {['All Status', 'Active', 'Inactive', 'Draft'].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <IconButton label="Refresh automations" onClick={() => loadWhatsAppData()}><RefreshCw size={15} /></IconButton>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#fbfcfe] text-left text-[#64748b]">
                    {['Automation Name', 'Trigger', 'Action', 'Status', 'Runs', 'Last Run', 'Actions'].map((heading) => (
                      <th key={heading} className="border-b border-[#edf2f7] px-4 py-4 font-black">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleAutomations.length ? visibleAutomations.map((automation) => (
                    <tr key={automation._id} onClick={() => setSelectedAutomationId(automation._id)} className={`cursor-pointer border-b border-[#edf2f7] hover:bg-slate-50 ${workflow?._id === automation._id ? 'bg-emerald-50/40' : ''}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-blue-50 text-blue-600"><FileText size={18} /></span>
                          <span className="min-w-0">
                            <strong className="block truncate text-[13px] text-[#17233c]">{automation.name}</strong>
                            <span className="block max-w-[220px] truncate text-[11px] text-[#64748b]">{automation.description || '-'}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4"><strong className="block text-[#17233c]">{automation.trigger}</strong><span className="text-[11px] text-[#64748b]">{automation.triggerGroup || '-'}</span></td>
                      <td className="px-4 py-4"><strong className="block text-[#17233c]">{automation.action}</strong><span className="text-[11px] text-[#64748b]">{automation.templateName || '-'}</span></td>
                      <td className="px-4 py-4"><StatusPill tone={statusTone(automation.status)}>{automation.status}</StatusPill></td>
                      <td className="px-4 py-4 font-semibold text-[#17233c]">{number(automation.runs)}</td>
                      <td className="px-4 py-4 text-[#17233c]">{dateLabel(automation.lastRunAt)}</td>
                      <td className="px-4 py-4">
                        <ActionMenu
                          id={`automation-${automation._id}`}
                          openId={openActionMenu}
                          setOpenId={setOpenActionMenu}
                          label="Automation actions"
                          actions={[
                            { label: 'View Workflow', icon: <Eye size={14} />, onClick: () => setSelectedAutomationId(automation._id) },
                            { label: 'Edit', icon: <Edit3 size={14} />, onClick: () => { setEditingAutomation(automation); setShowAutomationForm(true); } },
                            { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => duplicateAutomation(automation) },
                            { label: automation.status === 'Active' ? 'Deactivate' : 'Activate', icon: <Play size={14} />, onClick: () => updateAutomationStatus(automation, automation.status === 'Active' ? 'Inactive' : 'Active') },
                            { label: 'Delete', icon: <Trash2 size={14} />, danger: true, onClick: () => { if (window.confirm('Delete this automation?')) return deleteAutomation(automation); return undefined; } },
                          ]}
                        />
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-[#64748b]">No WhatsApp automations found. Create an automation to start this workflow.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-[#edf2f7] px-4 py-4 text-[12px] text-[#536173] sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {visibleAutomations.length ? (automationPage - 1) * pageSize + 1 : 0} to {Math.min(automationPage * pageSize, filteredAutomations.length)} of {filteredAutomations.length} automations</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setAutomationPage((page) => Math.max(1, page - 1))} disabled={automationPage === 1} className="h-8 rounded-md border border-[#dbe4ef] bg-white px-3 font-bold disabled:opacity-50">Prev</button>
                <span className="rounded-md bg-emerald-600 px-3 py-2 font-bold text-white">{automationPage}</span>
                <button type="button" onClick={() => setAutomationPage((page) => Math.min(totalPages, page + 1))} disabled={automationPage === totalPages} className="h-8 rounded-md border border-[#dbe4ef] bg-white px-3 font-bold disabled:opacity-50">Next</button>
              </div>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          {workflow ? (
            <div className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="m-0 text-[17px] font-black text-[#17233c]">{workflow.name}</h3>
                  <p className="m-0 mt-1 text-[12px] text-[#64748b]">{workflow.description || '-'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill tone={statusTone(workflow.status)}>{workflow.status}</StatusPill>
                  <ActionMenu
                    id={`workflow-more-${workflow._id}`}
                    openId={openActionMenu}
                    setOpenId={setOpenActionMenu}
                    label="Workflow actions"
                    actions={[
                      { label: 'Edit', icon: <Edit3 size={14} />, onClick: () => { setEditingAutomation(workflow); setShowAutomationForm(true); } },
                      { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => duplicateAutomation(workflow) },
                      { label: workflow.status === 'Active' ? 'Deactivate' : 'Activate', icon: <Play size={14} />, onClick: () => updateAutomationStatus(workflow, workflow.status === 'Active' ? 'Inactive' : 'Active') },
                      { label: 'Delete', icon: <Trash2 size={14} />, danger: true, onClick: () => { if (window.confirm('Delete this automation?')) return deleteAutomation(workflow); return undefined; } },
                    ]}
                  />
                </div>
              </div>
              <div className="mb-4 flex gap-6 border-b border-[#edf2f7]">
                {['Workflow', 'Settings', 'History', 'Logs'].map((tab, index) => (
                  <button key={tab} type="button" disabled={index > 0} className={`h-10 border-0 border-b-2 bg-transparent px-0 text-[12px] font-bold ${index === 0 ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-[#64748b] opacity-60'}`}>{tab}</button>
                ))}
              </div>
              <div className="space-y-4">
                {(workflow.steps?.length ? workflow.steps : []).map((step, index) => {
                  const Icon = step.type === 'Trigger' ? FileText : step.type === 'Condition' ? Filter : step.type === 'Action' ? MessageCircle : GitBranch;
                  const tone = step.type === 'Condition' ? 'bg-blue-50 text-blue-600' : step.type === 'Exit' ? 'bg-violet-50 text-violet-600' : 'bg-emerald-50 text-emerald-600';
                  return (
                    <div key={`${step.type}-${index}`}>
                      <div className="rounded-lg border border-[#dbe4ef] bg-[#fbfcfe] p-4">
                        <div className="flex items-center gap-4">
                          <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-full ${tone}`}><Icon size={20} /></span>
                          <div className="min-w-0 flex-1">
                            <strong className="block text-[12px] text-emerald-700">{step.type}</strong>
                            <h4 className="m-0 text-[14px] font-black text-[#17233c]">{step.title}</h4>
                            <p className="m-0 mt-1 text-[12px] text-[#64748b]">{step.description || '-'}</p>
                          </div>
                          <CheckCircle2 size={18} className="text-emerald-600" />
                        </div>
                      </div>
                      {index < workflow.steps.length - 1 && <div className="mx-auto flex h-8 w-px items-center justify-center border-l border-dashed border-[#cbd5e1]"><span className="-ml-3 flex h-6 w-6 items-center justify-center rounded-full border border-[#cbd5e1] bg-white text-[#64748b]">+</span></div>}
                    </div>
                  );
                })}
                {!workflow.steps?.length && <EmptyPanel title="Workflow steps not configured" message="Edit this automation to save trigger, condition, action, and exit steps." />}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-[12px] md:grid-cols-4">
                <Card className="p-3"><span className="block text-[#64748b]">Total Runs</span><strong className="text-[16px] text-[#17233c]">{number(totalRuns)}</strong></Card>
                <Card className="p-3"><span className="block text-emerald-700">Successful</span><strong className="text-[16px] text-[#17233c]">{number(successful)} ({percent(successful, totalRuns)})</strong></Card>
                <Card className="p-3"><span className="block text-red-600">Failed</span><strong className="text-[16px] text-[#17233c]">{number(failedRuns)} ({percent(failedRuns, totalRuns)})</strong></Card>
                <Card className="p-3"><span className="block text-[#64748b]">Last Run</span><strong className="text-[13px] text-[#17233c]">{dateLabel(workflow.lastRunAt)}</strong></Card>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => { setEditingAutomation(workflow); setShowAutomationForm(true); }} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155]"><Edit3 size={15} /> Edit Automation</button>
                <button type="button" onClick={() => duplicateAutomation(workflow)} className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-200 bg-white px-4 text-[13px] font-bold text-emerald-700"><Copy size={15} /> Duplicate</button>
                <button type="button" onClick={() => deleteAutomation(workflow)} className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 bg-white px-4 text-[13px] font-bold text-red-600"><Trash2 size={15} /> Delete</button>
              </div>
            </div>
          ) : (
            <div className="p-5"><EmptyPanel title="No automation selected" message="Create or select an automation to view the workflow." /></div>
          )}
        </Card>
      </div>
    );
  }

  function renderChatbot() {
    const tabs = ['Bot Builder', 'Bot Settings', 'User Input', 'Live Chat Handoff', 'Analytics', 'Logs'];
    const palette = [
      ['Message', 'Text', FileText],
      ['Message', 'Image', ImageIcon],
      ['Message', 'Document', Paperclip],
      ['Message', 'Audio', Mic],
      ['Condition', 'Condition', Filter],
      ['Message', 'Buttons', MousePointerClick],
      ['Message', 'List', List],
      ['Handoff', 'Assign to Agent', Headphones],
      ['End', 'End Flow', XCircle],
    ];
    const nodes = selectedChatbot?.nodes || [];
    const canvasWidth = Math.max(860, ...nodes.map((node) => Number(node.x || 0) + 260), 860);
    const canvasHeight = Math.max(560, ...nodes.map((node) => Number(node.y || 0) + 150), 560);

    function nodeTone(type) {
      if (type === 'Start') return 'border-emerald-200 bg-emerald-50';
      if (type === 'Condition') return 'border-amber-200 bg-amber-50';
      if (type === 'Handoff') return 'border-cyan-200 bg-cyan-50';
      if (type === 'End') return 'border-red-200 bg-red-50';
      return 'border-blue-200 bg-blue-50';
    }

    function nodeIcon(type) {
      if (type === 'Start') return Play;
      if (type === 'Condition') return Filter;
      if (type === 'Handoff') return Headphones;
      if (type === 'End') return XCircle;
      return MessageCircle;
    }

    return (
      <div>
        <div className="mb-4 flex gap-7 overflow-x-auto border-b border-[#dfe7f1]">
          {tabs.map((tab, index) => (
            <button
              key={tab}
              type="button"
              disabled={index > 0}
              onClick={() => setChatbotTab(tab)}
              className={`h-11 shrink-0 border-0 border-b-2 bg-transparent px-0 text-[13px] font-bold ${chatbotTab === tab ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-[#334155] hover:text-emerald-700'} disabled:opacity-60`}
            >
              {tab}
            </button>
          ))}
        </div>

        {!selectedChatbot ? (
          <Card className="p-8">
            <EmptyPanel title="No chatbot created" message="Create a bot to start building saved WhatsApp conversation flows." />
            <div className="mt-4 flex justify-center">
              <PrimaryButton onClick={() => { setEditingChatbot(null); setShowChatbotForm(true); }}><Plus size={16} /> Create New Bot</PrimaryButton>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card className="min-w-0 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-[#dfe7f1] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <select value={selectedChatbot._id} onChange={(event) => { setSelectedChatbotId(event.target.value); setSelectedChatbotNodeId(''); }} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-black text-[#17233c] outline-none focus:border-emerald-500">
                    {chatbots.map((bot) => <option key={bot._id} value={bot._id}>{bot.name}</option>)}
                  </select>
                  <IconButton label="Edit bot" onClick={() => { setEditingChatbot(selectedChatbot); setShowChatbotForm(true); }}><Edit3 size={15} /></IconButton>
                  <StatusPill tone={statusTone(selectedChatbot.status)}>{selectedChatbot.status}</StatusPill>
                  <select value={selectedChatbot.language || 'English'} onChange={(event) => saveChatbot(selectedChatbot, { language: event.target.value })} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#334155] outline-none focus:border-emerald-500">
                    {['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'].map((language) => <option key={language} value={language}>{language}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <IconButton label="Undo" disabled><Undo2 size={15} /></IconButton>
                  <IconButton label="Refresh bot" onClick={() => loadWhatsAppData()}><RefreshCw size={15} /></IconButton>
                  <span className="px-2 text-[12px] font-bold text-[#334155]">100%</span>
                  <IconButton label="Zoom out" disabled><ZoomOut size={15} /></IconButton>
                  <IconButton label="Zoom in" disabled><ZoomIn size={15} /></IconButton>
                  <IconButton label="Grid"><Grid3X3 size={15} /></IconButton>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
                <aside className="border-b border-[#dfe7f1] bg-white p-4 lg:border-b-0 lg:border-r">
                  <div className="mb-4 flex gap-5 border-b border-[#edf2f7]">
                    <button type="button" className="h-10 border-0 border-b-2 border-emerald-600 bg-transparent px-0 text-[12px] font-black text-emerald-700">Nodes</button>
                    <button type="button" disabled className="h-10 border-0 border-b-2 border-transparent bg-transparent px-0 text-[12px] font-bold text-[#64748b] opacity-60">Components</button>
                  </div>
                  <p className="m-0 mb-2 text-[12px] font-black text-[#17233c]">Messages</p>
                  <div className="space-y-2">
                    {palette.map(([type, label, Icon]) => (
                      <button key={`${type}-${label}`} type="button" onClick={() => addChatbotNode(type)} className="flex h-10 w-full items-center gap-3 rounded-md border border-[#edf2f7] bg-white px-3 text-left text-[12px] font-bold text-[#334155] hover:border-emerald-300 hover:bg-emerald-50">
                        <Icon size={15} className="text-emerald-600" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => addChatbotNode('Message')} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#cbd5e1] bg-white text-[12px] font-bold text-blue-600">
                    <Plus size={15} /> Add Node
                  </button>
                </aside>

                <div className="overflow-auto bg-[#fbfcfe]">
                  <div
                    className="relative"
                    style={{
                      width: canvasWidth,
                      height: canvasHeight,
                      backgroundImage: 'radial-gradient(#d8e2ee 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                    }}
                  >
                    {nodes.map((node, index) => {
                      const Icon = nodeIcon(node.type);
                      const selected = selectedChatbotNode?.nodeId === node.nodeId;
                      return (
                        <button
                          key={node.nodeId}
                          type="button"
                          onClick={() => setSelectedChatbotNodeId(node.nodeId)}
                          className={`absolute min-h-[86px] w-[220px] rounded-lg border p-3 text-left shadow-sm ${nodeTone(node.type)} ${selected ? 'ring-2 ring-emerald-500' : ''}`}
                          style={{ left: Number(node.x || 0), top: Number(node.y || 0) }}
                        >
                          <span className="mb-2 flex items-center gap-2 text-[12px] font-black text-blue-700"><Icon size={15} /> {node.title}</span>
                          <span className="block line-clamp-3 text-[12px] leading-5 text-[#17233c]">{node.message || node.messageType || node.type}</span>
                          {node.quickReplies?.length ? (
                            <span className="mt-2 flex flex-wrap gap-1">
                              {node.quickReplies.slice(0, 3).map((reply) => <span key={reply} className="rounded border border-[#dbe4ef] bg-white px-2 py-1 text-[10px] font-bold text-[#334155]">{reply}</span>)}
                            </span>
                          ) : null}
                          {index < nodes.length - 1 && <span className="absolute left-1/2 top-full h-10 border-l border-[#94a3b8]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              {selectedChatbotNode ? (
                <div>
                  <div className="flex items-start justify-between gap-3 border-b border-[#edf2f7] p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600"><MessageCircle size={17} /></span>
                      <div>
                        <h3 className="m-0 text-[15px] font-black text-[#17233c]">{selectedChatbotNode.title}</h3>
                        <p className="m-0 mt-1 text-[12px] text-[#64748b]">{selectedChatbot.name}</p>
                      </div>
                    </div>
                    <IconButton label="Delete bot" onClick={() => deleteChatbot(selectedChatbot)}><Trash2 size={15} /></IconButton>
                  </div>
                  <div className="flex gap-6 border-b border-[#edf2f7] px-5">
                    {['Content', 'Settings', 'Advanced'].map((tab, index) => (
                      <button key={tab} type="button" disabled={index > 0} className={`h-11 border-0 border-b-2 bg-transparent px-0 text-[12px] font-bold ${index === 0 ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-[#64748b] opacity-60'}`}>{tab}</button>
                    ))}
                  </div>
                  <div className="space-y-5 p-5">
                    <label className="block">
                      <span className="mb-2 block text-[12px] font-black text-[#17233c]">Node Title</span>
                      <input defaultValue={selectedChatbotNode.title} onBlur={(event) => updateChatbotNode({ title: event.target.value })} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[12px] font-black text-[#17233c]">Message Type</span>
                      <select value={selectedChatbotNode.messageType || 'Text'} onChange={(event) => updateChatbotNode({ messageType: event.target.value })} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                        {['Text', 'Image', 'Video', 'Document', 'Audio'].map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[12px] font-black text-[#17233c]">Message</span>
                      <textarea defaultValue={selectedChatbotNode.message} onBlur={(event) => updateChatbotNode({ message: event.target.value })} rows={5} maxLength={1024} className="w-full resize-none rounded-md border border-[#dbe4ef] p-3 text-[13px] outline-none focus:border-emerald-500" />
                    </label>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[12px] font-black text-[#17233c]">Quick Replies</span>
                        <StatusPill tone={selectedChatbotNode.quickReplies?.length ? 'green' : 'slate'}>{selectedChatbotNode.quickReplies?.length ? 'On' : 'Off'}</StatusPill>
                      </div>
                      <div className="space-y-2">
                        {(selectedChatbotNode.quickReplies || []).map((reply, index) => (
                          <div key={`${reply}-${index}`} className="flex h-10 items-center gap-2 rounded-md border border-[#edf2f7] px-3">
                            <List size={14} className="text-[#64748b]" />
                            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#17233c]">{reply}</span>
                            <IconButton label="Remove reply" onClick={() => updateChatbotNode({ quickReplies: selectedChatbotNode.quickReplies.filter((_, replyIndex) => replyIndex !== index) })}><Trash2 size={14} /></IconButton>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => updateChatbotNode({ quickReplies: [...(selectedChatbotNode.quickReplies || []), `Reply ${(selectedChatbotNode.quickReplies?.length || 0) + 1}`] })} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white text-[13px] font-bold text-blue-600">
                        <Plus size={15} /> Add Reply
                      </button>
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-[12px] font-black text-[#17233c]">Next Step</span>
                      <select value={selectedChatbotNode.nextStep || ''} onChange={(event) => updateChatbotNode({ nextStep: event.target.value })} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                        <option value="">Continue to next step</option>
                        {nodes.filter((node) => node.nodeId !== selectedChatbotNode.nodeId).map((node) => <option key={node.nodeId} value={node.nodeId}>{node.title}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-3 border-t border-[#edf2f7] p-5">
                    <button type="button" onClick={() => duplicateChatbot(selectedChatbot)} className="h-10 flex-1 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155]">Duplicate</button>
                    <PrimaryButton onClick={() => saveChatbot(selectedChatbot)} disabled={savingChatbot}>{savingChatbot ? 'Saving...' : 'Save Changes'}</PrimaryButton>
                  </div>
                </div>
              ) : (
                <div className="p-5"><EmptyPanel title="No node selected" message="Add or select a bot node to edit its content." /></div>
              )}
            </Card>
          </div>
        )}
      </div>
    );
  }

  function renderFlows() {
    const tabs = ['All Flows', 'Lead Generation', 'Customer Support', 'Booking & Appointment', 'Feedback', 'Others'];
    const palette = [
      ['Message', 'Send Message', MessageCircle],
      ['Question', 'Ask Question', UserCheck],
      ['Condition', 'Condition', Filter],
      ['Reminder', 'Send Reminder', Bell],
      ['Wait', 'Wait', Clock],
      ['Success', 'Success Message', CheckCircle2],
      ['End', 'End Flow', XCircle],
    ];
    const nodes = selectedFlow?.nodes || [];
    const canvasWidth = Math.max(820, ...nodes.map((node) => Number(node.x || 0) + 250), 820);
    const canvasHeight = Math.max(620, ...nodes.map((node) => Number(node.y || 0) + 150), 620);

    function flowIcon(type) {
      if (type === 'Start') return Play;
      if (type === 'Question') return UserCheck;
      if (type === 'Condition') return Filter;
      if (type === 'Reminder') return Bell;
      if (type === 'Wait') return Clock;
      if (type === 'Success') return CheckCircle2;
      if (type === 'End') return XCircle;
      return MessageCircle;
    }

    function flowTone(type) {
      if (type === 'Start' || type === 'Success') return 'border-emerald-200 bg-emerald-50';
      if (type === 'Question') return 'border-violet-200 bg-violet-50';
      if (type === 'Reminder' || type === 'Wait') return 'border-amber-200 bg-amber-50';
      if (type === 'End') return 'border-red-200 bg-red-50';
      return 'border-blue-200 bg-blue-50';
    }

    return (
      <div>
        <div className="mb-4 flex gap-7 overflow-x-auto border-b border-[#dfe7f1]">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setFlowTab(tab); setSelectedFlowNodeId(''); }}
              className={`h-11 shrink-0 border-0 border-b-2 bg-transparent px-0 text-[13px] font-bold ${flowTab === tab ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-[#334155] hover:text-emerald-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {!flows.length ? (
          <Card className="p-8">
            <EmptyPanel title="No WhatsApp flows created" message="Create a flow to build saved lead capture, booking, support, or feedback journeys." />
            <div className="mt-4 flex justify-center">
              <PrimaryButton onClick={() => { setEditingFlow(null); setShowFlowForm(true); }}><Plus size={16} /> Create Flow</PrimaryButton>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[250px_minmax(0,1fr)_380px]">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#edf2f7] p-4">
                <h3 className="m-0 text-[15px] font-black text-[#17233c]">Your Flows</h3>
                <IconButton label="Create flow" onClick={() => { setEditingFlow(null); setShowFlowForm(true); }}><Plus size={16} /></IconButton>
              </div>
              <div className="border-b border-[#edf2f7] p-3">
                <label className="relative block">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input value={flowSearch} onChange={(event) => setFlowSearch(event.target.value)} placeholder="Search flows..." className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-emerald-500" />
                </label>
              </div>
              <div className="max-h-[570px] overflow-y-auto p-2">
                {filteredFlows.length ? filteredFlows.map((flow) => {
                  const selected = selectedFlow?._id === flow._id;
                  return (
                    <button key={flow._id} type="button" onClick={() => { setSelectedFlowId(flow._id); setSelectedFlowNodeId(''); }} className={`mb-2 flex w-full items-center gap-3 rounded-md border p-3 text-left ${selected ? 'border-emerald-400 bg-emerald-50' : 'border-[#edf2f7] bg-white hover:bg-slate-50'}`}>
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-blue-50 text-blue-600"><GitBranch size={16} /></span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-[12px] text-[#17233c]">{flow.name}</strong>
                        <span className="block truncate text-[11px] text-[#64748b]">{flow.category}</span>
                      </span>
                      <StatusPill tone={flow.status === 'Published' ? 'green' : statusTone(flow.status)}>{flow.status}</StatusPill>
                    </button>
                  );
                }) : <div className="p-4"><EmptyPanel title="No matching flows" message="Clear the search or category filter to see saved flows." /></div>}
              </div>
              <div className="border-t border-[#edf2f7] p-3">
                <button type="button" disabled className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white text-[12px] font-bold text-[#334155] disabled:opacity-60">
                  <Trash2 size={14} /> View Deleted Flows
                </button>
              </div>
            </Card>

            <Card className="min-w-0 overflow-hidden">
              {selectedFlow ? (
                <>
                  <div className="flex flex-col gap-3 border-b border-[#dfe7f1] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="m-0 max-w-[260px] truncate text-[16px] font-black text-[#17233c]">{selectedFlow.name}</h3>
                      <IconButton label="Edit flow" onClick={() => { setEditingFlow(selectedFlow); setShowFlowForm(true); }}><Edit3 size={15} /></IconButton>
                      <StatusPill tone={selectedFlow.status === 'Published' ? 'green' : statusTone(selectedFlow.status)}>{selectedFlow.status}</StatusPill>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconButton label="Refresh flows" onClick={() => loadWhatsAppData()}><RefreshCw size={15} /></IconButton>
                      <span className="px-2 text-[12px] font-bold text-[#334155]">100%</span>
                      <IconButton label="Zoom out" disabled><ZoomOut size={15} /></IconButton>
                      <IconButton label="Zoom in" disabled><ZoomIn size={15} /></IconButton>
                      <IconButton label="Fullscreen" disabled><Grid3X3 size={15} /></IconButton>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)]">
                    <aside className="border-b border-[#dfe7f1] bg-white p-3 lg:border-b-0 lg:border-r">
                      <p className="m-0 mb-2 text-[12px] font-black text-[#17233c]">Add Node</p>
                      <div className="space-y-2">
                        {palette.map(([type, label, Icon]) => (
                          <button key={type} type="button" onClick={() => addFlowNode(type)} className="flex h-10 w-full items-center gap-2 rounded-md border border-[#edf2f7] bg-white px-3 text-left text-[12px] font-bold text-[#334155] hover:border-emerald-300 hover:bg-emerald-50">
                            <Icon size={15} className="text-emerald-600" /> {label}
                          </button>
                        ))}
                      </div>
                    </aside>
                    <div className="overflow-auto bg-[#fbfcfe]">
                      <div
                        className="relative"
                        style={{
                          width: canvasWidth,
                          height: canvasHeight,
                          backgroundImage: 'radial-gradient(#d8e2ee 1px, transparent 1px)',
                          backgroundSize: '20px 20px',
                        }}
                      >
                        {nodes.map((node, index) => {
                          const Icon = flowIcon(node.type);
                          const selected = selectedFlowNode?.nodeId === node.nodeId;
                          return (
                            <button
                              key={node.nodeId}
                              type="button"
                              onClick={() => setSelectedFlowNodeId(node.nodeId)}
                              className={`absolute min-h-[90px] w-[230px] rounded-lg border p-3 text-left shadow-sm ${flowTone(node.type)} ${selected ? 'ring-2 ring-emerald-500' : ''}`}
                              style={{ left: Number(node.x || 0), top: Number(node.y || 0) }}
                            >
                              <span className="mb-2 flex items-center gap-2 text-[12px] font-black text-blue-700"><Icon size={15} /> {node.title}</span>
                              <span className="block line-clamp-4 text-[12px] leading-5 text-[#17233c]">{node.message || (node.variableName ? `Save response as {${node.variableName}}` : node.type)}</span>
                              {node.buttons?.length ? <span className="mt-2 block truncate text-[11px] font-bold text-emerald-700">{node.buttons.join(', ')}</span> : null}
                              {index < nodes.length - 1 && <span className="absolute left-1/2 top-full h-10 border-l border-[#94a3b8]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6"><EmptyPanel title="No flow selected" message="Select or create a flow to open the builder." /></div>
              )}
            </Card>

            <Card className="overflow-hidden">
              {selectedFlowNode ? (
                <div>
                  <div className="flex items-start justify-between gap-3 border-b border-[#edf2f7] p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600"><MessageCircle size={17} /></span>
                      <div>
                        <h3 className="m-0 text-[15px] font-black text-[#17233c]">{selectedFlowNode.title}</h3>
                        <p className="m-0 mt-1 text-[12px] text-[#64748b]">{selectedFlowNode.type} Node</p>
                      </div>
                    </div>
                    <IconButton label="Delete flow" onClick={() => deleteFlow(selectedFlow)}><Trash2 size={15} /></IconButton>
                  </div>
                  <div className="flex gap-6 border-b border-[#edf2f7] px-5">
                    {['Content', `Buttons (${selectedFlowNode.buttons?.length || 0})`, 'Settings', 'Advanced'].map((tab, index) => (
                      <button key={tab} type="button" disabled={index > 0} className={`h-11 border-0 border-b-2 bg-transparent px-0 text-[12px] font-bold ${index === 0 ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-[#64748b] opacity-60'}`}>{tab}</button>
                    ))}
                  </div>
                  <div className="space-y-5 p-5">
                    <label className="block">
                      <span className="mb-2 block text-[12px] font-black text-[#17233c]">Node Title</span>
                      <input defaultValue={selectedFlowNode.title} onBlur={(event) => updateFlowNode({ title: event.target.value })} className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[12px] font-black text-[#17233c]">Message Type</span>
                      <select value={selectedFlowNode.messageType || 'Text'} onChange={(event) => updateFlowNode({ messageType: event.target.value })} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                        {['Text', 'Image', 'Video', 'Document', 'Audio'].map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[12px] font-black text-[#17233c]">Message</span>
                      <textarea defaultValue={selectedFlowNode.message} onBlur={(event) => updateFlowNode({ message: event.target.value })} rows={5} maxLength={1024} className="w-full resize-none rounded-md border border-[#dbe4ef] p-3 text-[13px] outline-none focus:border-emerald-500" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[12px] font-black text-[#17233c]">Save Response Variable</span>
                      <input defaultValue={selectedFlowNode.variableName} onBlur={(event) => updateFlowNode({ variableName: event.target.value })} placeholder="name, phone, requirement..." className="h-10 w-full rounded-md border border-[#dbe4ef] px-3 text-[13px] outline-none focus:border-emerald-500" />
                    </label>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[12px] font-black text-[#17233c]">Quick Reply Buttons</span>
                        <StatusPill tone={selectedFlowNode.buttons?.length ? 'green' : 'slate'}>{selectedFlowNode.buttons?.length ? 'On' : 'Off'}</StatusPill>
                      </div>
                      <div className="space-y-2">
                        {(selectedFlowNode.buttons || []).map((button, index) => (
                          <div key={`${button}-${index}`} className="flex h-10 items-center gap-2 rounded-md border border-[#edf2f7] px-3">
                            <List size={14} className="text-[#64748b]" />
                            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#17233c]">{button}</span>
                            <IconButton label="Remove button" onClick={() => updateFlowNode({ buttons: selectedFlowNode.buttons.filter((_, buttonIndex) => buttonIndex !== index) })}><Trash2 size={14} /></IconButton>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => updateFlowNode({ buttons: [...(selectedFlowNode.buttons || []), `Button ${(selectedFlowNode.buttons?.length || 0) + 1}`] })} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white text-[13px] font-bold text-blue-600">
                        <Plus size={15} /> Add Button
                      </button>
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-[12px] font-black text-[#17233c]">Next Step</span>
                      <select value={selectedFlowNode.nextStep || ''} onChange={(event) => updateFlowNode({ nextStep: event.target.value })} className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                        <option value="">Continue to next step</option>
                        {nodes.filter((node) => node.nodeId !== selectedFlowNode.nodeId).map((node) => <option key={node.nodeId} value={node.nodeId}>{node.title}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-3 border-t border-[#edf2f7] p-5">
                    <button type="button" onClick={() => duplicateFlow(selectedFlow)} className="h-10 flex-1 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155]">Duplicate</button>
                    <PrimaryButton onClick={() => saveFlow(selectedFlow)} disabled={savingFlow}>{savingFlow ? 'Saving...' : 'Save Changes'}</PrimaryButton>
                  </div>
                </div>
              ) : (
                <div className="p-5"><EmptyPanel title="No node selected" message="Add or select a flow node to edit its content." /></div>
              )}
            </Card>
          </div>
        )}
      </div>
    );
  }

  function renderCatalog() {
    const tabs = ['All Products', 'Collections', 'Categories'];
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(filteredCatalogProducts.length / pageSize));
    const visibleProducts = filteredCatalogProducts.slice((catalogPage - 1) * pageSize, catalogPage * pageSize);
    const activeProducts = catalogProducts.filter((product) => product.status === 'Active').length;
    const draftProducts = catalogProducts.filter((product) => product.status !== 'Active').length;
    const rejectedProducts = 0;
    const metrics = [
      [ShoppingBag, 'Total Products', catalogTotal || catalogProducts.length, `${number(catalogStats.products || activeProducts)} inventory item(s)`, 'blue'],
      [CheckCircle2, 'Published', activeProducts, `${percent(activeProducts, catalogProducts.length)} of total`, 'emerald'],
      [Clock, 'Draft', draftProducts, `${percent(draftProducts, catalogProducts.length)} of total`, 'amber'],
      [XCircle, 'Rejected', rejectedProducts, 'No rejected workflow connected', 'red'],
    ];

    function productCatalogStatus(product) {
      return product?.status === 'Active' ? 'Published' : 'Draft';
    }

    return (
      <div>
        <input ref={catalogFileRef} type="file" accept=".xlsx" className="hidden" onChange={importCatalogFile} />
        <div className="mb-4 flex gap-7 overflow-x-auto border-b border-[#dfe7f1]">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setCatalogTab(tab); setCatalogPage(1); }}
              className={`h-11 shrink-0 border-0 border-b-2 bg-transparent px-0 text-[13px] font-bold ${catalogTab === tab ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-[#334155] hover:text-emerald-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {metrics.map(([Icon, label, value, note, tone]) => (
                <CampaignMetric key={label} icon={Icon} label={label} value={number(value)} note={note} tone={tone} />
              ))}
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-[#dfe7f1] bg-white p-3 xl:flex-row xl:items-center">
              <label className="relative min-w-[260px] flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input value={catalogSearch} onChange={(event) => { setCatalogSearch(event.target.value); setCatalogPage(1); }} placeholder="Search products by name, SKU..." className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-9 text-[13px] outline-none focus:border-emerald-500" />
                {catalogSearch && <button type="button" onClick={() => setCatalogSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-transparent text-[#64748b]"><X size={15} /></button>}
              </label>
              <select value={catalogCategory} onChange={(event) => { setCatalogCategory(event.target.value); setCatalogPage(1); }} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#334155] outline-none focus:border-emerald-500">
                {['All Categories', ...catalogCategories].map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select value={catalogStatus} onChange={(event) => { setCatalogStatus(event.target.value); setCatalogPage(1); }} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#334155] outline-none focus:border-emerald-500">
                {['All Status', 'Published', 'Draft'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <button type="button" disabled className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#334155] disabled:opacity-60">
                <Filter size={15} /> More Filters
              </button>
              <IconButton label="Refresh catalog" onClick={refreshCatalog}><RefreshCw size={15} /></IconButton>
            </div>
            {catalogMessage && <p className="m-0 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700">{catalogMessage}</p>}

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#fbfcfe] text-left text-[#64748b]">
                      {['', 'Product', 'SKU', 'Category', 'Price', 'Status', 'Last Updated', 'Actions'].map((heading) => (
                        <th key={heading || 'select'} className="border-b border-[#edf2f7] px-4 py-4 font-black">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProducts.length ? visibleProducts.map((product) => {
                      const selected = selectedCatalogProduct?._id === product._id;
                      return (
                        <tr key={product._id} onClick={() => setSelectedCatalogProductId(product._id)} className={`cursor-pointer border-b border-[#edf2f7] hover:bg-slate-50 ${selected ? 'bg-emerald-50/40' : ''}`}>
                          <td className="px-4 py-4"><input type="checkbox" onClick={(event) => event.stopPropagation()} /></td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-slate-100 text-slate-600"><Package size={18} /></span>
                              <span className="min-w-0">
                                <strong className="block truncate text-[13px] text-[#17233c]">{product.description || '-'}</strong>
                                <span className="block max-w-[220px] truncate text-[11px] text-[#64748b]">{product.brand || product.productDescription || product.itemType || '-'}</span>
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-semibold text-[#17233c]">{product.code || '-'}</td>
                          <td className="px-4 py-4"><StatusPill tone="slate">{product.category || 'Uncategorized'}</StatusPill></td>
                          <td className="px-4 py-4 font-semibold text-[#17233c]">{formatCurrency(product.rate || 0)}</td>
                          <td className="px-4 py-4"><StatusPill tone={product.status === 'Active' ? 'green' : 'amber'}>{productCatalogStatus(product)}</StatusPill></td>
                          <td className="px-4 py-4 text-[#17233c]">{dateLabel(product.updatedAt || product.createdAt)}</td>
                          <td className="px-4 py-4">
                            <ActionMenu
                              id={`product-${product._id}`}
                              openId={openActionMenu}
                              setOpenId={setOpenActionMenu}
                              label="Product actions"
                              actions={[
                                { label: 'View Details', icon: <Eye size={14} />, onClick: () => setSelectedCatalogProductId(product._id) },
                                { label: 'Edit', icon: <Edit3 size={14} />, onClick: () => { setEditingCatalogProduct(product); setShowCatalogProductForm(true); } },
                                { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => duplicateCatalogProduct(product) },
                                { label: 'Move to Draft', icon: <Clock size={14} />, onClick: () => moveCatalogProductToDraft(product), disabled: product.status !== 'Active' },
                                { label: 'Delete', icon: <Trash2 size={14} />, danger: true, onClick: () => { if (window.confirm('Delete this product?')) return deleteCatalogProduct(product); return undefined; } },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[#64748b]">No products found. Add or import inventory products to publish a WhatsApp catalog.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-[#edf2f7] px-4 py-4 text-[12px] text-[#536173] sm:flex-row sm:items-center sm:justify-between">
                <span>Showing {visibleProducts.length ? (catalogPage - 1) * pageSize + 1 : 0} to {Math.min(catalogPage * pageSize, filteredCatalogProducts.length)} of {filteredCatalogProducts.length} products</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setCatalogPage(1)} disabled={catalogPage === 1} className="h-8 rounded-md border border-[#dbe4ef] bg-white px-3 font-bold disabled:opacity-50">First</button>
                  <button type="button" onClick={() => setCatalogPage((page) => Math.max(1, page - 1))} disabled={catalogPage === 1} className="h-8 rounded-md border border-[#dbe4ef] bg-white px-3 font-bold disabled:opacity-50">Prev</button>
                  <span className="rounded-md bg-emerald-600 px-3 py-2 font-bold text-white">{catalogPage}</span>
                  <button type="button" onClick={() => setCatalogPage((page) => Math.min(totalPages, page + 1))} disabled={catalogPage === totalPages} className="h-8 rounded-md border border-[#dbe4ef] bg-white px-3 font-bold disabled:opacity-50">Next</button>
                </div>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            {selectedCatalogProduct ? (
              <div className="p-5">
                <div className="flex justify-end"><IconButton label="Close selection" onClick={() => setSelectedCatalogProductId('')}><X size={15} /></IconButton></div>
                <div className="flex items-start gap-4 border-b border-[#edf2f7] pb-5">
                  <span className="flex h-24 w-24 flex-none items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Package size={34} /></span>
                  <div className="min-w-0">
                    <h3 className="m-0 truncate text-[16px] font-black text-[#17233c]">{selectedCatalogProduct.description}</h3>
                    <p className="m-0 mt-1 text-[12px] text-[#64748b]">{selectedCatalogProduct.brand || selectedCatalogProduct.itemType || '-'}</p>
                    <div className="mt-2"><StatusPill tone={selectedCatalogProduct.status === 'Active' ? 'green' : 'amber'}>{productCatalogStatus(selectedCatalogProduct)}</StatusPill></div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 border-b border-[#edf2f7] py-5">
                  {[
                    [Eye, 'Preview', null],
                    [Share2, 'Share', null],
                    [Edit3, 'Edit', () => { setEditingCatalogProduct(selectedCatalogProduct); setShowCatalogProductForm(true); }],
                    [MoreVertical, 'More', () => duplicateCatalogProduct(selectedCatalogProduct)],
                  ].map(([Icon, label, onClick]) => (
                    <button key={label} type="button" onClick={onClick || undefined} disabled={!onClick} className="flex flex-col items-center gap-1 rounded-md border border-[#edf2f7] bg-white px-2 py-2 text-[11px] font-bold text-[#334155] disabled:opacity-60">
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="border-b border-[#edf2f7] py-5">
                  <div className="mb-4 flex items-center justify-between"><h3 className="m-0 text-[13px] font-black text-[#17233c]">Product Details</h3><button type="button" onClick={() => { setEditingCatalogProduct(selectedCatalogProduct); setShowCatalogProductForm(true); }} className="border-0 bg-transparent text-[12px] font-bold text-blue-600">Edit</button></div>
                  {[
                    ['SKU', selectedCatalogProduct.code],
                    ['Category', selectedCatalogProduct.category || 'Uncategorized'],
                    ['Price', formatCurrency(selectedCatalogProduct.rate || 0)],
                    ['Stock', number(selectedCatalogProduct.stock || 0)],
                    ['Description', selectedCatalogProduct.productDescription || '-'],
                    ['Status', productCatalogStatus(selectedCatalogProduct)],
                    ['Last Updated', dateLabel(selectedCatalogProduct.updatedAt || selectedCatalogProduct.createdAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="mb-3 grid grid-cols-[110px_1fr] gap-4 text-[12px]">
                      <span className="text-[#64748b]">{label}</span>
                      <strong className="font-semibold text-[#17233c]">{value || '-'}</strong>
                    </div>
                  ))}
                </div>
                <div className="py-5">
                  <h3 className="m-0 mb-3 text-[13px] font-black text-[#17233c]">Quick Actions</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => duplicateCatalogProduct(selectedCatalogProduct)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#334155]"><Copy size={14} /> Duplicate</button>
                    <button type="button" onClick={() => moveCatalogProductToDraft(selectedCatalogProduct)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#334155]"><Clock size={14} /> Move to Draft</button>
                    <button type="button" onClick={() => deleteCatalogProduct(selectedCatalogProduct)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-[12px] font-bold text-red-600 sm:col-span-2"><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5"><EmptyPanel title="No product selected" message="Select a product to view catalog details." /></div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  function renderAssistant() {
    const deliveryRate = percent(totalDelivered, totalSent);
    const readRate = percent(totalRead, totalSent);
    const responseRate = percent(totalReplies, totalSent);
    const activeContacts = contacts.filter((contact) => String(contact.status || 'active').toLowerCase() !== 'inactive').length;
    const newContacts = contacts.filter((contact) => {
      const created = new Date(contact.createdAt || contact.updatedAt || 0);
      return nowMs > 0 && !Number.isNaN(created.getTime()) && nowMs - created.getTime() <= 30 * 24 * 60 * 60 * 1000;
    }).length;
    const pendingOrders = invoices.filter((invoice) => ['pending', 'unpaid', 'overdue'].includes(String(invoice.status || invoice.paymentStatus || '').toLowerCase())).length;
    const inactiveContacts = contacts.length - activeContacts;
    const activeAutomations = automations.filter((automation) => automation.status === 'Active').length;
    const approvedTemplates = templates.filter((template) => template.status === 'Approved').length;
    const questions = [
      'How is my WhatsApp performance this month?',
      'Show me top performing campaigns',
      'Which template has highest replies?',
      'How many inactive contacts do I have?',
      'Suggest a message for order follow-up',
    ];
    const insightCards = [
      [ShieldCheck, 'Smart Insight', 'Engagement Summary', `${number(totalReplies)} replies from ${number(totalSent)} sent message(s).`, 'View Details', () => askAssistant('How is my WhatsApp performance this month?'), 'violet'],
      [Users, 'Recommendation', 'Re-engage Contacts', `${number(inactiveContacts)} inactive contact(s) found.`, 'Create Campaign', () => setActive('campaigns'), 'emerald'],
      [Zap, 'Automation Tip', 'Save Time with Automation', `${number(activeAutomations)} active automation(s) are running.`, 'Create Automation', () => setActive('automation'), 'amber'],
      [BarChart3, 'Performance Alert', failed ? 'Delivery Failures Found' : 'Delivery Health', `${number(failed)} failed message(s) in saved campaign records.`, 'View Analytics', () => setActive('analytics'), 'blue'],
    ];
    const overview = [
      [Send, 'Messages Sent', totalSent, 'From campaigns', 'blue'],
      [CheckCircle2, 'Delivered', totalDelivered, deliveryRate, 'emerald'],
      [Eye, 'Read', totalRead, readRate, 'amber'],
      [Headphones, 'Replies', totalReplies, responseRate, 'cyan'],
      [Users, 'Active Contacts', activeContacts, `${number(contacts.length)} total`, 'violet'],
      [UserPlus, 'New Contacts', newContacts, 'Last 30 days', 'blue'],
      [XCircle, 'Failed', failed, 'From campaigns', 'red'],
      [MessageCircle, 'Response Rate', responseRate, `${number(totalReplies)} replies`, 'emerald'],
    ];
    const suggestions = [
      {
        title: 'Send Offer Campaign',
        detail: contacts.length ? `You can target up to ${number(contacts.length)} contact(s).` : 'Add contacts before creating a campaign.',
        label: 'Create Campaign',
        action: () => setActive('campaigns'),
        tone: 'violet',
      },
      {
        title: 'Follow-up with Pending Orders',
        detail: pendingOrders ? `${number(pendingOrders)} pending order/invoice record(s) found.` : 'No pending order/invoice records found.',
        label: 'Send Reminder',
        action: () => setActive('automation'),
        tone: 'emerald',
      },
      {
        title: 'Review Templates',
        detail: `${number(approvedTemplates)} approved template(s) out of ${number(templates.length)} saved template(s).`,
        label: 'View Templates',
        action: () => setActive('templates'),
        tone: 'amber',
      },
    ];

    return (
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
            {insightCards.map(([Icon, type, title, detail, label, action, tone]) => (
              <Card key={title} className="p-4">
                <div className="mb-4 flex items-start gap-3">
                  <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${tone === 'violet' ? 'bg-violet-50 text-violet-600' : tone === 'amber' ? 'bg-amber-50 text-amber-600' : tone === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}><Icon size={18} /></span>
                  <div>
                    <p className="m-0 text-[12px] text-[#64748b]">{type}</p>
                    <h3 className="m-0 mt-1 text-[13px] font-black text-[#17233c]">{title}</h3>
                  </div>
                </div>
                <p className="m-0 min-h-[44px] text-[13px] leading-6 text-[#334155]">{detail}</p>
                <button type="button" onClick={action} className="mt-4 inline-flex items-center gap-2 border-0 bg-transparent p-0 text-[13px] font-bold text-blue-600">{label} <ChevronDown size={14} className="-rotate-90" /></button>
              </Card>
            ))}
          </div>

          <Card className="p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="m-0 text-[16px] font-black text-[#17233c]">Business Overview</h3>
              <select className="h-9 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#334155] outline-none">
                <option>This Month</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {overview.map(([Icon, label, value, note, tone]) => (
                <Card key={label} className="p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone === 'red' ? 'bg-red-50 text-red-600' : tone === 'amber' ? 'bg-amber-50 text-amber-600' : tone === 'cyan' ? 'bg-cyan-50 text-cyan-600' : tone === 'violet' ? 'bg-violet-50 text-violet-600' : tone === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}><Icon size={18} /></span>
                    <div>
                      <p className="m-0 text-[11px] font-bold text-[#64748b]">{label}</p>
                      <h3 className="m-0 mt-1 text-[22px] font-black text-[#17233c]">{typeof value === 'string' ? value : number(value)}</h3>
                    </div>
                  </div>
                  <p className={`m-0 text-[12px] font-semibold ${tone === 'red' ? 'text-red-600' : 'text-emerald-600'}`}>{note}</p>
                  <div className="mt-3 flex h-6 items-end gap-1">
                    {[2, 5, 3, 7, 4, 8, 6, 10].map((height, index) => <span key={index} className={`w-full rounded-t ${tone === 'red' ? 'bg-red-300' : 'bg-blue-300'}`} style={{ height: `${height * 2}px` }} />)}
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-[16px] font-black text-[#17233c]">AI Suggestions for You</h3>
              <button type="button" onClick={() => askAssistant('Give me all suggestions')} className="border-0 bg-transparent text-[13px] font-bold text-blue-600">View All Suggestions</button>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.title} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${suggestion.tone === 'violet' ? 'bg-violet-50 text-violet-600' : suggestion.tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}><ShieldCheck size={18} /></span>
                    <div>
                      <h4 className="m-0 text-[13px] font-black text-[#17233c]">{suggestion.title}</h4>
                      <p className="m-0 mt-2 min-h-[38px] text-[12px] leading-5 text-[#64748b]">{suggestion.detail}</p>
                      <button type="button" onClick={suggestion.action} className="mt-3 rounded-md border-0 bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-700">{suggestion.label}</button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="m-0 mb-3 text-[15px] font-black text-[#17233c]">Frequently Asked Insights</h3>
            <div className="flex flex-wrap gap-2">
              {questions.map((question) => (
                <button key={question} type="button" onClick={() => askAssistant(question)} className="h-9 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#334155] hover:bg-slate-50">{question}</button>
              ))}
            </div>
          </Card>
        </div>

        <Card className="flex min-h-[720px] flex-col overflow-hidden">
          <div className="flex items-start justify-between border-b border-[#edf2f7] p-5">
            <div>
              <h3 className="m-0 text-[18px] font-black text-[#17233c]">AI Assistant <StatusPill tone="slate">Beta</StatusPill></h3>
              <p className="m-0 mt-1 text-[12px] text-[#64748b]">Your smart business partner</p>
            </div>
            <IconButton label="Close assistant" onClick={() => setActive('dashboard')}><X size={15} /></IconButton>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
              <h4 className="m-0 text-[13px] font-black text-[#17233c]">Hello!</h4>
              <p className="m-0 mt-2 text-[13px] leading-6 text-[#334155]">Ask me anything about your WhatsApp Business performance. I will use the current saved records only.</p>
            </div>
            <div>
              <p className="m-0 mb-2 text-[12px] font-black text-[#17233c]">Suggested Questions</p>
              <div className="space-y-2">
                {questions.map((question) => (
                  <button key={question} type="button" onClick={() => askAssistant(question)} className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-[#dbe4ef] bg-white px-3 text-left text-[12px] font-bold text-[#334155] hover:bg-slate-50">
                    <span>{question}</span>
                    <ChevronDown size={14} className="-rotate-90" />
                  </button>
                ))}
              </div>
            </div>
            {assistantMessages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`rounded-lg border p-4 text-[13px] leading-6 ${message.role === 'user' ? 'ml-6 border-violet-100 bg-violet-50 text-[#17233c]' : 'mr-6 border-[#dfe7f1] bg-white text-[#334155]'}`}>
                {message.text}
              </div>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); askAssistant(); }} className="border-t border-[#edf2f7] p-4">
            <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
              <input value={assistantQuestion} onChange={(event) => setAssistantQuestion(event.target.value)} placeholder="Ask anything..." className="h-12 min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none" />
              <PrimaryButton type="submit"><Send size={15} /></PrimaryButton>
            </div>
            <p className="m-0 mt-2 text-center text-[11px] text-[#94a3b8]">AI Assistant can make mistakes. Verify important information.</p>
          </form>
        </Card>
      </div>
    );
  }

  function renderModule() {
    if (active === 'inbox') return renderInbox();
    if (active === 'dashboard') return renderDashboard();
    if (active === 'contacts') return renderContacts();
    if (active === 'campaigns') return renderCampaigns();
    if (active === 'templates') return renderTemplates();
    if (active === 'automation') return renderAutomations();
    if (active === 'chatbot') return renderChatbot();
    if (active === 'flows') return renderFlows();
    if (active === 'catalog') return renderCatalog();
    if (active === 'assistant') return renderAssistant();
    return (
      <Card className="p-5">
        <EmptyPanel
          title={`${moduleTitle} is ready`}
          message="This section will use connected WhatsApp Business data when the related backend workflow is available. No sample records are shown."
        />
      </Card>
    );
  }

  return (
    <div className="min-h-[calc(100vh-76px)] bg-[#f6f9fd] text-[#17233c]">
      <div className="flex min-h-[calc(100vh-76px)]">
        <aside className="sticky top-0 hidden w-[245px] shrink-0 border-r border-[#e3eaf3] bg-white p-4 lg:block">
          <h2 className="mb-4 mt-0 text-[13px] font-black uppercase tracking-wide text-emerald-600">WhatsApp Business</h2>
          <nav className="space-y-1">
            {SIDEBAR.map(([key, label, Icon]) => {
              const selected = active === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-md border-0 px-3 text-left text-[13px] font-bold ${selected ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-[#334155] hover:bg-slate-50'}`}
                >
                  <Icon size={17} />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {key === 'inbox' && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">0</span>}
                </button>
              );
            })}
          </nav>

          <Card className="mt-8 p-4">
            <h3 className="m-0 mb-3 text-[12px] font-black text-[#17233c]">WhatsApp Account</h3>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><MessageCircle size={17} /></span>
              <div>
                <strong className="block text-[12px]">Inbox not connected</strong>
                <StatusPill tone="amber">Setup Required</StatusPill>
              </div>
            </div>
            <div className="mb-3 flex justify-between text-[12px]"><span>Contacts</span><strong>{number(contacts.length)}</strong></div>
            <div className="flex justify-between text-[12px]"><span>Campaigns</span><strong>{number(campaigns.length)}</strong></div>
          </Card>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <header className="mb-5 flex flex-col gap-3 border-b border-[#dfe7f1] pb-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="m-0 text-[24px] font-black text-[#17233c]">{moduleTitle}</h1>
              <p className="m-0 mt-1 text-[13px] text-[#64748b]">
                {active === 'inbox'
                  ? 'Manage all your WhatsApp conversations in one place'
                  : active === 'chatbot'
                    ? 'Build smart chatbot flows to automate conversations'
                    : active === 'flows'
                      ? 'Create interactive flows for lead capture, appointments, feedback and more.'
                      : active === 'catalog'
                        ? 'Create and manage your product catalog to showcase on WhatsApp.'
                    : `Manage ${moduleTitle.toLowerCase()} for WhatsApp Business`}
              </p>
              {loadError && <p className="m-0 mt-2 text-[12px] font-semibold text-red-600">{loadError}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {active === 'campaigns' ? (
                <>
                  <button type="button" disabled className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#17233c] disabled:opacity-60">
                    <Archive size={15} /> Import Contacts
                  </button>
                  <PrimaryButton onClick={() => setShowCampaignForm(true)}><Plus size={16} /> New Campaign</PrimaryButton>
                </>
              ) : active === 'templates' ? (
                <>
                  <button type="button" disabled className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#17233c] disabled:opacity-60">
                    <Archive size={15} /> Template Categories
                  </button>
                  <PrimaryButton onClick={() => { setEditingTemplate(null); setShowTemplateForm(true); }}><Plus size={16} /> Create Template</PrimaryButton>
                </>
              ) : active === 'automation' ? (
                <>
                  <button type="button" disabled className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#17233c] disabled:opacity-60">
                    <Archive size={15} /> Import Automation
                  </button>
                  <PrimaryButton onClick={() => { setEditingAutomation(null); setShowAutomationForm(true); }}><Plus size={16} /> Create Automation</PrimaryButton>
                </>
              ) : active === 'chatbot' ? (
                <>
                  <button type="button" disabled className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#17233c] disabled:opacity-60">
                    <MessageCircle size={15} /> Test Your Bot
                  </button>
                  <PrimaryButton onClick={() => { setEditingChatbot(null); setShowChatbotForm(true); }}><Plus size={16} /> Create New Bot</PrimaryButton>
                </>
              ) : active === 'flows' ? (
                <>
                  <button type="button" disabled className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#17233c] disabled:opacity-60">
                    <Archive size={15} /> Import Flow
                  </button>
                  <PrimaryButton onClick={() => { setEditingFlow(null); setShowFlowForm(true); }}><Plus size={16} /> Create Flow</PrimaryButton>
                </>
              ) : active === 'catalog' ? (
                <>
                  <button type="button" onClick={() => catalogFileRef.current?.click()} disabled={catalogImporting} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#17233c] disabled:opacity-60">
                    <Archive size={15} /> {catalogImporting ? 'Importing...' : 'Import Catalog'}
                  </button>
                  <button type="button" disabled className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#17233c] disabled:opacity-60">
                    <Settings size={15} /> Settings
                  </button>
                  <PrimaryButton onClick={() => { setEditingCatalogProduct(null); setShowCatalogProductForm(true); }}><Plus size={16} /> Add Product</PrimaryButton>
                </>
              ) : active === 'assistant' ? (
                <button type="button" disabled className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#17233c] disabled:opacity-60">
                  <Settings size={15} /> Assistant Settings
                </button>
              ) : active === 'contacts' ? (
                <>
                  <button type="button" disabled className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#17233c] disabled:opacity-60">
                    <Archive size={15} /> Import Contacts
                  </button>
                  <button type="button" disabled className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#17233c] disabled:opacity-60">
                    <Archive size={15} /> Export
                  </button>
                  <PrimaryButton onClick={() => setShowContactForm(true)}><Plus size={16} /> Add Contact</PrimaryButton>
                </>
              ) : (
                <>
                  <button type="button" disabled className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-emerald-700 disabled:opacity-60">
                    <Archive size={15} /> Mark all as read
                  </button>
                  <PrimaryButton onClick={() => setShowNewMessage(true)} disabled={!canMessage}><Plus size={16} /> New Message</PrimaryButton>
                </>
              )}
            </div>
          </header>

          <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
            {SIDEBAR.map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActive(key)}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-[12px] font-bold ${active === key ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-[#dbe4ef] bg-white text-[#334155] hover:bg-slate-50'}`}
              >
                <Icon size={15} />
                {label}
                {key === 'inbox' && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">0</span>}
              </button>
            ))}
          </div>

          {renderModule()}
        </main>
      </div>

      {showNewMessage && (
        contacts.length ? (
          <NewMessageModal contacts={contacts} onClose={() => setShowNewMessage(false)} />
        ) : (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-5 text-center shadow-xl">
              <Boxes className="mx-auto mb-3 text-emerald-600" size={32} />
              <h3 className="m-0 text-[16px] font-black text-[#17233c]">No contacts available</h3>
              <p className="m-0 mt-2 text-[13px] text-[#64748b]">Add customers or vendors before starting a WhatsApp message.</p>
              <button type="button" onClick={() => setShowNewMessage(false)} className="mt-4 h-10 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-slate-50">Close</button>
            </div>
          </div>
        )
      )}
      {showCampaignForm && (
        <CampaignFormModal
          onClose={() => setShowCampaignForm(false)}
          onCreated={() => loadWhatsAppData()}
        />
      )}
      {showContactForm && (
        <ContactFormModal
          onClose={() => setShowContactForm(false)}
          onCreated={() => loadWhatsAppData()}
        />
      )}
      {showTemplateForm && (
        <TemplateFormModal
          template={editingTemplate}
          onClose={() => { setShowTemplateForm(false); setEditingTemplate(null); }}
          onSaved={() => loadWhatsAppData()}
        />
      )}
      {showAutomationForm && (
        <AutomationFormModal
          automation={editingAutomation}
          templates={templates}
          onClose={() => { setShowAutomationForm(false); setEditingAutomation(null); }}
          onSaved={() => loadWhatsAppData()}
        />
      )}
      {showChatbotForm && (
        <ChatbotFormModal
          bot={editingChatbot}
          onClose={() => { setShowChatbotForm(false); setEditingChatbot(null); }}
          onSaved={() => loadWhatsAppData()}
        />
      )}
      {showFlowForm && (
        <FlowFormModal
          flow={editingFlow}
          onClose={() => { setShowFlowForm(false); setEditingFlow(null); }}
          onSaved={() => loadWhatsAppData()}
        />
      )}
      {showCatalogProductForm && (
        <CatalogProductModal
          product={editingCatalogProduct}
          categories={catalogCategories}
          onClose={() => { setShowCatalogProductForm(false); setEditingCatalogProduct(null); }}
          onSaved={refreshCatalog}
        />
      )}
    </div>
  );
}
