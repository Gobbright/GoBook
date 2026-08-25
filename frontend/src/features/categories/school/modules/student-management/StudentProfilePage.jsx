import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Book, BookOpen, Bus, Calendar, ChevronDown, ClipboardList, Droplet,
  FileText, Folder, GraduationCap, IndianRupee, MessageCircle, MessageSquare, MoreVertical,
  Printer, Search, ShieldAlert, User, Users, Venus,
} from 'lucide-react';

import { useCurrentUser } from '../../../../../hooks/useCurrentUser.js';
import { deleteModuleRecord, listModuleRecords, openModuleRecordFile, updateModuleRecord } from '../../../../../services/moduleRecordsService.js';

const STUDENTS_KEY = 'school/students/registration';
const ATTENDANCE_KEY = 'school/attendance/student-attendance';
const FEES_COLLECT_KEY = 'school/fees/collect-fees';
const FEES_STUDENT_KEY = 'school/fees/student-fees';
const MARKS_KEY = 'school/examinations/marks-entry';

const TABS = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'parents', label: 'Parents', icon: Users },
  { key: 'academics', label: 'Academics', icon: BookOpen },
  { key: 'attendance', label: 'Attendance', icon: Calendar },
  { key: 'fees', label: 'Fees', icon: IndianRupee },
  { key: 'exams', label: 'Exams', icon: FileText },
  { key: 'homework', label: 'Homework', icon: ClipboardList },
  { key: 'transport', label: 'Transport', icon: Bus },
  { key: 'library', label: 'Library', icon: Book },
  { key: 'documents', label: 'Documents', icon: Folder },
  { key: 'communication', label: 'Communication', icon: MessageCircle },
  { key: 'remarks', label: 'Remarks', icon: MessageSquare },
  { key: 'discipline', label: 'Discipline', icon: ShieldAlert },
];

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ageFromDob(dob) {
  if (!dob) return '';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return '';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  return `${years}Y ${months}M`;
}

function matchByName(records, name) {
  const norm = String(name || '').trim().toLowerCase();
  if (!norm) return [];
  return records.filter((r) => String(r.data?.studentName || '').trim().toLowerCase() === norm);
}

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function Card({ title, icon: Icon, action, children }) {
  return (
    <section className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-none"><Icon size={13} /></span>}
          <h2 className="m-0 text-[13px] font-bold text-[#111827]">{title}</h2>
        </div>
      </div>
      <div className="flex-1">{children}</div>
      {action}
    </section>
  );
}

function LinkAction({ label, onClick }) {
  return <button type="button" onClick={onClick} className="mt-3 text-[12px] font-semibold text-blue-600 bg-transparent border-0 cursor-pointer inline-flex items-center gap-1 self-start">{label} →</button>;
}

function InfoLine({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[12.5px] py-1">
      <span className="text-[#94a3b8]">{label}</span>
      <span className="text-[#111827] font-medium text-right">{value || '—'}</span>
    </div>
  );
}

function Placeholder({ text }) {
  return <p className="text-[12px] text-[#94a3b8] m-0">{text || 'Not tracked yet.'}</p>;
}

function Ring({ value, color, label, sub }) {
  const size = 88;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef2f7" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[14px] font-bold text-[#111827]">{value}%</div>
      </div>
      <div className="text-[11.5px] font-semibold text-[#374151]">{label}</div>
      <div className="text-[10.5px] text-[#94a3b8]">{sub}</div>
    </div>
  );
}

