import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Patient Management';
const CATEGORY = 'Hospital';

const ITEMS = [
  {
    path: '/hospital/patients', title: 'Patients', fields: [
      { key: 'name', label: 'Patient Name', required: true },
      { key: 'age', label: 'Age', type: 'number' },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
      { key: 'phone', label: 'Phone' },
      { key: 'address', label: 'Address', type: 'textarea' },
    ],
  },
  {
    path: '/hospital/appointments', title: 'Appointments', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'doctorName', label: 'Doctor' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'time', label: 'Time' },
      { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Completed', 'Cancelled'] },
    ],
  },
  {
    path: '/hospital/admissions', title: 'Admissions', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'ward', label: 'Ward' },
      { key: 'bedNumber', label: 'Bed Number' },
      { key: 'admissionDate', label: 'Admission Date', type: 'date' },
      { key: 'doctorName', label: 'Attending Doctor' },
    ],
  },
  {
    path: '/hospital/discharge', title: 'Discharge', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'dischargeDate', label: 'Discharge Date', type: 'date' },
      { key: 'diagnosis', label: 'Diagnosis' },
      { key: 'followUpDate', label: 'Follow-up Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Discharged', 'Referred'] },
    ],
  },
  {
    path: '/hospital/medical-history', title: 'Medical History', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'condition', label: 'Condition' },
      { key: 'diagnosedDate', label: 'Diagnosed Date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    path: '/hospital/follow-up', title: 'Follow Up', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'followUpDate', label: 'Follow-up Date', type: 'date' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Completed'] },
    ],
  },
];

export const patientManagementRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
