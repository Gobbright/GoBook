import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Eye, Pencil, Plus, ShieldCheck, X } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const EMPTY_FORM = {
  patientName: '',
  patientId: '',
  providerName: '',
  tpa: '',
  planName: '',
  policyNumber: '',
  memberId: '',
  policyHolder: '',
  relationship: 'Self',
  coverageAmount: '',
  copay: '',
  cashlessEligible: 'Yes',
  roomLimit: '',
  startDate: '',
  expiryDate: '',
  insuranceCard: '',
  policyDocument: '',
};

const INPUT = 'h-9 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] outline-none focus:border-blue-500';
const LABEL = 'mb-1 block text-[12px] font-semibold text-[#374151]';

function patientLabel(record) {
  const data = record?.data || {};
  return [data.name, data.patientId].filter(Boolean).join(' - ') || 'Select patient';
}

function getStatus(expiryDate) {
  if (!expiryDate) return 'Active';
  const today = new Date();
  const expiry = new Date(`${expiryDate}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return 'Active';
  if (expiry < today) return 'Expired';
  const days = Math.ceil((expiry - today) / 86400000);
  return days <= 30 ? 'Expiring Soon' : 'Active';
}

function statusClass(status) {
  if (status === 'Expired') return 'bg-red-50 text-red-700 border-red-200';
  if (status === 'Expiring Soon') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-green-50 text-green-700 border-green-200';
}

function Button({ children, onClick, tone = 'white' }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white',
    white: 'border-[#dbe4ef] bg-white text-[#374151]',
  };
  return <button type="button" onClick={onClick} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-semibold cursor-pointer ${tones[tone]}`}>{children}</button>;
}

function FileField({ value, onChange }) {
  return (
    <label className="flex h-9 cursor-pointer items-center justify-center rounded-md border border-dashed border-[#b8c7da] bg-[#f8fafc] px-3 text-[12.5px] font-semibold text-[#0f4c81] hover:bg-blue-50">
      {value || 'Upload'}
      <input type="file" className="hidden" onChange={(event) => onChange(event.target.files?.[0]?.name || '')} />
    </label>
  );
}

