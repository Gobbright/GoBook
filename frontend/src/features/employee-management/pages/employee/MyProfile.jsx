import { PageHeader } from '../../components/common/PageHeader.jsx';
import { useLoad } from '../../hooks/useLoad.js';
import { authService } from '../../services/authService.js';

export default function MyProfile() {
  const { data, loading, error } = useLoad(authService.me, []);
  const employee = data?.employee;
  return <><PageHeader title="My Profile" subtitle="Your employee profile" />{error && <p className="error">{error}</p>}{loading ? <div className="card">Loading...</div> : <div className="card profile-grid">{[['Employee ID', employee?.employeeId], ['Name', employee?.name || data?.user?.name], ['Email', employee?.email || data?.user?.email], ['Mobile', employee?.phone], ['Department', employee?.dept], ['Designation', employee?.designation], ['Joining Date', employee?.joinDate], ['Status', employee?.status]].map(([label, value]) => <div className="profile-field" key={label}><strong>{label}</strong><p>{value || '-'}</p></div>)}</div>}</>;
}
