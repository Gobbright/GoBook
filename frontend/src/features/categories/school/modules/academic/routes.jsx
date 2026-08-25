import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Academics';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/academics/classes-sections', title: 'Classes & Sections', fields: [
      { key: 'className', label: 'Class Name', required: true },
      { key: 'sectionName', label: 'Section' },
      { key: 'classTeacher', label: 'Class Teacher' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
    ],
  },
  {
    path: '/school/academics/subjects', title: 'Subjects', fields: [
      { key: 'subjectName', label: 'Subject Name', required: true },
      { key: 'subjectCode', label: 'Subject Code' },
      { key: 'className', label: 'Class' },
      { key: 'teacherName', label: 'Teacher Name' },
    ],
  },
  {
    path: '/school/academics/teachers-subjects', title: 'Teachers & Subjects', fields: [
      { key: 'teacherName', label: 'Teacher Name', required: true },
      { key: 'subjectName', label: 'Subject' },
      { key: 'className', label: 'Class' },
      { key: 'weeklyPeriods', label: 'Weekly Periods', type: 'number' },
    ],
  },
  {
    path: '/school/academics/timetable', title: 'Timetable', fields: [
      { key: 'className', label: 'Class', required: true },
      { key: 'section', label: 'Section' },
      { key: 'day', label: 'Day', type: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
      { key: 'period', label: 'Period' },
      { key: 'subjectName', label: 'Subject' },
      { key: 'teacherName', label: 'Teacher Name' },
    ],
  },
  {
    path: '/school/academics/academic-year', title: 'Academic Year', fields: [
      { key: 'yearLabel', label: 'Academic Year', required: true },
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'endDate', label: 'End Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Upcoming', 'Active', 'Completed'] },
    ],
  },
];

export const academicRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
