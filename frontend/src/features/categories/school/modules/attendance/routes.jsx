import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Attendance';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/attendance/student-attendance', title: 'Student Attendance', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'className', label: 'Class' },
      { key: 'section', label: 'Section' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Present', 'Absent', 'Leave', 'Late'] },
    ],
  },
  {
    path: '/school/attendance/teacher-attendance', title: 'Teacher Attendance', fields: [
      { key: 'teacherName', label: 'Teacher Name', required: true },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Present', 'Absent', 'Leave', 'Late'] },
      { key: 'inTime', label: 'In Time' },
      { key: 'outTime', label: 'Out Time' },
    ],
  },
  {
    path: '/school/attendance/register', title: 'Attendance Register', fields: [
      { key: 'className', label: 'Class', required: true },
      { key: 'section', label: 'Section' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'totalStudents', label: 'Total Students', type: 'number' },
      { key: 'presentCount', label: 'Present Count', type: 'number' },
      { key: 'absentCount', label: 'Absent Count', type: 'number' },
    ],
  },
  {
    path: '/school/attendance/leave-management', title: 'Leave Management', fields: [
      { key: 'applicantName', label: 'Applicant Name', required: true },
      { key: 'applicantType', label: 'Applicant Type', type: 'select', options: ['Student', 'Teacher', 'Staff'] },
      { key: 'fromDate', label: 'From Date', type: 'date' },
      { key: 'toDate', label: 'To Date', type: 'date' },
      { key: 'reason', label: 'Reason', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
    ],
  },
  {
    path: '/school/attendance/reports', title: 'Attendance Reports', fields: [
      { key: 'reportTitle', label: 'Report Title', required: true },
      { key: 'className', label: 'Class' },
      { key: 'period', label: 'Period' },
      { key: 'attendancePercentage', label: 'Attendance %', type: 'number' },
      { key: 'remarks', label: 'Remarks', type: 'textarea' },
    ],
  },
];

export const attendanceRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
