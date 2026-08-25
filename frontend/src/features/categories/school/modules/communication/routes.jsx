import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Communication';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/communication/notices', title: 'Notices', fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'audience', label: 'Audience', type: 'select', options: ['Students', 'Parents', 'Staff', 'All'] },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    path: '/school/communication/announcements', title: 'Announcements', fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'category', label: 'Category', type: 'select', options: ['General', 'Academic', 'Event', 'Urgent'] },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'message', label: 'Message', type: 'textarea' },
    ],
  },
  {
    path: '/school/communication/messages', title: 'Messages', fields: [
      { key: 'sender', label: 'Sender', required: true },
      { key: 'recipient', label: 'Recipient' },
      { key: 'subject', label: 'Subject' },
      { key: 'message', label: 'Message', type: 'textarea' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/school/communication/parent-communication', title: 'Parent Communication', fields: [
      { key: 'parentName', label: 'Parent Name', required: true },
      { key: 'studentName', label: 'Student Name' },
      { key: 'subject', label: 'Subject' },
      { key: 'message', label: 'Message', type: 'textarea' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/school/communication/notifications', title: 'Notifications', fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'audience', label: 'Audience', type: 'select', options: ['Students', 'Parents', 'Staff', 'All'] },
      { key: 'type', label: 'Type', type: 'select', options: ['Info', 'Alert', 'Reminder'] },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
];

export const communicationRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
