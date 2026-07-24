import { DataTable } from '../../components/common/DataTable.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { useLoad } from '../../hooks/useLoad.js';
import { payrollService } from '../../services/payrollService.js';

export default function Payslips() {
  const { data, loading, error } = useLoad(payrollService.payslips, []);
  const columns = [{ key: 'month', label: 'Month' }, { key: 'basic', label: 'Basic' }, { key: 'allowances', label: 'Allowances' }, { key: 'deductions', label: 'Deductions' }, { key: 'net', label: 'Net' }, { key: 'status', label: 'Status' }];
  return <><PageHeader title="Payslips" subtitle="Only your payslips are shown" />{error && <p className="error">{error}</p>}{loading ? <div className="card">Loading...</div> : <DataTable columns={columns} rows={data?.data || []} />}</>;
}