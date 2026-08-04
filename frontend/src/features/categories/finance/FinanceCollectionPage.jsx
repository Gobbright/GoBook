import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, IndianRupee, ListFilter, LoaderCircle, Save } from 'lucide-react';

import { financeApi } from './financeApi.js';
import {
  EmptyState, ErrorState, FinanceCard, FinancePage, LoadingState, TypeBadge,
  fieldClass, formatMoney, indiaToday,
} from './FinanceUi.jsx';

const amountFilters = ['All', 100, 300, 500, 1000, 5000];

function rowAmount(customer, amounts) {
  const value = amounts[customer._id];
  const fallback = customer.paid ? customer.collectedAmount : customer.dailyCollectionAmount;
  const amount = Number(value || fallback);
  return Number.isFinite(amount) ? amount : 0;
}

function matchesAmountFilter(customer, amounts, filter) {
  if (filter === 'All') return true;
  return rowAmount(customer, amounts) === filter;
}

export function FinanceCollectionPage() {
  const [date, setDate] = useState(() => indiaToday());
  const [data, setData] = useState(null);
  const [amounts, setAmounts] = useState({});
  const [amountFilter, setAmountFilter] = useState('All');
  const [savingId, setSavingId] = useState('');
  const [savedId, setSavedId] = useState('');
  const [error, setError] = useState('');
  const [rowError, setRowError] = useState({});

  const load = useCallback(async () => {
    setError('');
    setData(null);
    try {
      const result = await financeApi.collectionEntry(date || indiaToday());
      setData(result);
      setAmounts(Object.fromEntries(result.customers.map((customer) => [
        customer._id,
        customer.paid ? String(customer.collectedAmount) : String(customer.dailyCollectionAmount),
      ])));
    } catch (err) {
      setError(err.message);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const filteredCustomers = useMemo(() => (
    data?.customers.filter((customer) => matchesAmountFilter(customer, amounts, amountFilter)) || []
  ), [amountFilter, amounts, data]);

  const collectedCustomers = useMemo(() => (
    filteredCustomers.filter((customer) => customer.paid)
  ), [filteredCustomers]);

  async function save(customer) {
    const amount = Number(amounts[customer._id]);
    setRowError((current) => ({ ...current, [customer._id]: '' }));
    setSavedId('');
    if (!Number.isFinite(amount) || amount <= 0) {
      setRowError((current) => ({ ...current, [customer._id]: 'Enter an amount greater than zero' }));
      return;
    }
    setSavingId(customer._id);
    try {
      await financeApi.saveCollection(customer._id, { date: date || indiaToday(), amount });
      setSavedId(customer._id);
      setData((current) => {
        const currentCustomer = current.customers.find((item) => item._id === customer._id) || customer;
        const previous = currentCustomer.paid ? currentCustomer.collectedAmount : 0;
        return {
          ...current,
          totalCollected: current.totalCollected - previous + amount,
          customers: current.customers.map((item) => (
            item._id === customer._id
              ? { ...item, collectedAmount: amount, paid: true }
              : item
          )),
        };
      });
    } catch (err) {
      setRowError((current) => ({ ...current, [customer._id]: err.message }));
    } finally {
      setSavingId('');
    }
  }

  return (
    <FinancePage
      title="Collection Entry"
      description="Record or update each active customer&apos;s collection for the selected date."
      action={(
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <CalendarDays size={17} className="text-[#4f90ff]" />
          <span className="hidden sm:inline">Collection date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value || indiaToday())}
            className="border-0 bg-transparent text-sm font-extrabold text-slate-800 outline-none dark:text-white"
          />
        </label>
      )}
    >
      {data && (
        <FinanceCard className="mb-5 overflow-hidden bg-gradient-to-br from-[#4f90ff] to-[#6366f1] p-5 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="m-0 text-xs font-bold text-blue-100">Total collected on {date}</p>
              <p className="mb-0 mt-2 text-3xl font-black">{formatMoney(data.totalCollected)}</p>
              <p className="mb-0 mt-1 text-xs font-semibold text-blue-100">
                {collectedCustomers.length} collected / {filteredCustomers.length} shown
              </p>
            </div>
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15"><IndianRupee size={25} /></span>
          </div>
        </FinanceCard>
      )}

      <FinanceCard className="mb-5 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="m-0 inline-flex items-center gap-2 text-base font-black text-slate-900 dark:text-white"><ListFilter size={18} className="text-[#4f90ff]" /> Amount filter</h2>
            <p className="mb-0 mt-1 text-xs text-slate-500">Default All. Click amount to show only matching customer rows.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {amountFilters.map((filter) => {
              const active = amountFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setAmountFilter(filter)}
                  className={`inline-flex min-h-9 items-center justify-center rounded-xl border px-3 py-2 text-xs font-extrabold transition ${
                    active
                      ? 'border-[#4f90ff] bg-[#4f90ff] text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-blue-950'
                  }`}
                >
                  {filter === 'All' ? 'All' : formatMoney(filter)}
                </button>
              );
            })}
          </div>
        </div>
      </FinanceCard>

      <FinanceCard className="overflow-hidden">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <h2 className="m-0 text-base font-black text-slate-900 dark:text-white">Active customer entries</h2>
          <p className="mb-0 mt-1 text-xs text-slate-500">Save creates the entry; Update replaces that date&apos;s saved amount.</p>
        </div>
        {!data && !error && <LoadingState />}
        {error && <div className="p-5"><ErrorState message={error} onRetry={load} /></div>}
        {data?.customers.length === 0 && <EmptyState title="No active customers for this date" description="Add an active customer with a start date on or before the selected date." />}
        {data?.customers.length > 0 && filteredCustomers.length === 0 && (
          <EmptyState title="No customers for this amount" description="Choose All or another amount filter." />
        )}
        {filteredCustomers.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredCustomers.map((customer) => (
              <div key={customer._id} className="grid items-center gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_200px_120px] sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="m-0 truncate font-extrabold text-slate-900 dark:text-white">{customer.name}</p>
                    <TypeBadge type={customer.type} />
                    {customer.paid && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        <Check size={12} /> Paid
                      </span>
                    )}
                  </div>
                  <p className="mb-0 mt-1 text-xs text-slate-500">
                    Daily plan: {formatMoney(customer.dailyCollectionAmount)} / {customer.phone}
                  </p>
                </div>
                <div>
                  <label htmlFor={`amount-${customer._id}`} className="sr-only">Collection amount for {customer.name}</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      id={`amount-${customer._id}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amounts[customer._id] || ''}
                      onChange={(event) => setAmounts((current) => ({ ...current, [customer._id]: event.target.value }))}
                      className={`${fieldClass} pl-8`}
                    />
                  </div>
                  {rowError[customer._id] && <p className="mb-0 mt-1 text-[11px] font-semibold text-red-600">{rowError[customer._id]}</p>}
                </div>
                <button
                  type="button"
                  disabled={savingId === customer._id}
                  onClick={() => save(customer)}
                  className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold transition disabled:opacity-60 ${
                    savedId === customer._id
                      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950'
                      : 'border-[#4f90ff] bg-[#4f90ff] text-white hover:bg-[#3f7fe8]'
                  }`}
                >
                  {savingId === customer._id
                    ? <LoaderCircle className="animate-spin" size={15} />
                    : savedId === customer._id ? <Check size={15} /> : <Save size={15} />}
                  {savingId === customer._id ? 'Saving...' : savedId === customer._id ? 'Saved' : customer.paid ? 'Update' : 'Save'}
                </button>
              </div>
            ))}
          </div>
        )}
      </FinanceCard>

      <FinanceCard className="mt-5 overflow-hidden">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <h2 className="m-0 text-base font-black text-slate-900 dark:text-white">Collected list</h2>
          <p className="mb-0 mt-1 text-xs text-slate-500">Customers already collected on {date}.</p>
        </div>
        {!data && !error && <LoadingState />}
        {data && collectedCustomers.length === 0 && <EmptyState title="No collections saved" description="Saved collections for the selected date will appear here." />}
        {collectedCustomers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-5 py-3 text-right">Collected amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {collectedCustomers.map((customer) => (
                  <tr key={customer._id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-5 py-4 font-extrabold text-slate-900 dark:text-white">{customer.name}</td>
                    <td className="px-4 py-4"><TypeBadge type={customer.type} /></td>
                    <td className="px-4 py-4 text-xs text-slate-500">{customer.phone}</td>
                    <td className="px-5 py-4 text-right font-black text-[#4f90ff]">{formatMoney(customer.collectedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FinanceCard>
    </FinancePage>
  );
}
