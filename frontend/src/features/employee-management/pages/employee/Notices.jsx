import { PageHeader } from '../../components/common/PageHeader.jsx';
import { useLoad } from '../../hooks/useLoad.js';
import { api } from '../../services/api.js';

export default function Notices() {
  const { data, loading, error } = useLoad(() => api.get('/employee/notices'), []);
  const notices = data?.data || [];

  return (
    <>
      <PageHeader title="Notices" subtitle="Company announcements" />
      {error && <p className="error">{error}</p>}
      {loading ? (
        <div className="card">Loading...</div>
      ) : (
        <>
          <div className="table-count-badge notice-count-badge">Total: {notices.length} {notices.length === 1 ? 'record' : 'records'}</div>
          <div className="notice-list">
            {notices.length ? notices.map((notice, index) => (
              <article className="card notice-card" key={notice._id}>
                <small className="notice-number">#{index + 1}</small>
                <strong>{notice.title}</strong>
                <p>{notice.publishDate} - {notice.audience}</p>
                <div>{notice.message}</div>
              </article>
            )) : <div className="card empty">No notices found</div>}
          </div>
        </>
      )}
    </>
  );
}