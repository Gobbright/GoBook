import { useEffect, useMemo, useState } from 'react';
import { ChefHat, Settings } from 'lucide-react';

import {
  kotTickets,
  PosBadge,
  PosCard,
  PosPageHeader,
  PosPrimaryButton,
  PosSecondaryButton,
} from './RestaurantPosShared.jsx';
import { listModuleRecords, updateModuleRecord } from '../../../../../services/moduleRecordsService.js';

const TABS = [
  { label: 'New Orders', value: 'New' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Completed', value: 'Completed' },
];

function normalizeKot(record, index) {
  const data = record.data || {};
  return {
    recordId: record._id,
    rawData: data,
    id: data.kotNo || data.orderId || `KOT-${index + 1}`,
    table: data.table || data.tableOrRoom || '-',
    type: data.type || data.orderType || 'Dine In',
    priority: data.priority || 'Normal',
    status: data.status || 'New',
    assignTo: data.assignTo || 'Kitchen',
    time: data.time || 'Just now',
    items: Array.isArray(data.items)
      ? data.items.map((item) => ({ qty: Number(item.qty || 1), name: item.name || item.itemName || 'Item' }))
      : [],
  };
}

export function KotPage() {
  const [active, setActive] = useState('New');
  const [tickets, setTickets] = useState(kotTickets);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    listModuleRecords('hotel/restaurant-pos/kot')
      .then((res) => {
        if (!active) return;
        const rows = (res.records || []).map(normalizeKot);
        if (rows.length) setTickets(rows);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const visibleTickets = useMemo(() => tickets.filter((ticket) => ticket.status === active), [active, tickets]);
  const counts = useMemo(() => TABS.reduce((acc, tab) => {
    acc[tab.value] = tickets.filter((ticket) => ticket.status === tab.value).length;
    return acc;
  }, {}), [tickets]);

  async function setTicketStatus(id, status) {
    const ticket = tickets.find((item) => item.id === id);
    setTickets((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    if (ticket?.recordId) {
      await updateModuleRecord(ticket.recordId, { ...ticket.rawData, status });
    }
  }

  function startPreparing(id) {
    setTicketStatus(id, 'In Progress').catch((err) => setMessage(err.message || 'Unable to update ticket'));
    setActive('In Progress');
  }

  function completeTicket(id) {
    setTicketStatus(id, 'Completed').catch((err) => setMessage(err.message || 'Unable to update ticket'));
    setActive('Completed');
  }

  function sendToService(id) {
    setTickets((current) => current.filter((ticket) => ticket.id !== id));
    setMessage(`${id} sent to service.`);
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <PosPageHeader
        title="KOT / Kitchen"
        subtitle="Kitchen order ticket management for preparation, routing, and service readiness."
        actions={<PosSecondaryButton onClick={() => setMessage('KOT options opened: station routing, printer, and reprint settings.')}><Settings size={15} />Options</PosSecondaryButton>}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      <PosCard>
        <div className="border-b border-slate-100 px-4 pt-4">
          <div className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActive(tab.value)}
                className={`inline-flex h-9 items-center gap-2 rounded px-4 text-[12px] font-semibold transition ${active === tab.value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-blue-700'}`}
              >
                {tab.label}
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">{counts[tab.value] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 p-4">
          {visibleTickets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-[13px] text-slate-500">No tickets in this status.</div>
          ) : visibleTickets.map((ticket) => (
            <article key={ticket.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[170px_150px_120px_minmax(0,1fr)_160px]">
                <div>
                  <div className="text-[13px] font-bold text-slate-950">{ticket.id}</div>
                  <div className="mt-2 text-[13px] font-semibold text-slate-600">{ticket.table}</div>
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-slate-500">Type</div>
                  <div className="mt-2"><PosBadge>{ticket.type}</PosBadge></div>
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-slate-500">Priority</div>
                  <div className="mt-2"><PosBadge>{ticket.priority}</PosBadge></div>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                    <ChefHat size={14} />
                    Assign To {ticket.assignTo}
                  </div>
                  <div className="space-y-1">
                    {ticket.items.map((item) => (
                      <div key={`${ticket.id}-${item.name}`} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2 text-[13px]">
                        <span className="font-bold text-slate-950">{item.qty}</span>
                        <span className="font-semibold text-slate-700">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-start justify-between gap-3 lg:items-end">
                  <div>
                    <div className="text-right text-[12px] font-semibold text-slate-500">Status</div>
                    <div className="mt-2"><PosBadge>{ticket.status}</PosBadge></div>
                    <div className="mt-3 text-right text-[12px] font-semibold text-slate-500">{ticket.time}</div>
                  </div>
                  {ticket.status === 'New' && <PosPrimaryButton onClick={() => startPreparing(ticket.id)} className="bg-emerald-600 hover:bg-emerald-700">Start Preparing</PosPrimaryButton>}
                  {ticket.status === 'In Progress' && <PosPrimaryButton onClick={() => completeTicket(ticket.id)}>Mark Ready</PosPrimaryButton>}
                  {ticket.status === 'Completed' && <PosSecondaryButton onClick={() => sendToService(ticket.id)}>Send to Service</PosSecondaryButton>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </PosCard>
    </div>
  );
}
