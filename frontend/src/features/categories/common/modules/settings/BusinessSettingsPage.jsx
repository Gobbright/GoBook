import { useEffect, useRef, useState } from 'react';

import { apiClient } from '../../../../../services/apiClient.js';
import { API_BASE_URL, SERVER_ORIGIN } from '../../../../../services/apiBase.js';
import { getToken } from '../../../../../services/authToken.js';

const API_BASE = API_BASE_URL;

function notifySettingsUpdated(settings) {
  window.dispatchEvent(new CustomEvent('gobook:settings-updated', { detail: { settings } }));
}

const EMPTY = {
  businessName: '', businessEmail: '', phone: '', address: '', gstin: '',
  city: '', state: 'Tamil Nadu', pincode: '',
  fyStart: '01 April', currency: 'INR - Indian Rupee (₹)', timezone: '(GMT +05:30) Asia/Kolkata',
  dateFormat: 'DD MMM YYYY', invoicePrefix: 'INV-',
  emailNotifications: true, smsNotifications: true, whatsappNotifications: true,
  autoBackup: true, maintainAuditLog: true,
  bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', bankBranch: '', accountType: 'Savings',
  gspProvider: '', gspClientId: '', gspClientSecret: '', gspUsername: '', gspPassword: '', gspSandbox: true,
  emailSmtpHost: '', emailSmtpPort: 587, emailSmtpSecure: false, emailSmtpUser: '', emailSmtpPass: '',
};

const INDIAN_STATES = [
  'Andaman & Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra & Nagar Haveli', 'Daman & Diu', 'Delhi',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand',
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
];

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="relative flex-none border-0 cursor-pointer p-0 bg-transparent"
      style={{ width: 40, height: 22 }}
      aria-checked={on}
      role="switch"
    >
      <div className="w-full h-full rounded-full transition-colors duration-200" style={{ background: on ? '#2563eb' : '#d1d5db' }} />
      <div className="absolute top-0.75 w-4 h-4 rounded-full bg-white shadow transition-all duration-200" style={{ left: on ? '21px' : '3px' }} />
    </button>
  );
}

function SectionHeader({ title, editing, onEdit, onSave, onCancel }) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
      <h3 className="m-0 text-[14px] font-semibold text-[#111827]">{title}</h3>
      {editing ? (
        <div className="flex gap-2">
          <button type="button" onClick={onSave} className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-white bg-blue-600 border-0 rounded-md cursor-pointer hover:bg-blue-700 font-[inherit]">Save</button>
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#536173] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">
          <svg fill="none" height="12" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
      )}
    </div>
  );
}

