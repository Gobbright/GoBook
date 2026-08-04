import { DataTable } from '../../components/common/DataTable.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { useLoad } from '../../hooks/useLoad.js';
import { leaveService } from '../../services/leaveService.js';

export default function LeaveStatus() {
  const { data, loading, error } = useLoad(leaveService.status, []);
  const columns = [
    { key: 'leaveId', label: 'Leave ID' },
    { key: 'applied', label: 'Applied Date' },
    { key: 'type', label: 'Type' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'days', label: 'Days' },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status' },
  ];
  return <><PageHeader title="Leave Status" subtitle="Latest leave request status" />{error && <p className="error">{error}</p>}{loading ? <div className="card">Loading...</div> : <DataTable columns={columns} rows={data?.data || []} />}</>;
}