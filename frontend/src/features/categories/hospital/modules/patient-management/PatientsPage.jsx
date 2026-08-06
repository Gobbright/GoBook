import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  ClipboardPlus,
  CreditCard,
  FileText,
  History,
  IndianRupee,
  MoreHorizontal,
  Phone,
  Search,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';

const FIELDS = [
  { key: 'name', label: 'Patient Name', required: true },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'age', label: 'Age', type: 'number' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'bloodGroup', label: 'Blood Group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'emergencyContact', label: 'Emergency Contact' },
  { key: 'address', label: 'Address', type: 'textarea', full: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
];

const PROFILE_TABS = ['Overview', 'Appointments', 'Visits', 'Medical History', 'Prescriptions', 'Laboratory', 'Radiology', 'Admissions', 'Documents', 'Insurance', 'Billing'];
const SELECT = 'h-8 rounded-md border border-[#dbe4ef] bg-white px-2.5 text-[12.5px] font-[inherit] text-[#374151] outline-none focus:border-blue-500';

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}

function shortGender(gender = '') {
  return gender ? gender[0].toUpperCase() : '-';
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function patientDate(record) {
  return record.data?.lastVisit || record.data?.updatedAt || record.updatedAt || record.createdAt;
}

function phoneOf(data = {}) {
  return data.phone || data.mobile || '';
}

function ActionButton({ children, onClick, tone = 'blue' }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white',
    green: 'border-emerald-600 bg-emerald-600 text-white',
    white: 'border-[#dbe4ef] bg-white text-[#374151]',
  };
  return (
    <button type="button" onClick={onClick} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-semibold cursor-pointer ${tones[tone]}`}>
      {children}
    </button>
  );
}

function MoreMenu({ record, onEdit, onNavigate }) {
  const [open, setOpen] = useState(false);
  const data = record.data || {};
  const patientName = data.name || '';
  const items = [
    ['Edit Patient', () => onEdit(record)],
    ['Start OPD Visit', () => onNavigate('/hospital/consultation', { patientName })],
    ['Admit Patient', () => onNavigate('/hospital/admission', { patientName })],
    ['Medical History', () => onNavigate('/hospital/medical-history', { patientName })],
    ['Prescriptions', () => onNavigate('/hospital/prescription', { patientName })],
    ['Documents', () => onNavigate('/hospital/patient-documents', { patientName })],
    ['Insurance', () => onNavigate('/hospital/insurance-details', { patientName })],
    ['Print Patient Card', () => window.print()],
  ];
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#374151] cursor-pointer" aria-label="Patient actions">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-md border border-[#dfe7f1] bg-white shadow-lg">
          {items.map(([label, handler]) => (
            <button
              key={label}
              type="button"
              onClick={() => { setOpen(false); handler(); }}
              className="block w-full border-0 bg-white px-3 py-2 text-left text-[12.5px] text-[#374151] cursor-pointer hover:bg-blue-50"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTabContent({ tab, patient }) {
  const data = patient?.data || {};
  if (tab === 'Overview') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Mobile', phoneOf(data) || '-'],
          ['Email', data.email || '-'],
          ['Emergency', data.emergencyContact || '-'],
          ['Address', data.address || '-'],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">{label}</div>
            <div className="mt-0.5 truncate text-[12.5px] font-medium text-[#111827]">{value}</div>
          </div>
        ))}
      </div>
    );
  }
  return <div className="text-[12.5px] text-[#536173]">{tab} records for this patient will appear here as the hospital workflow grows.</div>;
}

export function PatientsPage() {
  const navigate = useNavigate();
  const { records, loading, create, update, remove } = useModuleRecords('hospital/patients');
  const medicalHistory = useModuleRecords('hospital/medical-history');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Patients');
  const [genderFilter, setGenderFilter] = useState('Gender');
  const [bloodFilter, setBloodFilter] = useState('Blood Group');
  const [dateFilter, setDateFilter] = useState('Date');
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [modal, setModal] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = new Date().toDateString();
    return records.filter((record) => {
      const data = record.data || {};
      const haystack = [data.patientId, data.name, phoneOf(data), data.email].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesStatus = statusFilter === 'All Patients' || (data.status || 'Active') === statusFilter;
      const matchesGender = genderFilter === 'Gender' || data.gender === genderFilter;
      const matchesBlood = bloodFilter === 'Blood Group' || data.bloodGroup === bloodFilter;
      const dateValue = patientDate(record);
      const matchesDate = dateFilter === 'Date' || (dateFilter === 'Today' && dateValue && new Date(dateValue).toDateString() === today);
      return matchesSearch && matchesStatus && matchesGender && matchesBlood && matchesDate;
    });
  }, [records, search, statusFilter, genderFilter, bloodFilter, dateFilter]);

  const selected = records.find((record) => record._id === selectedId) || filtered[0] || null;
  const selectedAllergies = useMemo(() => {
    const patientName = selected?.data?.name;
    if (!patientName) return [];
    return medicalHistory.records
      .filter((record) => record.data?.patientName === patientName && record.data?.category === 'Allergies')
      .map((record) => record.data?.allergy)
      .filter(Boolean);
  }, [medicalHistory.records, selected]);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  function go(path, state = {}) {
    navigate(path, { state });
  }

  async function deletePatient(record) {
    if (!window.confirm(`Delete ${record.data?.name || 'this patient'}?`)) return;
    await remove(record._id);
    if (selectedId === record._id) setSelectedId(null);
  }

  return (
    <div className="p-3 md:p-4">
      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Patient' : 'Edit Patient'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Patient' : 'Update Patient'}
        />
      )}

      <div className="rounded-xl border border-[#dfe7f1] bg-white p-3">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h1 className="m-0 text-[20px] font-extrabold text-[#111827]">Patients</h1>
          <ActionButton onClick={() => navigate('/hospital/patient-registration')} tone="green">
            <UserPlus size={14} />Register Patient
          </ActionButton>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              className="h-9 w-full rounded-md border border-[#dbe4ef] bg-white pl-8 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500"
              placeholder="Search Name / Patient ID / Mobile / Email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className={SELECT} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {['All Patients', 'Active', 'Inactive'].map((option) => <option key={option}>{option}</option>)}
            </select>
            <select className={SELECT} value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)}>
              {['Gender', 'Male', 'Female', 'Other'].map((option) => <option key={option}>{option}</option>)}
            </select>
            <select className={SELECT} value={bloodFilter} onChange={(event) => setBloodFilter(event.target.value)}>
              {['Blood Group', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((option) => <option key={option}>{option}</option>)}
            </select>
            <select className={SELECT} value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              {['Date', 'Today'].map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-[#edf2f7]">
          <table className="w-full min-w-[840px] border-collapse">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[#64748b]">
                {['Patient ID', 'Patient', 'Mobile', 'Age/Gender', 'Last Visit', 'Actions'].map((heading) => (
                  <th key={heading} className="px-3 py-2 font-extrabold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="px-3 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="px-3 py-8 text-center text-[13px] text-[#536173]">No patients found.</td></tr>
              ) : filtered.map((record) => {
                const data = record.data || {};
                const active = selected?._id === record._id;
                return (
                  <tr key={record._id} onClick={() => { setSelectedId(record._id); setActiveTab('Overview'); }} className={`border-t border-[#edf2f7] text-[13px] cursor-pointer ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-2 font-semibold text-[#0f4c81]">{data.patientId || '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-blue-100 text-[12px] font-extrabold text-blue-700">{initials(data.name)}</span>
                        <span className="font-semibold text-[#111827]">{data.name || 'Unnamed'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[#374151]">{phoneOf(data) || '-'}</td>
                    <td className="px-3 py-2 text-[#374151]">{data.age || '-'} / {shortGender(data.gender)}</td>
                    <td className="px-3 py-2 text-[#374151]">{formatDate(patientDate(record))}</td>
                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <ActionButton onClick={() => go('/hospital/book-appointment', { patientName: data.name, patientId: data.patientId })} tone="blue">
                          <CalendarCheck size={13} />Book
                        </ActionButton>
                        <ActionButton onClick={() => deletePatient(record)} tone="white">Delete</ActionButton>
                        <MoreMenu record={record} onEdit={(nextRecord) => setModal({ mode: 'edit', record: nextRecord })} onNavigate={go} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[#dfe7f1] bg-white p-3">
        {!selected ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-[#536173]">
            <User size={18} />Select a patient to open the 360 patient profile.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-blue-100 text-[16px] font-extrabold text-blue-700">{initials(selected.data?.name)}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <h2 className="m-0 text-[18px] font-extrabold uppercase text-[#111827]">{selected.data?.name || 'Unnamed Patient'}</h2>
                    <span className="text-[13px] font-extrabold text-[#0f4c81]">{selected.data?.patientId || '-'}</span>
                  </div>
                  <div className="mt-1 text-[12.5px] text-[#536173]">
                    {selected.data?.age || '-'} Years | {selected.data?.gender || '-'} | {selected.data?.bloodGroup || '-'}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#374151]"><Phone size={13} />{phoneOf(selected.data) || '-'}</div>
                  {(selectedAllergies.length > 0 || selected.data?.knownAllergies) && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[12px] font-semibold text-amber-800">
                      Allergy: {selectedAllergies.join(', ') || selected.data?.knownAllergies}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={() => go('/hospital/book-appointment', { patientName: selected.data?.name, patientId: selected.data?.patientId })} tone="blue">
                  <CalendarCheck size={14} />+ Appointment
                </ActionButton>
                <ActionButton onClick={() => go('/hospital/consultation', { patientName: selected.data?.name })} tone="green">
                  <ClipboardPlus size={14} />+ OPD Visit
                </ActionButton>
                <ActionButton onClick={() => go('/hospital/admission', { patientName: selected.data?.name })} tone="white">
                  Admit Patient
                </ActionButton>
                <ActionButton onClick={() => go('/hospital/new-bill', { patientName: selected.data?.name })} tone="white">
                  <IndianRupee size={14} />Generate Bill
                </ActionButton>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1 border-t border-[#edf2f7] pt-3">
              {PROFILE_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`h-8 rounded-md border px-2.5 text-[12.5px] font-semibold cursor-pointer ${activeTab === tab ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-transparent bg-white text-[#536173] hover:bg-gray-50'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-lg border border-[#edf2f7] bg-[#fbfdff] p-3">
              <ProfileTabContent tab={activeTab} patient={selected} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                [History, 'Medical History', '/hospital/medical-history'],
                [FileText, 'Documents', '/hospital/patient-documents'],
                [ShieldCheck, 'Insurance', '/hospital/insurance-details'],
                [CreditCard, 'Billing', '/hospital/new-bill'],
              ].map(([Icon, label, path]) => (
                <button key={label} type="button" onClick={() => go(path, { patientName: selected.data?.name })} className="flex h-9 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white text-[12.5px] font-semibold text-[#374151] cursor-pointer hover:bg-blue-50">
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
