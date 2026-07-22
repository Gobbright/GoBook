import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Contractors & Labour';
const CATEGORY = 'Construction';

const ITEMS = [
  {
    path: '/construction/contractors-labour/contractors', title: 'Contractors', fields: [
      { key: 'name', label: 'Contractor Name', required: true },
      { key: 'trade', label: 'Trade' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
    ],
  },
  {
    path: '/construction/contractors-labour/subcontractor-billing', title: 'Subcontractor Billing', fields: [
      { key: 'contractorName', label: 'Contractor Name', required: true },
      { key: 'projectName', label: 'Project Name' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Paid'] },
    ],
  },
  {
    path: '/construction/contractors-labour/labour-register', title: 'Labour Register', fields: [
      { key: 'name', label: 'Labour Name', required: true },
      { key: 'skill', label: 'Skill' },
      { key: 'contractorName', label: 'Contractor Name' },
      { key: 'siteName', label: 'Site Name' },
    ],
  },
  {
    path: '/construction/contractors-labour/wages', title: 'Wages', fields: [
      { key: 'labourName', label: 'Labour Name', required: true },
      { key: 'daysWorked', label: 'Days Worked', type: 'number' },
      { key: 'ratePerDay', label: 'Rate Per Day', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Paid'] },
    ],
  },
];

export const contractorsLabourRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
