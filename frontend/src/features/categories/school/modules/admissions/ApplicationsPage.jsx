import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CalendarClock, CheckCircle2, ChevronDown, ChevronRight, Circle, Download, Eye,
  FileCheck, MessageSquarePlus, MoreVertical, RotateCcw, Search, ShieldCheck, Star, X, XCircle,
} from 'lucide-react';

import { useCurrentUser } from '../../../../../hooks/useCurrentUser.js';
import {
  deleteModuleRecord, listModuleRecords, openModuleRecordFile, updateModuleRecord,
} from '../../../../../services/moduleRecordsService.js';
import { downloadExcel } from '../../../../../utils/exportData.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';

const MODULE_KEY = 'school/admissions/new-admission';

const CLASS_OPTIONS = ['Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const STATUS_FLOW = ['Draft', 'Submitted', 'Under Review', 'Shortlisted', 'Approved', 'Rejected'];

const STATUS_STYLE = {
  Draft: 'bg-slate-100 text-slate-600',
  Submitted: 'bg-blue-50 text-blue-700',
  'Under Review': 'bg-amber-50 text-amber-700',
  Shortlisted: 'bg-violet-50 text-violet-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-700',
};

const DOCUMENT_TYPES = [
  { key: 'studentPhoto', label: 'Student Photo' },
  { key: 'birthCertificate', label: 'Birth Certificate' },
  { key: 'aadharCard', label: 'Aadhar Card' },
  { key: 'previousTc', label: 'Previous TC' },
  { key: 'marksheet', label: 'Marksheet' },
  { key: 'others', label: 'Others' },
];

const DETAIL_SECTIONS = [
  {
    key: 'parent', title: 'Parent / Guardian Details', fields: [
      ['guardianName', "Father's / Guardian's Name"], ['motherName', "Mother's Name"], ['occupation', 'Occupation'],
      ['email', 'Email'], ['mobileNumber', 'Mobile Number'], ['alternateNumber', 'Alternate Number'],
    ],
  },
  {
    key: 'contact', title: 'Contact & Address', fields: [
      ['addressLine1', 'Address Line 1'], ['addressLine2', 'Address Line 2'], ['city', 'City'],
      ['state', 'State'], ['pinCode', 'PIN Code'],
    ],
  },
  {
    key: 'previousSchool', title: 'Previous School Details', fields: [
      ['previousSchoolName', 'Previous School Name'], ['board', 'Board'], ['lastClassAttended', 'Last Class Attended'],
      ['mediumOfInstruction', 'Medium of Instruction'], ['previousAcademicYear', 'Previous Academic Year'], ['tcNumber', 'TC Number'],
    ],
  },
  {
    key: 'previousAcademic', title: 'Previous Academic Information', fields: [
      ['lastExamPassed', 'Last Exam Passed'], ['percentageCgpa', 'Percentage / CGPA'], ['grade', 'Grade'], ['subjectsStudied', 'Subjects Studied'],
    ],
  },
];

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
  return <span className={`inline-block px-2.5 py-1 rounded-md text-[12px] font-semibold ${STATUS_STYLE[status] || 'bg-slate-100 text-slate-600'}`}>{status || 'Draft'}</span>;
}

