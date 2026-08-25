import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Download, Filter, MoreVertical, Plus, RefreshCw, Search, UserCheck,
  UserMinus, UserRound, Users, X, XCircle,
} from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';

const STATUSES = ['Active', 'Probation', 'On Leave', 'Inactive', 'Resigned', 'Terminated'];

function statusClass(status) {
  if (status === 'Active') return 'hr-pill green';
  if (status === 'Probation') return 'hr-pill amber';
  if (status === 'On Leave') return 'hr-pill blue';
  if (status === 'Inactive' || status === 'Resigned') return 'hr-pill gray';
  return 'hr-pill red';
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'E';
}

function dateText(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function EmployeeList() {
  const { data, loading, error, setData, reload } = useLoad(adminService.employees, []);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuId, setMenuId] = useState('');
  const [filters, setFilters] = useState({ dept: '', designation: '', branch: '', manager: '', status: new Set(['Active']) });
  const rows = useMemo(() => data?.data || [], [data]);

  const options = useMemo(() => ({
    depts: [...new Set(rows.map((r) => r.dept).filter(Boolean))],
    designations: [...new Set(rows.map((r) => r.designation).filter(Boolean))],
    branches: [...new Set(rows.map((r) => r.branch).filter(Boolean))],
    managers: [...new Set(rows.map((r) => r.reportingManager).filter(Boolean))],
  }), [rows]);

  const filtered = rows.filter((row) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || [row.name, row.email, row.phone, row.employeeId, row.dept, row.designation].some((value) => String(value || '').toLowerCase().includes(q));
    const matchesStatus = filters.status.size === 0 || filters.status.has(row.status || 'Active');
    return matchesQuery
      && matchesStatus
      && (!filters.dept || row.dept === filters.dept)
      && (!filters.designation || row.designation === filters.designation)
      && (!filters.branch || row.branch === filters.branch)
      && (!filters.manager || row.reportingManager === filters.manager);
  });

  const counts = {
    total: rows.length,
    active: rows.filter((r) => (r.status || 'Active') === 'Active').length,
    probation: rows.filter((r) => r.status === 'Probation').length,
    onLeave: rows.filter((r) => r.status === 'On Leave').length,
    inactive: rows.filter((r) => r.status === 'Inactive').length,
    resigned: rows.filter((r) => r.status === 'Resigned').length,
  };

  function toggleStatus(status) {
    setFilters((current) => {
      const next = new Set(current.status);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return { ...current, status: next };
    });
  }

  async function deactivate(row) {
    await adminService.updateEmployee(row._id, { name: row.name, email: row.email, status: 'Inactive' });
    setData((current) => ({ ...current, data: (current?.data || []).map((item) => item._id === row._id ? { ...item, status: 'Inactive' } : item) }));
    setMenuId('');
  }

  return (
    <div className="hr-screen">
      <div className="hr-page-head">
        <div>
          <h1>Employees</h1>
          <p>View and manage your organization employees</p>
        </div>
        <div className="hr-actions">
          <Link className="hr-btn primary" to="/employee-management/employees/add"><Plus size={15} /> Add Employee</Link>
          <button className="hr-icon-btn" type="button"><MoreVertical size={17} /></button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="hr-stat-grid">
        {[
          [Users, counts.total, 'Total Employees', 'blue'],
          [CheckCircle2, counts.active, 'Active', 'green'],
          [UserRound, counts.probation, 'Probation', 'orange'],
          [UserCheck, counts.onLeave, 'On Leave', 'blue'],
          [XCircle, counts.inactive, 'Inactive', 'red'],
          [UserMinus, counts.resigned, 'Resigned', 'red'],
        ].map(([Icon, value, label, tone]) => (
          <section className="hr-stat-card" key={label}>
            <span className={`hr-stat-icon ${tone}`}><Icon size={21} /></span>
            <div><strong>{value}</strong><span>{label}</span></div>
          </section>
        ))}
      </div>

      <section className="hr-card">
        <div className="hr-toolbar">
          <div className="hr-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, ID, email or mobile..." /></div>
          <button className="hr-btn soft" type="button" onClick={() => setFiltersOpen(true)}>Filter <Filter size={14} /></button>
          <button className="hr-icon-btn" type="button" title="Export"><Download size={16} /></button>
          <button className="hr-icon-btn" type="button" title="Refresh" onClick={reload}><RefreshCw size={16} /></button>
        </div>

        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead><tr><th>Employee</th><th>ID</th><th>Department</th><th>Designation</th><th>Branch</th><th>Manager</th><th>Joining Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={9}>Loading employees...</td></tr> : null}
              {!loading && filtered.length === 0 ? <tr><td colSpan={9}>No employees found.</td></tr> : null}
              {filtered.map((row) => (
                <tr key={row._id}>
                  <td>
                    <div className="hr-employee-cell"><span>{initials(row.name)}</span><div><strong>{row.name}</strong><small>{row.email || '-'}<br />{row.phone || '-'}</small></div></div>
                  </td>
                  <td>{row.employeeId}</td><td>{row.dept || '-'}</td><td>{row.designation || '-'}</td><td>{row.branch || '-'}</td><td>{row.reportingManager || '-'}</td><td>{dateText(row.joinDate)}</td>
                  <td><span className={statusClass(row.status || 'Active')}>{row.status || 'Active'}</span></td>
                  <td className="hr-menu-cell">
                    <button className="hr-icon-btn" type="button" onClick={() => setMenuId(menuId === row._id ? '' : row._id)}><MoreVertical size={15} /></button>
                    {menuId === row._id && (
                      <div className="hr-row-menu">
                        <Link to={`/employee-management/employees/${row._id}`}>View Profile</Link>
                        <Link to={`/employee-management/employees/${row._id}/documents`}>Documents</Link>
                        <Link to={`/employee-management/employees/add?edit=${row._id}`}>Edit</Link>
                        <button type="button" onClick={() => deactivate(row)}>Deactivate</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="hr-table-footer">Showing {filtered.length} of {rows.length} entries</div>
      </section>

      {filtersOpen && (
        <aside className="hr-filter-panel">
          <div className="hr-panel-head"><h2>Filter Employees</h2><button type="button" onClick={() => setFiltersOpen(false)}><X size={17} /></button></div>
          {[
            ['Department', 'dept', options.depts],
            ['Designation', 'designation', options.designations],
            ['Branch', 'branch', options.branches],
            ['Reporting Manager', 'manager', options.managers],
          ].map(([label, key, items]) => (
            <label className="hr-field" key={key}>{label}<select value={filters[key]} onChange={(e) => setFilters((current) => ({ ...current, [key]: e.target.value }))}><option value="">All</option>{items.map((item) => <option key={item}>{item}</option>)}</select></label>
          ))}
          <div className="hr-check-list"><strong>Employment Status</strong>{STATUSES.map((status) => <label key={status}><input type="checkbox" checked={filters.status.has(status)} onChange={() => toggleStatus(status)} />{status}</label>)}</div>
          <div className="hr-panel-actions"><button className="hr-btn" type="button" onClick={() => setFilters({ dept: '', designation: '', branch: '', manager: '', status: new Set() })}>Reset</button><button className="hr-btn primary" type="button" onClick={() => setFiltersOpen(false)}>Apply Filters</button></div>
        </aside>
      )}
    </div>
  );
}
