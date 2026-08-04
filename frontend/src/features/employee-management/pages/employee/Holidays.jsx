import { DataTable } from '../../components/common/DataTable.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { useLoad } from '../../hooks/useLoad.js';
import { holidayService } from '../../services/holidayService.js';

export default function Holidays() {
  const { data, loading, error } = useLoad(holidayService.list, []);
  const columns = [{ key: 'date', label: 'Date' }, { key: 'name', label: 'Holiday' }, { key: 'type', label: 'Type' }];
  return <><PageHeader title="Holidays" subtitle="Company holiday calendar" />{error && <p className="error">{error}</p>}{loading ? <div className="card">Loading...</div> : <DataTable columns={columns} rows={data?.data || []} />}</>;
}