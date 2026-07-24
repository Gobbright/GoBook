import { Link } from 'react-router-dom';
import { Scale, Tags } from 'lucide-react';
import { DataTable } from '../../../components/common/DataTable.jsx';
import { PageHeader } from '../../../components/common/PageHeader.jsx';
import { useLoad } from '../../../hooks/useLoad.js';
import { leaveService } from '../../../services/leaveService.js';

export default function LeaveRequests() {
  const { data, loading, error, setData } = useLoad(leaveService.adminLeaves, []);
  async function update(row, status) {
    const updated = await leaveService.updateStatus(row._id, status);
    setData((current) => ({ data: (current?.data || []).map((record) => record._id === updated._id ? updated : record) }));
  }
  const columns = [
    { key: 'leaveId', label: 'Leave ID' },
    { key: 'applied', label: 'Applied Date' },
    { key: 'empId', label: 'Employee ID' },
    { key: 'name', label: 'Name' },
    { key: 'dept', label: 'Department' },
    { key: 'type', label: 'Type' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'days', label: 'Days' },
    { key: 'reason', label: 'Reason' },
    { key: 'recordedBy', label: 'Source' },
    { key: 'status', label: 'Status' },
  ];
  return <><PageHeader title="Leave Requests" subtitle="Review employee leave applications" action={<div className="page-actions-row"><Link className="btn" to="/employee-management/leave/balance"><Scale size={15} />Balance</Link><Link className="btn" to="/employee-management/leave/types"><Tags size={15} />Types</Link></div>} />{error && <p className="error">{error}</p>}{loading ? <div className="card">Loading...</div> : <DataTable columns={columns} rows={data?.data || []} actions={(row) => <div className="row-actions"><button className="btn primary" onClick={() => update(row, 'Approved')}>Approve</button><button className="btn" onClick={() => update(row, 'Rejected')}>Reject</button></div>} />}</>;
}