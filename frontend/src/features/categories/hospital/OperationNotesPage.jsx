import { useMemo, useState } from 'react';
import { CheckCircle2, FileSignature, FileText, Save } from 'lucide-react';

import { useModuleRecords } from '../shared/recordUi/useModuleRecords.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const ANESTHESIA = ['General', 'Spinal', 'Epidural', 'Local', 'Regional', 'Sedation'];


function displayDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function displayTime(value = '') {
  const [hour, minute] = String(value).split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value || '-';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${String(hour % 12 || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function Button({ children, icon: Icon, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} font-[inherit] transition disabled:cursor-not-allowed disabled:opacity-60`}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[12px] font-extrabold uppercase text-[#536173]">{label}</span>
      {children}
    </label>
  );
}

export function OperationNotesPage() {
  const otBookings = useModuleRecords('hospital/ot-booking');
  const operationNotes = useModuleRecords('hospital/operation-notes');
  const medicalHistory = useModuleRecords('hospital/medical-history');
  const ipdProcedures = useModuleRecords('hospital/ipd-procedures');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [message, setMessage] = useState('');
  const bookings = otBookings.records;
  const selected = bookings.find((record) => record._id === selectedBookingId) || bookings[0] || null;
  const data = selected?.data || {};
  const [form, setForm] = useState({
    preOpDiagnosis: '',
    postOpDiagnosis: '',
    procedurePerformed: '',
    anesthesia: 'General',
    findings: '',
    procedureDetails: '',
    specimens: '',
    bloodLoss: '',
    complications: '',
    implants: '',
    instruments: '',
    postOpInstructions: '',
    surgeonNotes: '',
    anesthetistNotes: '',
    digitalSignature: '',
  });

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function payload(status) {
    return {
      ...form,
      surgeryId: data.surgeryId,
      surgery: data.surgery,
      patientName: data.patientName,
      patientId: data.patientId,
      surgeon: data.surgeon,
      anesthetist: data.anesthetist,
      ot: data.ot,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime || '',
      status,
      finalizedAt: status === 'FINALIZED' ? new Date().toISOString() : '',
      name: `${data.surgery || 'Surgery'} Operation Note - ${data.patientName || 'Patient'}`,
      reportType: 'Final Operation Report',
    };
  }

  async function saveDraft() {
    await operationNotes.create(payload('DRAFT'));
    setMessage('Operation note draft saved.');
  }

  async function finalizeNote() {
    if (!form.preOpDiagnosis || !form.postOpDiagnosis || !form.procedurePerformed) {
      window.alert('Diagnosis and procedure performed are required before finalizing.');
      return;
    }
    const finalPayload = payload('FINALIZED');
    await operationNotes.create(finalPayload);
    await medicalHistory.create({
      patientName: data.patientName,
      patientId: data.patientId,
      category: 'Surgery History',
      name: `${data.surgery} - ${displayDate(data.date)}`,
      surgeryId: data.surgeryId,
      surgeon: data.surgeon,
      diagnosis: form.postOpDiagnosis,
      procedurePerformed: form.procedurePerformed,
      notes: form.surgeonNotes,
      status: 'Finalized',
      date: data.date,
    });
    await ipdProcedures.create({
      patientName: data.patientName,
      patientId: data.patientId,
      surgeryId: data.surgeryId,
      name: form.procedurePerformed,
      procedure: form.procedurePerformed,
      surgeon: data.surgeon,
      anesthetist: data.anesthetist,
      notes: form.procedureDetails,
      status: 'Completed',
      date: data.date,
    });
    setMessage('Final operation report saved to Patient Medical History and IPD Treatment Procedures.');
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[13px] font-semibold text-[#64748b]">Home &gt; Emergency & OT &gt; Operation Notes</div>
          <h1 className="m-0 text-[26px] font-extrabold text-[#071936]">Operation Notes</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Clinical record of what actually happened during surgery.</p>
        </div>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-extrabold text-blue-700">Final operation report</span>
      </div>

      {message && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-[13px] font-semibold text-green-700">{message}</div>}

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        <div className="grid gap-4 border-b border-[#edf2f7] bg-[#fbfdff] p-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[14px] font-extrabold uppercase text-[#071936]"><FileText size={16} />Operation Notes</div>
            <div className="grid gap-2 text-[13px] font-semibold text-[#334155] md:grid-cols-2 xl:grid-cols-3">
              <div>Surgery: <strong>{data.surgery || '-'}</strong></div>
              <div>Surgery ID: <strong>{data.surgeryId || '-'}</strong></div>
              <div>Patient: <strong>{data.patientName || '-'} - {data.patientId || '-'}</strong></div>
              <div>Surgeon: <strong>{data.surgeon || '-'}</strong></div>
              <div>Anesthetist: <strong>{data.anesthetist || '-'}</strong></div>
              <div>OT: <strong>{data.ot || '-'}</strong></div>
              <div>Date: <strong>{displayDate(data.date)}</strong></div>
              <div>Time: <strong>{displayTime(data.startTime || '09:10')} to {displayTime(data.endTime || '10:45')}</strong></div>
            </div>
          </div>
          <Field label="Select Surgery / OT Booking">
            <select className={INPUT} value={selected?._id || ''} onChange={(event) => setSelectedBookingId(event.target.value)}>
              {bookings.map((booking) => <option key={booking._id} value={booking._id}>{booking.data?.surgeryId || booking.data?.surgery || booking._id}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Pre-operative Diagnosis"><input className={INPUT} value={form.preOpDiagnosis} onChange={(event) => set('preOpDiagnosis', event.target.value)} /></Field>
              <Field label="Post-operative Diagnosis"><input className={INPUT} value={form.postOpDiagnosis} onChange={(event) => set('postOpDiagnosis', event.target.value)} /></Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Procedure Performed"><input className={INPUT} value={form.procedurePerformed} onChange={(event) => set('procedurePerformed', event.target.value)} /></Field>
              <Field label="Anesthesia"><select className={INPUT} value={form.anesthesia} onChange={(event) => set('anesthesia', event.target.value)}>{ANESTHESIA.map((item) => <option key={item}>{item}</option>)}</select></Field>
            </div>

            <Field label="Operative Findings"><textarea className={`${TEXTAREA} min-h-24`} value={form.findings} onChange={(event) => set('findings', event.target.value)} /></Field>
            <Field label="Procedure Details"><textarea className={`${TEXTAREA} min-h-32`} value={form.procedureDetails} onChange={(event) => set('procedureDetails', event.target.value)} /></Field>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Specimens"><input className={INPUT} value={form.specimens} onChange={(event) => set('specimens', event.target.value)} /></Field>
              <Field label="Estimated Blood Loss"><input className={INPUT} value={form.bloodLoss} onChange={(event) => set('bloodLoss', event.target.value)} /></Field>
              <Field label="Complications"><input className={INPUT} value={form.complications} onChange={(event) => set('complications', event.target.value)} /></Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Implants"><input className={INPUT} value={form.implants} onChange={(event) => set('implants', event.target.value)} /></Field>
              <Field label="Instruments"><input className={INPUT} value={form.instruments} onChange={(event) => set('instruments', event.target.value)} /></Field>
            </div>

            <Field label="Post-operative Instructions"><textarea className={`${TEXTAREA} min-h-24`} value={form.postOpInstructions} onChange={(event) => set('postOpInstructions', event.target.value)} /></Field>
            <Field label="Surgeon Notes"><textarea className={`${TEXTAREA} min-h-24`} value={form.surgeonNotes} onChange={(event) => set('surgeonNotes', event.target.value)} /></Field>
            <Field label="Anesthetist Notes"><textarea className={`${TEXTAREA} min-h-24`} value={form.anesthetistNotes} onChange={(event) => set('anesthetistNotes', event.target.value)} /></Field>
          </main>

          <aside className="space-y-4">
            <div className="rounded-lg border border-[#dfe7f1] bg-[#f8fbff] p-4">
              <div className="mb-2 flex items-center gap-2 text-[14px] font-extrabold text-[#071936]"><FileSignature size={15} />Digital Signature</div>
              <input className={INPUT} value={form.digitalSignature} onChange={(event) => set('digitalSignature', event.target.value)} />
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-[13px] font-semibold text-emerald-800">
              Finalized notes appear under Patient &gt; Medical History &gt; Surgery History and IPD &gt; Treatment &gt; Procedures.
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button icon={Save} onClick={saveDraft}>Save Draft</Button>
              <Button icon={CheckCircle2} tone="green" onClick={finalizeNote}>Finalize Operation Note</Button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

