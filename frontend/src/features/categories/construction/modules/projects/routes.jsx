import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Projects';
const CATEGORY = 'Construction';

const ITEMS = [
  {
    path: '/construction/projects/boq', title: 'BOQ', fields: [
      { key: 'projectName', label: 'Project Name', required: true },
      { key: 'itemDescription', label: 'Item Description' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'rate', label: 'Rate', type: 'number' },
    ],
  },
  {
    path: '/construction/projects/work-orders', title: 'Work Orders', fields: [
      { key: 'projectName', label: 'Project Name', required: true },
      { key: 'contractorName', label: 'Contractor Name' },
      { key: 'issueDate', label: 'Issue Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Completed'] },
    ],
  },
  {
    path: '/construction/projects/site-progress', title: 'Site Progress', fields: [
      { key: 'projectName', label: 'Project Name', required: true },
      { key: 'progressPercent', label: 'Progress %', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    path: '/construction/projects/milestones', title: 'Milestones', fields: [
      { key: 'projectName', label: 'Project Name', required: true },
      { key: 'milestoneName', label: 'Milestone Name' },
      { key: 'targetDate', label: 'Target Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Achieved', 'Delayed'] },
    ],
  },
  {
    path: '/construction/projects/ra-bills', title: 'RA Bills', fields: [
      { key: 'projectName', label: 'Project Name', required: true },
      { key: 'billNumber', label: 'Bill Number' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Paid'] },
    ],
  },
  {
    path: '/construction/projects/retention-money', title: 'Retention Money', fields: [
      { key: 'projectName', label: 'Project Name', required: true },
      { key: 'contractorName', label: 'Contractor Name' },
      { key: 'amountHeld', label: 'Amount Held', type: 'number' },
      { key: 'releaseDate', label: 'Release Date', type: 'date' },
    ],
  },
];

export const constructionProjectRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
