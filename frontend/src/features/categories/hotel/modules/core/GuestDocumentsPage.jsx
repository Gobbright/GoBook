import { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Plus, Search } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import {
  GuestAvatar,
  GuestBadge,
  GuestCard,
  GuestPageHeader,
  GuestPrimaryButton,
  GuestSearch,
  GuestTableActions,
} from './GuestShared.jsx';
import { deleteModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';

const EMPTY_GUEST = { id: '-', name: 'No guest selected', mobile: '-', email: '-', room: '-', status: 'Registered', vip: false };

export function GuestDocumentsPage() {
  const [guest, setGuest] = useState(EMPTY_GUEST);
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All Documents');
  const [status, setStatus] = useState('All Status');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    let active = true;
    Promise.all([
      listModuleRecords('hotel/guests/list').catch(() => ({ records: [] })),
      listModuleRecords('hotel/guests/documents').catch(() => ({ records: [] })),
    ]).then(([guestRes, documentRes]) => {
      if (!active) return;
      const selected = guestRes.records?.[0]?.data;
      if (selected) {
        setGuest({
          id: selected.guestId || selected.id || '-',
          name: selected.guestName || selected.fullName || selected.name || EMPTY_GUEST.name,
          mobile: selected.mobile || selected.phone || '-',
          email: selected.email || '-',
          room: selected.roomNumber || selected.room || '-',
          status: selected.status || 'Registered',
          vip: Boolean(selected.vip),
        });
      }
      setDocuments((documentRes.records || []).map((record) => {
        const data = record.data || {};
        return {
          recordId: record._id,
          type: data.documentType || data.idType || '-',
          number: data.documentNo || data.idNumber || '-',
          issueDate: data.issueDate || '-',
          expiryDate: data.expiryDate || '-',
          uploadedOn: data.uploadedOn || record.createdAt || '-',
          status: data.status || 'Pending',
        };
      }));
    });
    return () => { active = false; };
  }, []);

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((document) => {
      const matchesSearch = !query || [document.type, document.number].some((value) => value.toLowerCase().includes(query));
      const matchesType = type === 'All Documents' || document.type === type;
      const matchesStatus = status === 'All Status' || document.status === status;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [documents, search, status, type]);

  const pagination = paginateRows(filteredDocuments, page, pageSize);

  async function handleDocumentAction(action, document) {
    if (action === 'View') window.alert(`${document.type}: ${document.number}`);
    if (action === 'Download') window.alert(`${document.type} download requested.`);
    if (action === 'Delete') {
      const ok = window.confirm(`Delete ${document.type} document?`);
      if (!ok) return;
      try {
        if (document.recordId) await deleteModuleRecord(document.recordId);
        setDocuments((current) => current.filter((item) => item.recordId !== document.recordId));
      } catch (err) {
        window.alert(err.message || 'Unable to delete document.');
      }
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <GuestPageHeader
        title="Guest Documents"
        subtitle="View and manage guest documents"
        actions={(
          <GuestPrimaryButton>
            <Plus size={15} />
            Upload Document
          </GuestPrimaryButton>
        )}
      />

      <GuestCard className="mb-4 p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr] lg:items-center">
          <div className="flex items-center gap-3">
            <GuestAvatar />
            <div>
              <div className="flex items-center gap-2">
                <div className="text-[16px] font-bold text-slate-950">{guest.name}</div>
                {guest.vip && <GuestBadge>VIP</GuestBadge>}
              </div>
              <div className="mt-1 text-[12px] text-slate-500">Guest ID: {guest.id}</div>
            </div>
          </div>
          <div className="text-[13px] text-slate-700">
            <div className="flex items-center gap-2"><Phone size={14} className="text-slate-500" /> {guest.mobile}</div>
            <div className="mt-2 flex items-center gap-2"><Mail size={14} className="text-slate-500" /> {guest.email}</div>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-slate-500">Room No.</div>
            <div className="mt-1 text-[13px] font-bold text-slate-950">{guest.room}</div>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-slate-500">Status</div>
            <div className="mt-1"><GuestBadge>{guest.status}</GuestBadge></div>
          </div>
        </div>
      </GuestCard>

      <GuestCard>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_180px_160px]">
          <GuestSearch value={search} onChange={setSearch} placeholder="Search document or number..." />
          <SelectDropdown value={type} onChange={setType} options={['All Documents', 'Aadhaar Card', 'PAN Card', 'Driving License', 'Passport']} />
          <SelectDropdown value={status} onChange={setStatus} options={['All Status', 'Verified', 'Pending', 'Expired']} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Document Type</th>
                <th className="px-4 py-3 font-semibold">Document Number</th>
                <th className="px-4 py-3 font-semibold">Issue Date</th>
                <th className="px-4 py-3 font-semibold">Expiry Date</th>
                <th className="px-4 py-3 font-semibold">Uploaded On</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageRows.map((document) => (
                <tr key={document.type} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{document.type}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{document.number}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{document.issueDate}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{document.expiryDate}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{document.uploadedOn}</td>
                  <td className="px-4 py-3"><GuestBadge>{document.status}</GuestBadge></td>
                  <td className="px-4 py-3"><GuestTableActions document item={document} onAction={handleDocumentAction} /></td>
                </tr>
              ))}
              {filteredDocuments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">No documents match the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={filteredDocuments.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </GuestCard>

      <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-500">
        <Search size={14} />
        Documents can be linked to reservations, stays, or billing records during upload.
      </div>
    </div>
  );
}
