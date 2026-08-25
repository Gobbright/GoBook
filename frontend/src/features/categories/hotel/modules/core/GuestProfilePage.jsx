import { useEffect, useState } from 'react';
import { Ban, CalendarPlus, CreditCard, Edit2, FileText, Mail, MessageSquare, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  GuestAvatar,
  GuestBadge,
  GuestCard,
  GuestPageHeader,
  GuestSecondaryButton,
  money,
} from './GuestShared.jsx';
import { listModuleRecords } from '../../../../../services/moduleRecordsService.js';

const tabs = ['Personal Information', 'Contact & Address', 'ID Proof', 'Stay History', 'Notes & Preferences'];

const EMPTY_GUEST = { id: '-', name: 'No guest selected', mobile: '-', email: '-', nationality: '-', status: 'Registered', vip: false, room: '-', roomType: '-', checkIn: '-', checkOut: '-' };

function InfoTile({ label, value }) {
  return (
    <div>
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-[13px] font-bold text-slate-950">{value}</div>
    </div>
  );
}

function ProfileAction({ icon: Icon, children, danger }) {
  return (
    <button
      type="button"
      className={`inline-flex h-11 w-full items-center gap-3 rounded-md border px-3 text-[13px] font-semibold ${
        danger ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border-slate-200 bg-white text-blue-700 hover:border-blue-300'
      }`}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}

function DataTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-semibold">Stay ID</th>
            <th className="px-4 py-3 font-semibold">Room</th>
            <th className="px-4 py-3 font-semibold">Nights</th>
            <th className="px-4 py-3 font-semibold">Amount</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{row.id}</td>
              <td className="px-4 py-3 text-[13px] text-slate-700">{row.room}</td>
              <td className="px-4 py-3 text-[13px] text-slate-700">{row.nights}</td>
              <td className="px-4 py-3 text-[13px] text-slate-700">{money(row.amount)}</td>
              <td className="px-4 py-3"><GuestBadge>{row.status === 'Current' ? 'In-House' : 'Checked-out'}</GuestBadge></td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-[13px] text-slate-500">No stay history found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function GuestProfilePage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [guest, setGuest] = useState(EMPTY_GUEST);
  const [stayHistory, setStayHistory] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      listModuleRecords('hotel/guests/list').catch(() => ({ records: [] })),
      listModuleRecords('hotel/front-desk/in-house-guests').catch(() => ({ records: [] })),
      listModuleRecords('hotel/reservations/list').catch(() => ({ records: [] })),
    ]).then(([guestRes, stayRes, reservationRes]) => {
      if (!active) return;
      const firstGuestRecord = guestRes.records?.[0]?.data;
      const firstStayRecord = stayRes.records?.[0]?.data;
      const selected = firstStayRecord || firstGuestRecord;
      if (selected) {
        const selectedName = selected.guestName || selected.fullName || selected.name || EMPTY_GUEST.name;
        setGuest({
          id: selected.guestId || selected.reservationId || selected.id || '-',
          name: selectedName,
          mobile: selected.mobile || selected.phone || '-',
          email: selected.email || '-',
          nationality: selected.nationality || selected.country || '-',
          status: selected.status || 'Registered',
          vip: Boolean(selected.vip),
          room: selected.roomNumber || selected.room || '-',
          roomType: selected.roomType || '-',
          checkIn: selected.checkInDate || selected.checkIn || '-',
          checkOut: selected.checkOutDate || selected.checkOut || '-',
          address: selected.address || '-',
          idProof: selected.idProof || selected.idNumber || '-',
        });
        const rows = [...(stayRes.records || []), ...(reservationRes.records || [])]
          .map((record, index) => {
            const data = record.data || {};
            if ((data.guestName || data.fullName || data.name) !== selectedName) return null;
            return {
              id: data.stayId || data.reservationId || data.reservationNo || `STAY-${index + 1}`,
              room: data.roomNumber || data.room || data.availableRoom || '-',
              nights: Number(data.nights || 0),
              amount: Number(data.amount || data.estimatedTotal || 0),
              status: data.status || 'Registered',
            };
          })
          .filter(Boolean);
        setStayHistory(rows);
      }
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <GuestPageHeader title="Guest Profile" subtitle="View guest detailed information" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_260px]">
        <GuestCard className="p-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
            <div className="flex items-start gap-4">
              <GuestAvatar size="lg" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="m-0 text-[20px] font-bold text-slate-950">{guest.name}</h2>
                  {guest.vip && <GuestBadge>VIP</GuestBadge>}
                </div>
                <p className="m-0 mt-1 text-[12px] text-slate-500">Guest ID: {guest.id}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-4">
              <InfoTile label="Current" value={<GuestBadge>{guest.status}</GuestBadge>} />
              <InfoTile label="Check-in Date" value={guest.checkIn} />
              <InfoTile label="Room No." value={guest.room} />
              <InfoTile label="Expected Check-out" value={guest.checkOut} />
            </div>
          </div>
        </GuestCard>

        <GuestCard className="p-4">
          <div className="grid gap-2">
            <Link to="/hotel/guests/registration" className="no-underline"><ProfileAction icon={Edit2}>Edit Profile</ProfileAction></Link>
            <ProfileAction icon={MessageSquare}>Add Note</ProfileAction>
            <Link to="/hotel/billing/guest-billing" className="no-underline"><ProfileAction icon={CreditCard}>View Folio</ProfileAction></Link>
            <ProfileAction icon={Mail}>Send Message</ProfileAction>
            <ProfileAction icon={Ban} danger>Block Guest</ProfileAction>
          </div>
        </GuestCard>
      </div>

      <GuestCard className="mt-4">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-0 border-b-2 bg-transparent px-3 py-3 text-[13px] font-semibold ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'Personal Information' && (
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 md:grid-cols-4">
              <InfoTile label="Full Name" value={guest.name} />
              <InfoTile label="Gender" value="-" />
              <InfoTile label="Date of Birth" value="-" />
              <InfoTile label="Nationality" value={guest.nationality} />
              <InfoTile label="Marital Status" value="-" />
              <InfoTile label="VIP Status" value={guest.vip ? 'Yes' : 'No'} />
              <InfoTile label="Registration" value="-" />
              <InfoTile label="Registered By" value="-" />
            </div>
          )}
          {activeTab === 'Contact & Address' && (
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 md:grid-cols-4">
              <InfoTile label="Mobile Number" value={guest.mobile} />
              <InfoTile label="Email" value={guest.email} />
              <InfoTile label="Address" value={guest.address || '-'} />
              <InfoTile label="City" value="-" />
              <InfoTile label="State" value="-" />
              <InfoTile label="PIN Code" value="-" />
              <InfoTile label="Country" value={guest.nationality} />
              <InfoTile label="Preferred Language" value="-" />
            </div>
          )}
          {activeTab === 'ID Proof' && (
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 md:grid-cols-4">
              <InfoTile label="ID Proof Type" value="-" />
              <InfoTile label="ID Number" value={guest.idProof || '-'} />
              <InfoTile label="Issue Date" value="-" />
              <InfoTile label="Verification" value={<GuestBadge>Pending</GuestBadge>} />
            </div>
          )}
          {activeTab === 'Stay History' && <DataTable rows={stayHistory} />}
          {activeTab === 'Notes & Preferences' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <GuestCard className="bg-slate-50 p-4 shadow-none"><InfoTile label="Room Preference" value="-" /></GuestCard>
              <GuestCard className="bg-slate-50 p-4 shadow-none"><InfoTile label="Food Preference" value="-" /></GuestCard>
              <GuestCard className="bg-slate-50 p-4 shadow-none"><InfoTile label="Special Notes" value="-" /></GuestCard>
            </div>
          )}
        </div>
      </GuestCard>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/hotel/reservations/new" className="no-underline"><GuestSecondaryButton><CalendarPlus size={15} />New Reservation</GuestSecondaryButton></Link>
        <Link to="/hotel/front-desk/check-in" className="no-underline"><GuestSecondaryButton><UserCheck size={15} />Check-in</GuestSecondaryButton></Link>
        <Link to="/hotel/guests/documents" className="no-underline"><GuestSecondaryButton><FileText size={15} />Documents</GuestSecondaryButton></Link>
      </div>
    </div>
  );
}
