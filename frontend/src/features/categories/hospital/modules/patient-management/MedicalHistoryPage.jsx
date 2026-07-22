import { LinkedTimelineView } from '../../../shared/recordUi/LinkedTimelineView.jsx';

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'condition', label: 'Condition', required: true },
  { key: 'diagnosedDate', label: 'Diagnosed Date', type: 'date' },
  { key: 'allergies', label: 'Known Allergies' },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

export function MedicalHistoryPage() {
  return (
    <LinkedTimelineView
      moduleKey="hospital/medical-history"
      title="Medical History"
      group="Patient Management"
      subtitle="Chronological medical history per patient"
      fields={FIELDS}
      dateKey="diagnosedDate"
      renderEntry={(data) => (
        <>
          <div className="text-[13px] font-medium text-[#111827]">{data.condition || 'Condition not specified'}</div>
          {data.allergies && <div className="text-xs text-red-600 mt-1">Allergies: {data.allergies}</div>}
          {data.notes && <p className="text-[13px] text-[#374151] mt-1.5 whitespace-pre-wrap">{data.notes}</p>}
        </>
      )}
    />
  );
}
