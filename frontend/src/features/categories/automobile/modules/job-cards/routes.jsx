import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Job Cards';
const CATEGORY = 'Automobile';

const ITEMS = [
  {
    path: '/automobile/job-cards/create', title: 'Create Job Card', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'complaint', label: 'Complaint', type: 'textarea' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/automobile/job-cards/technician-allocation', title: 'Technician Allocation', fields: [
      { key: 'jobCardNumber', label: 'Job Card Number', required: true },
      { key: 'technicianName', label: 'Technician Name' },
      { key: 'assignedDate', label: 'Assigned Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Assigned', 'In Progress', 'Completed'] },
    ],
  },
  {
    path: '/automobile/job-cards/estimate', title: 'Estimate', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'estimatedAmount', label: 'Estimated Amount', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Sent', 'Approved'] },
    ],
  },
  {
    path: '/automobile/job-cards/whatsapp-approval-link', title: 'WhatsApp Approval Link', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'customerPhone', label: 'Customer Phone' },
      { key: 'sentDate', label: 'Sent Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Sent', 'Approved', 'Pending'] },
    ],
  },
  {
    path: '/automobile/job-cards/status-tracking', title: 'Status Tracking', fields: [
      { key: 'jobCardNumber', label: 'Job Card Number', required: true },
      { key: 'vehicleNumber', label: 'Vehicle Number' },
      { key: 'currentStage', label: 'Current Stage', type: 'select', options: ['Received', 'Diagnosis', 'Repair', 'Quality Check', 'Ready'] },
      { key: 'updatedDate', label: 'Updated Date', type: 'date' },
    ],
  },
];

export const automobileJobCardRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
