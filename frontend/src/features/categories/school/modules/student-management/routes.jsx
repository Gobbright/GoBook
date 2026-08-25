import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';
import { StudentRegistrationPage } from './StudentRegistrationPage.jsx';
import { StudentListPage } from './StudentListPage.jsx';
import { StudentProfilePage } from './StudentProfilePage.jsx';

const GROUP = 'Students';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/students/documents', title: 'Student Documents', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'documentType', label: 'Document Type', type: 'select', options: ['Birth Certificate', 'Transfer Certificate', 'ID Proof', 'Photo', 'Other'] },
      { key: 'documentNumber', label: 'Document Number' },
      { key: 'uploadDate', label: 'Upload Date', type: 'date' },
    ],
  },
];

export const studentManagementRoutes = [
  { path: '/school/students/registration', element: <StudentRegistrationPage /> },
  { path: '/school/students/list', element: <StudentListPage /> },
  { path: '/school/students/profile', element: <StudentProfilePage /> },
  { path: '/school/students/profile/:id', element: <StudentProfilePage /> },
  ...ITEMS.map(({ path, title, fields }) => ({
    path,
    element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
  })),
];
