import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, MessageCircle, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { financeApi } from './financeApi.js';
import {
  EmptyState, ErrorState, FinanceCard, FinancePage, LoadingState, TypeBadge, formatMoney,
} from './FinanceUi.jsx';

function whatsappNumber(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 10) return '';
  const lastTen = digits.slice(-10);
  return `91${lastTen}`;
}

function reminderMessage(customer, overdue) {
  const dueText = formatMoney(customer.dailyCollectionAmount);
  const overdueText = overdue ? ` Your payment is overdue for ${customer.daysWithoutPayment} days.` : '';
  return `Hi ${customer.name}, this is a reminder for today's collection amount ${dueText}.${overdueText} Please make the payment today. Thank you.`;
}

function sendWhatsAppReminder(customer, overdue) {
  const number = whatsappNumber(customer.phone);
  if (!number) return;
  const message = reminderMessage(customer, overdue);
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

function ReminderList({ items, overdue = false, onCollect }) {
  if (items.length === 0) {
    return <EmptyState title={overdue ? 'No overdue customers' : 'Everyone is paid today'} description={overdue ? 'No active customer has missed payments for 3 or more days.' : 'There are no pending collections for today.'} />;
  }
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((customer) => {
        const canWhatsApp = Boolean(whatsappNumber(customer.phone));
        return (
          <div key={customer._id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between sm:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="m-0 font-extrabold text-slate-900 dark:text-white">{customer.name}</p>
                <TypeBadge type={customer.type} />
                {overdue && (
                  <span className="rounded-md bg-red-50 px-2 py-1 text-[11px] font-extrabold text-red-600 dark:bg-red-950 dark:text-red-300">
                    {customer.daysWithoutPayment} days
                  </span>
                )}
              </div>
              <p className="mb-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Phone size={12} /> {customer.phone}</span>
                <span>Due: {formatMoney(customer.dailyCollectionAmount)}</span>
                <span>Last paid: {customer.lastPaymentDate || 'No payment yet'}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                disabled={!canWhatsApp}
                onClick={() => sendWhatsAppReminder(customer, overdue)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              >
                <MessageCircle size={15} />
                Send WhatsApp
              </button>
              <button type="button" onClick={onCollect} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Enter collection
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FinanceRemindersPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      setData(await financeApi.reminders());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <FinancePage title="Reminders" description="Follow up today&apos;s unpaid and long-overdue active customers through WhatsApp.">
      {!data && !error && <LoadingState />}
      {error && <ErrorState message={error} onRetry={load} />}
      {data && (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <FinanceCard className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950"><CalendarClock size={20} /></span>
                <div>
                  <h2 className="m-0 text-base font-black text-slate-900 dark:text-white">Due today</h2>
                  <p className="mb-0 mt-0.5 text-xs text-slate-500">{data.dueToday.length} pending</p>
                </div>
              </div>
            </div>
            <ReminderList items={data.dueToday} onCollect={() => navigate('/finance/collections')} />
          </FinanceCard>

          <FinanceCard className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950"><AlertTriangle size={20} /></span>
                <div>
                  <h2 className="m-0 text-base font-black text-slate-900 dark:text-white">Overdue 3+ days</h2>
                  <p className="mb-0 mt-0.5 text-xs text-slate-500">{data.overdue.length} customer(s)</p>
                </div>
              </div>
            </div>
            <ReminderList items={data.overdue} overdue onCollect={() => navigate('/finance/collections')} />
          </FinanceCard>
        </div>
      )}
    </FinancePage>
  );
}
