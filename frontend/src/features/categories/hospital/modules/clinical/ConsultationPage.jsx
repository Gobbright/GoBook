import { LinkedTimelineView } from '../../../shared/recordUi/LinkedTimelineView.jsx';

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'symptoms', label: 'Symptoms', type: 'textarea' },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

export function ConsultationPage() {
  return (
    <LinkedTimelineView
      moduleKey="hospital/consultation"
      title="Consultation"
      group="Clinical"
      subtitle="Visit history per patient"
      fields={FIELDS}
      dateKey="date"
      renderEntry={(data) => (
        <>
          <div className="text-xs text-[#94a3b8] mb-1">{data.doctorName || 'No doctor assigned'}</div>
          {data.symptoms && <div className="text-[13px] text-[#374151]"><span className="font-medium text-[#111827]">Symptoms:</span> {data.symptoms}</div>}
          {data.diagnosis && <div className="text-[13px] text-[#374151] mt-1"><span className="font-medium text-[#111827]">Diagnosis:</span> {data.diagnosis}</div>}
          {data.notes && <p className="text-[13px] text-[#374151] mt-1.5 whitespace-pre-wrap">{data.notes}</p>}
        </>
      )}
    />
  );
}
