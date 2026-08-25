import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightCircle, Calendar, CalendarPlus, Circle, Download, Eye,
  MessageSquarePlus, MoreVertical, Phone, PhoneCall, Plus, RefreshCw,
  StickyNote, User, X, XCircle,
} from 'lucide-react';

import { useCurrentUser } from '../../../../../hooks/useCurrentUser.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, deleteModuleRecord, listModuleRecords, updateModuleRecord } from '../../../../../services/moduleRecordsService.js';
import { downloadExcel } from '../../../../../utils/exportData.js';

const MODULE_KEY = 'school/admissions/enquiries';

const LABEL = 'block text-[12.5px] font-medium text-[#374151] mb-1';
const INPUT = 'w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white';

const CLASS_OPTIONS = ['Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const RELATIONSHIP_OPTIONS = ['Father', 'Mother', 'Guardian', 'Self', 'Other'];
const SOURCE_OPTIONS = ['Walk-in', 'Phone Call', 'Website', 'Referral', 'Social Media', 'Other'];
const STATUS_FLOW = ['New', 'Contacted', 'Follow-up Scheduled', 'Converted', 'Closed'];

const STATUS_STYLE = {
  New: 'bg-blue-50 text-blue-700',
  Contacted: 'bg-amber-50 text-amber-700',
  'Follow-up Scheduled': 'bg-violet-50 text-violet-700',
  Converted: 'bg-emerald-50 text-emerald-700',
  Closed: 'bg-slate-100 text-slate-600',
};

function academicYearOptions() {
  const year = new Date().getFullYear();
  return [year - 1, year, year + 1].map((y) => `${y}-${y + 1}`);
}

function generateEnquiryNumber() {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(100000 + Math.random() * 900000));
  return `ENQ${year}-${seq}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function initialForm() {
  return {
    studentName: '', enquirerName: '', relationship: '', phone: '', email: '',
    classInterested: '', academicYear: academicYearOptions()[1], source: '', notes: '', followUpDate: '',
  };
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }) {
  return <span className={`inline-block px-2.5 py-1 rounded-md text-[12px] font-semibold ${STATUS_STYLE[status] || 'bg-slate-100 text-slate-600'}`}>{status || 'New'}</span>;
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className={LABEL}>{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
    </div>
  );
}

export function EnquiriesPage() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [remarkText, setRemarkText] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const remarkInputRef = useRef(null);

  function load() {
    setLoading(true);
    return listModuleRecords(MODULE_KEY)
      .then((res) => {
        const list = res.records ?? [];
        setRecords(list);
        setSelectedId((current) => current ?? list[0]?._id ?? null);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((r) => {
      const d = r.data || {};
      if (term) {
        const haystack = `${d.enquirerName || ''} ${d.studentName || ''} ${d.phone || ''} ${d.enquiryNumber || ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (statusFilter && (d.status || 'New') !== statusFilter) return false;
      if (sourceFilter && d.source !== sourceFilter) return false;
      return true;
    });
  }, [records, search, statusFilter, sourceFilter]);

  const selected = records.find((r) => r._id === selectedId) || null;

  function resetFilters() {
    setSearch('');
    setStatusFilter('');
    setSourceFilter('');
  }

  function selectRecord(id) {
    setSelectedId(id);
  }

  function exportEnquiries() {
    downloadExcel({
      title: 'Admission Enquiries',
      filename: 'admission-enquiries',
      rows: filtered.map((r) => ({
        enquiryNumber: r.data?.enquiryNumber || '',
        enquirerName: r.data?.enquirerName || '',
        studentName: r.data?.studentName || '',
        phone: r.data?.phone || '',
        classInterested: r.data?.classInterested || '',
        source: r.data?.source || '',
        status: r.data?.status || 'New',
        enquiryDate: formatDate(r.data?.enquiryDate),
      })),
      columns: [
        { key: 'enquiryNumber', label: 'Enquiry No.' },
        { key: 'enquirerName', label: 'Enquirer Name' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'classInterested', label: 'Class Interested' },
        { key: 'source', label: 'Source' },
        { key: 'status', label: 'Status' },
        { key: 'enquiryDate', label: 'Enquiry Date' },
      ],
    });
  }

  async function applyAction(nextStatus, note) {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const entry = { status: nextStatus || selected.data?.status || 'New', note, at: new Date().toISOString(), by: currentUser?.name || 'Admin' };
      const nextData = {
        ...selected.data,
        status: nextStatus || selected.data?.status,
        history: [...(selected.data?.history || []), entry],
      };
      const updated = await updateModuleRecord(selected._id, nextData);
      setRecords((current) => current.map((r) => (r._id === selected._id ? updated : r)));
    } finally {
      setBusy(false);
    }
  }

  async function addRemark() {
    if (!selected || !remarkText.trim() || busy) return;
    setBusy(true);
    try {
      const entry = { text: remarkText.trim(), at: new Date().toISOString(), by: currentUser?.name || 'Admin' };
      const nextData = { ...selected.data, remarks: [...(selected.data?.remarks || []), entry] };
      const updated = await updateModuleRecord(selected._id, nextData);
      setRecords((current) => current.map((r) => (r._id === selected._id ? updated : r)));
      setRemarkText('');
    } finally {
      setBusy(false);
    }
  }

  async function convertToAdmission() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await applyAction('Converted', 'Converted to admission application');
    } finally {
      setBusy(false);
    }
    const d = selected.data || {};
    navigate('/school/admissions/new-admission', {
      state: {
        prefill: {
          fullName: d.studentName || d.enquirerName || '',
          mobileNumber: d.phone || '',
          email: d.email || '',
          classApplyingFor: d.classInterested || '',
          academicYear: d.academicYear || '',
          guardianName: d.relationship && d.relationship !== 'Self' ? d.enquirerName : '',
        },
      },
    });
  }

  async function removeRecord(record) {
    if (!window.confirm(`Delete enquiry from ${record.data?.enquirerName || 'this contact'}?`)) return;
    await deleteModuleRecord(record._id);
    setRecords((current) => current.filter((r) => r._id !== record._id));
    if (selectedId === record._id) setSelectedId(null);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>Admissions</span><span>›</span><span>Admission Enquiries</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Admission Enquiries</h1>
        </div>
        <button type="button" onClick={() => setShowAddForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-bold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0">
          <Plus size={15} /> Add Enquiry
        </button>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-50">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, enquiry no..."
            className="w-full border border-[#dbe4ef] rounded-md pl-3 pr-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]"
          />
        </div>
        <div className="w-44"><SelectDropdown value={sourceFilter} onChange={setSourceFilter} options={SOURCE_OPTIONS} placeholder="All Sources" /></div>
        <div className="w-44"><SelectDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_FLOW} placeholder="All Status" /></div>
        <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50">Reset</button>
        <button type="button" onClick={exportEnquiries} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50">
          <Download size={14} /> Export
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
        <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#edf2f7] text-[13px] font-semibold text-[#111827]">Enquiries ({filtered.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Enquiry No.</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Enquirer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Class Interested</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Source</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Enquiry Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-[13px] text-[#536173] px-4 py-8 text-center">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-[13px] text-[#536173] px-4 py-8 text-center">No enquiries yet. Click "Add Enquiry" to log one.</td></tr>
                ) : (
                  filtered.map((record) => {
                    const d = record.data || {};
                    return (
                      <tr key={record._id} className={`hover:bg-gray-50 cursor-pointer ${selectedId === record._id ? 'bg-blue-50/50' : ''}`} onClick={() => selectRecord(record._id)}>
                        <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px]"><span className="text-blue-600 font-semibold">{d.enquiryNumber || '—'}</span></td>
                        <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px]">
                          <div className="font-medium text-[#111827]">{d.enquirerName || '—'}</div>
                          <div className="text-[11.5px] text-[#94a3b8]">{d.phone || ''}</div>
                        </td>
                        <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{d.classInterested || '—'}</td>
                        <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{d.source || '—'}</td>
                        <td className="px-4 py-3 border-b border-[#f3f4f6]"><StatusBadge status={d.status} /></td>
                        <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{formatDate(d.enquiryDate)}</td>
                        <td className="px-4 py-3 border-b border-[#f3f4f6]" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button type="button" title="View" onClick={() => selectRecord(record._id)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-blue-50 text-blue-500 bg-transparent border-0 cursor-pointer"><Eye size={14} /></button>
                            <DropdownMenu onDelete={() => removeRecord(record)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <DetailPanel
            record={selected}
            onClose={() => setSelectedId(null)}
            onAction={applyAction}
            onConvert={convertToAdmission}
            busy={busy}
            remarkText={remarkText}
            setRemarkText={setRemarkText}
            remarkInputRef={remarkInputRef}
            onAddRemark={addRemark}
          />
        )}
      </div>

      {showAddForm && (
        <AddEnquiryModal
          onClose={() => setShowAddForm(false)}
          onCreated={(record) => {
            setRecords((current) => [record, ...current]);
            setSelectedId(record._id);
            setShowAddForm(false);
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

function DropdownMenu({ onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[#536173] bg-transparent border-0 cursor-pointer"><MoreVertical size={14} /></button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1 z-50 w-32">
          <button type="button" onClick={() => { setOpen(false); onDelete(); }} className="w-full text-left px-3 py-2 text-[12.5px] text-red-600 hover:bg-red-50 bg-transparent border-0 cursor-pointer">Delete</button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-[#94a3b8]">{label}</div>
      <div className="text-[13px] font-medium text-[#111827]">{value || '—'}</div>
    </div>
  );
}

function DetailPanel({ record, onClose, onAction, onConvert, busy, remarkText, setRemarkText, remarkInputRef, onAddRemark }) {
  const [activeTab, setActiveTab] = useState('details');
  const d = record.data || {};
  const history = d.history || [];
  const remarks = d.remarks || [];
  const converted = d.status === 'Converted';
  const tabs = [['details', 'Details'], ['history', 'History'], ['remarks', 'Remarks']];

  return (
    <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 xl:sticky xl:top-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-[13px] flex items-center justify-center flex-none">{initials(d.enquirerName)}</span>
          <div>
            <div className="text-[14px] font-bold text-[#111827] flex items-center gap-2">{d.enquirerName || 'Unnamed contact'} <StatusBadge status={d.status} /></div>
            <div className="text-[11.5px] text-[#94a3b8]">{d.enquiryNumber} · {formatDate(d.enquiryDate)}</div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-[#94a3b8] hover:text-[#111827] bg-transparent border-0 cursor-pointer"><X size={16} /></button>
      </div>

      <div className="flex border-b border-[#e2e8f0] mb-3">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)} className={`px-3 py-2 text-[12.5px] font-semibold border-0 border-b-2 bg-transparent cursor-pointer -mb-px ${activeTab === key ? 'text-blue-600 border-blue-600' : 'text-[#94a3b8] border-transparent'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Student Name" value={d.studentName} />
          <InfoRow label="Relationship" value={d.relationship} />
          <InfoRow label="Phone" value={d.phone} />
          <InfoRow label="Email" value={d.email} />
          <InfoRow label="Class Interested" value={d.classInterested} />
          <InfoRow label="Academic Year" value={d.academicYear} />
          <InfoRow label="Source" value={d.source} />
          <InfoRow label="Follow-up Date" value={formatDate(d.followUpDate)} />
          <div className="col-span-2"><InfoRow label="Notes" value={d.notes} /></div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="flex flex-col gap-3">
          {history.length === 0 ? (
            <p className="text-[12.5px] text-[#94a3b8]">No history yet.</p>
          ) : (
            [...history].reverse().map((entry, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="flex flex-col items-center pt-0.5">
                  <Circle size={9} className={i === 0 ? 'text-blue-600 fill-blue-600' : 'text-[#cbd5e1] fill-[#cbd5e1]'} />
                  {i < history.length - 1 && <div className="w-px flex-1 bg-[#e2e8f0] mt-1" />}
                </div>
                <div className="pb-3">
                  <div className="text-[11.5px] text-[#94a3b8]">{formatDateTime(entry.at)}</div>
                  <div className="text-[13px] font-medium text-[#111827]">{entry.note || entry.status}</div>
                  <div className="text-[11.5px] text-[#94a3b8]">by {entry.by || 'System'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'remarks' && (
        <div className="flex flex-col gap-3">
          {remarks.length === 0 ? (
            <p className="text-[12.5px] text-[#94a3b8]">No remarks yet.</p>
          ) : (
            remarks.map((entry, i) => (
              <div key={i} className="px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                <div className="text-[13px] text-[#111827]">{entry.text}</div>
                <div className="text-[11px] text-[#94a3b8] mt-1">{entry.by || 'Admin'} · {formatDateTime(entry.at)}</div>
              </div>
            ))
          )}
          <div className="flex flex-col gap-2">
            <textarea ref={remarkInputRef} value={remarkText} onChange={(e) => setRemarkText(e.target.value)} rows={2} placeholder="Add a remark..." className="w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] resize-none" />
            <button type="button" disabled={busy || !remarkText.trim()} onClick={onAddRemark} className="self-end px-3 py-1.5 text-[12.5px] font-semibold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 disabled:opacity-60">Add Remark</button>
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[#e2e8f0]">
        <div className="text-[12.5px] font-semibold text-[#111827] mb-2">Actions</div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => onAction('Contacted', 'Contacted enquirer')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-amber-700 bg-amber-50 rounded-md cursor-pointer hover:bg-amber-100 border-0 disabled:opacity-60"><PhoneCall size={13} /> Mark Contacted</button>
          <button type="button" disabled={busy} onClick={() => onAction('Follow-up Scheduled', 'Follow-up scheduled')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-violet-700 bg-violet-50 rounded-md cursor-pointer hover:bg-violet-100 border-0 disabled:opacity-60"><CalendarPlus size={13} /> Schedule Follow-up</button>
          <button type="button" disabled={busy || converted} onClick={onConvert} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-emerald-700 bg-emerald-50 rounded-md cursor-pointer hover:bg-emerald-100 border-0 disabled:opacity-60"><ArrowRightCircle size={13} /> Convert to Admission</button>
          <button type="button" disabled={busy} onClick={() => onAction('Closed', 'Marked as closed/lost')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-red-700 bg-red-50 rounded-md cursor-pointer hover:bg-red-100 border-0 disabled:opacity-60"><XCircle size={13} /> Close / Lost</button>
          <button type="button" disabled={busy} onClick={() => { setActiveTab('remarks'); remarkInputRef.current?.focus(); }} className="col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-[#374151] bg-[#f1f5f9] rounded-md cursor-pointer hover:bg-[#e2e8f0] border-0 disabled:opacity-60"><MessageSquarePlus size={13} /> Add Remarks</button>
        </div>
      </div>
    </div>
  );
}

function AddEnquiryModal({ onClose, onCreated, currentUser }) {
  const [form, setForm] = useState(initialForm);
  const [enquiryNumber, setEnquiryNumber] = useState(generateEnquiryNumber);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key) {
    return (value) => setForm((current) => ({ ...current, [key]: value }));
  }
  function setInput(key) {
    return (e) => set(key)(e.target.value);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.enquirerName.trim() || !form.phone.trim() || !form.classInterested) {
      setError('Enquirer Name, Phone, and Class Interested are required.');
      return;
    }
    setSaving(true);
    try {
      const record = await createModuleRecord(MODULE_KEY, {
        ...form,
        enquiryNumber,
        enquiryDate: todayISO(),
        status: 'New',
        history: [{ status: 'New', note: 'Enquiry logged', at: new Date().toISOString(), by: currentUser?.name || 'Admin' }],
        remarks: [],
      });
      onCreated(record);
    } catch (err) {
      setError(err.message || 'Unable to save enquiry');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-160 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#edf2f7]">
          <h3 className="m-0 text-[15px] font-semibold text-[#111827]">Add Admission Enquiry</h3>
          <button type="button" onClick={onClose} className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-lg leading-none font-[inherit]">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {error && <div className="rounded-lg px-3 py-2 bg-red-50 border border-red-100 text-red-700 text-[12.5px]">{error}</div>}

          <section className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-none"><User size={14} /></span>
              <h4 className="m-0 text-[13.5px] font-bold text-[#111827]">Enquirer & Student</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Enquirer Name" required><input className={INPUT} value={form.enquirerName} onChange={setInput('enquirerName')} placeholder="Enter enquirer name" /></Field>
              <Field label="Relationship to Student"><SelectDropdown value={form.relationship} onChange={set('relationship')} options={RELATIONSHIP_OPTIONS} placeholder="Select Relationship" /></Field>
              <Field label="Student Name (if known)"><input className={INPUT} value={form.studentName} onChange={setInput('studentName')} placeholder="Enter student name" /></Field>
              <Field label="Class Interested" required><SelectDropdown value={form.classInterested} onChange={set('classInterested')} options={CLASS_OPTIONS} placeholder="Select Class" /></Field>
              <Field label="Academic Year"><SelectDropdown value={form.academicYear} onChange={set('academicYear')} options={academicYearOptions()} placeholder="Select Year" /></Field>
              <Field label="Source"><SelectDropdown value={form.source} onChange={set('source')} options={SOURCE_OPTIONS} placeholder="Select Source" /></Field>
            </div>
          </section>

          <section className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-none"><Phone size={14} /></span>
              <h4 className="m-0 text-[13.5px] font-bold text-[#111827]">Contact Details</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Phone" required><input className={INPUT} value={form.phone} onChange={setInput('phone')} placeholder="Enter phone number" /></Field>
              <Field label="Email"><input type="email" className={INPUT} value={form.email} onChange={setInput('email')} placeholder="Enter email" /></Field>
            </div>
          </section>

          <section className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-none"><StickyNote size={14} /></span>
              <h4 className="m-0 text-[13.5px] font-bold text-[#111827]">Notes & Follow-up</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Follow-up Date">
                <div className="relative">
                  <input type="date" className={`${INPUT} pr-8`} value={form.followUpDate} onChange={setInput('followUpDate')} />
                  <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                </div>
              </Field>
              <Field label="Enquiry Number">
                <div className="flex gap-2">
                  <input className={`${INPUT} min-w-0`} value={enquiryNumber} readOnly />
                  <button type="button" onClick={() => setEnquiryNumber(generateEnquiryNumber())} className="inline-flex items-center gap-1 px-3 rounded-md bg-blue-600 text-white border-0 cursor-pointer text-[12px] font-medium flex-none">
                    <RefreshCw size={13} /> Generate
                  </button>
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes"><textarea rows={3} className={`${INPUT} resize-none`} value={form.notes} onChange={setInput('notes')} placeholder="Enter enquiry notes / requirements" /></Field>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 disabled:opacity-60">{saving ? 'Saving…' : 'Save Enquiry'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
