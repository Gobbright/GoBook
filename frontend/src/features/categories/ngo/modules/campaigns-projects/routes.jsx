import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Campaigns & Projects';
const CATEGORY = 'NGO';

const ITEMS = [
  {
    path: '/ngo/campaigns-projects/campaigns', title: 'Campaigns', fields: [
      { key: 'name', label: 'Campaign Name', required: true },
      { key: 'targetAmount', label: 'Target Amount', type: 'number' },
      { key: 'raisedAmount', label: 'Raised Amount', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Completed', 'Paused'] },
    ],
  },
  {
    path: '/ngo/campaigns-projects/projects', title: 'Projects', fields: [
      { key: 'name', label: 'Project Name', required: true },
      { key: 'location', label: 'Location' },
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Planned', 'Ongoing', 'Completed'] },
    ],
  },
  {
    path: '/ngo/campaigns-projects/grant-management', title: 'Grant Management', fields: [
      { key: 'grantName', label: 'Grant Name', required: true },
      { key: 'funderName', label: 'Funder Name' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Applied', 'Approved', 'Rejected'] },
    ],
  },
  {
    path: '/ngo/campaigns-projects/csr-partner-portal', title: 'CSR Partner Portal', fields: [
      { key: 'partnerName', label: 'Partner Name', required: true },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'contribution', label: 'Contribution', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
    ],
  },
  {
    path: '/ngo/campaigns-projects/budget-vs-actual', title: 'Budget vs Actual', fields: [
      { key: 'projectName', label: 'Project Name', required: true },
      { key: 'budgetedAmount', label: 'Budgeted Amount', type: 'number' },
      { key: 'actualAmount', label: 'Actual Amount', type: 'number' },
      { key: 'period', label: 'Period' },
    ],
  },
];

export const ngoCampaignProjectRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
