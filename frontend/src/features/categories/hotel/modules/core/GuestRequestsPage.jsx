import { useMemo, useState } from 'react';
import { Filter, RefreshCw } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { Badge, Card, EmptySearch, PageHeader, SecondaryButton, TableActions, frontDeskRequests } from './FrontDeskShared.jsx';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';

const tabs = ['All', 'Pending', 'In Progress', 'Completed'];

export function GuestRequestsPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [requests, setRequests] = useState(frontDeskRequests);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All Types');
  const [floor, setFloor] = useState('All Floors');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesTab = activeTab === 'All' || request.status === activeTab;
      const matchesType = type === 'All Types' || request.type === type;
      const matchesSearch = !query || [request.id, request.guest, request.room, request.type].some((value) => value.toLowerCase().includes(query));
      const matchesFloor = floor === 'All Floors' || request.room.startsWith(floor.replace('Floor ', ''));
      return matchesTab && matchesType && matchesSearch && matchesFloor;
    });
  }, [activeTab, floor, requests, search, type]);

  const pagination = paginateRows(filtered, page, pageSize);

  function handleRequestAction(action, request) {
    if (!request) return;
    if (action === 'View') setMessage(`${request.id}: ${request.type} for ${request.guest} (${request.room}).`);
    if (action === 'Edit') {
      const updated = { ...request, status: 'In Progress' };
      setRequests((current) => current.map((item) => (item.id === request.id ? updated : item)));
      setMessage(`${request.id} moved to In Progress.`);
    }
    if (action === 'Delete') {
      const ok = window.confirm(`Delete request ${request.id}?`);
      if (!ok) return;
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setMessage(`${request.id} deleted.`);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <PageHeader title="Guest Requests" subtitle="View and manage guest service requests." />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      <Card>
        <div className="border-b border-slate-100 px-4 pt-3">
          <div className="flex flex-wrap gap-5">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border-0 border-b-2 bg-transparent px-0 py-3 text-[13px] font-semibold ${
                  activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_180px_180px_auto_auto]">
          <EmptySearch value={search} onChange={setSearch} placeholder="Search request or guest..." />
          <SelectDropdown
            value={type}
            onChange={setType}
            options={['All Types', 'Extra Blanket', 'Room Cleaning', 'Toiletries', 'Wi-Fi Issue', 'Late Check-out']}
          />
          <SelectDropdown value={floor} onChange={setFloor} options={['All Floors', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5']} />
          <SecondaryButton>
            <Filter size={15} />
            Filter
          </SecondaryButton>
          <SecondaryButton className="px-3" aria-label="Refresh">
            <RefreshCw size={15} />
          </SecondaryButton>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Request ID</th>
                <th className="px-4 py-3 font-semibold">Guest / Room</th>
                <th className="px-4 py-3 font-semibold">Request Type</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Request Time</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageRows.map((request) => (
                <tr key={request.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{request.id}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{request.guest} ({request.room})</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{request.type}</td>
                  <td className="px-4 py-3"><Badge>{request.priority}</Badge></td>
                  <td className="px-4 py-3"><Badge>{request.status}</Badge></td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{request.time}</td>
                  <td className="px-4 py-3"><TableActions item={request} onAction={handleRequestAction} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">
                    No requests match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={filtered.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Card>
    </div>
  );
}
