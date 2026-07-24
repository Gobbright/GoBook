import { DataTable } from '../../../components/common/DataTable.jsx';
import { PageHeader } from '../../../components/common/PageHeader.jsx';
import { useLoad } from '../../../hooks/useLoad.js';
import { attendanceService } from '../../../services/attendanceService.js';

function dateTimeText(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CorrectionRequests() {
  const { data, loading, error, setData } = useLoad(attendanceService.corrections, []);
  async function update(row, status) {
    const updated = await attendanceService.updateCorrection(row._id, { status });
    setData((current) => ({ data: (current?.data || []).map((record) => record._id === updated._id ? updated : record) }));
  }
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'createdAt', label: 'Requested At', render: (row) => dateTimeText(row.createdAt) },
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'name', label: 'Name' },
    { key: 'dept', label: 'Department' },
    { key: 'checkIn', label: 'Check In' },
    { key: 'checkOut', label: 'Check Out' },
    { key: 'reason', label: 'Reason' },
    { key: 'reviewedBy', label: 'Reviewed By' },
    { key: 'status', label: 'Status' },
  ];
  return <><PageHeader title="Correction Requests" subtitle="Approve or reject attendance corrections" />{error && <p className="error">{error}</p>}{loading ? <div className="card">Loading...</div> : <DataTable columns={columns} rows={data?.data || []} actions={(row) => <div className="row-actions"><button className="btn primary" onClick={() => update(row, 'Approved')}>Approve</button><button className="btn" onClick={() => update(row, 'Rejected')}>Reject</button></div>} />}</>;
}