function StudentPicker() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listModuleRecords(STUDENTS_KEY)
      .then((res) => setStudents((res.records ?? []).filter((r) => r.data?.status === 'Registered')))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter((r) => String(r.data?.studentName || '').toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="p-4 md:p-7">
      <div className="mb-4">
        <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
          <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
          <span>›</span><span>Students</span><span>›</span><span>Student Profile</span>
        </nav>
        <h1 className="m-0 text-[22px] font-bold text-[#111827]">Student Profile</h1>
      </div>
      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 max-w-140">
        <label className="block text-[12.5px] font-medium text-[#374151] mb-1.5">Select a student to view their profile</label>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by student name..." className="w-full border border-[#dbe4ef] rounded-md pl-9 pr-3 py-2 text-[13px] outline-none focus:border-blue-500" />
        </div>
        <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-[12.5px] text-[#94a3b8]">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-[12.5px] text-[#94a3b8]">No registered students found.</p>
          ) : filtered.map((r) => (
            <button key={r._id} type="button" onClick={() => navigate(`/school/students/profile/${r._id}`)} className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-gray-50 border-0 bg-transparent cursor-pointer text-left">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center flex-none">{initials(r.data?.studentName)}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-[#111827] truncate">{r.data?.studentName}</span>
                <span className="block text-[11px] text-[#94a3b8]">{r.data?.studentId} · {[r.data?.className, r.data?.section].filter(Boolean).join(' - ')}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [attendance, setAttendance] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [feeSummary, setFeeSummary] = useState(null);
  const [marks, setMarks] = useState([]);
  const [remarkText, setRemarkText] = useState('');
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      listModuleRecords(STUDENTS_KEY).then((r) => r.records ?? []).catch(() => []),
      listModuleRecords(ATTENDANCE_KEY).then((r) => r.records ?? []).catch(() => []),
      listModuleRecords(FEES_COLLECT_KEY).then((r) => r.records ?? []).catch(() => []),
      listModuleRecords(FEES_STUDENT_KEY).then((r) => r.records ?? []).catch(() => []),
      listModuleRecords(MARKS_KEY).then((r) => r.records ?? []).catch(() => []),
    ]).then(([students, attendanceRecords, feeCollectRecords, feeStudentRecords, marksRecords]) => {
      const found = students.find((r) => r._id === id) || null;
      setRecord(found);
      const name = found?.data?.studentName;
      setAttendance(matchByName(attendanceRecords, name));
      setFeePayments(matchByName(feeCollectRecords, name).sort((a, b) => new Date(b.data?.date || 0) - new Date(a.data?.date || 0)));
      setFeeSummary(matchByName(feeStudentRecords, name)[0]?.data || null);
      setMarks(matchByName(marksRecords, name));
    }).finally(() => setLoading(false));
  }, [id]);

  const attendanceStats = useMemo(() => {
    const now = new Date();
    const thisMonth = attendance.filter((r) => {
      const d = r.data?.date ? new Date(r.data.date) : null;
      return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const total = thisMonth.length;
    const present = thisMonth.filter((r) => r.data?.status === 'Present').length;
    const absent = thisMonth.filter((r) => r.data?.status === 'Absent').length;
    const leave = thisMonth.filter((r) => r.data?.status === 'Leave').length;
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
    return { total, present, absent, leave, presentPct: pct(present), absentPct: pct(absent), leavePct: pct(leave) };
  }, [attendance]);

  async function addRemark() {
    if (!record || !remarkText.trim() || busy) return;
    setBusy(true);
    try {
      const entry = { text: remarkText.trim(), by: currentUser?.name || 'Admin', at: new Date().toISOString() };
      const updated = await updateModuleRecord(record._id, { ...record.data, remarks: [...(record.data?.remarks || []), entry] });
      setRecord(updated);
      setRemarkText('');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!record || !window.confirm(`Delete ${record.data?.studentName}? This cannot be undone.`)) return;
    await deleteModuleRecord(record._id);
    navigate('/school/students/list');
  }

  if (!id) return <StudentPicker />;

  if (loading) {
    return <div className="p-7 text-center text-[13px] text-[#536173]">Loading student profile…</div>;
  }

  if (!record) {
    return (
      <div className="p-7 text-center">
        <p className="text-[13px] text-[#536173] mb-3">Student not found.</p>
        <button type="button" onClick={() => navigate('/school/students/list')} className="text-[13px] font-semibold text-blue-600 bg-transparent border-0 cursor-pointer">Back to Student List</button>
      </div>
    );
  }

  const d = record.data || {};
  const classHistory = [...(d.classHistory || [])].reverse();
  const remarks = [...(d.remarks || [])].reverse();

  return (
    <div className="p-4 md:p-7">
      <div className="mb-3">
        <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
          <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
          <span>›</span><span>Students</span><span>›</span><span>Student Profile</span>
        </nav>
        <h1 className="m-0 text-[22px] font-bold text-[#111827]">Student Profile</h1>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[#eef2f7] flex items-center justify-center overflow-hidden flex-none">
              {d.photo?.id ? (
                <button type="button" onClick={() => openModuleRecordFile(d.photo.id)} className="w-full h-full bg-transparent border-0 cursor-pointer flex items-center justify-center text-blue-700 font-bold text-[20px]">{initials(d.studentName)}</button>
              ) : (
                <span className="text-blue-700 font-bold text-[20px]">{initials(d.studentName)}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="m-0 text-[19px] font-bold text-[#111827]">{d.studentName}</h2>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${d.studentStatus === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{d.studentStatus}</span>
              </div>
              <div className="text-[12px] text-[#94a3b8] mb-2">Student ID : {d.studentId} &nbsp;·&nbsp; Admission No : {d.admissionNumber || '—'}</div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
                <span className="flex items-center gap-1.5 text-[#374151]"><GraduationCap size={13} className="text-blue-500" /> Class <strong>{[d.className, d.section].filter(Boolean).join(' - ') || '—'}</strong></span>
                <span className="flex items-center gap-1.5 text-[#374151]"><MessageSquare size={13} className="text-cyan-500" /> Roll <strong>{d.rollNumber || '—'}</strong></span>
                <span className="flex items-center gap-1.5 text-[#374151]"><Calendar size={13} className="text-emerald-500" /> DOB <strong>{formatDate(d.dob)} {ageFromDob(d.dob) && `(${ageFromDob(d.dob)})`}</strong></span>
                <span className="flex items-center gap-1.5 text-[#374151]"><Venus size={13} className="text-violet-500" /> Gender <strong>{d.gender || '—'}</strong></span>
                <span className="flex items-center gap-1.5 text-[#374151]"><Droplet size={13} className="text-red-500" /> Blood Group <strong>{d.bloodGroup || '—'}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button type="button" onClick={() => setActionsOpen((o) => !o)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50">Quick Actions <ChevronDown size={13} /></button>
              {actionsOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1 z-50 w-48">
                  <button type="button" onClick={() => { setActionsOpen(false); navigate('/school/attendance/student-attendance'); }} className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-gray-50 bg-transparent border-0 cursor-pointer">Mark Attendance</button>
                  <button type="button" onClick={() => { setActionsOpen(false); navigate('/school/fees/collect-fees'); }} className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-gray-50 bg-transparent border-0 cursor-pointer">Collect Fees</button>
                  <button type="button" onClick={() => { setActionsOpen(false); navigate('/school/examinations/marks-entry'); }} className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-gray-50 bg-transparent border-0 cursor-pointer">Enter Marks</button>
                  <button type="button" onClick={() => { setActionsOpen(false); navigate('/school/students/list'); }} className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-gray-50 bg-transparent border-0 cursor-pointer">Edit Student</button>
                </div>
              )}
            </div>
            <div className="relative">
              <button type="button" onClick={() => setMenuOpen((o) => !o)} className="w-9 h-9 flex items-center justify-center rounded-md border border-[#dbe4ef] bg-white hover:bg-gray-50 text-[#536173] cursor-pointer"><MoreVertical size={15} /></button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1 z-50 w-40">
                  <button type="button" onClick={() => { setMenuOpen(false); window.print(); }} className="w-full flex items-center gap-1.5 text-left px-3 py-2 text-[12.5px] hover:bg-gray-50 bg-transparent border-0 cursor-pointer"><Printer size={12} /> Print Profile</button>
                  <button type="button" onClick={() => { setMenuOpen(false); handleDelete(); }} className="w-full text-left px-3 py-2 text-[12.5px] text-red-600 hover:bg-red-50 bg-transparent border-0 cursor-pointer">Delete Student</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl mb-4 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`inline-flex items-center gap-1.5 px-3.5 py-3 text-[12.5px] font-semibold whitespace-nowrap border-0 border-b-2 bg-transparent cursor-pointer -mb-px ${activeTab === tab.key ? 'text-blue-600 border-blue-600' : 'text-[#94a3b8] border-transparent hover:text-[#374151]'}`}>
                <Icon size={13} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <Card title="Personal Information" icon={User}>
              <InfoLine label="Full Name" value={d.studentName} />
              <InfoLine label="Student ID" value={d.studentId} />
              <InfoLine label="Admission No" value={d.admissionNumber} />
              <InfoLine label="Date of Birth" value={formatDate(d.dob)} />
              <InfoLine label="Gender" value={d.gender} />
              <InfoLine label="Nationality" value={d.nationality} />
              <InfoLine label="Religion" value={d.religion} />
              <InfoLine label="Blood Group" value={d.bloodGroup} />
              <InfoLine label="Mobile Number" value={d.fatherMobile || d.motherMobile} />
              <InfoLine label="Email ID" value={d.email} />
              <InfoLine label="Address" value={[d.addressLine1, d.city, d.state, d.pinCode].filter(Boolean).join(', ')} />
            </Card>

            <Card title="Current Class Information" icon={GraduationCap}>
              <InfoLine label="Class" value={d.className} />
              <InfoLine label="Section" value={d.section} />
              <InfoLine label="Roll Number" value={d.rollNumber} />
              <InfoLine label="Class Teacher" value="Not tracked yet" />
              <InfoLine label="Academic Year" value={d.academicYear} />
              <InfoLine label="Student Status" value={d.studentStatus} />
              <InfoLine label="Date of Admission" value={formatDate(d.dateOfAdmission)} />
            </Card>

            <Card title="Attendance Summary (This Month)" icon={Calendar} action={<LinkAction label="View Attendance History" onClick={() => setActiveTab('attendance')} />}>
              {attendanceStats.total === 0 ? <Placeholder text="No attendance recorded this month." /> : (
                <div className="flex justify-around">
                  <Ring value={attendanceStats.presentPct} color="#16a34a" label="Present" sub={`${attendanceStats.present} Days`} />
                  <Ring value={attendanceStats.absentPct} color="#dc2626" label="Absent" sub={`${attendanceStats.absent} Days`} />
                  <Ring value={attendanceStats.leavePct} color="#d97706" label="Leave" sub={`${attendanceStats.leave} Days`} />
                </div>
              )}
            </Card>

            <Card title="Recent Fee Summary" icon={IndianRupee} action={<LinkAction label="View Fee History" onClick={() => setActiveTab('fees')} />}>
              {feeSummary ? (
                <>
                  <InfoLine label={`Total Fees (${d.academicYear || ''})`} value={money(feeSummary.totalFee)} />
                  <InfoLine label="Paid Fees" value={money(feeSummary.paidAmount)} />
                  <InfoLine label="Outstanding Fees" value={<span className="text-red-600">{money(feeSummary.balance)}</span>} />
                  <InfoLine label="Last Payment" value={formatDate(feePayments[0]?.data?.date)} />
                </>
              ) : <Placeholder text="No fee record found for this student yet." />}
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
            <div className="xl:col-span-2">
              <Card title="Academic Performance" icon={FileText} action={<LinkAction label="View All Exam Results" onClick={() => setActiveTab('exams')} />}>
                {marks.length === 0 ? <Placeholder text="No exam marks recorded yet." /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12.5px] border-collapse">
                      <thead>
                        <tr className="text-[#94a3b8]"><th className="text-left font-semibold pb-1.5">Exam</th><th className="text-left font-semibold pb-1.5">Subject</th><th className="text-right font-semibold pb-1.5">Marks</th></tr>
                      </thead>
                      <tbody>
                        {marks.slice(0, 6).map((r) => (
                          <tr key={r._id} className="border-t border-[#f1f5f9]">
                            <td className="py-1.5 text-[#111827]">{r.data?.examName || '—'}</td>
                            <td className="py-1.5 text-[#374151]">{r.data?.subjectName || '—'}</td>
                            <td className="py-1.5 text-right font-medium text-[#111827]">{r.data?.marksObtained ?? '—'}/{r.data?.maxMarks ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            <Card title="Recent Activities" icon={ClipboardList}>
              <Placeholder text="Activity feed isn't tracked yet — it would need to pull events from homework, fees, exams, and transport together." />
            </Card>

            <Card title="Documents" icon={Folder} action={<LinkAction label="View All Documents" onClick={() => setActiveTab('documents')} />}>
              <DocumentsList student={d} />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card title="Class History" icon={GraduationCap}>
              {classHistory.length === 0 ? <Placeholder text="No class history yet." /> : (
                <table className="w-full text-[12.5px] border-collapse">
                  <thead>
                    <tr className="text-[#94a3b8]"><th className="text-left font-semibold pb-1.5">Academic Year</th><th className="text-left font-semibold pb-1.5">Class</th><th className="text-left font-semibold pb-1.5">Section</th><th className="text-left font-semibold pb-1.5">Roll No.</th><th className="text-left font-semibold pb-1.5">Status</th></tr>
                  </thead>
                  <tbody>
                    {classHistory.map((h, i) => (
                      <tr key={i} className="border-t border-[#f1f5f9]">
                        <td className="py-1.5 text-[#111827]">{h.academicYear}</td>
                        <td className="py-1.5 text-[#374151]">{h.className}</td>
                        <td className="py-1.5 text-[#374151]">{h.section}</td>
                        <td className="py-1.5 text-[#374151]">{h.rollNumber}</td>
                        <td className="py-1.5"><span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${h.status === 'Current' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{h.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Communication History" icon={MessageCircle}>
              <Placeholder text="Per-student communication history isn't tracked yet — Notices/Messages aren't linked to individual students yet." />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <Card title="Remarks" icon={MessageSquare}>
                <RemarksList remarks={remarks.slice(0, 3)} />
                <div className="flex flex-col gap-2 mt-3">
                  <textarea value={remarkText} onChange={(e) => setRemarkText(e.target.value)} rows={2} placeholder="Add a remark about this student..." className="w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[12.5px] outline-none focus:border-blue-500 resize-none" />
                  <button type="button" disabled={busy || !remarkText.trim()} onClick={addRemark} className="self-end px-3 py-1.5 text-[12px] font-semibold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 disabled:opacity-60">Add Remark</button>
                </div>
                {remarks.length > 3 && <LinkAction label="View All Remarks" onClick={() => setActiveTab('remarks')} />}
              </Card>
            </div>
            <Card title="Discipline Summary" icon={ShieldAlert}>
              <Placeholder text="Discipline/incident tracking isn't built yet." />
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'parents' && (
        <Card title="Parent / Guardian Information" icon={Users}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <InfoLine label="Father's Name" value={d.fatherName} />
            <InfoLine label="Mother's Name" value={d.motherName} />
            <InfoLine label="Guardian Name" value={d.guardianName} />
            <InfoLine label="Father's Mobile" value={d.fatherMobile} />
            <InfoLine label="Mother's Mobile" value={d.motherMobile} />
            <InfoLine label="Email ID" value={d.email} />
            <InfoLine label="Occupation (Father)" value={d.occupationFather} />
            <InfoLine label="Occupation (Mother)" value={d.occupationMother} />
            <InfoLine label="Annual Income" value={d.annualIncome} />
            <InfoLine label="Emergency Contact" value={d.emergencyContactName} />
            <InfoLine label="Emergency Relationship" value={d.emergencyRelationship} />
            <InfoLine label="Emergency Mobile" value={d.emergencyMobile} />
          </div>
        </Card>
      )}

      {activeTab === 'academics' && (
        <Card title="Academic Details" icon={BookOpen}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <InfoLine label="Class" value={d.className} />
            <InfoLine label="Section" value={d.section} />
            <InfoLine label="Roll Number" value={d.rollNumber} />
            <InfoLine label="Academic Year" value={d.academicYear} />
            <InfoLine label="Previous School" value={d.previousSchoolName} />
            <InfoLine label="Previous Board" value={d.previousBoard} />
            <InfoLine label="Last Class Attended" value={d.lastClassAttended} />
            <InfoLine label="Last Academic Year" value={d.lastAcademicYear} />
          </div>
        </Card>
      )}

      {activeTab === 'attendance' && (
        <Card title="Attendance Records" icon={Calendar}>
          {attendance.length === 0 ? <Placeholder text="No attendance records found for this student." /> : (
            <table className="w-full text-[13px] border-collapse">
              <thead><tr className="text-[#94a3b8]"><th className="text-left font-semibold pb-2">Date</th><th className="text-left font-semibold pb-2">Class</th><th className="text-left font-semibold pb-2">Status</th></tr></thead>
              <tbody>
                {[...attendance].sort((a, b) => new Date(b.data?.date || 0) - new Date(a.data?.date || 0)).map((r) => (
                  <tr key={r._id} className="border-t border-[#f1f5f9]">
                    <td className="py-2 text-[#111827]">{formatDate(r.data?.date)}</td>
                    <td className="py-2 text-[#374151]">{[r.data?.className, r.data?.section].filter(Boolean).join(' - ') || '—'}</td>
                    <td className="py-2"><span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${r.data?.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : r.data?.status === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{r.data?.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === 'fees' && (
        <div className="flex flex-col gap-3">
          {feeSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card title="Total Fees" icon={IndianRupee}><div className="text-[20px] font-bold text-[#111827]">{money(feeSummary.totalFee)}</div></Card>
              <Card title="Paid Fees" icon={IndianRupee}><div className="text-[20px] font-bold text-emerald-600">{money(feeSummary.paidAmount)}</div></Card>
              <Card title="Outstanding Fees" icon={IndianRupee}><div className="text-[20px] font-bold text-red-600">{money(feeSummary.balance)}</div></Card>
            </div>
          )}
          <Card title="Payment History" icon={FileText}>
            {feePayments.length === 0 ? <Placeholder text="No fee payments recorded for this student." /> : (
              <table className="w-full text-[13px] border-collapse">
                <thead><tr className="text-[#94a3b8]"><th className="text-left font-semibold pb-2">Date</th><th className="text-left font-semibold pb-2">Amount</th><th className="text-left font-semibold pb-2">Mode</th><th className="text-left font-semibold pb-2">Receipt No.</th></tr></thead>
                <tbody>
                  {feePayments.map((r) => (
                    <tr key={r._id} className="border-t border-[#f1f5f9]">
                      <td className="py-2 text-[#111827]">{formatDate(r.data?.date)}</td>
                      <td className="py-2 text-[#374151]">{money(r.data?.amount)}</td>
                      <td className="py-2 text-[#374151]">{r.data?.paymentMode || '—'}</td>
                      <td className="py-2 text-[#374151]">{r.data?.receiptNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'exams' && (
        <Card title="Exam Marks" icon={FileText}>
          {marks.length === 0 ? <Placeholder text="No exam marks recorded for this student." /> : (
            <table className="w-full text-[13px] border-collapse">
              <thead><tr className="text-[#94a3b8]"><th className="text-left font-semibold pb-2">Exam</th><th className="text-left font-semibold pb-2">Subject</th><th className="text-right font-semibold pb-2">Marks Obtained</th><th className="text-right font-semibold pb-2">Max Marks</th></tr></thead>
              <tbody>
                {marks.map((r) => (
                  <tr key={r._id} className="border-t border-[#f1f5f9]">
                    <td className="py-2 text-[#111827]">{r.data?.examName || '—'}</td>
                    <td className="py-2 text-[#374151]">{r.data?.subjectName || '—'}</td>
                    <td className="py-2 text-right text-[#374151]">{r.data?.marksObtained ?? '—'}</td>
                    <td className="py-2 text-right text-[#374151]">{r.data?.maxMarks ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card title="Documents" icon={Folder}>
          <DocumentsList student={d} />
        </Card>
      )}

      {activeTab === 'remarks' && (
        <Card title="All Remarks" icon={MessageSquare}>
          <RemarksList remarks={remarks} />
          <div className="flex flex-col gap-2 mt-3 max-w-140">
            <textarea value={remarkText} onChange={(e) => setRemarkText(e.target.value)} rows={2} placeholder="Add a remark about this student..." className="w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[12.5px] outline-none focus:border-blue-500 resize-none" />
            <button type="button" disabled={busy || !remarkText.trim()} onClick={addRemark} className="self-end px-3 py-1.5 text-[12px] font-semibold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 disabled:opacity-60">Add Remark</button>
          </div>
        </Card>
      )}

      {['homework', 'transport', 'library', 'communication', 'discipline'].includes(activeTab) && (
        <Card title={TABS.find((t) => t.key === activeTab)?.label} icon={TABS.find((t) => t.key === activeTab)?.icon}>
          <Placeholder text="This section isn't tracked per-student yet — it needs its own module linkage that hasn't been built." />
        </Card>
      )}
    </div>
  );
}

function DocumentsList({ student }) {
  const items = [
    { label: 'Student Photo', available: !!student.photo?.id, onView: student.photo?.id ? () => openModuleRecordFile(student.photo.id) : null },
    { label: 'Birth Certificate', available: false },
    { label: 'Aadhaar Card', available: false },
    { label: 'Address Proof', available: false },
    { label: 'Previous School TC', available: false },
  ];
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between px-2.5 py-2 border border-[#e2e8f0] rounded-md">
          <span className="flex items-center gap-2 text-[12.5px] text-[#111827]"><FileText size={13} className={item.available ? 'text-blue-500' : 'text-[#cbd5e1]'} /> {item.label}</span>
          {item.available ? (
            <button type="button" onClick={item.onView} className="text-[11.5px] font-semibold text-blue-600 bg-transparent border-0 cursor-pointer">View</button>
          ) : <span className="text-[11px] text-[#94a3b8]">Not uploaded</span>}
        </div>
      ))}
    </div>
  );
}

function RemarksList({ remarks }) {
  if (remarks.length === 0) return <Placeholder text="No remarks yet." />;
  return (
    <div className="flex flex-col gap-2">
      {remarks.map((r, i) => (
        <div key={i} className="px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
          <p className="text-[12.5px] text-[#111827] m-0">{r.text}</p>
          <div className="text-[11px] text-[#94a3b8] mt-1">- {r.by} ({formatDateTime(r.at)})</div>
        </div>
      ))}
    </div>
  );
}
