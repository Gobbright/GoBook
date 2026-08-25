import { NavLink } from 'react-router-dom';

const LEAVE_PAGES = [
  { label: 'Leave Requests', path: '/employee-management/leave' },
  { label: 'Leave Types', path: '/employee-management/leave/types' },
  { label: 'Leave Balance', path: '/employee-management/leave/balance' },
  { label: 'Leave Calendar', path: '/employee-management/leave/calendar' },
  { label: 'Leave Reports', path: '/employee-management/leave/reports' },
];

export function LeaveNav({ current }) {
  return (
    <nav className="hr-subsection-tabs" aria-label="Leave subsection navigation">
      {LEAVE_PAGES.map((page) => (
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
