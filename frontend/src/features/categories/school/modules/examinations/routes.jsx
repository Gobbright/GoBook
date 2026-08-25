import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Examinations';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/examinations/exam-setup', title: 'Exam Setup', fields: [
      { key: 'examName', label: 'Exam Name', required: true },
      { key: 'className', label: 'Class' },
      { key: 'examType', label: 'Exam Type', type: 'select', options: ['Unit Test', 'Midterm', 'Final', 'Other'] },
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'endDate', label: 'End Date', type: 'date' },
    ],
  },
  {
    path: '/school/examinations/schedule', title: 'Exam Schedule', fields: [
      { key: 'examName', label: 'Exam Name', required: true },
      { key: 'subjectName', label: 'Subject' },
      { key: 'className', label: 'Class' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'time', label: 'Time' },
      { key: 'venue', label: 'Venue' },
    ],
  },
  {
    path: '/school/examinations/marks-entry', title: 'Marks Entry', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'examName', label: 'Exam' },
      { key: 'subjectName', label: 'Subject' },
      { key: 'marksObtained', label: 'Marks Obtained', type: 'number' },
      { key: 'maxMarks', label: 'Max Marks', type: 'number' },
    ],
  },
  {
    path: '/school/examinations/results', title: 'Results', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'examName', label: 'Exam' },
      { key: 'className', label: 'Class' },
      { key: 'totalMarks', label: 'Total Marks', type: 'number' },
      { key: 'percentage', label: 'Percentage', type: 'number' },
      { key: 'grade', label: 'Grade' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pass', 'Fail'] },
    ],
  },
  {
    path: '/school/examinations/report-cards', title: 'Report Cards', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'className', label: 'Class' },
      { key: 'examName', label: 'Exam' },
      { key: 'overallGrade', label: 'Overall Grade' },
      { key: 'remarks', label: 'Remarks', type: 'textarea' },
    ],
  },
];

export const examinationsRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
