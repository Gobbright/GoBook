import { useMemo, useState } from 'react';
import { CalendarDays, Clock } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { todayISO, fmtDate } from '../../../shared/recordUi/dateUtils.js';

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientEmail', label: 'Patient Email', type: 'email', required: true },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'time', label: 'Time', type: 'time' },
  { key: 'reason', label: 'Reason for Visit' },
  { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Completed', 'Cancelled', 'No Show'] },
];

export function AppointmentsPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/appointments');
  const patients = useLookupRecords('hospital/patients');
  const doctors = useLookupRecords('hospital/doctors');
  const departments = useLookupRecords('hospital/departments');
  const [date, setDate] = useState(todayISO());
  const [modal, setModal] = useState(null);

  const lookupOptions = {
    'hospital/patients': names(patients.records),
    'hospital/doctors': names(doctors.records),
    'hospital/departments': names(departments.records),
  };

  const dayAppointments = useMemo(() =>
    records
      .filter((r) => r.data?.date === date)
      .sort((a, b) => (a.data?.time || '').localeCompare(b.data?.time || '')),
  [records, date]);

  const stats = useMemo(() => {
    const total = dayAppointments.length;
    const completed = dayAppointments.filter((r) => r.data?.status === 'Completed').length;
    const scheduled = dayAppointments.filter((r) => r.data?.status === 'Scheduled').length;
    const cancelled = dayAppointments.filter((r) => ['Cancelled', 'No Show'].includes(r.data?.status)).length;
    return { total, completed, scheduled, cancelled };
  }, [dayAppointments]);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this appointment?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Appointments" group="Patient Management" subtitle="Daily schedule across all doctors" actionLabel="Add Appointments" onAction={() => setModal({ mode: 'add', record: { data: { date } } })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Appointment' : 'Edit Appointment'}
          fields={FIELDS}
          initial={modal.record?.data}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Appointment' : 'Update Appointment'}
        />
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-blue-600" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" />
        </div>
        <button type="button" onClick={() => setDate(todayISO())} className="text-[12px] text-blue-600 bg-transparent border-0 cursor-pointer font-[inherit] hover:underline">Today</button>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-[12px] text-[#536173]">
          <span><strong className="text-[#111827]">{stats.total}</strong> total</span>
          <span><strong className="text-amber-600">{stats.scheduled}</strong> scheduled</span>
          <span><strong className="text-green-600">{stats.completed}</strong> completed</span>
          <span><strong className="text-red-500">{stats.cancelled}</strong> cancelled/no-show</span>
        </div>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="px-5 py-3.5 border-b border-[#edf2f7]">
          <h2 className="m-0 text-[14px] font-semibold text-[#111827]">Schedule for {fmtDate(date)}</h2>
        </div>
        {loading ? (
          <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
        ) : dayAppointments.length === 0 ? (
          <p className="text-[13px] text-[#536173] px-5 py-8 text-center">No appointments scheduled for this date.</p>
        ) : (
          <div className="divide-y divide-[#f3f4f6]">
            {dayAppointments.map((r) => (
              <div key={r._id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-20 flex-none flex items-center gap-1.5 text-[13px] font-semibold text-[#111827]">
                  <Clock size={13} className="text-[#94a3b8]" />
                  {r.data?.time || '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#111827]">{r.data?.patientName || 'Unnamed patient'}</div>
                  <div className="text-xs text-[#94a3b8]">
                    {r.data?.doctorName ? `Dr. ${r.data.doctorName.replace(/^Dr\.?\s*/i, '')}` : 'No doctor assigned'}
                    {r.data?.departmentName ? ` · ${r.data.departmentName}` : ''}
                    {r.data?.reason ? ` · ${r.data.reason}` : ''}
                  </div>
                </div>
                <StatusBadge value={r.data?.status} />
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
