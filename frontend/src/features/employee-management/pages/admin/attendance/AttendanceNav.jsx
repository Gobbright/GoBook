import { NavLink } from 'react-router-dom';

const ATTENDANCE_PAGES = [
  { label: 'Daily Attendance', path: '/employee-management/attendance' },
  { label: 'Attendance Register', path: '/employee-management/attendance/monthly' },
  { label: 'Corrections', path: '/employee-management/attendance/corrections' },
  { label: 'Reports', path: '/employee-management/attendance/reports' },
];

export function AttendanceNav({ current }) {
  return (
    <nav className="hr-subsection-tabs" aria-label="Attendance subsection navigation">
      {ATTENDANCE_PAGES.map((page) => (
        <NavLink
          className={page.path === current || page.label === current ? 'active' : ''}
          key={page.path}
          to={page.path}
        >
          {page.label}
        </NavLink>
      ))}
    </nav>
  );
}
