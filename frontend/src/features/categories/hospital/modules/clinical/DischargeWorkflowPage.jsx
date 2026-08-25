import { useMemo, useState } from 'react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const DISCHARGE_TYPES = ['Normal', 'Against Medical Advice / LAMA', 'Transfer to Another Hospital', 'Absconded', 'Deceased'];
const CONDITIONS = ['Stable', 'Improved', 'Critical', 'Referred', 'Deceased'];
const CHECKLIST = ['Doctor clearance', 'Nursing clearance', 'Pharmacy clearance', 'Diagnostics completed', 'Final bill prepared', 'Payment cleared', 'Documents handed over'];

function normalize(value = '') {
  return String(value || '-').trim().toLowerCase();
}

function stayDays(admissionDate, dischargeDate) {
  const start = new Date(admissionDate || dischargeDate);
  const end = new Date(dischargeDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(Math.floor((end - start) / 86400000), 1);
}

function fmt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function bedMatches(record, admission) {
  const bed = record.data || {};
  const data = admission.data || {};
  return (data.ipdNo && bed.ipdNo === data.ipdNo)
    || ((bed.wardName || bed.ward) === data.wardName && (bed.roomName || bed.roomNumber) === data.roomName && (bed.bedNumber || bed.name) === data.bedNumber);
}

function Line() {
  return <div className="my-8 h-px max-w-[610px] bg-black/70" />;
}

function BracketButton({ children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="bg-transparent font-mono text-[14px] text-black outline-none disabled:opacity-50"
    >
      [{children}]
    </button>
  );
}

function BracketInput({ value, onChange, className = '', multiline = false }) {
  const shared = `min-w-0 bg-transparent font-mono text-[14px] text-black outline-none ${className}`;
  return (
    <span className="inline-flex max-w-full items-center gap-1 whitespace-nowrap">
      <span>[</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={1}
          className={`${shared} h-7 w-[420px] resize-none overflow-hidden border-b border-black/70 leading-6`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${shared} h-7 w-auto`}
        />
      )}
      <span>]</span>
    </span>
  );
}

function BracketSelect({ value, onChange, options }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span>[</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent font-mono text-[14px] text-black outline-none"
      >
        {options.map((item) => <option key={item}>{item}</option>)}
      </select>
      <span>]</span>
    </span>
  );
}

export function DischargeWorkflowPage() {
  const admissions = useModuleRecords('hospital/ipd-admissions');
  const beds = useModuleRecords('hospital/bed-management');
  const discharge = useModuleRecords('hospital/discharge');
  const [dischargeDate] = useState(todayISO());
  const [dischargeType, setDischargeType] = useState('Normal');
  const [finalDiagnosis, setFinalDiagnosis] = useState('Viral Fever with Dehydration');
  const [condition, setCondition] = useState('Stable');
  const [treatmentSummary, setTreatmentSummary] = useState('');
  const [proceduresPerformed, setProceduresPerformed] = useState('');
  const [medicines, setMedicines] = useState([
    { medicine: 'Paracetamol 500mg', frequency: '1-0-1', duration: '3 Days' },
    { medicine: 'ORS Sachet', frequency: '1-1-1', duration: '3 Days' },
  ]);
  const [followUpRequired, setFollowUpRequired] = useState(true);
  const [followUpDoctor, setFollowUpDoctor] = useState('');
  const [followUpDate, setFollowUpDate] = useState(addDays(todayISO(), 7));
  const [followUpInstructions, setFollowUpInstructions] = useState('Review after 7 days');
  const [checks, setChecks] = useState(() => Object.fromEntries(CHECKLIST.map((item) => [item, true])));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const activeAdmissions = useMemo(() => {
    const source = admissions.records;
    return source.filter((record) => !['draft', 'discharged'].includes(normalize(record.data?.status)));
  }, [admissions.records]);

  const selectedAdmission = activeAdmissions[0] || null;
  const data = useMemo(() => selectedAdmission?.data || {}, [selectedAdmission]);
  const currentBed = useMemo(() => {
    const source = beds.records;
    return source.find((record) => bedMatches(record, selectedAdmission)) || null;
  }, [beds.records, selectedAdmission]);
  const stay = stayDays(data.admissionDate, dischargeDate);
  const allClear = CHECKLIST.every((item) => checks[item]);

  function updateMedicine(index, key, value) {
    setMedicines((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  }

  function addMedicine() {
    setMedicines((current) => [...current, { medicine: '', frequency: '1-0-1', duration: '3 Days' }]);
  }

  async function saveDischarge(status) {
    if (status === 'Discharged' && !allClear) {
      setMessage('Complete all discharge clearances before final discharge.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: `${data.patientName || 'Patient'} discharge`,
        patientName: data.patientName || '-',
        patientId: data.patientId || '-',
        ipdNo: data.ipdNo || data.admissionNo || '-',
        admissionDate: data.admissionDate,
        dischargeDate,
        stayDays: stay,
        doctorName: data.doctorName || followUpDoctor,
        departmentName: data.departmentName || 'General Medicine',
        dischargeType,
        diagnosis: finalDiagnosis,
        conditionAtDischarge: condition,
        dischargeSummary: treatmentSummary,
        proceduresPerformed,
        medicines,
        followUpRequired: followUpRequired ? 'Yes' : 'No',
        followUpDoctor,
        followUpDate: followUpRequired ? followUpDate : '',
        followUpInstructions,
        checklist: checks,
        status,
      };
      await discharge.create(payload);
      if (selectedAdmission._id) {
        await admissions.update(selectedAdmission._id, {
          ...data,
          dischargeDate,
          dischargeSummary: treatmentSummary,
          finalDiagnosis,
          conditionAtDischarge: condition,
          dischargeMedicines: medicines,
          followUpDate: followUpRequired ? followUpDate : '',
          futureBedChargesStopped: status === 'Discharged',
          status: status === 'Discharged' ? 'Discharged' : 'Ready for Discharge',
        });
      }
      if (status === 'Discharged' && currentBed) {
        await beds.update(currentBed._id, {
          ...currentBed.data,
          status: 'Cleaning',
          patientName: '',
          patientId: '',
          ipdNo: '',
          lastDischargedAt: dischargeDate,
          housekeepingStatus: 'Pending',
        });
      }
      setMessage(status === 'Discharged'
        ? `${data.patientName || 'Patient'} discharged. Bed moved to CLEANING for housekeeping clearance.`
        : `Discharge ${status.toLowerCase()} saved.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <h1 className="m-0 mb-7 text-[24px] font-semibold text-black">UI</h1>

      {message && (
        <div className="mb-4 rounded-[18px] bg-[#f3f3f3] px-6 py-3 font-mono text-[14px] text-black">
          {message}
        </div>
      )}

      <section className="rounded-[28px] bg-[#f3f3f3] px-6 py-5 font-mono text-[14px] leading-6 text-black md:px-8">
        <div>DISCHARGE PATIENT</div>

        <div className="mt-8 grid max-w-[560px] grid-cols-[minmax(0,1fr)_180px] gap-x-8">
          <div>{data.patientName || '-'}</div>
          <div>{data.ipdNo || data.admissionNo || '-'}</div>
          <div>Admission: {fmt(data.admissionDate || '2026-08-05')}</div>
          <div />
          <div>Discharge: {fmt(dischargeDate)}</div>
          <div />
          <div>Stay: {stay} Days</div>
        </div>

        <div className="mt-8">
          <div>{data.doctorName || '-'}</div>
          <div>{data.departmentName || 'General Medicine'}</div>
        </div>

        <Line />

        <div>DISCHARGE DETAILS</div>

        <div className="mt-8 grid gap-6">
          <label className="block">
            <div>Discharge Type *</div>
            <BracketSelect value={dischargeType} onChange={setDischargeType} options={DISCHARGE_TYPES} />
          </label>

          <label className="block">
            <div>Final Diagnosis *</div>
            <BracketInput value={finalDiagnosis} onChange={setFinalDiagnosis} className="w-[260px]" />
          </label>

          <label className="block">
            <div>Condition at Discharge</div>
            <BracketSelect value={condition} onChange={setCondition} options={CONDITIONS} />
          </label>

          <label className="block">
            <div>Treatment Summary</div>
            <BracketInput value={treatmentSummary} onChange={setTreatmentSummary} multiline />
          </label>

          <label className="block">
            <div>Procedures Performed</div>
            <BracketInput value={proceduresPerformed} onChange={setProceduresPerformed} multiline />
          </label>
        </div>

        <Line />

        <div>MEDICATION ON DISCHARGE</div>

        <div className="mt-8 grid max-w-[420px] gap-1">
          {medicines.map((item, index) => (
            <div key={`${item.medicine}-${index}`} className="grid grid-cols-[minmax(0,190px)_70px_70px] gap-5">
              <input
                value={item.medicine}
                onChange={(event) => updateMedicine(index, 'medicine', event.target.value)}
                className="min-w-0 bg-transparent font-mono text-[14px] outline-none"
              />
              <input
                value={item.frequency}
                onChange={(event) => updateMedicine(index, 'frequency', event.target.value)}
                className="min-w-0 bg-transparent font-mono text-[14px] outline-none"
              />
              <input
                value={item.duration}
                onChange={(event) => updateMedicine(index, 'duration', event.target.value)}
                className="min-w-0 bg-transparent font-mono text-[14px] outline-none"
              />
            </div>
          ))}
        </div>

        <div className="mt-8">
          <BracketButton onClick={addMedicine}>+ Add Medicine</BracketButton>
        </div>

        <Line />

        <div>FOLLOW-UP</div>

        <div className="mt-8 grid gap-6">
          <label className="grid max-w-[300px] grid-cols-[1fr_auto] items-center gap-6">
            <span>Follow-up Required</span>
            <span className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={followUpRequired}
                onChange={(event) => setFollowUpRequired(event.target.checked)}
                className="h-3.5 w-3.5"
              />
              <span>Yes</span>
            </span>
          </label>

          <label className="block">
            <div>Doctor</div>
            <BracketInput value={followUpDoctor} onChange={setFollowUpDoctor} className="w-[150px]" />
          </label>

          <label className="block">
            <div>Date</div>
            <BracketInput value={fmt(followUpDate)} onChange={setFollowUpDate} className="w-[110px]" />
          </label>

          <label className="block">
            <div>Instructions</div>
            <BracketInput value={followUpInstructions} onChange={setFollowUpInstructions} className="w-[180px]" />
          </label>
        </div>

        <Line />

        <div>DISCHARGE CHECKLIST</div>

        <div className="mt-8 grid gap-1">
          {CHECKLIST.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setChecks((current) => ({ ...current, [item]: !current[item] }))}
              className="w-fit bg-transparent font-mono text-[14px] text-black outline-none"
            >
              {checks[item] ? '✓' : ' '} {item}
            </button>
          ))}
        </div>

        <Line />

        <div className="flex max-w-[500px] flex-wrap justify-between gap-6">
          <BracketButton onClick={() => saveDischarge('Draft')} disabled={saving}>Save Draft</BracketButton>
          <BracketButton onClick={() => saveDischarge('Summary Generated')} disabled={saving}>Generate Summary</BracketButton>
          <BracketButton onClick={() => saveDischarge('Discharged')} disabled={saving}>Discharge</BracketButton>
        </div>
      </section>

      <h2 className="m-0 mt-8 text-[24px] font-semibold text-black">Discharge workflow</h2>

      <section className="mt-5 rounded-[28px] bg-[#f3f3f3] px-6 py-5 font-mono text-[14px] leading-6 text-black md:px-8">
        <div>Doctor Plans Discharge</div>
        <div className="pl-9">↓</div>
        <div>Discharge Summary Draft</div>
        <div className="pl-9">↓</div>
        <div>Doctor Clearance</div>
        <div className="pl-9">↓</div>
        <div>Nursing Clearance</div>
        <div className="pl-9">↓</div>
        <div>Pharmacy / Diagnostics Clearance</div>
        <div className="pl-9">↓</div>
        <div>Stop Future Bed Charges</div>
        <div className="pl-9">↓</div>
        <div>Final Bill Generated</div>
        <div className="pl-9">↓</div>
        <div>Insurance / Payment Settlement</div>
        <div className="pl-9">↓</div>
        <div>Final Discharge</div>
        <div className="pl-9">↓</div>
        <div>Bed → CLEANING</div>
        <div className="pl-9">↓</div>
        <div>Housekeeping Completes</div>
        <div className="pl-9">↓</div>
        <div>Bed → AVAILABLE</div>
      </section>
    </div>
  );
}


