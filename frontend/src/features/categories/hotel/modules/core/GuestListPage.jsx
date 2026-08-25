import { useEffect, useMemo, useState } from 'react';
import { Download, Filter, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { deleteModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';
import {
  GuestBadge,
  GuestCard,
  GuestPageHeader,
  GuestPrimaryButton,
  GuestSearch,
  GuestSecondaryButton,
  GuestStatCard,
  GuestTableActions,
} from './GuestShared.jsx';

function normalizeGuestRecord(record, index, sourceModule = 'hotel/guests/list') {
  const data = record.data || {};
  return {
    recordId: record._id,
    sourceModule,
    id: data.guestId || data.id || `GST-${String(index + 1).padStart(5, '0')}`,
    name: data.guestName || data.fullName || data.name || 'Guest',
    mobile: data.mobile || data.phone || '',
    email: data.email || '',
    nationality: data.nationality || data.country || 'Indian',
    status: data.status === 'Registered' ? 'Checked-out' : data.status || 'Checked-out',
    vip: Boolean(data.vip),
    room: data.room || data.roomNumber || '-',
    roomType: data.roomType || '-',
    lastStay: data.lastStay || '-',
    stays: Number(data.stays || 0),
  };
}

export function GuestListPage() {
  const navigate = useNavigate();
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState('');
  const [nationality, setNationality] = useState('All');
  const [vipStatus, setVipStatus] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    let active = true;
    Promise.all([
      listModuleRecords('hotel/guests/list').catch(() => ({ records: [] })),
      listModuleRecords('hotel/front-desk/in-house-guests').catch(() => ({ records: [] })),
    ]).then(([guestRes, inHouseRes]) => {
      if (!active) return;
      const savedGuests = (guestRes.records || []).map((record, index) => normalizeGuestRecord(record, index, 'hotel/guests/list'));
      const inHouseGuests = (inHouseRes.records || []).map((record, index) => ({
        ...normalizeGuestRecord(record, index, 'hotel/front-desk/in-house-guests'),
        status: 'In-House',
        room: record.data?.room || record.data?.roomNumber || '-',
        roomType: record.data?.roomType || '-',
      }));
      const byMobileOrName = new Map();
      [...savedGuests, ...inHouseGuests].forEach((guest) => {
        byMobileOrName.set(guest.mobile || guest.name, guest);
      });
      setGuests([...byMobileOrName.values()]);
    });
    return () => { active = false; };
  }, []);

  const filteredGuests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return guests.filter((guest) => {
      const matchesSearch = !query || [guest.id, guest.name, guest.mobile, guest.email, guest.room].some((value) => value.toLowerCase().includes(query));
      const matchesNationality = nationality === 'All' || guest.nationality === nationality;
      const matchesVip = vipStatus === 'All' || (vipStatus === 'VIP' ? guest.vip : !guest.vip);
      const matchesStatus = status === 'All' || guest.status === status;
      return matchesSearch && matchesNationality && matchesVip && matchesStatus;
    });
  }, [guests, nationality, search, status, vipStatus]);

  const counts = useMemo(() => ({
    total: guests.length,
    inHouse: guests.filter((guest) => guest.status === 'In-House').length,
    checkedOut: guests.filter((guest) => guest.status === 'Checked-out').length,
    vip: guests.filter((guest) => guest.vip).length,
  }), [guests]);

  const pagination = paginateRows(filteredGuests, page, pageSize);

  async function handleGuestAction(action, guest) {
    if (action === 'View') navigate('/hotel/guests/profile');
    if (action === 'Edit') navigate('/hotel/guests/registration');
    if (action === 'Delete') {
      const ok = window.confirm(`Delete ${guest?.name || 'guest'}?`);
      if (!ok) return;
      try {
        if (guest.recordId) await deleteModuleRecord(guest.recordId);
        setGuests((current) => current.filter((item) => item.recordId !== guest.recordId));
      } catch (err) {
        window.alert(err.message || 'Unable to delete guest.');
      }
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <GuestPageHeader
        title="Guest List"
        subtitle="View and manage all guests"
        actions={(
          <>
            <Link to="/hotel/guests/registration" className="no-underline">
              <GuestPrimaryButton>
                <Plus size={15} />
                Add New Guest
              </GuestPrimaryButton>
            </Link>
            <GuestSecondaryButton>
              <Download size={15} />
              Export
            </GuestSecondaryButton>
          </>
        )}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <GuestStatCard label="Total Guests" value={counts.total} tone="blue" />
        <GuestStatCard label="In-House Guests" value={counts.inHouse} tone="green" />
        <GuestStatCard label="Checked-out" value={counts.checkedOut} tone="amber" />
        <GuestStatCard label="VIP Guests" value={counts.vip} tone="blue" />
      </div>

      <GuestCard>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 xl:grid-cols-[1fr_180px_160px_160px_auto]">
          <GuestSearch value={search} onChange={setSearch} placeholder="Search guest by name, mobile, email or ID..." />
          <SelectDropdown value={nationality} onChange={setNationality} options={['All', 'Indian', 'American', 'British']} />
          <SelectDropdown value={vipStatus} onChange={setVipStatus} options={['All', 'VIP', 'Non VIP']} />
          <SelectDropdown value={status} onChange={setStatus} options={['All', 'In-House', 'Checked-out']} />
          <GuestSecondaryButton>
            <Filter size={15} />
            Filter
          </GuestSecondaryButton>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Guest ID</th>
                <th className="px-4 py-3 font-semibold">Guest Name</th>
                <th className="px-4 py-3 font-semibold">Mobile Number</th>
                <th className="px-4 py-3 font-semibold">Email ID</th>
                <th className="px-4 py-3 font-semibold">Nationality</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">VIP Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageRows.map((guest) => (
                <tr key={guest.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-[13px] font-semibold text-blue-700">{guest.id}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{guest.name}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{guest.mobile}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{guest.email}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{guest.nationality}</td>
                  <td className="px-4 py-3"><GuestBadge>{guest.status}</GuestBadge></td>
                  <td className="px-4 py-3">{guest.vip ? <GuestBadge>VIP</GuestBadge> : <span className="text-slate-400">-</span>}</td>
                  <td className="px-4 py-3"><GuestTableActions item={guest} onAction={handleGuestAction} /></td>
                </tr>
              ))}
              {filteredGuests.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-slate-500">No guests match the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={filteredGuests.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </GuestCard>
    </div>
  );
}
