import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Academic';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/classes', title: 'Classes', fields: [
      { key: 'className', label: 'Class Name', required: true },
      { key: 'classTeacher', label: 'Class Teacher' },
      { key: 'totalStudents', label: 'Total Students', type: 'number' },
      { key: 'section', label: 'Section' },
    ],
  },
  {
    path: '/school/sections', title: 'Sections', fields: [
      { key: 'sectionName', label: 'Section Name', required: true },
      { key: 'className', label: 'Class' },
      { key: 'classTeacher', label: 'Class Teacher' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
    ],
  },
  {
    path: '/school/subjects', title: 'Subjects', fields: [
      { key: 'subjectName', label: 'Subject Name', required: true },
      { key: 'className', label: 'Class' },
      { key: 'teacherName', label: 'Teacher' },
      { key: 'subjectCode', label: 'Subject Code' },
    ],
  },
  {
    path: '/school/timetable', title: 'Timetable', fields: [
      { key: 'className', label: 'Class', required: true },
      { key: 'day', label: 'Day', type: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
      { key: 'period', label: 'Period' },
      { key: 'subject', label: 'Subject' },
      { key: 'teacherName', label: 'Teacher' },
    ],
  },
  {
    path: '/school/exams', title: 'Exams', fields: [
      { key: 'examName', label: 'Exam Name', required: true },
      { key: 'className', label: 'Class' },
      { key: 'examDate', label: 'Exam Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Upcoming', 'Ongoing', 'Completed'] },
    ],
  },
];

export const academicRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