function InsuranceModal({ initial, patients, onClose, onSubmit }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });

  function set(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'patientName') {
        const patient = patients.find((record) => record.data?.name === value);
        next.patientId = patient?.data?.patientId || '';
      }
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf2f7] px-4 py-3">
          <h2 className="m-0 text-[18px] font-extrabold text-[#111827]">Add Insurance</h2>
          <button type="button" onClick={onClose} className="rounded-md border-0 bg-transparent p-1 text-[#64748b] cursor-pointer"><X size={18} /></button>
        </div>
        <div className="space-y-4 p-4">
          <section>
            <div className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-[#111827]">Insurance Provider</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <label><span className={LABEL}>Patient *</span><select className={INPUT} value={form.patientName} onChange={(event) => set('patientName', event.target.value)}><option value="">Select patient</option>{patients.map((patient) => <option key={patient._id} value={patient.data?.name}>{patientLabel(patient)}</option>)}</select></label>
              <label><span className={LABEL}>Provider Name</span><input className={INPUT} value={form.providerName} onChange={(event) => set('providerName', event.target.value)} /></label>
              <label><span className={LABEL}>TPA</span><input className={INPUT} value={form.tpa} onChange={(event) => set('tpa', event.target.value)} /></label>
              <label><span className={LABEL}>Plan Name</span><input className={INPUT} value={form.planName} onChange={(event) => set('planName', event.target.value)} /></label>
            </div>
          </section>

          <section>
            <div className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-[#111827]">Policy Information</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <label><span className={LABEL}>Policy Number</span><input className={INPUT} value={form.policyNumber} onChange={(event) => set('policyNumber', event.target.value)} /></label>
              <label><span className={LABEL}>Member ID</span><input className={INPUT} value={form.memberId} onChange={(event) => set('memberId', event.target.value)} /></label>
              <label><span className={LABEL}>Policy Holder</span><input className={INPUT} value={form.policyHolder} onChange={(event) => set('policyHolder', event.target.value)} /></label>
              <label><span className={LABEL}>Relationship</span><select className={INPUT} value={form.relationship} onChange={(event) => set('relationship', event.target.value)}>{['Self', 'Spouse', 'Child', 'Parent', 'Other'].map((option) => <option key={option}>{option}</option>)}</select></label>
            </div>
          </section>

          <section>
            <div className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-[#111827]">Coverage</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <label><span className={LABEL}>Coverage Amount</span><input className={INPUT} value={form.coverageAmount} onChange={(event) => set('coverageAmount', event.target.value)} /></label>
              <label><span className={LABEL}>Co-pay %</span><input className={INPUT} value={form.copay} onChange={(event) => set('copay', event.target.value)} /></label>
              <label><span className={LABEL}>Cashless Eligible</span><select className={INPUT} value={form.cashlessEligible} onChange={(event) => set('cashlessEligible', event.target.value)}>{['Yes', 'No'].map((option) => <option key={option}>{option}</option>)}</select></label>
              <label><span className={LABEL}>Room Limit</span><input className={INPUT} value={form.roomLimit} onChange={(event) => set('roomLimit', event.target.value)} /></label>
            </div>
          </section>

          <section>
            <div className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-[#111827]">Validity & Documents</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <label><span className={LABEL}>Start Date</span><input className={INPUT} type="date" value={form.startDate} onChange={(event) => set('startDate', event.target.value)} /></label>
              <label><span className={LABEL}>Expiry Date</span><input className={INPUT} type="date" value={form.expiryDate} onChange={(event) => set('expiryDate', event.target.value)} /></label>
              <div><span className={LABEL}>Insurance Card</span><FileField value={form.insuranceCard} onChange={(value) => set('insuranceCard', value)} /></div>
              <div><span className={LABEL}>Policy Document</span><FileField value={form.policyDocument} onChange={(value) => set('policyDocument', value)} /></div>
            </div>
          </section>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf2f7] px-4 py-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button tone="blue" onClick={() => onSubmit({ ...form, status: getStatus(form.expiryDate) })}>Save Insurance</Button>
        </div>
      </div>
    </div>
  );
}

export function InsurancePage() {
  const location = useLocation();
  const patients = useModuleRecords('hospital/patients');
  const insurance = useModuleRecords('hospital/insurance-details');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [modal, setModal] = useState(null);
  const [viewing, setViewing] = useState(null);

  const selectedPatient = useMemo(() => {
    if (selectedPatientId) return patients.records.find((record) => record._id === selectedPatientId) || null;
    const fromState = location.state?.patientName;
    return patients.records.find((record) => record.data?.name === fromState) || patients.records[0] || null;
  }, [patients.records, selectedPatientId, location.state]);

  const policies = useMemo(() => {
    const patientName = selectedPatient?.data?.name || '';
    return insurance.records.filter((record) => !patientName || record.data?.patientName === patientName);
  }, [insurance.records, selectedPatient]);

  async function submit(form) {
    if (!form.patientName || !form.providerName) return;
    if (modal.mode === 'edit') await insurance.update(modal.record._id, form);
    else await insurance.create(form);
    setModal(null);
  }

  return (
    <div className="p-3 md:p-4">
      {modal && <InsuranceModal initial={modal.mode === 'edit' ? modal.record.data : { patientName: selectedPatient?.data?.name || '', patientId: selectedPatient?.data?.patientId || '' }} patients={patients.records} onClose={() => setModal(null)} onSubmit={submit} />}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between"><h2 className="m-0 text-[18px] font-extrabold">Insurance Details</h2><button type="button" onClick={() => setViewing(null)} className="border-0 bg-transparent cursor-pointer"><X size={18} /></button></div>
            <pre className="max-h-[60vh] overflow-auto rounded-lg bg-[#f8fafc] p-3 text-[12px] text-[#374151]">{JSON.stringify(viewing.data, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f7f7f8] p-5 md:p-6">
        <div className="mb-7">
          <h1 className="m-0 text-[16px] font-extrabold text-[#111827]">Insurance</h1>
        </div>
        <div className="mb-8 flex flex-col gap-2">
          <div className="text-[14px] font-semibold text-[#111827]">
            Patient: {selectedPatient ? `${selectedPatient.data?.name || 'Unnamed'} - ${selectedPatient.data?.patientId || '-'}` : 'Select patient'}
          </div>
          <select className="h-8 max-w-sm rounded-md border border-[#dbe4ef] bg-white px-2.5 text-[12.5px] font-[inherit] outline-none focus:border-blue-500" value={selectedPatient?._id || ''} onChange={(event) => setSelectedPatientId(event.target.value)}>
            {patients.records.map((patient) => <option key={patient._id} value={patient._id}>{patientLabel(patient)}</option>)}
          </select>
        </div>

        <div className="mb-8 flex justify-center">
          <button type="button" onClick={() => setModal({ mode: 'add' })} className="inline-flex h-8 items-center gap-2 rounded-md border border-transparent bg-transparent px-3 text-[13px] font-semibold text-[#111827] cursor-pointer hover:bg-white">
            <Plus size={14} />Add Insurance
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {insurance.loading ? (
            <div className="py-10 text-center text-[13px] text-[#536173]">Loading insurance...</div>
          ) : policies.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#536173]">No insurance policies found.</div>
          ) : policies.map((policy) => {
            const data = policy.data || {};
            const status = getStatus(data.expiryDate);
            return (
              <div key={policy._id} className="max-w-2xl rounded-lg border border-[#111827] bg-white p-4">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[14px] font-extrabold text-[#111827]"><ShieldCheck size={16} />{data.providerName || data.name || 'Insurance Provider'}</div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${statusClass(status)}`}>{status}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-[13px]">
                  <div className="font-semibold text-[#536173]">Policy No</div><div className="font-semibold text-[#111827]">{data.policyNumber || '-'}</div>
                  <div className="font-semibold text-[#536173]">Plan</div><div className="font-semibold text-[#111827]">{data.planName || '-'}</div>
                  <div className="font-semibold text-[#536173]">Valid Until</div><div className="font-semibold text-[#111827]">{fmtDate(data.expiryDate)}</div>
                </div>
                <div className="mt-6 flex flex-wrap justify-between gap-2">
                  <Button onClick={() => setViewing(policy)}><Eye size={13} />View Details</Button>
                  <Button onClick={() => setModal({ mode: 'edit', record: policy })}><Pencil size={13} />Edit</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
