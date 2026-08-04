import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import { DataTable } from '../../../components/common/DataTable.jsx';
import { PageHeader } from '../../../components/common/PageHeader.jsx';
import { useLoad } from '../../../hooks/useLoad.js';
import { noticeService } from '../../../services/noticeService.js';

export default function AllNotices() {
  const { data, loading, error } = useLoad(noticeService.adminList, []);
  const columns = [
    { key: 'publishDate', label: 'Sent Date' },
    { key: 'title', label: 'Title' },
    { key: 'message', label: 'Message' },
    { key: 'status', label: 'Status' },
  ];
  return (
    <>
      <PageHeader title="Employee Notices" subtitle="Announcements sent by the administrator" action={<Link className="btn primary" to="/employee-management/notices/add"><Send size={15} />Send Notice</Link>} />
      {error && <p className="error">{error}</p>}
      {loading ? <div className="card">Loading...</div> : <DataTable columns={columns} rows={data?.data || []} empty="No notices sent yet" />}
    </>
  );
}