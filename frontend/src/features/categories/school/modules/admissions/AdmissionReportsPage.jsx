import { useEffect, useMemo, useState } from 'react';
import {
  Award, Calendar, CheckCircle2, Download, FileText, Filter, Hourglass,
  Mail, Printer, TrendingDown, TrendingUp, Users, XCircle,
} from 'lucide-react';

import { listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import { downloadExcel } from '../../../../../utils/exportData.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';

const APPLICATIONS_KEY = 'school/admissions/new-admission';
const ENQUIRIES_KEY = 'school/admissions/enquiries';
const CLASS_OPTIONS = ['Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const PENDING_STATUSES = ['Submitted', 'Under Review', 'Shortlisted'];

const SOURCE_COLORS = {
  'Walk-in': '#2563eb',
  'Phone Call': '#0891b2',
  Website: '#06b6d4',
  Referral: '#f59e0b',
  'Social Media': '#ec4899',
  Other: '#94a3b8',
};

function academicYearOptions() {
  const year = new Date().getFullYear();
  return [year - 1, year, year + 1].map((y) => `${y}-${y + 1}`);
}

function pct(n, d) {
  return d ? (n / d) * 100 : 0;
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

function MiniBarChart({ data, dataKey, color }) {
  const width = 560;
  const height = 260;
  const padX = 30;
  const padY = 24;
  const padBottom = 36;
  const innerW = width - padX * 2;
  const innerH = height - padY - padBottom;
  const max = Math.max(1, ...data.map((d) => d[dataKey]));
  const gap = data.length ? innerW / data.length : 0;
  const barWidth = Math.min(28, gap * 0.6);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={padX} x2={width - padX} y1={padY + innerH - innerH * f} y2={padY + innerH - innerH * f} stroke="#eef2f7" />
      ))}
      {data.map((d, i) => {
        const barH = (d[dataKey] / max) * innerH;
        const x = padX + gap * i + (gap - barWidth) / 2;
        const y = padY + innerH - barH;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barWidth} height={Math.max(barH, 1)} rx={3} fill={color}>
              <title>{`${d.label}: ${d[dataKey]}`}</title>
            </rect>
            <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fontSize="10.5" className="fill-[#374151]">{d[dataKey]}</text>
            <text x={x + barWidth / 2} y={height - 16} textAnchor="middle" fontSize="9.5" className="fill-[#94a3b8]">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SourceDonut({ counts }) {
  const entries = Object.entries(counts);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let acc = 0;
  const arcs = entries.map(([key, value]) => {
    const dash = total ? (value / total) * circumference : 0;
    const arc = { key, value, color: SOURCE_COLORS[key] || '#94a3b8', dasharray: `${dash} ${circumference - dash}`, dashoffset: -acc };
    acc += dash;
    return arc;
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex-none" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef2f7" strokeWidth={strokeWidth} />
          {arcs.map((arc) => (
            <circle key={arc.key} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={arc.color} strokeWidth={strokeWidth} strokeDasharray={arc.dasharray} strokeDashoffset={arc.dashoffset} transform={`rotate(-90 ${size / 2} ${size / 2})`}>
              <title>{`${arc.key}: ${arc.value}`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[10.5px] text-[#94a3b8]">Total</div>
          <div className="text-[18px] font-bold text-[#111827]">{total}</div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 w-full">
        {entries.length === 0 ? (
          <p className="text-[12px] text-[#94a3b8] text-center m-0">No enquiries yet.</p>
        ) : entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex items-center gap-1.5 text-[#374151] truncate"><span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: SOURCE_COLORS[key] || '#94a3b8' }} />{key}</span>
            <span className="text-[#94a3b8] flex-none">{pct(value, total).toFixed(2)}% <span className="text-[#111827] font-semibold">({value})</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TREND_SERIES = [
  { key: 'enquiries', color: '#7c3aed', label: 'Enquiries' },
  { key: 'applications', color: '#2563eb', label: 'Applications' },
  { key: 'admissions', color: '#16a34a', label: 'Admissions' },
];

function TrendChart({ data }) {
  const width = 900;
  const height = 260;
  const padX = 26;
  const padY = 20;
  const padBottom = 28;
  const innerW = width - padX * 2;
  const innerH = height - padY - padBottom;
  const max = Math.max(1, ...data.flatMap((d) => [d.enquiries, d.applications, d.admissions]));

  function pointsFor(key) {
    return data.map((d, i) => ({
      x: padX + (data.length === 1 ? innerW / 2 : (innerW * i) / (data.length - 1)),
      y: padY + innerH - (d[key] / max) * innerH,
      value: d[key],
    }));
  }

  return (
    <div>
      <div className="flex gap-4 mb-2 flex-wrap">
        {TREND_SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11.5px] text-[#374151]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {TREND_SERIES.map((s) => {
          const pts = pointsFor(s.key);
          const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          return (
            <g key={s.key}>
              <path d={path} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" />
              {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={s.color}><title>{`${s.label}: ${p.value}`}</title></circle>)}
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = padX + (data.length === 1 ? innerW / 2 : (innerW * i) / (data.length - 1));
          return <text key={i} x={x} y={height - 8} textAnchor="middle" fontSize="10" className="fill-[#94a3b8]">{d.label}</text>;
        })}
      </svg>
    </div>
  );
}

const FUNNEL_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#16a34a'];

function FunnelChart({ stages }) {
  const maxVal = Math.max(1, ...stages.map((s) => s.value));
  const overall = stages[0]?.value ? pct(stages[stages.length - 1]?.value || 0, stages[0].value) : 0;

  return (
    <div className="flex flex-col gap-2.5">
      {stages.map((s, i) => {
        const widthPct = 25 + (s.value / maxVal) * 75;
        return (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-28 text-[11.5px] text-[#536173] text-right flex-none">{s.label}</div>
            <div className="flex-1">
              <div className="h-8 rounded-md flex items-center px-2.5 text-white text-[12px] font-semibold" style={{ width: `${widthPct}%`, background: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}>
                {s.value.toLocaleString()}
              </div>
            </div>
            <div className="w-16 text-[11px] text-[#94a3b8] flex-none">{s.pct !== null ? `(${s.pct.toFixed(2)}%)` : ''}</div>
          </div>
        );
      })}
      <div className="text-center mt-2 pt-2 border-t border-[#f1f5f9]">
        <div className="text-[11.5px] text-[#536173]">Conversion Rate</div>
        <div className="text-[20px] font-bold text-emerald-600">{overall.toFixed(2)}%</div>
      </div>
    </div>
  );
}

export function AdmissionReportsPage() {
  const [applications, setApplications] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listModuleRecords(APPLICATIONS_KEY).then((r) => r.records ?? []).catch(() => []),
      listModuleRecords(ENQUIRIES_KEY).then((r) => r.records ?? []).catch(() => []),
    ]).then(([apps, enqs]) => {
      setApplications(apps.filter((r) => r.data?.status && r.data.status !== 'Draft'));
      setEnquiries(enqs);
    }).finally(() => setLoading(false));
  }, []);

  const filteredApps = useMemo(() => applications.filter((r) => {
    const d = r.data || {};
    if (academicYear && d.academicYear !== academicYear) return false;
    if (fromDate && d.applicationDate && d.applicationDate < fromDate) return false;
    if (toDate && d.applicationDate && d.applicationDate > toDate) return false;
    return true;
  }), [applications, academicYear, fromDate, toDate]);

  const filteredEnqs = useMemo(() => enquiries.filter((r) => {
    const d = r.data || {};
    if (academicYear && d.academicYear !== academicYear) return false;
    if (fromDate && d.enquiryDate && d.enquiryDate < fromDate) return false;
    if (toDate && d.enquiryDate && d.enquiryDate > toDate) return false;
    return true;
  }), [enquiries, academicYear, fromDate, toDate]);

  const stats = useMemo(() => {
    const totalEnquiries = filteredEnqs.length;
    const totalApplications = filteredApps.length;
    const pending = filteredApps.filter((r) => PENDING_STATUSES.includes(r.data?.status)).length;
    const approved = filteredApps.filter((r) => r.data?.status === 'Approved').length;
    const rejected = filteredApps.filter((r) => r.data?.status === 'Rejected').length;
    return { totalEnquiries, totalApplications, pending, approved, rejected, conversionRate: pct(approved, totalApplications) };
  }, [filteredApps, filteredEnqs]);

  const classRows = useMemo(() => CLASS_OPTIONS.map((cls) => {
    const enq = filteredEnqs.filter((r) => r.data?.classInterested === cls).length;
    const apps = filteredApps.filter((r) => r.data?.classApplyingFor === cls);
    const pending = apps.filter((r) => PENDING_STATUSES.includes(r.data?.status)).length;
    const approved = apps.filter((r) => r.data?.status === 'Approved').length;
    const rejected = apps.filter((r) => r.data?.status === 'Rejected').length;
    return { cls, enquiries: enq, applications: apps.length, pending, approved, rejected, admissions: approved, conversion: pct(approved, apps.length) };
  }).filter((row) => row.enquiries > 0 || row.applications > 0), [filteredApps, filteredEnqs]);

  const sourceBreakdown = useMemo(() => {
    const counts = {};
    filteredEnqs.forEach((r) => {
      const src = r.data?.source || 'Other';
      counts[src] = (counts[src] || 0) + 1;
    });
    return counts;
  }, [filteredEnqs]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) };
    });
    return months.map((m) => {
      const enq = filteredEnqs.filter((r) => {
        const dt = r.data?.enquiryDate ? new Date(r.data.enquiryDate) : null;
        return dt && dt.getFullYear() === m.year && dt.getMonth() === m.month;
      }).length;
      const apps = filteredApps.filter((r) => {
        const dt = r.data?.applicationDate ? new Date(r.data.applicationDate) : null;
        return dt && dt.getFullYear() === m.year && dt.getMonth() === m.month;
      });
      const admissions = apps.filter((r) => r.data?.status === 'Approved').length;
      return { label: m.label, enquiries: enq, applications: apps.length, admissions };
    });
  }, [filteredApps, filteredEnqs]);

  const funnelStages = useMemo(() => {
    const totalEnq = filteredEnqs.length;
    const totalApps = filteredApps.length;
    const shortlisted = filteredApps.filter((r) => ['Shortlisted', 'Approved'].includes(r.data?.status)).length;
    const approved = filteredApps.filter((r) => r.data?.status === 'Approved').length;
    return [
      { label: 'Total Enquiries', value: totalEnq, pct: null },
      { label: 'Total Applications', value: totalApps, pct: pct(totalApps, totalEnq) },
      { label: 'Shortlisted', value: shortlisted, pct: pct(shortlisted, totalApps) },
      { label: 'Approved Admissions', value: approved, pct: pct(approved, shortlisted) },
    ];
  }, [filteredApps, filteredEnqs]);

  const quickSummary = useMemo(() => {
    if (!classRows.length) return null;
    const highestApplications = [...classRows].sort((a, b) => b.applications - a.applications)[0];
    const highestAdmissions = [...classRows].sort((a, b) => b.admissions - a.admissions)[0];
    const withApps = classRows.filter((r) => r.applications > 0);
    const bestConversion = withApps.length ? [...withApps].sort((a, b) => b.conversion - a.conversion)[0] : null;
    const lowestConversion = withApps.length ? [...withApps].sort((a, b) => a.conversion - b.conversion)[0] : null;
    return { highestApplications, highestAdmissions, bestConversion, lowestConversion };
  }, [classRows]);

  function resetFilters() {
    setAcademicYear('');
    setFromDate('');
    setToDate('');
  }

  function exportSummary() {
    downloadExcel({
      title: 'Admission Reports — Summary By Class',
      filename: 'admission-reports-summary',
      rows: classRows.map((r) => ({
        cls: r.cls, enquiries: r.enquiries, applications: r.applications, pending: r.pending,
        approved: r.approved, rejected: r.rejected, admissions: r.admissions, conversion: `${r.conversion.toFixed(2)}%`,
      })),
      columns: [
        { key: 'cls', label: 'Class' }, { key: 'enquiries', label: 'Enquiries' }, { key: 'applications', label: 'Applications' },
        { key: 'pending', label: 'Pending' }, { key: 'approved', label: 'Approved' }, { key: 'rejected', label: 'Rejected' },
        { key: 'admissions', label: 'Admissions' }, { key: 'conversion', label: 'Conversion Rate' },
      ],
    });
  }

  function showNotice(text) {
    setNotice(text);
    setTimeout(() => setNotice(''), 4000);
  }

  const totalsRow = classRows.reduce((acc, r) => ({
    enquiries: acc.enquiries + r.enquiries, applications: acc.applications + r.applications, pending: acc.pending + r.pending,
    approved: acc.approved + r.approved, rejected: acc.rejected + r.rejected, admissions: acc.admissions + r.admissions,
  }), { enquiries: 0, applications: 0, pending: 0, approved: 0, rejected: 0, admissions: 0 });

  return (
    <div className="p-4 md:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>Admissions</span><span>›</span><span>Admission Reports</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Admission Reports</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40"><SelectDropdown value={academicYear} onChange={setAcademicYear} options={academicYearOptions()} placeholder="Academic Year" /></div>
          <div className="flex items-center gap-1.5 border border-[#dbe4ef] rounded-md px-2.5 py-1.5 bg-white">
            <Calendar size={14} className="text-[#94a3b8]" />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="text-[12.5px] outline-none border-0 font-[inherit] w-32" />
            <span className="text-[#94a3b8]">–</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="text-[12.5px] outline-none border-0 font-[inherit] w-32" />
          </div>
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50"><Filter size={13} /> Reset</button>
          <button type="button" onClick={exportSummary} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0"><Download size={14} /> Export</button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50"><Printer size={14} /> Print</button>
        </div>
      </div>

      {notice && <div className="mb-4 rounded-lg px-4 py-2.5 bg-blue-50 border border-blue-100 text-blue-700 text-[12.5px]">{notice}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <StatCard icon={Users} iconColor="#7c3aed" iconBg="#f5f3ff" label="Total Enquiries" value={stats.totalEnquiries} sub="This academic year" />
        <StatCard icon={FileText} iconColor="#2563eb" iconBg="#eff6ff" label="Total Applications" value={stats.totalApplications} sub={`${pct(stats.totalApplications, stats.totalEnquiries).toFixed(2)}% of enquiries`} />
        <StatCard icon={Hourglass} iconColor="#d97706" iconBg="#fffbeb" label="Pending Applications" value={stats.pending} sub={`${pct(stats.pending, stats.totalApplications).toFixed(2)}% of applications`} />
        <StatCard icon={CheckCircle2} iconColor="#16a34a" iconBg="#f0fdf4" label="Approved Applications" value={stats.approved} sub={`${pct(stats.approved, stats.totalApplications).toFixed(2)}% of applications`} />
        <StatCard icon={XCircle} iconColor="#dc2626" iconBg="#fef2f2" label="Rejected Applications" value={stats.rejected} sub={`${pct(stats.rejected, stats.totalApplications).toFixed(2)}% of applications`} />
        <StatCard icon={Filter} iconColor="#0891b2" iconBg="#ecfeff" label="Conversion Rate" value={`${stats.conversionRate.toFixed(2)}%`} sub="Applications → Admissions" />
      </div>

      {loading ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl p-10 text-center text-[13px] text-[#536173]">Loading report data…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <h2 className="m-0 mb-3 text-[14px] font-bold text-[#111827]">Class-wise Applications</h2>
              <MiniBarChart data={classRows.map((r) => ({ label: r.cls, applications: r.applications }))} dataKey="applications" color="#2563eb" />
            </div>
            <div className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <h2 className="m-0 mb-3 text-[14px] font-bold text-[#111827]">Class-wise Admissions</h2>
              <MiniBarChart data={classRows.map((r) => ({ label: r.cls, admissions: r.admissions }))} dataKey="admissions" color="#16a34a" />
            </div>
            <div className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <h2 className="m-0 mb-3 text-[14px] font-bold text-[#111827]">Admission Source</h2>
              <SourceDonut counts={sourceBreakdown} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4 mb-4">
            <div className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <h2 className="m-0 mb-3 text-[14px] font-bold text-[#111827]">Admission Trend (Monthly)</h2>
              <TrendChart data={monthlyTrend} />
            </div>
            <div className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <h2 className="m-0 mb-3 text-[14px] font-bold text-[#111827]">Conversion Funnel</h2>
              <FunnelChart stages={funnelStages} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
            <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#edf2f7] text-[13px] font-semibold text-[#111827]">Summary By Class</div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Class', 'Enquiries', 'Applications', 'Pending', 'Approved', 'Rejected', 'Admissions', 'Conversion Rate'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#536173] border-b border-[#edf2f7] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classRows.length === 0 ? (
                      <tr><td colSpan={8} className="text-[13px] text-[#536173] px-4 py-8 text-center">No admission data yet.</td></tr>
                    ) : (
                      <>
                        {classRows.map((r) => (
                          <tr key={r.cls} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] font-medium text-[#111827]">{r.cls}</td>
                            <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{r.enquiries}</td>
                            <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{r.applications}</td>
                            <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{r.pending}</td>
                            <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{r.approved}</td>
                            <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{r.rejected}</td>
                            <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{r.admissions}</td>
                            <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{r.conversion.toFixed(2)}%</td>
                          </tr>
                        ))}
                        <tr className="font-semibold bg-[#f8fafc]">
                          <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#111827]">Total</td>
                          <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#111827]">{totalsRow.enquiries}</td>
                          <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#111827]">{totalsRow.applications}</td>
                          <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#111827]">{totalsRow.pending}</td>
                          <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#111827]">{totalsRow.approved}</td>
                          <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#111827]">{totalsRow.rejected}</td>
                          <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#111827]">{totalsRow.admissions}</td>
                          <td className="px-4 py-2.5 border-b border-[#f3f4f6] text-[13px] text-[#111827]">{pct(totalsRow.approved, totalsRow.applications).toFixed(2)}%</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-white border border-[#dfe7f1] rounded-xl p-4">
                <h2 className="m-0 mb-3 text-[14px] font-bold text-[#111827]">Quick Summary</h2>
                {!quickSummary ? (
                  <p className="text-[12.5px] text-[#94a3b8] m-0">No data yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-none"><TrendingUp size={14} /></span>
                      <div className="flex-1 min-w-0"><div className="text-[11.5px] text-[#94a3b8]">Highest Applications</div><div className="text-[13px] font-semibold text-[#111827]">{quickSummary.highestApplications.cls}</div></div>
                      <div className="text-[13px] font-bold text-[#111827]">{quickSummary.highestApplications.applications}</div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-none"><CheckCircle2 size={14} /></span>
                      <div className="flex-1 min-w-0"><div className="text-[11.5px] text-[#94a3b8]">Highest Admissions</div><div className="text-[13px] font-semibold text-[#111827]">{quickSummary.highestAdmissions.cls}</div></div>
                      <div className="text-[13px] font-bold text-[#111827]">{quickSummary.highestAdmissions.admissions}</div>
                    </div>
                    {quickSummary.bestConversion && (
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-none"><Award size={14} /></span>
                        <div className="flex-1 min-w-0"><div className="text-[11.5px] text-[#94a3b8]">Best Conversion Rate</div><div className="text-[13px] font-semibold text-[#111827]">{quickSummary.bestConversion.cls}</div></div>
                        <div className="text-[13px] font-bold text-[#111827]">{quickSummary.bestConversion.conversion.toFixed(2)}%</div>
                      </div>
                    )}
                    {quickSummary.lowestConversion && (
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-none"><TrendingDown size={14} /></span>
                        <div className="flex-1 min-w-0"><div className="text-[11.5px] text-[#94a3b8]">Lowest Conversion Rate</div><div className="text-[13px] font-semibold text-[#111827]">{quickSummary.lowestConversion.cls}</div></div>
                        <div className="text-[13px] font-bold text-[#111827]">{quickSummary.lowestConversion.conversion.toFixed(2)}%</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#dfe7f1] rounded-xl p-4">
                <h2 className="m-0 mb-3 text-[14px] font-bold text-[#111827]">Actions</h2>
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={exportSummary} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0"><Download size={13} /> Export Detailed Report</button>
                  <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold text-[#374151] bg-[#f1f5f9] rounded-md cursor-pointer hover:bg-[#e2e8f0] border-0"><Printer size={13} /> Print Report</button>
                  <button type="button" onClick={() => showNotice('Email delivery is not set up yet.')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold text-[#374151] bg-[#f1f5f9] rounded-md cursor-pointer hover:bg-[#e2e8f0] border-0"><Mail size={13} /> Email Report</button>
                  <button type="button" onClick={() => showNotice('Scheduled reports are not set up yet.')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold text-[#374151] bg-[#f1f5f9] rounded-md cursor-pointer hover:bg-[#e2e8f0] border-0"><Calendar size={13} /> Schedule Report</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