export function BusinessSettingsPage() {
  const [settings, setSettings] = useState(EMPTY);
  const [draft, setDraft] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState(null);
  const [pendingLogoPreview, setPendingLogoPreview] = useState('');
  const [testEmailStatus, setTestEmailStatus] = useState(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    apiClient('/settings')
      .then((data) => setSettings(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function startEdit(section) {
    setDraft({ ...settings });
    setEditingSection(section);
    setTestEmailStatus(null);
  }

  function cancelEdit() {
    setDraft(null);
    setEditingSection(null);
    setTestEmailStatus(null);
  }

  async function sendTestEmail() {
    if (!window.confirm("This will immediately email every patient with an appointment today. Continue?")) return;
    setTestingEmail(true);
    setTestEmailStatus(null);
    try {
      const res = await apiClient('/settings/test-email', { method: 'POST' });
      setTestEmailStatus({ ok: true, message: res.message || 'Reminders sent' });
    } catch (err) {
      setTestEmailStatus({ ok: false, message: err.message || 'Failed to send reminders' });
    } finally {
      setTestingEmail(false);
    }
  }

  async function saveSection() {
    setSaving(true);
    try {
      const updated = await apiClient('/settings', { method: 'PUT', body: JSON.stringify(draft) });
      setSettings(updated);
      notifySettingsUpdated(updated);
      setDraft(null);
      setEditingSection(null);
    } catch {
      // keep editing open on error
    } finally {
      setSaving(false);
    }
  }




  

  async function togglePref(key) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    notifySettingsUpdated(next);
    apiClient('/settings', { method: 'PUT', body: JSON.stringify(next) }).catch(() => setSettings(settings));
  }

  function handleLogoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingLogoFile(file);
    setPendingLogoPreview(URL.createObjectURL(file));
  }

  function cancelLogoSelect() {
    if (pendingLogoPreview) URL.revokeObjectURL(pendingLogoPreview);
    setPendingLogoFile(null);
    setPendingLogoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleLogoSave() {
    if (!pendingLogoFile) return;
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append('logo', pendingLogoFile);
      const token = getToken();
      const res = await fetch(`${API_BASE}/settings/logo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSettings((p) => {
        const next = { ...p, logoUrl: data.logoUrl };
        notifySettingsUpdated(next);
        return next;
      });
      cancelLogoSelect();
    } catch (err) {
      console.error('Logo upload failed:', err);
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleLogoRemove() {
    setLogoUploading(true);
    try {
      const token = getToken();
      await fetch(`${API_BASE}/settings/logo`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setSettings((p) => {
        const next = { ...p, logoUrl: '' };
        notifySettingsUpdated(next);
        return next;
      });
    } catch (err) {
      console.error('Logo remove failed:', err);
    } finally {
      setLogoUploading(false);
    }
  }

  const d = editingSection ? draft : settings;

  return (
    <div className="p-4 md:p-7">
      <div className="mb-1">
        <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
          <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
          <span>›</span><span>Settings</span><span>›</span><span>Business Settings</span>
        </nav>
        <h1 className="m-0 text-[22px] font-bold">Business Settings</h1>
        <p className="m-0 text-[13px] text-[#536173] mt-0.5">Manage your business details and preferences</p>
        {loading && <p className="text-xs text-blue-500 mt-1">Loading settings…</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        {/* Business Information */}
        <div className="bg-white border border-[#dfe7f1] rounded-xl p-5">
          <SectionHeader
            title="Business Information"
            editing={editingSection === 'info'}
            onEdit={() => startEdit('info')}
            onSave={saveSection}
            onCancel={cancelEdit}
          />
          {editingSection === 'info' ? (
            <div className="space-y-3">
              {[
                { key: 'businessName', label: 'Business Name', type: 'text' },
                { key: 'businessEmail', label: 'Business Email', type: 'email' },
                { key: 'phone', label: 'Phone Number', type: 'text' },
                { key: 'address', label: 'Business Address', type: 'text' },
                { key: 'gstin', label: 'GSTIN', type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key} className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 sm:items-center">
                  <label className="text-[13px] text-[#536173] sm:w-36 sm:flex-none">{label}</label>
                  <input
                    type={type}
                    value={draft[key] ?? ''}
                    onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                    className="flex-1 border border-[#dbe4ef] rounded-md px-3 py-1.5 text-[13px] outline-none focus:border-blue-500 font-[inherit]"
                    disabled={saving}
                  />
                </div>
              ))}
              <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 sm:items-center">
                <label className="text-[13px] text-[#536173] sm:w-36 sm:flex-none">City</label>
                <input
                  type="text"
                  value={draft.city ?? ''}
                  onChange={(e) => setDraft((p) => ({ ...p, city: e.target.value }))}
                  className="flex-1 border border-[#dbe4ef] rounded-md px-3 py-1.5 text-[13px] outline-none focus:border-blue-500 font-[inherit]"
                  disabled={saving}
                  placeholder="e.g. Trichy"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 sm:items-center">
                <label className="text-[13px] text-[#536173] sm:w-36 sm:flex-none">
                  State <span className="text-blue-600 font-semibold">*</span>
                </label>
                <select
                  value={draft.state ?? 'Tamil Nadu'}
                  onChange={(e) => setDraft((p) => ({ ...p, state: e.target.value }))}
                  className="flex-1 border border-[#dbe4ef] rounded-md px-3 py-1.5 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white"
                  disabled={saving}
                >
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 sm:items-center">
                <label className="text-[13px] text-[#536173] sm:w-36 sm:flex-none">Pincode</label>
                <input
                  type="text"
                  value={draft.pincode ?? ''}
                  onChange={(e) => setDraft((p) => ({ ...p, pincode: e.target.value }))}
                  className="flex-1 border border-[#dbe4ef] rounded-md px-3 py-1.5 text-[13px] outline-none focus:border-blue-500 font-[inherit]"
                  disabled={saving}
                  placeholder="6-digit pincode"
                  maxLength={6}
                />
              </div>
              <p className="text-[11.5px] text-blue-600 bg-blue-50 border border-blue-100 rounded-md px-3 py-2 m-0">
                <strong>State is used for auto GST detection</strong> — selecting the correct state ensures CGST+SGST (intrastate) or IGST (interstate) is applied automatically on bills.
              </p>
            </div>
          ) : (
            <dl className="space-y-3">
              {[
                { label: 'Business Name',    value: settings.businessName },
                { label: 'Business Email',   value: settings.businessEmail },
                { label: 'Phone Number',     value: settings.phone },
                { label: 'Business Address', value: settings.address },
                { label: 'City',             value: settings.city },
                { label: 'State',            value: settings.state },
                { label: 'Pincode',          value: settings.pincode },
                { label: 'GSTIN',            value: settings.gstin },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col sm:flex-row gap-0.5 sm:gap-3">
                  <dt className="text-[13px] text-[#536173] sm:w-36 sm:flex-none leading-relaxed">{label}</dt>
                  <dd className={`text-[13px] font-medium leading-relaxed m-0 wrap-break-word ${label === 'State' && value ? 'text-blue-700' : 'text-[#111827]'}`}>
                    {value || '—'}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* General Settings */}
        <div className="bg-white border border-[#dfe7f1] rounded-xl p-5">
          <SectionHeader
            title="General Settings"
            editing={editingSection === 'general'}
            onEdit={() => startEdit('general')}
            onSave={saveSection}
            onCancel={cancelEdit}
          />
          {editingSection === 'general' ? (
            <div className="space-y-3">
              {[
                { key: 'fyStart',       label: 'FY Start',       type: 'text' },
                { key: 'currency',      label: 'Currency',       type: 'text' },
                { key: 'timezone',      label: 'Time Zone',      type: 'text' },
                { key: 'dateFormat',    label: 'Date Format',    type: 'text' },
                { key: 'invoicePrefix', label: 'Invoice Prefix', type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key} className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 sm:items-center">
                  <label className="text-[13px] text-[#536173] sm:w-40 sm:flex-none">{label}</label>
                  <input
                    type={type}
                    value={draft[key] ?? ''}
                    onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                    className="flex-1 border border-[#dbe4ef] rounded-md px-3 py-1.5 text-[13px] outline-none focus:border-blue-500 font-[inherit]"
                    disabled={saving}
                  />
                </div>
              ))}
            </div>
          ) : (
            <dl className="space-y-3">
              {[
                { label: 'Financial Year Start', value: settings.fyStart },
                { label: 'Currency',             value: settings.currency },
                { label: 'Time Zone',            value: settings.timezone },
                { label: 'Date Format',          value: settings.dateFormat },
                { label: 'Invoice Prefix',       value: settings.invoicePrefix },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col sm:flex-row gap-0.5 sm:gap-3">
                  <dt className="text-[13px] text-[#536173] sm:w-40 sm:flex-none leading-relaxed">{label}</dt>
                  <dd className="text-[13px] text-[#111827] font-medium leading-relaxed m-0 wrap-break-word">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Preferences */}
        <div className="bg-white border border-[#dfe7f1] rounded-xl p-5">
          <h3 className="m-0 text-[14px] font-semibold text-[#111827] mb-4">Preferences</h3>
          <div className="space-y-4">
            {[
              { key: 'emailNotifications',    label: 'Enable Email Notifications' },
              { key: 'smsNotifications',       label: 'Enable SMS Notifications' },
              { key: 'whatsappNotifications',  label: 'Enable WhatsApp Notifications' },
              { key: 'autoBackup',             label: 'Auto Backup' },
              { key: 'maintainAuditLog',       label: 'Maintain Audit Log' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-[13px] text-[#111827]">{label}</span>
                <Toggle on={!!settings[key]} onChange={() => togglePref(key)} />
              </div>
            ))}
          </div>
        </div>

        {/* Logo & Branding */}
        <div className="bg-white border border-[#dfe7f1] rounded-xl p-5">
          <h3 className="m-0 text-[14px] font-semibold text-[#111827] mb-4">Logo &amp; Branding</h3>
          <div className="flex flex-col items-center justify-center gap-4 pt-4">
            {pendingLogoPreview ? (
              <img
                src={pendingLogoPreview}
                alt="Logo preview"
                className="w-24 h-24 rounded-2xl object-contain shadow-md border border-blue-200"
              />
            ) : settings.logoUrl ? (
              <img
                src={`${SERVER_ORIGIN}${settings.logoUrl}`}
                alt="Business logo"
                crossOrigin="anonymous"
                className="w-24 h-24 rounded-2xl object-contain shadow-md border border-[#edf2f7]"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
                <span className="text-white text-4xl font-extrabold select-none">G</span>
              </div>
            )}
            <div className="text-center">
              <div className="text-[18px] font-bold text-[#111827]">{settings.businessName || 'GoBook'}</div>
              <div className="text-[13px] text-[#536173] mt-0.5">Business Management Suite</div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {pendingLogoFile ? (
                <>
                  <button
                    type="button"
                    disabled={logoUploading}
                    onClick={handleLogoSave}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60"
                  >
                    {logoUploading ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    disabled={logoUploading}
                    onClick={cancelLogoSelect}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={logoUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60"
                  >
                    <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                    Update Logo
                  </button>
                  <button
                    type="button"
                    disabled={logoUploading}
                    onClick={handleLogoRemove}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-red-600 bg-white border border-red-200 rounded-md cursor-pointer hover:bg-red-50 font-[inherit] disabled:opacity-60"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
            <p className="text-[12px] text-[#536173] text-center m-0">
              {pendingLogoFile ? 'Click Save to upload the selected logo.' : 'Upload your business logo file.'}
            </p>
          </div>
        </div>

        {/* GSP Integration — full width */}
        <div className="md:col-span-2 bg-white border border-[#dfe7f1] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-semibold text-[#111827] m-0">GSP Integration (E-Way Bill API)</h3>
              <p className="text-[12.5px] text-[#536173] mt-1 m-0">Connect a GST Suvidha Provider so GoBook can generate E-Way Bill numbers automatically without visiting the government portal.</p>
            </div>
            {editingSection !== 'gsp' && (
              <button type="button" className="text-[13px] text-blue-600 font-medium cursor-pointer hover:underline bg-transparent border-0 font-[inherit]" onClick={() => startEdit('gsp')}>Edit</button>
            )}
          </div>

          {editingSection === 'gsp' ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
                <strong>How to get credentials:</strong> Register at{' '}
                <a href="https://www.mastersindia.co/gst-api/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Masters India GSP</a>
                {' '}(or any NIC-approved GSP). After registration, they will provide your Client ID, Client Secret, Username and Password.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#536173] font-medium">GSP Provider</label>
                  <select
                    className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] outline-none bg-white font-[inherit]"
                    value={draft.gspProvider}
                    onChange={e => setDraft(p => ({ ...p, gspProvider: e.target.value }))}
                  >
                    <option value="">— Select Provider —</option>
                    <option value="masters-india">Masters India (MasterGST)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#536173] font-medium">Mode</label>
                  <select
                    className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] outline-none bg-white font-[inherit]"
                    value={draft.gspSandbox ? 'sandbox' : 'production'}
                    onChange={e => setDraft(p => ({ ...p, gspSandbox: e.target.value === 'sandbox' }))}
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="production">Production (Live)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#536173] font-medium">Client ID</label>
                  <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Provided by GSP" value={draft.gspClientId} onChange={e => setDraft(p => ({ ...p, gspClientId: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#536173] font-medium">Client Secret</label>
                  <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" type="password" placeholder="Provided by GSP" value={draft.gspClientSecret} onChange={e => setDraft(p => ({ ...p, gspClientSecret: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#536173] font-medium">GSP Username (your GSTIN)</label>
                  <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Your 15-digit GSTIN" value={draft.gspUsername} onChange={e => setDraft(p => ({ ...p, gspUsername: e.target.value.toUpperCase() }))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#536173] font-medium">GSP Password</label>
                  <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" type="password" placeholder="Your GSP portal password" value={draft.gspPassword} onChange={e => setDraft(p => ({ ...p, gspPassword: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <button type="button" className="px-4 py-2 bg-blue-600 text-white text-[13px] font-medium rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" disabled={saving} onClick={saveSection}>{saving ? 'Saving…' : 'Save GSP Settings'}</button>
                <button type="button" className="px-4 py-2 bg-white text-[#536173] text-[13px] font-medium rounded-md cursor-pointer hover:bg-gray-50 border border-[#dbe4ef] font-[inherit]" onClick={cancelEdit}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'GSP Provider',  value: settings.gspProvider === 'masters-india' ? 'Masters India (MasterGST)' : settings.gspProvider || '—' },
                { label: 'Mode',          value: settings.gspSandbox ? 'Sandbox (Testing)' : 'Production (Live)' },
                { label: 'Client ID',     value: settings.gspClientId ? '••••••••' + settings.gspClientId.slice(-4) : '—' },
                { label: 'GSP Username',  value: settings.gspUsername || '—' },
                { label: 'Status',        value: settings.gspProvider && settings.gspClientId ? '✓ Configured' : 'Not configured' },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col sm:flex-row gap-0.5 sm:gap-3">
                  <dt className="text-[13px] text-[#536173] sm:w-44 sm:flex-none">{label}</dt>
                  <dd className={`text-[13px] font-medium m-0 ${value.startsWith('✓') ? 'text-green-600' : 'text-[#111827]'}`}>{value}</dd>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Outgoing Email (SMTP) — full width */}
        <div className="md:col-span-2 bg-white border border-[#dfe7f1] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-semibold text-[#111827] m-0">Outgoing Email (SMTP)</h3>
              <p className="text-[12.5px] text-[#536173] mt-1 m-0">Send appointment reminders and other notifications from your own hospital email address instead of GoBook's shared mailbox.</p>
            </div>
            {editingSection !== 'smtp' && (
              <button type="button" className="text-[13px] text-blue-600 font-medium cursor-pointer hover:underline bg-transparent border-0 font-[inherit]" onClick={() => startEdit('smtp')}>Edit</button>
            )}
          </div>

          {editingSection === 'smtp' ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
                <strong>For Gmail:</strong> use host <code>smtp.gmail.com</code>, port <code>587</code>, and create an{' '}
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-semibold">App Password</a>
                {' '}(Google Account → Security → App Passwords) — your regular password won't work if 2-Step Verification is on.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#536173] font-medium">SMTP Host</label>
                  <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="smtp.gmail.com" value={draft.emailSmtpHost} onChange={e => setDraft(p => ({ ...p, emailSmtpHost: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#536173] font-medium">SMTP Port</label>
                  <input type="number" className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="587" value={draft.emailSmtpPort} onChange={e => setDraft(p => ({ ...p, emailSmtpPort: Number(e.target.value) || '' }))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#536173] font-medium">Email Address</label>
                  <input type="email" className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="hospital@gmail.com" value={draft.emailSmtpUser} onChange={e => setDraft(p => ({ ...p, emailSmtpUser: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#536173] font-medium">App Password</label>
                  <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" type="password" placeholder="Leave blank to keep current" value={draft.emailSmtpPass} onChange={e => setDraft(p => ({ ...p, emailSmtpPass: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Toggle on={!!draft.emailSmtpSecure} onChange={(v) => setDraft(p => ({ ...p, emailSmtpSecure: v }))} />
                  <span className="text-[13px] text-[#111827]">Use SSL (port 465)</span>
                </div>
              </div>
              {testEmailStatus && (
                <p className={`text-[12.5px] m-0 ${testEmailStatus.ok ? 'text-green-600' : 'text-red-600'}`}>{testEmailStatus.message}</p>
              )}
              <div className="flex gap-2 mt-1">
                <button type="button" className="px-4 py-2 bg-blue-600 text-white text-[13px] font-medium rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" disabled={saving} onClick={saveSection}>{saving ? 'Saving…' : 'Save Email Settings'}</button>
                <button type="button" className="px-4 py-2 bg-white text-[#536173] text-[13px] font-medium rounded-md cursor-pointer hover:bg-gray-50 border border-[#dbe4ef] font-[inherit]" disabled={testingEmail} onClick={sendTestEmail}>{testingEmail ? 'Sending…' : 'Send Reminders Now'}</button>
                <button type="button" className="px-4 py-2 bg-white text-[#536173] text-[13px] font-medium rounded-md cursor-pointer hover:bg-gray-50 border border-[#dbe4ef] font-[inherit]" onClick={cancelEdit}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'SMTP Host',     value: settings.emailSmtpHost || '—' },
                { label: 'SMTP Port',     value: settings.emailSmtpHost ? (settings.emailSmtpPort || 587) : '—' },
                { label: 'Email Address', value: settings.emailSmtpUser || '—' },
                { label: 'Status',        value: settings.emailSmtpHost && settings.emailSmtpUser ? '✓ Configured' : 'Not configured' },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col sm:flex-row gap-0.5 sm:gap-3">
                  <dt className="text-[13px] text-[#536173] sm:w-44 sm:flex-none">{label}</dt>
                  <dd className={`text-[13px] font-medium m-0 ${String(value).startsWith('✓') ? 'text-green-600' : 'text-[#111827]'}`}>{value}</dd>
                </div>
              ))}
              {settings.emailSmtpHost && settings.emailSmtpUser && (
                <div className="sm:col-span-2 flex flex-col gap-1.5 mt-1">
                  <button type="button" className="self-start px-4 py-2 bg-white text-[#536173] text-[13px] font-medium rounded-md cursor-pointer hover:bg-gray-50 border border-[#dbe4ef] font-[inherit]" disabled={testingEmail} onClick={sendTestEmail}>{testingEmail ? 'Sending…' : 'Send Reminders Now'}</button>
                  {testEmailStatus && (
                    <p className={`text-[12.5px] m-0 ${testEmailStatus.ok ? 'text-green-600' : 'text-red-600'}`}>{testEmailStatus.message}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bank Details — full width */}
        <div className="md:col-span-2 bg-white border border-[#dfe7f1] rounded-xl p-5">
          <SectionHeader
            title="Bank Details"
            editing={editingSection === 'bank'}
            onEdit={() => startEdit('bank')}
            onSave={saveSection}
            onCancel={cancelEdit}
          />
          {editingSection === 'bank' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {[
                { key: 'bankName',          label: 'Bank Name',           type: 'text' },
                { key: 'accountHolderName', label: 'Account Holder Name', type: 'text' },
                { key: 'accountNumber',     label: 'Account Number',      type: 'text' },
                { key: 'ifscCode',          label: 'IFSC Code',           type: 'text' },
                { key: 'bankBranch',        label: 'Branch Name',         type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key} className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 sm:items-center">
                  <label className="text-[13px] text-[#536173] sm:w-44 sm:flex-none">{label}</label>
                  <input
                    type={type}
                    value={draft[key] ?? ''}
                    onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                    className="flex-1 border border-[#dbe4ef] rounded-md px-3 py-1.5 text-[13px] outline-none focus:border-blue-500 font-[inherit]"
                    disabled={saving}
                  />
                </div>
              ))}
              <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 sm:items-center">
                <label className="text-[13px] text-[#536173] sm:w-44 sm:flex-none">Account Type</label>
                <select
                  value={draft.accountType ?? 'Savings'}
                  onChange={(e) => setDraft((p) => ({ ...p, accountType: e.target.value }))}
                  className="flex-1 border border-[#dbe4ef] rounded-md px-3 py-1.5 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white"
                  disabled={saving}
                >
                  <option>Savings</option>
                  <option>Current</option>
                  <option>Overdraft</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {[
                { label: 'Bank Name',           value: settings.bankName },
                { label: 'Account Holder Name', value: settings.accountHolderName },
                { label: 'Account Number',      value: settings.accountNumber },
                { label: 'IFSC Code',           value: settings.ifscCode },
                { label: 'Branch Name',         value: settings.bankBranch },
                { label: 'Account Type',        value: settings.accountType },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col sm:flex-row gap-0.5 sm:gap-3">
                  <dt className="text-[13px] text-[#536173] sm:w-44 sm:flex-none leading-relaxed">{label}</dt>
                  <dd className="text-[13px] text-[#111827] font-medium leading-relaxed m-0 wrap-break-word">{value || '—'}</dd>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
