import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import { PageHeader, ReservationShell } from './ReservationShared.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_OPTIONS = ['August 2026', 'September 2026', 'October 2026'];
const VIEW_OPTIONS = ['Month', 'Week', 'Day'];

const STATUS_STYLE = {
  Confirmed: 'bg-green-200 text-green-900',
  Pending: 'bg-orange-200 text-orange-900',
  'Checked-in': 'bg-violet-200 text-violet-900',
  'Checked-out': 'bg-slate-300 text-slate-900',
  Cancelled: 'bg-red-200 text-red-900',
};

const CALENDAR_ROWS = [
  [27, 28, 29, 30, 31, 1, 2],
  [3, 4, 5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14, 15, 16],
  [17, 18, 19, 20, 21, 22, 23],
  [24, 25, 26, 27, 28, 29, 30],
  [31, 1, 2, 3, 4, 5, 6],
];

function dayFromDate(value) {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.getDate();
  const match = String(value).match(/^(\d{1,2})/);
  return match ? Number(match[1]) : 0;
}

function bookingStyle(row) {
  return STATUS_STYLE[row.status] || STATUS_STYLE.Confirmed;
}

export function ReservationCalendarPage() {
  const [month, setMonth] = useState('August 2026');
  const [view, setView] = useState('Month');
  const [selected, setSelected] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      listModuleRecords('hotel/reservations/list').catch(() => ({ records: [] })),
      listModuleRecords('hotel/front-desk/in-house-guests').catch(() => ({ records: [] })),
    ])
      .then(([reservationRes, inHouseRes]) => {
        if (!active) return;
        const reservationBookings = (reservationRes.records || []).map((record, index) => {
          const data = record.data || {};
          return {
            id: record._id || data.reservationNo || `RES-${index + 1}`,
            guest: data.guestName || data.guest || '',
            room: data.availableRoom || data.roomNumber || data.room || '-',
            checkIn: data.checkInDate || data.checkIn || '',
            status: data.status || 'Pending',
          };
        });
        const inHouseBookings = (inHouseRes.records || []).map((record, index) => {
          const data = record.data || {};
          return {
            id: record._id || data.reservationId || `INH-${index + 1}`,
            guest: data.guestName || data.name || '',
            room: data.roomNumber || data.room || '-',
            checkIn: data.checkInDate || data.checkIn || '',
            status: 'Checked-in',
          };
        });
        setBookings([...reservationBookings, ...inHouseBookings].filter((booking) => booking.guest));
      })
      .catch(() => {
        if (active) setBookings([]);
      });
    return () => { active = false; };
  }, []);

  const bookingsByDay = useMemo(() => bookings.reduce((map, item) => {
    const day = dayFromDate(item.checkIn);
    map[day] = [...(map[day] || []), item];
    return map;
  }, {}), [bookings]);

  function moveMonth(direction) {
    const index = MONTH_OPTIONS.indexOf(month);
    const nextIndex = Math.min(MONTH_OPTIONS.length - 1, Math.max(0, index + direction));
    setMonth(MONTH_OPTIONS[nextIndex]);
    setSelected(null);
    setMessage(`Calendar changed to ${MONTH_OPTIONS[nextIndex]}.`);
  }

  function goToday() {
    setMonth('August 2026');
    setView('Month');
    const today = new Date().getDate();
    setSelected((bookingsByDay[today] || [])[0] || null);
    setMessage(`Calendar returned to today, ${today} August 2026.`);
  }

  return (
    <ReservationShell>
      <PageHeader title="Reservation Calendar" subtitle="View reservations in calendar">
        <div className="text-[11px] text-slate-500">Home <span className="mx-2">›</span> Reservations <span className="mx-2">›</span> Calendar</div>
      </PageHeader>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={goToday} className="h-9 rounded border border-slate-200 bg-white px-4 text-[13px] font-semibold">Today</button>
            <button type="button" onClick={() => moveMonth(-1)} disabled={MONTH_OPTIONS.indexOf(month) <= 0} className="grid h-9 w-9 place-items-center rounded border border-slate-200 bg-white disabled:opacity-50" aria-label="Previous month"><ChevronLeft size={15} /></button>
            <button type="button" onClick={() => moveMonth(1)} disabled={MONTH_OPTIONS.indexOf(month) >= MONTH_OPTIONS.length - 1} className="grid h-9 w-9 place-items-center rounded border border-slate-200 bg-white disabled:opacity-50" aria-label="Next month"><ChevronRight size={15} /></button>
            <div className="w-48"><SelectDropdown value={month} onChange={setMonth} options={MONTH_OPTIONS} /></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-36"><SelectDropdown value={view} onChange={setView} options={VIEW_OPTIONS} /></div>
            <button type="button" onClick={() => setMessage(`${bookings.length} reservation(s) loaded for ${month} in ${view} view.`)} className="inline-flex h-9 items-center gap-2 rounded border border-blue-500 bg-white px-4 text-[13px] font-semibold text-blue-600"><Filter size={15} />Filter</button>
          </div>
        </div>

        {message && <p className="mb-4 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{message}</p>}

        <div className="overflow-hidden rounded border border-slate-200">
          <div className="grid grid-cols-7 bg-slate-50">
            {DAYS.map((day) => <div key={day} className="border-r border-slate-200 px-3 py-2 text-center text-[12px] font-bold text-slate-500 last:border-r-0">{day}</div>)}
          </div>
          {CALENDAR_ROWS.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-t border-slate-200">
              {week.map((day, index) => {
                const inactive = (weekIndex === 0 && day > 20) || (weekIndex === 5 && day < 10);
                const dayBookings = bookingsByDay[day] || [];
                return (
                  <button key={`${weekIndex}-${day}-${index}`} type="button" onClick={() => setSelected(dayBookings[0] || null)} className={`min-h-[96px] border-r border-slate-200 bg-white p-2 text-left last:border-r-0 hover:bg-blue-50/30 ${inactive ? 'text-slate-300' : 'text-slate-800'}`}>
                    <div className="text-[12px] font-semibold">{day}</div>
                    <div className="mt-2 space-y-1">
                      {dayBookings.slice(0, 2).map((booking) => (
                        <div key={booking.id} className={`truncate rounded px-2 py-1 text-[11px] font-semibold ${bookingStyle(booking)}`}>
                          {booking.guest} ({booking.room})
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-5 text-[12px] text-slate-600">
            {['Confirmed', 'Checked-in', 'Pending', 'Checked-out', 'Cancelled'].map((status) => <span key={status} className="inline-flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${bookingStyle({ status }).split(' ')[0]}`} />{status}</span>)}
          </div>
          {selected && <div className="rounded bg-blue-50 px-3 py-2 text-[12px] font-semibold text-blue-700">Selected: {selected.id} - {selected.guest} - Room {selected.room}</div>}
        </div>
      </section>
    </ReservationShell>
  );
}
