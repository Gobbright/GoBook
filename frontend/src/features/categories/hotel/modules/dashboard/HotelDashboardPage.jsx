import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BedDouble,
  Bell,
  CalendarCheck,
  ClipboardList,
  DoorOpen,
  IndianRupee,
  LogIn,
  LogOut,
  Plus,
  ReceiptText,
  Sparkles,
  UtensilsCrossed,
  UserPlus,
  Wrench,
} from 'lucide-react';

import { listModuleRecords } from '../../../../../services/moduleRecordsService.js';

const MONEY = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const QUICK_ACTIONS = [
  { label: 'Reservation', href: '/hotel/reservations/new', icon: CalendarCheck },
  { label: 'Check-in', href: '/hotel/front-desk/check-in', icon: LogIn },
  { label: 'Check-out', href: '/hotel/front-desk/check-out', icon: LogOut },
  { label: 'New Guest', href: '/hotel/guests/registration', icon: Plus },
  { label: 'Room Status', href: '/hotel/rooms-availability/room-status', icon: BedDouble },
];

const MODULE_CARDS = [
  {
    title: 'Billing',
    subtitle: 'Bills, invoices, payments, outstanding, refunds',
    href: '/hotel/billing/bills-invoices',
    icon: ReceiptText,
    tone: 'border-purple-100 bg-purple-50 text-purple-700',
  },
  {
    title: 'Reservations',
    subtitle: 'Bookings, calendar, availability, and rates',
    href: '/hotel/reservations/list',
    icon: CalendarCheck,
    tone: 'border-blue-100 bg-blue-50 text-blue-700',
  },
  {
    title: 'Front Desk',
    subtitle: 'Check-in, in-house guests, checkout, room changes',
    href: '/hotel/front-desk/in-house-guests',
    icon: LogIn,
    tone: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  {
    title: 'Guests',
    subtitle: 'Registration, guest list, profiles, documents',
    href: '/hotel/guests/list',
    icon: UserPlus,
    tone: 'border-indigo-100 bg-indigo-50 text-indigo-700',
  },
  {
    title: 'Rooms & Availability',
    subtitle: 'Room types, rooms, status, floors',
    href: '/hotel/rooms-availability/room-status',
    icon: BedDouble,
    tone: 'border-cyan-100 bg-cyan-50 text-cyan-700',
  },
  {
    title: 'Housekeeping',
    subtitle: 'Cleaning board, tasks, schedule, lost and found',
    href: '/hotel/housekeeping/room-status',
    icon: Sparkles,
    tone: 'border-amber-100 bg-amber-50 text-amber-700',
  },
  {
    title: 'Restaurant & POS',
    subtitle: 'POS billing, menu, tables, orders, KOT',
    href: '/hotel/restaurant-pos/billing',
    icon: UtensilsCrossed,
    tone: 'border-orange-100 bg-orange-50 text-orange-700',
  },
  {
    title: 'Hotel Services',
    subtitle: 'Room service, laundry, spa, transport, extras',
    href: '/hotel/services/room-service',
    icon: Bell,
    tone: 'border-rose-100 bg-rose-50 text-rose-700',
  },
  {
    title: 'Reports',
    subtitle: 'Revenue, occupancy, module summaries',
    href: '/hotel/reports',
    icon: BarChart3,
    tone: 'border-slate-200 bg-slate-50 text-slate-700',
  },
];

const WORKFLOW = [
  {
    title: 'Book',
    subtitle: 'Reservation + guest details',
    href: '/hotel/reservations/new',
    icon: CalendarCheck,
    tone: 'border-blue-100 bg-blue-50 text-blue-700',
  },
  {
    title: 'Arrive',
    subtitle: 'Check-in + room assignment',
    href: '/hotel/front-desk/check-in',
    icon: LogIn,
    tone: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  {
    title: 'Stay',
    subtitle: 'Rooms, requests, POS, services',
    href: '/hotel/front-desk/in-house-guests',
    icon: DoorOpen,
    tone: 'border-indigo-100 bg-indigo-50 text-indigo-700',
  },
  {
    title: 'Clean',
    subtitle: 'Housekeeping + maintenance',
    href: '/hotel/housekeeping/room-status',
    icon: Sparkles,
    tone: 'border-amber-100 bg-amber-50 text-amber-700',
  },
  {
    title: 'Bill',
    subtitle: 'Guest folio + payments',
    href: '/hotel/billing/guest-billing',
    icon: ReceiptText,
    tone: 'border-purple-100 bg-purple-50 text-purple-700',
  },
  {
    title: 'Report',
    subtitle: 'Revenue + occupancy',
    href: '/hotel/reports',
    icon: ClipboardList,
    tone: 'border-slate-200 bg-slate-50 text-slate-700',
  },
];

const TONE_CLASSES = {
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  emerald: 'bg-green-50 text-green-700 border-green-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
};

function dataOf(record) {
  return record?.data || {};
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function sameDay(value, day = todayKey()) {
  if (!value) return false;
  const text = String(value);
  if (text.startsWith(day)) return true;
  const parsed = new Date(text);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}

function amountOf(data) {
  if (Array.isArray(data.charges)) {
    return data.charges.reduce((sum, charge) => sum + Number(charge.amount ?? Number(charge.qty || 0) * Number(charge.rate || 0)), 0);
  }
  if (Array.isArray(data.items)) {
    return data.items.reduce((sum, item) => sum + Number(item.total || item.amount || Number(item.qty || 0) * Number(item.price || item.rate || 0)), 0);
  }
  return Number(data.grandTotal || data.total || data.amount || data.paymentAmount || data.subtotal || 0);
}

function statusOf(data) {
  return String(data.status || '').trim().toLowerCase();
}

function isOccupied(data) {
  return statusOf(data).includes('occupied') || statusOf(data).includes('in-house') || Boolean(data.occupancy && data.occupancy !== '-');
}

function isVacant(data) {
  return statusOf(data).includes('vacant') || statusOf(data).includes('available');
}

function isReserved(data) {
  return statusOf(data).includes('reserved') || statusOf(data).includes('booked');
}

function isMaintenance(data) {
  const status = statusOf(data);
  return status.includes('maintenance') || status.includes('out of order');
}

function isCleaning(data) {
  const status = statusOf(data);
  return status.includes('clean') || status.includes('dirty') || status.includes('inspection');
}

function normalizeArrival(record) {
  const data = dataOf(record);
  return {
    guest: data.guestName || data.guest || data.name || 'Guest',
    room: data.roomNumber || data.room || data.availableRoom || '-',
    checkIn: data.checkInDate || data.checkIn || data.arrivalDate || '-',
    status: data.status || 'Expected',
  };
}

function SummaryCard({ item }) {
  const Icon = item.icon;
  return (
    <div className={`rounded-lg border p-4 ${TONE_CLASSES[item.tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold uppercase text-slate-500">{item.label}</span>
        <Icon size={18} />
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-950">{item.value}</div>
    </div>
  );
}

function WorkflowMap() {
  return (
    <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="m-0 text-[16px] font-bold text-slate-950">How GoBook Hotel Works</h2>
          <p className="m-0 mt-1 text-[13px] text-slate-500">Follow this path for day-to-day hotel operations. Each step opens the right module.</p>
        </div>
        <Link to="/hotel/billing/guest-billing" className="text-[13px] font-semibold text-blue-600 no-underline hover:text-blue-700">
          Open guest folio
        </Link>
      </div>
      <div className="grid gap-3 lg:grid-cols-6">
        {WORKFLOW.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="flex items-stretch gap-3 lg:block">
              <Link to={step.href} className={`block h-full rounded-lg border p-3 no-underline transition hover:-translate-y-0.5 hover:shadow-sm ${step.tone}`}>
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/80">
                    <Icon size={16} />
                  </span>
                  <span className="text-[13px] font-bold">{step.title}</span>
                </div>
                <div className="mt-2 text-[12px] leading-4 opacity-90">{step.subtitle}</div>
              </Link>
              {index < WORKFLOW.length - 1 && (
                <div className="hidden items-center justify-center text-slate-300 lg:flex">
                  <ArrowRight size={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ModuleLauncher() {
  return (
    <section className="mb-5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-[15px] font-bold text-slate-950">Hotel Modules</h2>
          <p className="m-0 mt-0.5 text-[12px] text-slate-500">Open a module. Sidebar will show only that module.</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {MODULE_CARDS.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.title}
              to={module.href}
              className={`group flex min-h-[74px] items-center gap-2 rounded-md border px-3 py-2 no-underline transition hover:-translate-y-0.5 hover:shadow-sm ${module.tone}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/80">
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold">{module.title}</span>
                <span className="mt-0.5 block truncate text-[11px] leading-4 opacity-80">{module.subtitle}</span>
              </span>
              <ArrowRight size={14} className="shrink-0 opacity-60 transition group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
export function HotelDashboardPage() {
  const [records, setRecords] = useState({
    rooms: [],
    reservations: [],
    inHouse: [],
    checkouts: [],
    payments: [],
    restaurantBills: [],
    cleaningTasks: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      listModuleRecords('hotel/rooms-availability/rooms').catch(() => ({ records: [] })),
      listModuleRecords('hotel/reservations/list').catch(() => ({ records: [] })),
      listModuleRecords('hotel/front-desk/in-house-guests').catch(() => ({ records: [] })),
      listModuleRecords('hotel/front-desk/check-out').catch(() => ({ records: [] })),
      listModuleRecords('hotel/billing/payments').catch(() => ({ records: [] })),
      listModuleRecords('hotel/restaurant-pos/billing').catch(() => ({ records: [] })),
      listModuleRecords('hotel/housekeeping/cleaning-tasks').catch(() => ({ records: [] })),
    ]).then(([roomsRes, reservationsRes, inHouseRes, checkoutsRes, paymentsRes, restaurantRes, cleaningRes]) => {
      if (!active) return;
      setRecords({
        rooms: roomsRes.records || [],
        reservations: reservationsRes.records || [],
        inHouse: inHouseRes.records || [],
        checkouts: checkoutsRes.records || [],
        payments: paymentsRes.records || [],
        restaurantBills: restaurantRes.records || [],
        cleaningTasks: cleaningRes.records || [],
      });
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const dashboard = useMemo(() => {
    const day = todayKey();
    const rooms = records.rooms.map(dataOf);
    const reservations = records.reservations.map(dataOf);
    const inHouse = records.inHouse.map(dataOf);
    const checkouts = records.checkouts.map(dataOf);
    const payments = records.payments.map(dataOf);
    const restaurantBills = records.restaurantBills.map(dataOf);
    const cleaningTasks = records.cleaningTasks.map(dataOf);

    const totalRooms = rooms.length;
    const occupied = rooms.filter(isOccupied).length || inHouse.length;
    const reserved = rooms.filter(isReserved).length;
    const maintenance = rooms.filter(isMaintenance).length;
    const cleaningFromRooms = rooms.filter(isCleaning).length;
    const cleaning = Math.max(cleaningFromRooms, cleaningTasks.filter((task) => !statusOf(task).includes('completed')).length);
    const available = totalRooms > 0 ? Math.max(0, totalRooms - occupied - reserved - maintenance - cleaningFromRooms) : 0;
    const arrivals = reservations.filter((item) => sameDay(item.checkInDate || item.checkIn || item.arrivalDate, day));
    const departures = checkouts.filter((item) => sameDay(item.checkOutDate || item.date || item.createdAt, day));
    const todayPayments = payments.filter((item) => sameDay(item.paymentDate || item.date || item.createdAt, day));
    const restaurantToday = restaurantBills.filter((item) => sameDay(item.date || item.billDate || item.createdAt, day));
    const revenue = todayPayments.reduce((sum, item) => sum + amountOf(item), 0);
    const restaurantSales = restaurantToday.reduce((sum, item) => sum + amountOf(item), 0);
    const pendingPayments = checkouts.reduce((sum, item) => sum + Number(item.outstanding || Math.max(0, amountOf(item) - Number(item.paymentAmount || 0))), 0);
    const occupancyPercent = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

    return {
      dateLabel: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
      summary: [
        { label: 'Total Rooms', value: String(totalRooms), icon: BedDouble, tone: 'blue' },
        { label: 'Occupied', value: String(occupied), icon: DoorOpen, tone: 'green' },
        { label: 'Available', value: String(available), icon: BedDouble, tone: 'cyan' },
        { label: 'Cleaning', value: String(cleaning), icon: Sparkles, tone: 'amber' },
        { label: 'Arrivals', value: String(arrivals.length), icon: LogIn, tone: 'indigo' },
        { label: "Today's Rev", value: MONEY.format(revenue), icon: IndianRupee, tone: 'emerald' },
        { label: 'Occupancy', value: `${occupancyPercent}%`, icon: ClipboardList, tone: 'violet' },
      ],
      operationStats: [
        { label: "Today's Departures", value: String(departures.length) },
        { label: 'Current Guests', value: String(inHouse.length) },
        { label: 'Reserved Rooms', value: String(reserved) },
        { label: 'Maintenance Rooms', value: String(maintenance) },
        { label: 'Pending Payments', value: MONEY.format(pendingPayments) },
        { label: 'Restaurant Sales', value: MONEY.format(restaurantSales) },
      ],
      arrivals: arrivals.map((item, index) => normalizeArrival({ _id: `arrival-${index}`, data: item })).slice(0, 6),
      roomStatus: [
        { label: 'Available', value: available, color: 'bg-sky-500' },
        { label: 'Occupied', value: occupied, color: 'bg-emerald-500' },
        { label: 'Reserved', value: reserved, color: 'bg-indigo-500' },
        { label: 'Cleaning', value: cleaning, color: 'bg-amber-500' },
        { label: 'Maintenance', value: maintenance, color: 'bg-rose-500' },
      ],
      restaurantSales,
    };
  }, [records]);

  const totalStatus = dashboard.roomStatus.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="p-4 md:p-7 bg-slate-50 min-h-full">
      <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="m-0 text-[12px] font-semibold uppercase tracking-wide text-blue-700">Hotel Dashboard</p>
          <h1 className="m-0 mt-1 text-[28px] font-bold text-slate-950">Property Overview</h1>
          <p className="m-0 mt-2 text-sm text-slate-500">{loading ? 'Loading live hotel data...' : `Today: ${dashboard.dateLabel}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.href}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 no-underline shadow-sm hover:border-blue-300 hover:text-blue-700"
              >
                <Icon size={15} />
                {action.label}
              </Link>
            );
          })}
        </div>
      </section>

      <ModuleLauncher />

      <WorkflowMap />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {dashboard.summary.slice(0, 4).map((item) => <SummaryCard key={item.label} item={item} />)}
      </section>

      <section className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {dashboard.summary.slice(4).map((item) => <SummaryCard key={item.label} item={item} />)}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-semibold uppercase text-slate-500">Restaurant Sales</span>
            <UtensilsCrossed size={18} className="text-orange-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-950">{MONEY.format(dashboard.restaurantSales)}</div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-5">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="m-0 text-[16px] font-bold text-slate-950">Today's Arrivals</h2>
              <p className="m-0 mt-1 text-[13px] text-slate-500">Arrival and check-in summary</p>
            </div>
            <ReceiptText size={19} className="text-blue-600" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-left text-[12px] uppercase text-slate-500">
                  <th className="px-5 py-3 font-semibold">Guest</th>
                  <th className="px-5 py-3 font-semibold">Room</th>
                  <th className="px-5 py-3 font-semibold">Check-in</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.arrivals.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-[13px] text-slate-500">No arrivals found for today.</td>
                  </tr>
                ) : dashboard.arrivals.map((arrival) => (
                  <tr key={`${arrival.guest}-${arrival.room}`} className="border-t border-slate-100">
                    <td className="px-5 py-3 text-[13px] font-semibold text-slate-900">{arrival.guest}</td>
                    <td className="px-5 py-3 text-[13px] text-slate-600">{arrival.room}</td>
                    <td className="px-5 py-3 text-[13px] text-slate-600">{arrival.checkIn}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-700">
                        {arrival.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-[16px] font-bold text-slate-950">Room Availability</h2>
              <Wrench size={18} className="text-slate-500" />
            </div>
            <div className="mt-4 space-y-3">
              {dashboard.roomStatus.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="font-medium text-slate-600">{item.label}</span>
                    <span className="font-bold text-slate-950">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: totalStatus > 0 ? `${Math.max(6, (item.value / totalStatus) * 100)}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="m-0 text-[16px] font-bold text-slate-950">Operations</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {dashboard.operationStats.map((item) => (
                <div key={item.label} className="rounded-md bg-slate-50 p-3">
                  <div className="text-[12px] text-slate-500">{item.label}</div>
                  <div className="mt-1 text-[18px] font-bold text-slate-950">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
