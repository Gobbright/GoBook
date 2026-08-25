import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, ChevronDown, Columns3, Download, Eye, FileText, IndianRupee,
  MoreVertical, Pencil, Plus, RotateCcw, Search, Trash2, Upload, User, UserCheck, UserX,
} from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import {
  deleteModuleRecord, importModuleRecords, listModuleRecords, updateModuleRecord,
} from '../../../../../services/moduleRecordsService.js';
import { downloadExcel } from '../../../../../utils/exportData.js';

const MODULE_KEY = 'school/students/registration';

const LABEL = 'block text-[12px] font-medium text-[#374151] mb-1';
const INPUT = 'w-full border border-[#dbe4ef] rounded-md px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blue-500 font-[inherit] bg-white';

const CLASS_OPTIONS = ['Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

function academicYearOptions() {
  const year = new Date().getFullYear();
  return [year - 1, year, year + 1].map((y) => `${y}-${y + 1}`);
}

const IMPORT_FIELDS = [
  { key: 'studentName', label: 'Student Name', required: true },
  { key: 'studentId', label: 'Student ID' },
  { key: 'admissionNumber', label: 'Admission No' },
  { key: 'className', label: 'Class' },
  { key: 'section', label: 'Section' },
  { key: 'rollNumber', label: 'Roll Number' },
  { key: 'gender', label: 'Gender' },
  { key: 'academicYear', label: 'Academic Year' },
  { key: 'fatherMobile', label: 'Parent Mobile' },
  { key: 'studentStatus', label: 'Student Status' },
];

const EDIT_SECTIONS = [
  {
    title: 'Basic', fields: [
      ['studentName', 'Student Name', 'text', true], ['dob', 'Date of Birth', 'date'], ['gender', 'Gender', 'select', false, GENDER_OPTIONS], ['bloodGroup', 'Blood Group', 'text'],
    ],
  },
  {
    title: 'Academic', fields: [
      ['className', 'Class', 'select', true, CLASS_OPTIONS], ['section', 'Section', 'select', true, SECTION_OPTIONS], ['rollNumber', 'Roll Number', 'text'],
      ['academicYear', 'Academic Year', 'select', false, academicYearOptions()], ['studentStatus', 'Student Status', 'select', true, STATUS_OPTIONS],
    ],
  },
  {
    title: 'Parent & Contact', fields: [
      ['fatherName', "Father's Name", 'text'], ['motherName', "Mother's Name", 'text'], ['fatherMobile', "Father's Mobile", 'text'],
      ['motherMobile', "Mother's Mobile", 'text'], ['email', 'Email', 'text'],
    ],
  },
  {
    title: 'Address', fields: [
      ['addressLine1', 'Address Line 1', 'text'], ['city', 'City', 'text'], ['state', 'State', 'text'], ['pinCode', 'PIN Code', 'text'],
    ],
  },
];

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

function StatCard({ icon: Icon, iconColor, iconBg, label, value, sub }) {
  return (
    <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-start gap-3">
      <span className="w-10 h-10 rounded-full flex items-center justify-center flex-none" style={{ background: iconBg, color: iconColor }}><Icon size={17} /></span>
      <div className="min-w-0">
        <div className="text-[12px] text-[#536173] truncate">{label}</div>
        <div className="text-[20px] font-bold text-[#111827] leading-tight">{value}</div>
        {sub && <div className="text-[11px] text-[#94a3b8] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export function StudentListPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [studentIdFilter, setStudentIdFilter] = useState('');
  const [admissionNoFilter, setAdmissionNoFilter] = useState('');
  const [parentMobileFilter, setParentMobileFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editRecord, setEditRecord] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  function load() {
    setLoading(true);
    return listModuleRecords(MODULE_KEY)
      .then((res) => setStudents((res.records ?? []).filter((r) => r.data?.status === 'Registered')))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search, studentIdFilter, admissionNoFilter, parentMobileFilter, classFilter, sectionFilter, genderFilter, statusFilter, yearFilter]);

  const filtered = useMemo(() => students.filter((r) => {
    const d = r.data || {};
    const term = search.trim().toLowerCase();
    if (term && !String(d.studentName || '').toLowerCase().includes(term)) return false;
    if (studentIdFilter && !String(d.studentId || '').toLowerCase().includes(studentIdFilter.trim().toLowerCase())) return false;
    if (admissionNoFilter && !String(d.admissionNumber || '').toLowerCase().includes(admissionNoFilter.trim().toLowerCase())) return false;
    if (parentMobileFilter) {
      const term2 = parentMobileFilter.trim();
      if (!String(d.fatherMobile || '').includes(term2) && !String(d.motherMobile || '').includes(term2)) return false;
    }
    if (classFilter && d.className !== classFilter) return false;
    if (sectionFilter && d.section !== sectionFilter) return false;
    if (genderFilter && d.gender !== genderFilter) return false;
    if (statusFilter && d.studentStatus !== statusFilter) return false;
    if (yearFilter && d.academicYear !== yearFilter) return false;
    return true;
  }), [students, search, studentIdFilter, admissionNoFilter, parentMobileFilter, classFilter, sectionFilter, genderFilter, statusFilter, yearFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((r) => r.data?.studentStatus === 'Active').length;
    const male = students.filter((r) => r.data?.gender === 'Male').length;
    const female = students.filter((r) => r.data?.gender === 'Female').length;
    const inactive = students.filter((r) => r.data?.studentStatus === 'Inactive').length;
    const pct = (n) => (total ? `${((n / total) * 100).toFixed(2)}%` : '0.00%');
    return { total, active, male, female, inactive, pct };
  }, [students]);

  function resetFilters() {
    setSearch(''); setStudentIdFilter(''); setAdmissionNoFilter(''); setParentMobileFilter('');
    setClassFilter(''); setSectionFilter(''); setGenderFilter(''); setStatusFilter(''); setYearFilter('');
  }

  function toggleSelect(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((current) => {
      const ids = paginated.map((r) => r._id);
      const allSelected = ids.every((id) => current.has(id));
      const next = new Set(current);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  const singleSelected = selectedIds.size === 1 ? students.find((r) => selectedIds.has(r._id)) : null;

  async function removeStudent(record) {
    if (!window.confirm(`Delete ${record.data?.studentName || 'this student'}?`)) return;
    await deleteModuleRecord(record._id);
    setStudents((current) => current.filter((r) => r._id !== record._id));
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(record._id);
      return next;
    });
  }

  async function saveEdit(id, data) {
    setBusy(true);
    try {
      const existing = students.find((r) => r._id === id);
      const prev = existing?.data || {};
      const classChanged = data.className !== prev.className || data.section !== prev.section || data.rollNumber !== prev.rollNumber;
      const nextData = { ...data };
      if (classChanged) {
        nextData.classHistory = [
          ...(prev.classHistory || []).map((h) => (h.status === 'Current' ? { ...h, status: 'Promoted' } : h)),
          { academicYear: data.academicYear, className: data.className, section: data.section, rollNumber: data.rollNumber, status: 'Current', at: new Date().toISOString() },
        ];
      }
      const updated = await updateModuleRecord(id, nextData);
      setStudents((current) => current.map((r) => (r._id === id ? updated : r)));
      setEditRecord(null);
    } finally {
      setBusy(false);
    }
  }

  function exportStudents() {
    downloadExcel({
      title: 'Student List',
      filename: 'student-list',
      rows: filtered.map((r) => {
        const d = r.data || {};
        return {
          studentId: d.studentId || '', admissionNumber: d.admissionNumber || '', studentName: d.studentName || '',
          classSection: [d.className, d.section].filter(Boolean).join(' - '), gender: d.gender || '',
          parentMobile: d.fatherMobile || d.motherMobile || '', status: d.studentStatus || '',
        };
      }),
      columns: [
        { key: 'studentId', label: 'Student ID' }, { key: 'admissionNumber', label: 'Admission No.' }, { key: 'studentName', label: 'Student Name' },
        { key: 'classSection', label: 'Class - Section' }, { key: 'gender', label: 'Gender' }, { key: 'parentMobile', label: 'Parent Mobile' }, { key: 'status', label: 'Status' },
      ],
    });
  }

  function handlePickImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setPendingImportFile(file);
  }

  async function confirmImport() {
    const file = pendingImportFile;
    if (!file) return;
    setPendingImportFile(null);
    setBusy(true);
    try {
      const res = await importModuleRecords(MODULE_KEY, IMPORT_FIELDS, file);
      setImportResult(res);
      await load();
    } catch (err) {
      setImportResult({ error: err.message || 'Import failed' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-4">
        <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
          <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
          <span>›</span><span>Students</span><span>›</span><span>Student List</span>
        </nav>
        <h1 className="m-0 text-[22px] font-bold text-[#111827]">Student List</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
        <StatCard icon={User} iconColor="#2563eb" iconBg="#eff6ff" label="Total Students" value={stats.total} sub="This academic year" />
        <StatCard icon={UserCheck} iconColor="#16a34a" iconBg="#f0fdf4" label="Active Students" value={stats.active} sub={stats.pct(stats.active)} />
        <StatCard icon={User} iconColor="#d97706" iconBg="#fffbeb" label="Male Students" value={stats.male} sub={stats.pct(stats.male)} />
        <StatCard icon={User} iconColor="#7c3aed" iconBg="#f5f3ff" label="Female Students" value={stats.female} sub={stats.pct(stats.female)} />
        <StatCard icon={UserX} iconColor="#dc2626" iconBg="#fef2f2" label="Inactive Students" value={stats.inactive} sub={stats.pct(stats.inactive)} />
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className={LABEL}>Search by Name</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input className={`${INPUT} pl-8`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Enter student name" />
            </div>
          </div>
          <div><label className={LABEL}>Student ID</label><input className={INPUT} value={studentIdFilter} onChange={(e) => setStudentIdFilter(e.target.value)} placeholder="Enter student ID" /></div>
          <div><label className={LABEL}>Admission No.</label><input className={INPUT} value={admissionNoFilter} onChange={(e) => setAdmissionNoFilter(e.target.value)} placeholder="Enter admission number" /></div>
          <div><label className={LABEL}>Parent Mobile</label><input className={INPUT} value={parentMobileFilter} onChange={(e) => setParentMobileFilter(e.target.value)} placeholder="Enter parent mobile" /></div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-36"><label className={LABEL}>Class</label><SelectDropdown value={classFilter} onChange={setClassFilter} options={CLASS_OPTIONS} placeholder="All Classes" /></div>
          <div className="w-32"><label className={LABEL}>Section</label><SelectDropdown value={sectionFilter} onChange={setSectionFilter} options={SECTION_OPTIONS} placeholder="All Sections" /></div>
          <div className="w-32"><label className={LABEL}>Gender</label><SelectDropdown value={genderFilter} onChange={setGenderFilter} options={GENDER_OPTIONS} placeholder="All Genders" /></div>
          <div className="w-32"><label className={LABEL}>Status</label><SelectDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="All Status" /></div>
          <div className="w-36"><label className={LABEL}>Academic Year</label><SelectDropdown value={yearFilter} onChange={setYearFilter} options={academicYearOptions()} placeholder="All Years" /></div>
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50"><RotateCcw size={13} /> Reset</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="text-[13px] font-semibold text-[#111827]">Total {filtered.length} Students</div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => navigate('/school/students/registration')} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0"><Plus size={14} /> Add Student</button>
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handlePickImportFile} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold text-emerald-700 bg-emerald-50 rounded-md cursor-pointer hover:bg-emerald-100 border-0"><Upload size={14} /> Bulk Import</button>
          <button type="button" onClick={exportStudents} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold text-blue-700 bg-blue-50 rounded-md cursor-pointer hover:bg-blue-100 border-0"><Download size={14} /> Bulk Export</button>
          <button type="button" className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50"><Columns3 size={14} /> Columns <ChevronDown size={12} /></button>
        </div>
      </div>

      {importResult && (
        <div className={`mb-3 px-4 py-2.5 rounded-lg text-[12.5px] border ${importResult.error ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
          {importResult.error || `Import complete: ${importResult.imported} added${importResult.skipped ? `, ${importResult.skipped} skipped` : ''}.`}
          <button type="button" onClick={() => setImportResult(null)} className="ml-2 underline bg-transparent border-0 cursor-pointer p-0 text-inherit">Dismiss</button>
        </div>
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-10 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7]">
                  <input type="checkbox" checked={paginated.length > 0 && paginated.every((r) => selectedIds.has(r._id))} onChange={toggleSelectAllVisible} />
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7]">Photo</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Student ID</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Admission No.</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Student Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Class - Section</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Gender</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Parent Mobile</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-[13px] text-[#536173] px-4 py-8 text-center">Loading…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={10} className="text-[13px] text-[#536173] px-4 py-8 text-center">No registered students yet.</td></tr>
              ) : (
                paginated.map((record) => {
                  const d = record.data || {};
                  return (
                    <tr key={record._id} className={`hover:bg-gray-50 ${selectedIds.has(record._id) ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-4 py-2.5 border-b border-[#f3f4f6]"><input type="checkbox" checked={selectedIds.has(record._id)} onChange={() => toggleSelect(record._id)} /></td>
                      <td className="px-4 py-2.5 border-b border-[#f3f4f6]">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center">{initials(d.studentName)}</span>
                      </td>
                      <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[12.5px] text-[#374151]">{d.studentId || '—'}</td>
                      <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[12.5px]"><span className="text-blue-600 font-semibold">{d.admissionNumber || '—'}</span></td>
                      <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] font-medium text-[#111827]">{d.studentName || '—'}</td>
                      <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[12.5px] text-[#374151]">{[d.className, d.section].filter(Boolean).join(' - ') || '—'}</td>
                      <td className="px-4 py-2.5 border-b border-[#f3f4f6]">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${d.gender === 'Female' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}>{d.gender || '—'}</span>
                      </td>
                      <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[12.5px] text-[#374151]">{d.fatherMobile || d.motherMobile || '—'}</td>
                      <td className="px-4 py-2.5 border-b border-[#f3f4f6]">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${d.studentStatus === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{d.studentStatus || '—'}</span>
                      </td>
                      <td className="px-4 py-2.5 border-b border-[#f3f4f6]">
                        <div className="flex items-center gap-0.5">
                          <button type="button" title="View" onClick={() => navigate(`/school/students/profile/${record._id}`)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-blue-50 text-blue-500 bg-transparent border-0 cursor-pointer"><Eye size={13} /></button>
                          <button type="button" title="Edit" onClick={() => setEditRecord(record)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-amber-50 text-amber-500 bg-transparent border-0 cursor-pointer"><Pencil size={13} /></button>
                          <button type="button" title="Attendance" onClick={() => navigate('/school/attendance/student-attendance')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-emerald-50 text-emerald-500 bg-transparent border-0 cursor-pointer"><Calendar size={13} /></button>
                          <button type="button" title="Fees" onClick={() => navigate('/school/fees/student-fees')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-orange-50 text-orange-500 bg-transparent border-0 cursor-pointer"><IndianRupee size={13} /></button>
                          <button type="button" title="Exams" onClick={() => navigate('/school/examinations/marks-entry')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-violet-50 text-violet-500 bg-transparent border-0 cursor-pointer"><FileText size={13} /></button>
                          <button type="button" title="Documents" onClick={() => navigate('/school/students/documents')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-cyan-50 text-cyan-600 bg-transparent border-0 cursor-pointer"><FileText size={13} /></button>
                          <DropdownMenu onDelete={() => removeStudent(record)} />
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
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white cursor-pointer">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
                  .reduce((acc, n) => { if (acc.length && n - acc[acc.length - 1] > 1) acc.push('…'); acc.push(n); return acc; }, [])
                  .map((n, i) => n === '…' ? (
                    <span key={`e${i}`} className="px-1.5 text-[#94a3b8]">…</span>
                  ) : (
                    <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 text-[12px] rounded border cursor-pointer ${n === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-[#dbe4ef] hover:bg-gray-50'}`}>{n}</button>
                  ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white cursor-pointer">›</button>
              </div>
              <div className="w-24"><SelectDropdown value={pageSize} onChange={(v) => { setPageSize(Number(v)); setPage(1); }} options={[{ value: 10, label: '10 / page' }, { value: 25, label: '25 / page' }, { value: 50, label: '50 / page' }]} /></div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-3 mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={!singleSelected} onClick={() => singleSelected && navigate(`/school/students/profile/${singleSelected._id}`)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold text-blue-700 bg-blue-50 rounded-md cursor-pointer hover:bg-blue-100 border-0 disabled:opacity-40 disabled:cursor-not-allowed"><Eye size={13} /> View</button>
        <button type="button" disabled={!singleSelected} onClick={() => singleSelected && setEditRecord(singleSelected)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold text-amber-700 bg-amber-50 rounded-md cursor-pointer hover:bg-amber-100 border-0 disabled:opacity-40 disabled:cursor-not-allowed"><Pencil size={13} /> Edit</button>
        <button type="button" disabled={!singleSelected} onClick={() => navigate('/school/attendance/student-attendance')} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold text-emerald-700 bg-emerald-50 rounded-md cursor-pointer hover:bg-emerald-100 border-0 disabled:opacity-40 disabled:cursor-not-allowed"><Calendar size={13} /> Attendance</button>
        <button type="button" disabled={!singleSelected} onClick={() => navigate('/school/fees/student-fees')} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold text-orange-700 bg-orange-50 rounded-md cursor-pointer hover:bg-orange-100 border-0 disabled:opacity-40 disabled:cursor-not-allowed"><IndianRupee size={13} /> Fees</button>
        <button type="button" disabled={!singleSelected} onClick={() => navigate('/school/examinations/marks-entry')} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold text-violet-700 bg-violet-50 rounded-md cursor-pointer hover:bg-violet-100 border-0 disabled:opacity-40 disabled:cursor-not-allowed"><FileText size={13} /> Exams</button>
        <button type="button" disabled={!singleSelected} onClick={() => navigate('/school/students/documents')} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold text-cyan-700 bg-cyan-50 rounded-md cursor-pointer hover:bg-cyan-100 border-0 disabled:opacity-40 disabled:cursor-not-allowed"><FileText size={13} /> Documents</button>
        {!singleSelected && <span className="text-[11.5px] text-[#94a3b8] ml-1">Select exactly one student to enable these actions.</span>}
      </div>

      {editRecord && <EditModal record={editRecord} busy={busy} onClose={() => setEditRecord(null)} onSave={saveEdit} />}

      {pendingImportFile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setPendingImportFile(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-100 mx-4 p-6">
            <h2 className="text-[16px] font-bold text-[#111827] mb-2">Import Students</h2>
            <p className="text-[13px] text-[#536173] mb-5">Import students from <span className="font-medium text-[#111827]">{pendingImportFile.name}</span>? Column headers are matched to fields automatically.</p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setPendingImportFile(null)} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50">No</button>
              <button type="button" onClick={confirmImport} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0">Yes, Import</button>
            </div>
          </div>
        </div>
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
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[#536173] bg-transparent border-0 cursor-pointer"><MoreVertical size={13} /></button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1 z-50 w-32">
          <button type="button" onClick={() => { setOpen(false); onDelete(); }} className="w-full flex items-center gap-1.5 text-left px-3 py-2 text-[12.5px] text-red-600 hover:bg-red-50 bg-transparent border-0 cursor-pointer"><Trash2 size={12} /> Delete</button>
        </div>
      )}
    </div>
  );
}

function EditModal({ record, busy, onClose, onSave }) {
  const [form, setForm] = useState(() => ({ ...record.data }));

  function set(key) {
    return (value) => setForm((current) => ({ ...current, [key]: value }));
  }
  function setInput(key) {
    return (e) => set(key)(e.target.value);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-160 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#edf2f7]">
          <h3 className="m-0 text-[15px] font-semibold text-[#111827]">Edit Student — {record.data?.studentName}</h3>
          <button type="button" onClick={onClose} className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-lg leading-none">✕</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {EDIT_SECTIONS.map((section) => (
            <section key={section.title} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4">
              <h4 className="m-0 mb-3 text-[13px] font-bold text-[#111827]">{section.title}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.fields.map(([key, label, type, required, options]) => (
                  <div key={key}>
                    <label className={LABEL}>{label}{required && <span className="text-red-500"> *</span>}</label>
                    {type === 'select' ? (
                      <SelectDropdown value={form[key] || ''} onChange={set(key)} options={options} placeholder={`Select ${label}`} />
                    ) : (
                      <input type={type === 'date' ? 'date' : 'text'} className={INPUT} value={form[key] || ''} onChange={setInput(key)} />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50">Cancel</button>
            <button type="button" disabled={busy} onClick={() => onSave(record._id, form)} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 disabled:opacity-60">{busy ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