export function ApplicationsPage() {
  const currentUser = useCurrentUser();
  const location = useLocation();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState(location.state?.selectId ?? null);
  const [activeTab, setActiveTab] = useState(location.state?.tab ?? 'details');
  const [expanded, setExpanded] = useState({});
  const [remarkText, setRemarkText] = useState('');
  const [busy, setBusy] = useState(false);
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

  const classOptions = useMemo(() => CLASS_OPTIONS.filter((c) => records.some((r) => r.data?.classApplyingFor === c)), [records]);
  const yearOptions = useMemo(() => [...new Set(records.map((r) => r.data?.academicYear).filter(Boolean))].sort(), [records]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((r) => {
      const d = r.data || {};
      if (term) {
        const haystack = `${d.fullName || ''} ${d.applicationNumber || ''} ${d.mobileNumber || ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (classFilter && d.classApplyingFor !== classFilter) return false;
      if (yearFilter && d.academicYear !== yearFilter) return false;
      if (statusFilter && (d.status || 'Draft') !== statusFilter) return false;
      return true;
    });
  }, [records, search, classFilter, yearFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selected = records.find((r) => r._id === selectedId) || null;

  function resetFilters() {
    setSearch('');
    setClassFilter('');
    setYearFilter('');
    setStatusFilter('');
    setPage(1);
  }

  function selectRecord(id) {
    setSelectedId(id);
    setActiveTab('details');
  }

  function exportApplications() {
    downloadExcel({
      title: 'Applications',
      filename: 'applications',
      rows: filtered.map((r) => ({
        applicationNumber: r.data?.applicationNumber || '',
        fullName: r.data?.fullName || '',
        mobileNumber: r.data?.mobileNumber || '',
        classApplyingFor: r.data?.classApplyingFor || '',
        academicYear: r.data?.academicYear || '',
        status: r.data?.status || 'Draft',
        applicationDate: formatDate(r.data?.applicationDate),
      })),
      columns: [
        { key: 'applicationNumber', label: 'Application No.' },
        { key: 'fullName', label: 'Student Name' },
        { key: 'mobileNumber', label: 'Mobile' },
        { key: 'classApplyingFor', label: 'Class' },
        { key: 'academicYear', label: 'Academic Year' },
        { key: 'status', label: 'Status' },
        { key: 'applicationDate', label: 'Applied On' },
      ],
    });
  }

  async function applyAction(nextStatus, note) {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const entry = { status: nextStatus || selected.data?.status || 'Draft', note, at: new Date().toISOString(), by: currentUser?.name || 'Admin' };
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

  async function removeRecord(record) {
    if (!window.confirm(`Delete application ${record.data?.applicationNumber || ''}?`)) return;
    await deleteModuleRecord(record._id);
    setRecords((current) => current.filter((r) => r._id !== record._id));
    if (selectedId === record._id) setSelectedId(null);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-4">
        <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
          <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
          <span>›</span><span>Admissions</span><span>›</span><span>Applications</span>
        </nav>
        <h1 className="m-0 text-[22px] font-bold text-[#111827]">Applications</h1>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] font-semibold text-[#536173] mr-1">Application Status Flow:</span>
          {STATUS_FLOW.map((status, i) => (
            <span key={status} className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-md text-[12px] font-semibold ${STATUS_STYLE[status]}`}>{status}</span>
              {i < STATUS_FLOW.length - 1 && <span className="text-[#94a3b8] text-[12px]">{status === 'Shortlisted' ? '→' : status === 'Draft' ? '→' : i === STATUS_FLOW.length - 2 ? '/' : '→'}</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-50">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, application no., mobile..."
            className="w-full border border-[#dbe4ef] rounded-md pl-9 pr-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]"
          />
        </div>
        <div className="w-40"><SelectDropdown value={classFilter} onChange={(v) => { setClassFilter(v); setPage(1); }} options={classOptions} placeholder="All Classes" /></div>
        <div className="w-40"><SelectDropdown value={yearFilter} onChange={(v) => { setYearFilter(v); setPage(1); }} options={yearOptions} placeholder="Academic Year" /></div>
        <div className="w-40"><SelectDropdown value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={STATUS_FLOW} placeholder="All Status" /></div>
        <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50">
          <RotateCcw size={13} /> Reset
        </button>
        <button type="button" onClick={exportApplications} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0">
          <Download size={14} /> Export
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
        <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#edf2f7] text-[13px] font-semibold text-[#111827]">Applications ({filtered.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-10 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7]"><input type="checkbox" disabled /></th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Application No.</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Student Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Class</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Academic Year</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Applied On</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-[13px] text-[#536173] px-4 py-8 text-center">Loading…</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={8} className="text-[13px] text-[#536173] px-4 py-8 text-center">No applications yet. Create one from New Admission.</td></tr>
                ) : (
                  paginated.map((record) => {
                    const d = record.data || {};
                    return (
                      <tr key={record._id} className={`hover:bg-gray-50 cursor-pointer ${selectedId === record._id ? 'bg-blue-50/50' : ''}`} onClick={() => selectRecord(record._id)}>
                        <td className="px-4 py-3 border-b border-[#f3f4f6]" onClick={(e) => e.stopPropagation()}><input type="checkbox" /></td>
                        <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px]"><span className="text-blue-600 font-semibold">{d.applicationNumber || '—'}</span></td>
                        <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px]">
                          <div className="font-medium text-[#111827]">{d.fullName || '—'}</div>
                          <div className="text-[11.5px] text-[#94a3b8]">{d.mobileNumber || ''}</div>
                        </td>
                        <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{d.classApplyingFor || '—'}</td>
                        <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{d.academicYear || '—'}</td>
                        <td className="px-4 py-3 border-b border-[#f3f4f6]"><StatusBadge status={d.status} /></td>
                        <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{formatDate(d.applicationDate)}</td>
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

          {!loading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-[#edf2f7] flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#536173]">
              <span>Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
                    .reduce((acc, n) => {
                      if (acc.length && n - acc[acc.length - 1] > 1) acc.push('…');
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, i) => n === '…' ? (
                      <span key={`e${i}`} className="px-1.5 text-[#94a3b8]">…</span>
                    ) : (
                      <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 text-[12px] rounded border cursor-pointer font-[inherit] ${n === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-[#dbe4ef] hover:bg-gray-50'}`}>{n}</button>
                    ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">›</button>
                </div>
                <div className="w-24">
                  <SelectDropdown value={pageSize} onChange={(v) => { setPageSize(Number(v)); setPage(1); }} options={[{ value: 10, label: '10 / page' }, { value: 25, label: '25 / page' }, { value: 50, label: '50 / page' }]} />
                </div>
              </div>
            </div>
          )}
        </div>

        {selected && (
          <DetailPanel
            record={selected}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            expanded={expanded}
            setExpanded={setExpanded}
            onClose={() => setSelectedId(null)}
            onAction={applyAction}
            busy={busy}
            remarkText={remarkText}
            setRemarkText={setRemarkText}
            remarkInputRef={remarkInputRef}
            onAddRemark={addRemark}
          />
        )}
      </div>
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

function AccordionSection({ title, expanded, onToggle, children }) {
  return (
    <div className="border border-[#e2e8f0] rounded-lg overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2.5 bg-[#f8fafc] hover:bg-[#f1f5f9] border-0 cursor-pointer text-left">
        <span className="text-[12.5px] font-semibold text-[#111827]">{title}</span>
        {expanded ? <ChevronDown size={14} className="text-[#64748b]" /> : <ChevronRight size={14} className="text-[#64748b]" />}
      </button>
      {expanded && <div className="p-3 grid grid-cols-2 gap-3">{children}</div>}
    </div>
  );
}

function DetailPanel({ record, activeTab, setActiveTab, expanded, setExpanded, onClose, onAction, busy, remarkText, setRemarkText, remarkInputRef, onAddRemark }) {
  const d = record.data || {};
  const history = d.history || [];
  const remarks = d.remarks || [];
  const tabs = [
    ['details', 'Details'], ['documents', 'Documents'], ['history', 'History'], ['remarks', 'Remarks'],
  ];

  return (
    <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 xl:sticky xl:top-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-[13px] flex items-center justify-center flex-none">{initials(d.fullName)}</span>
          <div>
            <div className="text-[14px] font-bold text-[#111827] flex items-center gap-2">{d.fullName || 'Unnamed applicant'} <StatusBadge status={d.status} /></div>
            <div className="text-[11.5px] text-[#94a3b8]">{d.applicationNumber} · Applied on {formatDate(d.applicationDate)}</div>
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
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[12.5px] font-semibold text-[#111827] mb-2">Basic Information</div>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Class Applying For" value={d.classApplyingFor} />
              <InfoRow label="Academic Year" value={d.academicYear} />
              <InfoRow label="Date of Birth" value={formatDate(d.dob)} />
              <InfoRow label="Gender" value={d.gender} />
            </div>
          </div>
          {DETAIL_SECTIONS.map((section) => (
            <AccordionSection key={section.key} title={section.title} expanded={!!expanded[section.key]} onToggle={() => setExpanded((c) => ({ ...c, [section.key]: !c[section.key] }))}>
              {section.fields.map(([key, label]) => <InfoRow key={key} label={label} value={d[key]} />)}
            </AccordionSection>
          ))}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="flex flex-col gap-2">
          {DOCUMENT_TYPES.map(({ key, label }) => {
            const file = d.documents?.[key];
            return (
              <div key={key} className="flex items-center justify-between px-3 py-2.5 border border-[#e2e8f0] rounded-lg">
                <div className="flex items-center gap-2">
                  <FileCheck size={14} className={file?.id ? 'text-emerald-600' : 'text-[#cbd5e1]'} />
                  <span className="text-[12.5px] text-[#111827]">{label}</span>
                </div>
                {file?.id ? (
                  <button type="button" onClick={() => openModuleRecordFile(file.id)} className="text-[12px] font-semibold text-blue-600 bg-transparent border-0 cursor-pointer">View</button>
                ) : (
                  <span className="text-[11.5px] text-[#94a3b8]">Not uploaded</span>
                )}
              </div>
            );
          })}
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
          <button type="button" disabled={busy} onClick={() => onAction('Under Review', 'Documents verified')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-blue-700 bg-blue-50 rounded-md cursor-pointer hover:bg-blue-100 border-0 disabled:opacity-60"><ShieldCheck size={13} /> Verify Documents</button>
          <button type="button" disabled={busy} onClick={() => onAction('Shortlisted', 'Shortlisted for admission')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-violet-700 bg-violet-50 rounded-md cursor-pointer hover:bg-violet-100 border-0 disabled:opacity-60"><Star size={13} /> Shortlist</button>
          <button type="button" disabled={busy} onClick={() => onAction('Approved', 'Application approved')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-emerald-700 bg-emerald-50 rounded-md cursor-pointer hover:bg-emerald-100 border-0 disabled:opacity-60"><CheckCircle2 size={13} /> Approve</button>
          <button type="button" disabled={busy} onClick={() => onAction('Rejected', 'Application rejected')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-red-700 bg-red-50 rounded-md cursor-pointer hover:bg-red-100 border-0 disabled:opacity-60"><XCircle size={13} /> Reject</button>
          <button type="button" disabled={busy} onClick={() => onAction(null, 'Interview/Test scheduled')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-amber-700 bg-amber-50 rounded-md cursor-pointer hover:bg-amber-100 border-0 disabled:opacity-60"><CalendarClock size={13} /> Schedule Interview/Test</button>
          <button type="button" disabled={busy} onClick={() => { setActiveTab('remarks'); remarkInputRef.current?.focus(); }} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-[#374151] bg-[#f1f5f9] rounded-md cursor-pointer hover:bg-[#e2e8f0] border-0 disabled:opacity-60"><MessageSquarePlus size={13} /> Add Remarks</button>
        </div>
      </div>
    </div>
  );
}
