import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Volunteers';
const CATEGORY = 'NGO';

const ITEMS = [
  {
    path: '/ngo/volunteers/volunteers', title: 'Volunteers', fields: [
      { key: 'name', label: 'Volunteer Name', required: true },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'skills', label: 'Skills' },
    ],
  },
  {
    path: '/ngo/volunteers/assignments', title: 'Assignments', fields: [
      { key: 'volunteerName', label: 'Volunteer Name', required: true },
      { key: 'projectName', label: 'Project Name' },
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Ongoing', 'Completed'] },
    ],
  },
  {
    path: '/ngo/volunteers/certificates', title: 'Certificates', fields: [
      { key: 'volunteerName', label: 'Volunteer Name', required: true },
      { key: 'certificateType', label: 'Certificate Type' },
      { key: 'issueDate', label: 'Issue Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Issued', 'Pending'] },
    ],
  },
];

export const ngoVolunteerRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
