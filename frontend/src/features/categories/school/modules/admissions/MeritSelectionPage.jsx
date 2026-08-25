import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck,
  Download, Eye, FileText, ListChecks, MessageCircle, MessageSquarePlus, Pencil, RotateCcw,
  Star, Users, X, XCircle,
} from 'lucide-react';

import { useCurrentUser } from '../../../../../hooks/useCurrentUser.js';
import { createModuleRecord, listModuleRecords, updateModuleRecord } from '../../../../../services/moduleRecordsService.js';
import { downloadExcel } from '../../../../../utils/exportData.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';

const APPLICATIONS_KEY = 'school/admissions/new-admission';
const CRITERIA_KEY = 'school/admissions/selection-criteria';

const CLASS_OPTIONS = ['Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const STATUS_OPTIONS = ['Under Review', 'Shortlisted', 'Approved', 'Rejected'];
const STATUS_STYLE = {
  Draft: 'bg-slate-100 text-slate-600',
  Submitted: 'bg-blue-50 text-blue-700',
  'Under Review': 'bg-amber-50 text-amber-700',
  Shortlisted: 'bg-violet-50 text-violet-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-700',
};

const FLOW_STAGES = [
  { key: 'entranceTest', label: 'Entrance Test', sub: 'Test & Marks', icon: ClipboardCheck },
  { key: 'interview', label: 'Interview', sub: 'Interview & Marks', icon: Users },
  { key: 'evaluation', label: 'Evaluation', sub: 'Total Score', icon: BarChart3 },
  { key: 'shortlisting', label: 'Shortlisting', sub: 'Select Candidates', icon: Star },
  { key: 'approval', label: 'Approval', sub: 'Approve / Reject', icon: CheckCircle2 },
  { key: 'final', label: 'Selection List', sub: 'Final List', icon: ListChecks },
];

const TABS = [
  { key: 'entranceTest', label: 'Entrance Test' },
  { key: 'interview', label: 'Interview' },
  { key: 'evaluation', label: 'Evaluation & Shortlisting' },
  { key: 'final', label: 'Final Selection' },
];

const DEFAULT_CRITERIA = { entranceTestMax: 50, interviewMax: 30 };

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

function scoreOf(d, criteria) {
  const test = d.testMarks !== undefined && d.testMarks !== '' && d.testMarks !== null ? Number(d.testMarks) : null;
  const interview = d.interviewMarks !== undefined && d.interviewMarks !== '' && d.interviewMarks !== null ? Number(d.interviewMarks) : null;
  const maxTotal = (criteria.entranceTestMax || 0) + (criteria.interviewMax || 0);
  const total = (test ?? 0) + (interview ?? 0);
  const percentage = maxTotal ? (total / maxTotal) * 100 : 0;
  return { test, interview, total, maxTotal, percentage };
}

function remarkCount(d) {
  return (d.testEvaluatorRemarks?.length || 0) + (d.interviewEvaluatorRemarks?.length || 0) + (d.selectionRemarks?.length || 0);
}

function StatusBadge({ status }) {
  return <span className={`inline-block px-2.5 py-1 rounded-md text-[12px] font-semibold ${STATUS_STYLE[status] || 'bg-slate-100 text-slate-600'}`}>{status || 'Draft'}</span>;
}

export function MeritSelectionPage() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [criteriaId, setCriteriaId] = useState(null);
  const [activeTab, setActiveTab] = useState('evaluation');
  const [classFilter, setClassFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);

  function load() {
    setLoading(true);
    return Promise.all([
      listModuleRecords(APPLICATIONS_KEY).then((res) => res.records ?? []).catch(() => []),
      listModuleRecords(CRITERIA_KEY).then((res) => res.records ?? []).catch(() => []),
    ]).then(([apps, criteriaRecords]) => {
      const withMarks = apps.filter((r) => r.data?.status && r.data.status !== 'Draft');
      setRecords(withMarks);
      setSelectedId((current) => current ?? withMarks[0]?._id ?? null);
      if (criteriaRecords[0]) {
        setCriteria({ ...DEFAULT_CRITERIA, ...criteriaRecords[0].data });
        setCriteriaId(criteriaRecords[0]._id);
      }
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    setPage(1);
  }, [activeTab, classFilter, yearFilter, statusFilter]);

  const classOptions = useMemo(() => CLASS_OPTIONS.filter((c) => records.some((r) => r.data?.classApplyingFor === c)), [records]);
  const yearOptions = useMemo(() => [...new Set(records.map((r) => r.data?.academicYear).filter(Boolean))].sort(), [records]);

  const baseFiltered = useMemo(() => records.filter((r) => {
    const d = r.data || {};
    if (classFilter && d.classApplyingFor !== classFilter) return false;
    if (yearFilter && d.academicYear !== yearFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    return true;
  }), [records, classFilter, yearFilter, statusFilter]);

  const tabFiltered = useMemo(() => {
    if (activeTab === 'final') return baseFiltered.filter((r) => r.data?.status === 'Approved');
    return baseFiltered;
  }, [baseFiltered, activeTab]);

  const totalPages = Math.max(1, Math.ceil(tabFiltered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = tabFiltered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selected = records.find((r) => r._id === selectedId) || null;

  const stats = useMemo(() => {
    const total = baseFiltered.length;
    const testCompleted = baseFiltered.filter((r) => r.data?.testMarks !== undefined && r.data?.testMarks !== '' && r.data?.testMarks !== null).length;
    const interviewCompleted = baseFiltered.filter((r) => r.data?.interviewMarks !== undefined && r.data?.interviewMarks !== '' && r.data?.interviewMarks !== null).length;
    const shortlisted = baseFiltered.filter((r) => r.data?.status === 'Shortlisted').length;
    const approved = baseFiltered.filter((r) => r.data?.status === 'Approved').length;
    const rejected = baseFiltered.filter((r) => r.data?.status === 'Rejected').length;
    const pct = (n) => (total ? `${((n / total) * 100).toFixed(2)}%` : '0.00%');
    return { total, testCompleted, interviewCompleted, shortlisted, approved, rejected, pct };
  }, [baseFiltered]);

  function resetFilters() {
    setClassFilter('');
    setYearFilter('');
    setStatusFilter('');
  }

  async function applyAction(nextStatus, note) {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const entry = { status: nextStatus || selected.data?.status, note, at: new Date().toISOString(), by: currentUser?.name || 'Admin' };
      const nextData = { ...selected.data, status: nextStatus || selected.data?.status, history: [...(selected.data?.history || []), entry] };
      const updated = await updateModuleRecord(selected._id, nextData);
      setRecords((current) => current.map((r) => (r._id === selected._id ? updated : r)));
    } finally {
      setBusy(false);
    }
  }

  async function saveMarks(type, marksValue, remarkTextValue) {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const marksKey = type === 'test' ? 'testMarks' : 'interviewMarks';
      const remarksKey = type === 'test' ? 'testEvaluatorRemarks' : 'interviewEvaluatorRemarks';
      const nextData = { ...selected.data, [marksKey]: marksValue };
      if (remarkTextValue.trim()) {
        nextData[remarksKey] = [...(selected.data?.[remarksKey] || []), { text: remarkTextValue.trim(), by: currentUser?.name || 'Admin', at: new Date().toISOString() }];
      }
      const updated = await updateModuleRecord(selected._id, nextData);
      setRecords((current) => current.map((r) => (r._id === selected._id ? updated : r)));
    } finally {
      setBusy(false);
    }
  }

  async function addGeneralRemark(text) {
    if (!selected || !text.trim() || busy) return;
    setBusy(true);
    try {
      const entry = { text: text.trim(), by: currentUser?.name || 'Admin', at: new Date().toISOString() };
      const nextData = { ...selected.data, selectionRemarks: [...(selected.data?.selectionRemarks || []), entry] };
      const updated = await updateModuleRecord(selected._id, nextData);
      setRecords((current) => current.map((r) => (r._id === selected._id ? updated : r)));
    } finally {
      setBusy(false);
    }
  }

  function toggleSelectRow(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((current) => {
      const visibleIds = paginated.map((r) => r._id);
      const allSelected = visibleIds.every((id) => current.has(id));
      const next = new Set(current);
      visibleIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function bulkAction(nextStatus, note) {
    if (!selectedIds.size || bulkBusy) return;
    setBulkBusy(true);
    try {
      const ids = [...selectedIds];
      const updates = await Promise.all(ids.map((id) => {
        const rec = records.find((r) => r._id === id);
        if (!rec) return null;
        const entry = { status: nextStatus, note, at: new Date().toISOString(), by: currentUser?.name || 'Admin' };
        return updateModuleRecord(id, { ...rec.data, status: nextStatus, history: [...(rec.data?.history || []), entry] });
      }));
      setRecords((current) => current.map((r) => updates.find((u) => u && u._id === r._id) || r));
      setSelectedIds(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  function exportSelectionList() {
    downloadExcel({
      title: 'Merit / Selection List',
      filename: 'merit-selection-list',
      rows: tabFiltered.map((r) => {
        const d = r.data || {};
        const s = scoreOf(d, criteria);
        return {
          applicationNumber: d.applicationNumber || '',
          fullName: d.fullName || '',
          classApplyingFor: d.classApplyingFor || '',
          testMarks: s.test ?? '',
          interviewMarks: s.interview ?? '',
          total: `${s.total}/${s.maxTotal}`,
          percentage: `${s.percentage.toFixed(2)}%`,
          status: d.status || '',
        };
      }),
      columns: [
        { key: 'applicationNumber', label: 'Application No.' },
        { key: 'fullName', label: 'Student Name' },
        { key: 'classApplyingFor', label: 'Class' },
        { key: 'testMarks', label: 'Test Marks' },
        { key: 'interviewMarks', label: 'Interview Marks' },
        { key: 'total', label: 'Total Marks' },
        { key: 'percentage', label: 'Percentage' },
        { key: 'status', label: 'Status' },
      ],
    });
  }

  async function saveCriteria(nextCriteria) {
    if (criteriaId) {
      await updateModuleRecord(criteriaId, nextCriteria);
    } else {
      const created = await createModuleRecord(CRITERIA_KEY, nextCriteria);
      setCriteriaId(created._id);
    }
    setCriteria(nextCriteria);
    setShowCriteriaModal(false);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-4">
        <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
          <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
          <span>›</span><span>Admissions</span><span>›</span><span>Merit / Selection</span>
        </nav>
        <h1 className="m-0 text-[22px] font-bold text-[#111827]">Merit / Selection</h1>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <span className="text-[12.5px] font-semibold text-[#536173] mr-2">Selection Process Flow:</span>
          {FLOW_STAGES.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <div key={stage.key} className="flex items-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                  <Icon size={15} className="text-[#2563eb]" />
                  <div className="leading-tight">
                    <div className="text-[12px] font-semibold text-[#111827]">{stage.label}</div>
                    <div className="text-[10.5px] text-[#94a3b8]">{stage.sub}</div>
                  </div>
                </div>
                {i < FLOW_STAGES.length - 1 && <span className="text-[#cbd5e1] mx-2">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        {[
          { label: 'Total Applicants', value: stats.total, sub: 'This Academic Year' },
          { label: 'Test Completed', value: stats.testCompleted, sub: stats.pct(stats.testCompleted) },
          { label: 'Interview Completed', value: stats.interviewCompleted, sub: stats.pct(stats.interviewCompleted) },
          { label: 'Shortlisted', value: stats.shortlisted, sub: stats.pct(stats.shortlisted) },
          { label: 'Approved', value: stats.approved, sub: stats.pct(stats.approved) },
          { label: 'Rejected', value: stats.rejected, sub: stats.pct(stats.rejected) },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-[#dfe7f1] rounded-xl p-3.5">
            <div className="text-[11.5px] text-[#94a3b8]">{card.label}</div>
            <div className="text-[20px] font-bold text-[#111827] mt-1">{card.value}</div>
            <div className="text-[11px] text-[#94a3b8] mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <div>
          <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
            <div className="flex overflow-x-auto border-b border-[#e2e8f0]">
              {TABS.map((tab) => (
                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`px-4 py-3 text-[13px] font-semibold whitespace-nowrap border-0 border-b-2 bg-transparent cursor-pointer -mb-px ${activeTab === tab.key ? 'text-blue-600 border-blue-600' : 'text-[#94a3b8] border-transparent'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 flex flex-wrap items-center gap-3 border-b border-[#edf2f7]">
              <div className="w-40"><SelectDropdown value={classFilter} onChange={setClassFilter} options={classOptions} placeholder="All Classes" /></div>
              <div className="w-40"><SelectDropdown value={yearFilter} onChange={setYearFilter} options={yearOptions} placeholder="Academic Year" /></div>
              {activeTab !== 'final' && (
                <div className="w-44"><SelectDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="All Status" /></div>
              )}
              <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50"><RotateCcw size={13} /> Reset</button>
            </div>

            <div className="px-4 py-3 text-[13px] font-semibold text-[#111827]">
              {TABS.find((t) => t.key === activeTab)?.label} ({tabFiltered.length})
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {activeTab === 'evaluation' && (
                      <th className="w-10 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7]">
                        <input type="checkbox" checked={paginated.length > 0 && paginated.every((r) => selectedIds.has(r._id))} onChange={toggleSelectAllVisible} />
                      </th>
                    )}
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Application No.</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Student Name</th>
                    {activeTab !== 'evaluation' && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Class</th>}
                    {(activeTab === 'entranceTest' || activeTab === 'evaluation') && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Test Marks {activeTab === 'evaluation' && `(${criteria.entranceTestMax})`}</th>}
                    {(activeTab === 'interview' || activeTab === 'evaluation') && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Interview Marks {activeTab === 'evaluation' && `(${criteria.interviewMax})`}</th>}
                    {(activeTab === 'evaluation' || activeTab === 'final') && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Total Marks</th>}
                    {activeTab === 'evaluation' && <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Remarks</th>}
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-[13px] text-[#536173] px-4 py-8 text-center">Loading…</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={8} className="text-[13px] text-[#536173] px-4 py-8 text-center">No applicants in this view yet.</td></tr>
                  ) : (
                    paginated.map((record) => {
                      const d = record.data || {};
                      const s = scoreOf(d, criteria);
                      const rc = remarkCount(d);
                      return (
                        <tr key={record._id} className={`hover:bg-gray-50 cursor-pointer ${selectedId === record._id ? 'bg-blue-50/50' : ''}`} onClick={() => setSelectedId(record._id)}>
                          {activeTab === 'evaluation' && (
                            <td className="px-4 py-3 border-b border-[#f3f4f6]" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={selectedIds.has(record._id)} onChange={() => toggleSelectRow(record._id)} />
                            </td>
                          )}
                          <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px]"><span className="text-blue-600 font-semibold">{d.applicationNumber || '—'}</span></td>
                          <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px] font-medium text-[#111827]">{d.fullName || '—'}</td>
                          {activeTab !== 'evaluation' && <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{d.classApplyingFor || '—'}</td>}
                          {(activeTab === 'entranceTest' || activeTab === 'evaluation') && <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{s.test !== null ? s.test : '—'}</td>}
                          {(activeTab === 'interview' || activeTab === 'evaluation') && <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{s.interview !== null ? s.interview : '—'}</td>}
                          {(activeTab === 'evaluation' || activeTab === 'final') && (
                            <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px]">
                              <div className="font-semibold text-[#111827]">{s.total} / {s.maxTotal}</div>
                              <div className="text-[11px] text-[#94a3b8]">{s.percentage.toFixed(2)}%</div>
                            </td>
                          )}
                          {activeTab === 'evaluation' && (
                            <td className="px-4 py-3 border-b border-[#f3f4f6] text-[13px] text-[#536173]">
                              {rc > 0 ? <span className="inline-flex items-center gap-1"><MessageCircle size={12} /> {rc}</span> : '–'}
                            </td>
                          )}
                          <td className="px-4 py-3 border-b border-[#f3f4f6]"><StatusBadge status={d.status} /></td>
                          <td className="px-4 py-3 border-b border-[#f3f4f6]" onClick={(e) => e.stopPropagation()}>
                            <button type="button" title="View" onClick={() => setSelectedId(record._id)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-blue-50 text-blue-500 bg-transparent border-0 cursor-pointer"><Eye size={14} /></button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && tabFiltered.length > 0 && (
              <div className="px-4 py-3 border-t border-[#edf2f7] flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#536173]">
                <span>Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, tabFiltered.length)} of {tabFiltered.length} entries</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-7 h-7 flex items-center justify-center text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white cursor-pointer"><ChevronLeft size={13} /></button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
                    .reduce((acc, n) => { if (acc.length && n - acc[acc.length - 1] > 1) acc.push('…'); acc.push(n); return acc; }, [])
                    .map((n, i) => n === '…' ? (
                      <span key={`e${i}`} className="px-1.5 text-[#94a3b8]">…</span>
                    ) : (
                      <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 text-[12px] rounded border cursor-pointer font-[inherit] ${n === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-[#dbe4ef] hover:bg-gray-50'}`}>{n}</button>
                    ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-7 h-7 flex items-center justify-center text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white cursor-pointer"><ChevronRight size={13} /></button>
                </div>
              </div>
            )}
          </div>

          {activeTab === 'evaluation' && (
            <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mt-4 flex flex-wrap items-center gap-2">
              <button type="button" disabled={!selectedIds.size || bulkBusy} onClick={() => bulkAction('Shortlisted', 'Bulk shortlisted')} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-violet-700 bg-violet-50 rounded-md cursor-pointer hover:bg-violet-100 border-0 disabled:opacity-50"><Star size={14} /> Shortlist Selected</button>
              <button type="button" disabled={!selectedIds.size || bulkBusy} onClick={() => bulkAction('Approved', 'Bulk approved')} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-emerald-700 bg-emerald-50 rounded-md cursor-pointer hover:bg-emerald-100 border-0 disabled:opacity-50"><CheckCircle2 size={14} /> Approve Selected</button>
              <button type="button" disabled={!selectedIds.size || bulkBusy} onClick={() => bulkAction('Rejected', 'Bulk rejected')} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-red-700 bg-red-50 rounded-md cursor-pointer hover:bg-red-100 border-0 disabled:opacity-50"><XCircle size={14} /> Reject Selected</button>
              <button type="button" onClick={exportSelectionList} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 ml-auto"><Download size={14} /> Export Selection List</button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white border border-[#dfe7f1] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="m-0 text-[14px] font-bold text-[#111827]">Selection Criteria</h2>
              <button type="button" onClick={() => setShowCriteriaModal(true)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 bg-transparent border-0 cursor-pointer"><Pencil size={12} /> Edit Criteria</button>
            </div>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-[#94a3b8]">
                  <th className="text-left font-semibold pb-2">Component</th>
                  <th className="text-right font-semibold pb-2">Max Marks</th>
                  <th className="text-right font-semibold pb-2">Weightage (%)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#f1f5f9]"><td className="py-2 text-[#111827]">Entrance Test</td><td className="py-2 text-right text-[#111827]">{criteria.entranceTestMax}</td><td className="py-2 text-right text-[#111827]">{((criteria.entranceTestMax / (criteria.entranceTestMax + criteria.interviewMax || 1)) * 100).toFixed(2)}%</td></tr>
                <tr className="border-t border-[#f1f5f9]"><td className="py-2 text-[#111827]">Interview</td><td className="py-2 text-right text-[#111827]">{criteria.interviewMax}</td><td className="py-2 text-right text-[#111827]">{((criteria.interviewMax / (criteria.entranceTestMax + criteria.interviewMax || 1)) * 100).toFixed(2)}%</td></tr>
                <tr className="border-t border-[#f1f5f9] font-semibold"><td className="py-2 text-[#111827]">Total</td><td className="py-2 text-right text-[#111827]">{criteria.entranceTestMax + criteria.interviewMax}</td><td className="py-2 text-right text-[#111827]">100%</td></tr>
              </tbody>
            </table>
          </div>

          {selected && (
            <ApplicantDetailPanel
              record={selected}
              criteria={criteria}
              onClose={() => setSelectedId(null)}
              onAction={applyAction}
              onSaveMarks={saveMarks}
              onAddRemark={addGeneralRemark}
              onViewApplication={() => navigate('/school/admissions/applications', { state: { selectId: selected._id, tab: 'details' } })}
              onViewDocuments={() => navigate('/school/admissions/applications', { state: { selectId: selected._id, tab: 'documents' } })}
              busy={busy}
            />
          )}
        </div>
      </div>

      {showCriteriaModal && (
        <EditCriteriaModal criteria={criteria} onClose={() => setShowCriteriaModal(false)} onSave={saveCriteria} />
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

function MarksEntryForm({ label, max, currentMarks, onSave, busy }) {
  const [marks, setMarks] = useState(currentMarks ?? '');
  const [remark, setRemark] = useState('');

  useEffect(() => {
    setMarks(currentMarks ?? '');
  }, [currentMarks]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-[12px] font-medium text-[#374151] mb-1">{label} (out of {max})</label>
        <input type="number" min={0} max={max} value={marks} onChange={(e) => setMarks(e.target.value)} className="w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder={`Enter marks out of ${max}`} />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-[#374151] mb-1">Evaluator Remark</label>
        <textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} className="w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] resize-none" placeholder="Add an evaluator remark (optional)" />
      </div>
      <button type="button" disabled={busy || marks === ''} onClick={() => onSave(marks, remark)} className="self-end px-4 py-1.5 text-[12.5px] font-semibold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 disabled:opacity-60">Save</button>
    </div>
  );
}

function ApplicantDetailPanel({ record, criteria, onClose, onAction, onSaveMarks, onAddRemark, onViewApplication, onViewDocuments, busy }) {
  const [activeTab, setActiveTab] = useState('details');
  const [remarkText, setRemarkText] = useState('');
  const d = record.data || {};
  const s = scoreOf(d, criteria);
  const tabs = [['details', 'Details'], ['test', 'Test Marks'], ['interview', 'Interview Marks'], ['remarks', 'Remarks']];

  return (
    <div className="bg-white border border-[#dfe7f1] rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-[13px] flex items-center justify-center flex-none">{initials(d.fullName)}</span>
          <div>
            <div className="text-[14px] font-bold text-[#111827] flex items-center gap-2">{d.fullName || 'Unnamed applicant'} <StatusBadge status={d.status} /></div>
            <div className="text-[11.5px] text-[#94a3b8]">{d.applicationNumber} · Total Marks: {s.total}/{s.maxTotal} ({s.percentage.toFixed(2)}%)</div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-[#94a3b8] hover:text-[#111827] bg-transparent border-0 cursor-pointer"><X size={16} /></button>
      </div>

      <div className="flex border-b border-[#e2e8f0] mb-3 overflow-x-auto">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)} className={`px-3 py-2 text-[12px] font-semibold whitespace-nowrap border-0 border-b-2 bg-transparent cursor-pointer -mb-px ${activeTab === key ? 'text-blue-600 border-blue-600' : 'text-[#94a3b8] border-transparent'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Class Applying For" value={d.classApplyingFor} />
          <InfoRow label="Academic Year" value={d.academicYear} />
          <InfoRow label="Test Marks" value={s.test !== null ? `${s.test} / ${criteria.entranceTestMax}` : 'Not entered'} />
          <InfoRow label="Interview Marks" value={s.interview !== null ? `${s.interview} / ${criteria.interviewMax}` : 'Not entered'} />
          <div className="col-span-2"><InfoRow label="Total Score" value={`${s.total} / ${s.maxTotal} (${s.percentage.toFixed(2)}%)`} /></div>
        </div>
      )}

      {activeTab === 'test' && (
        <MarksEntryForm label="Test Marks" max={criteria.entranceTestMax} currentMarks={d.testMarks} busy={busy} onSave={(marks, remark) => onSaveMarks('test', marks, remark)} />
      )}

      {activeTab === 'interview' && (
        <MarksEntryForm label="Interview Marks" max={criteria.interviewMax} currentMarks={d.interviewMarks} busy={busy} onSave={(marks, remark) => onSaveMarks('interview', marks, remark)} />
      )}

      {activeTab === 'remarks' && (
        <div className="flex flex-col gap-3">
          {(d.testEvaluatorRemarks || []).map((entry, i) => (
            <div key={`t${i}`} className="px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <div className="text-[11px] font-semibold text-[#2563eb] mb-1">Test Evaluator Remarks</div>
              <div className="text-[13px] text-[#111827]">{entry.text}</div>
              <div className="text-[11px] text-[#94a3b8] mt-1">- {entry.by} ({formatDate(entry.at)})</div>
            </div>
          ))}
          {(d.interviewEvaluatorRemarks || []).map((entry, i) => (
            <div key={`i${i}`} className="px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <div className="text-[11px] font-semibold text-violet-600 mb-1">Interview Evaluator Remarks</div>
              <div className="text-[13px] text-[#111827]">{entry.text}</div>
              <div className="text-[11px] text-[#94a3b8] mt-1">- {entry.by} ({formatDate(entry.at)})</div>
            </div>
          ))}
          {(d.selectionRemarks || []).map((entry, i) => (
            <div key={`g${i}`} className="px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <div className="text-[11px] font-semibold text-[#536173] mb-1">General Remarks</div>
              <div className="text-[13px] text-[#111827]">{entry.text}</div>
              <div className="text-[11px] text-[#94a3b8] mt-1">- {entry.by} ({formatDateTime(entry.at)})</div>
            </div>
          ))}
          {remarkCount(d) === 0 && <p className="text-[12.5px] text-[#94a3b8]">No remarks yet.</p>}
          <div className="flex flex-col gap-2">
            <textarea value={remarkText} onChange={(e) => setRemarkText(e.target.value)} rows={2} placeholder="Add a general remark..." className="w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] resize-none" />
            <button type="button" disabled={busy || !remarkText.trim()} onClick={() => { onAddRemark(remarkText); setRemarkText(''); }} className="self-end px-3 py-1.5 text-[12.5px] font-semibold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 disabled:opacity-60">Add Remark</button>
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[#e2e8f0]">
        <div className="text-[12.5px] font-semibold text-[#111827] mb-2">Actions</div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onViewApplication} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-[#374151] bg-[#f1f5f9] rounded-md cursor-pointer hover:bg-[#e2e8f0] border-0"><Eye size={13} /> View Application</button>
          <button type="button" onClick={onViewDocuments} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-[#374151] bg-[#f1f5f9] rounded-md cursor-pointer hover:bg-[#e2e8f0] border-0"><FileText size={13} /> View Documents</button>
          <button type="button" disabled={busy} onClick={() => onAction('Shortlisted', 'Shortlisted for admission')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-violet-700 bg-violet-50 rounded-md cursor-pointer hover:bg-violet-100 border-0 disabled:opacity-60"><Star size={13} /> Shortlist</button>
          <button type="button" disabled={busy} onClick={() => onAction('Approved', 'Application approved')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-emerald-700 bg-emerald-50 rounded-md cursor-pointer hover:bg-emerald-100 border-0 disabled:opacity-60"><CheckCircle2 size={13} /> Approve</button>
          <button type="button" disabled={busy} onClick={() => onAction('Rejected', 'Application rejected')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-red-700 bg-red-50 rounded-md cursor-pointer hover:bg-red-100 border-0 disabled:opacity-60"><XCircle size={13} /> Reject</button>
          <button type="button" disabled={busy} onClick={() => onAction(null, 'Interview scheduled')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-amber-700 bg-amber-50 rounded-md cursor-pointer hover:bg-amber-100 border-0 disabled:opacity-60"><CalendarClock size={13} /> Schedule Interview</button>
          <button type="button" onClick={() => setActiveTab('remarks')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-[#374151] bg-[#f1f5f9] rounded-md cursor-pointer hover:bg-[#e2e8f0] border-0"><MessageSquarePlus size={13} /> Add Remark</button>
        </div>
      </div>
    </div>
  );
}

function EditCriteriaModal({ criteria, onClose, onSave }) {
  const [entranceTestMax, setEntranceTestMax] = useState(criteria.entranceTestMax);
  const [interviewMax, setInterviewMax] = useState(criteria.interviewMax);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ entranceTestMax: Number(entranceTestMax) || 0, interviewMax: Number(interviewMax) || 0 });
    } finally {
      setSaving(false);
    }
  }

  const total = (Number(entranceTestMax) || 0) + (Number(interviewMax) || 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-100 p-5">
        <h3 className="m-0 mb-4 text-[15px] font-bold text-[#111827]">Edit Selection Criteria</h3>
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <label className="block text-[12.5px] font-medium text-[#374151] mb-1">Entrance Test — Max Marks</label>
            <input type="number" min={0} value={entranceTestMax} onChange={(e) => setEntranceTestMax(e.target.value)} className="w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-[#374151] mb-1">Interview — Max Marks</label>
            <input type="number" min={0} value={interviewMax} onChange={(e) => setInterviewMax(e.target.value)} className="w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" />
          </div>
          <p className="text-[12px] text-[#94a3b8] m-0">Total: {total} marks. Weightage is calculated automatically from each component's share of the total.</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50">Cancel</button>
          <button type="button" disabled={saving} onClick={handleSave} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 disabled:opacity-60">{saving ? 'Saving…' : 'Save Criteria'}</button>
        </div>
      </div>
    </div>
  );
}
