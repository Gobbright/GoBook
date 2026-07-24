import { Bell, CalendarCheck, ClipboardList, Wallet } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { StatCard } from '../../components/common/StatCard.jsx';
import { useLoad } from '../../hooks/useLoad.js';
import { api } from '../../services/api.js';

export default function Dashboard() {
  const { data, loading, error } = useLoad(() => api.get('/employee/dashboard'), []);
  const stats = data || {};
  return <><PageHeader title="Employee Dashboard" subtitle="Your attendance, leave and notices" />{error && <p className="error">{error}</p>}<div className="grid stats"><StatCard label="Attendance" value={loading ? '...' : stats.attendance || 0} icon={CalendarCheck} /><StatCard label="Leaves" value={loading ? '...' : stats.leaves || 0} icon={ClipboardList} /><StatCard label="Payslips" value={loading ? '...' : stats.payslips || 0} icon={Wallet} /><StatCard label="Notices" value={loading ? '...' : stats.notices || 0} icon={Bell} /></div></>;
}