import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Clinical';
const CATEGORY = 'Hospital';

const ITEMS = [
  {
    path: '/hospital/doctors', title: 'Doctors', fields: [
      { key: 'name', label: 'Doctor Name', required: true },
      { key: 'specialization', label: 'Specialization' },
      { key: 'phone', label: 'Phone' },
      { key: 'department', label: 'Department' },
    ],
  },
  {
    path: '/hospital/departments', title: 'Departments', fields: [
      { key: 'name', label: 'Department Name', required: true },
      { key: 'headOfDept', label: 'Head of Department' },
      { key: 'floor', label: 'Floor' },
      { key: 'phone', label: 'Phone' },
    ],
  },
  {
    path: '/hospital/consultation', title: 'Consultation', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'doctorName', label: 'Doctor' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    path: '/hospital/treatment', title: 'Treatment', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'treatmentType', label: 'Treatment Type' },
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Ongoing', 'Completed'] },
    ],
  },
  {
    path: '/hospital/prescription', title: 'Prescription', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'doctorName', label: 'Doctor' },
      { key: 'medicines', label: 'Medicines', type: 'textarea' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/hospital/nursing', title: 'Nursing', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'nurseName', label: 'Nurse Name' },
      { key: 'ward', label: 'Ward' },
      { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Evening', 'Night'] },
    ],
  },
];

export const clinicalRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
