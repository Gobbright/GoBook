import { NavLink } from 'react-router-dom';

const PAYROLL_PAGES = [
  { label: 'Salary Structure', path: '/employee-management/payroll' },
  { label: 'Payroll Processing', path: '/employee-management/payroll/processing' },
  { label: 'Payslips', path: '/employee-management/payroll/payslips' },
  { label: 'Deductions', path: '/employee-management/payroll/deductions' },
  { label: 'Payroll Reports', path: '/employee-management/payroll/reports' },
];

export function PayrollNav({ current }) {
  return (
    <nav className="hr-subsection-tabs" aria-label="Payroll subsection navigation">
      {PAYROLL_PAGES.map((page) => <NavLink className={page.path === current ? 'active' : ''} key={page.path} to={page.path}>{page.label}</NavLink>)}
    </nav>
  );
}

export function payrollMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}
