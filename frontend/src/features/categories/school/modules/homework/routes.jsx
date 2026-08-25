import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Homework & Assignments';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/homework/create', title: 'Create Homework', fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'className', label: 'Class' },
      { key: 'subject', label: 'Subject' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    path: '/school/homework/assignment-list', title: 'Assignment List', fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'className', label: 'Class' },
      { key: 'subject', label: 'Subject' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Assigned', 'Submitted', 'Overdue'] },
    ],
  },
  {
    path: '/school/homework/submissions', title: 'Student Submissions', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'assignmentTitle', label: 'Assignment Title' },
      { key: 'submissionDate', label: 'Submission Date', type: 'date' },
      { key: 'fileReference', label: 'File Reference' },
      { key: 'status', label: 'Status', type: 'select', options: ['Submitted', 'Late', 'Pending'] },
    ],
  },
  {
    path: '/school/homework/evaluation', title: 'Evaluation', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'assignmentTitle', label: 'Assignment Title' },
      { key: 'marksObtained', label: 'Marks Obtained', type: 'number' },
      { key: 'maxMarks', label: 'Max Marks', type: 'number' },
      { key: 'remarks', label: 'Remarks', type: 'textarea' },
    ],
  },
];

export const homeworkRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
