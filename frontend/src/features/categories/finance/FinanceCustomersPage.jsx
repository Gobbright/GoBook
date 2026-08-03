import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck, CalendarDays, CheckCircle2, ClipboardList, Eye, IndianRupee, ListChecks,
  LoaderCircle, Pencil, Phone, Plus, RotateCcw, Save, UserPlus, UserRound, UsersRound,
  WalletCards, X, XCircle,
} from 'lucide-react';

import { FinanceCustomerNav } from './FinanceCustomerNav.jsx';
import { financeApi } from './financeApi.js';
import {
  EmptyState, ErrorState, FinanceCard, FinancePage, LoadingState, StatusBadge,
  TypeBadge, fieldClass, formatMoney, indiaToday, primaryButton,
} from './FinanceUi.jsx';

const initialForm = () => ({
  name: '',
  phone: '',
  type: 'Loan',
  totalAmount: '',
  dailyCollectionAmount: '',
  startDate: indiaToday(),
});

function formFromCustomer(customer) {
  return {
    name: customer?.name || '',
    phone: customer?.phone || '',
    type: customer?.type || 'Loan',
    totalAmount: customer?.totalAmount ? String(customer.totalAmount) : '',
    dailyCollectionAmount: customer?.dailyCollectionAmount ? String(customer.dailyCollectionAmount) : '',
    startDate: customer?.startDate || indiaToday(),
  };
}

function IconLabel({ icon: Icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Icon size={14} />
      {children}
    </span>
  );
}

function IconButton({ label, tone = 'slate', children, ...props }) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
    red: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
    slate: 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-grid size-9 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]}`}
      {...props}
    >
      {children}
    </button>
  );
}

function CustomerViewModal({ customer, onClose }) {
  if (!customer) return null;
  const details = [
    ['Name', customer.name, UserRound],
    ['Phone', customer.phone, Phone],
    ['Type', customer.type, ClipboardList],
    ['Status', customer.status === 'Finished' ? 'Closed' : customer.status, BadgeCheck],
    ['Start date', customer.startDate, CalendarDays],
    ['Total amount', formatMoney(customer.totalAmount), WalletCards],
    ['Daily amount', formatMoney(customer.dailyCollectionAmount), IndianRupee],
    ['Collected', formatMoney(customer.totalCollected), IndianRupee],
    ['Remaining', formatMoney(customer.remainingAmount), WalletCards],
    ['Entries', customer.entriesCount || 0, ListChecks],
    ['Last paid', customer.lastPaymentDate || '-', CalendarDays],
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div>
            <h2 className="m-0 inline-flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white"><Eye size={19} className="text-[#4f90ff]" /> Customer details</h2>
            <p className="mb-0 mt-1 text-xs text-slate-500">{customer.name}</p>
          </div>
          <IconButton label="Close details" onClick={onClose}><X size={17} /></IconButton>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {details.map(([label, value, Icon]) => (
            <div key={label} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <p className="m-0 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400"><Icon size={13} /> {label}</p>
              <p className="mb-0 mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomerEditModal({ customer, saving, error, onClose, onSave }) {
  const [form, setForm] = useState(() => formFromCustomer(customer));

  function set(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div>
            <h2 className="m-0 inline-flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white"><Pencil size={19} className="text-[#4f90ff]" /> Edit customer</h2>
            <p className="mb-0 mt-1 text-xs text-slate-500">Update plan and contact details.</p>
          </div>
          <IconButton label="Close edit" onClick={onClose}><X size={17} /></IconButton>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); onSave(customer, form); }} className="space-y-3 p-5">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            <IconLabel icon={UserRound}>Name</IconLabel>
            <input value={form.name} onChange={set('name')} className={`${fieldClass} mt-1.5`} maxLength={120} />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            <IconLabel icon={Phone}>Phone</IconLabel>
            <input value={form.phone} onChange={set('phone')} className={`${fieldClass} mt-1.5`} inputMode="tel" maxLength={20} />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            <IconLabel icon={ClipboardList}>Type</IconLabel>
            <select value={form.type} onChange={set('type')} className={`${fieldClass} mt-1.5`}>
              <option value="Loan">Loan</option>
              <option value="Chit">Chit</option>
              <option value="Deposit">Deposit</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              <IconLabel icon={WalletCards}>Total amount</IconLabel>
              <input type="number" min="0.01" step="0.01" value={form.totalAmount} onChange={set('totalAmount')} className={`${fieldClass} mt-1.5`} />
            </label>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              <IconLabel icon={IndianRupee}>Daily amount</IconLabel>
              <input type="number" min="0.01" step="0.01" value={form.dailyCollectionAmount} onChange={set('dailyCollectionAmount')} className={`${fieldClass} mt-1.5`} />
            </label>
          </div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            <IconLabel icon={CalendarDays}>Start date</IconLabel>
            <input type="date" value={form.startDate} onChange={set('startDate')} className={`${fieldClass} mt-1.5`} />
          </label>
          {error && <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-950/40">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Cancel
            </button>
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerTable({ customers, busyId, onView, onEdit, onClose, onReactivate, emptyTitle, emptyDescription, closedOnly = false }) {
  if (customers?.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  if (!customers?.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950">
          <tr>
            <th className="px-5 py-3"><IconLabel icon={UserRound}>Customer</IconLabel></th>
            <th className="px-4 py-3"><IconLabel icon={ClipboardList}>Type</IconLabel></th>
            <th className="px-4 py-3"><IconLabel icon={WalletCards}>Plan</IconLabel></th>
            <th className="px-4 py-3"><IconLabel icon={IndianRupee}>Collected</IconLabel></th>
            <th className="px-4 py-3"><IconLabel icon={BadgeCheck}>Status</IconLabel></th>
            <th className="px-5 py-3 text-right"><IconLabel icon={ListChecks} className="justify-end">Action</IconLabel></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {customers.map((customer) => {
            const isClosed = customer.status === 'Finished';
            return (
              <tr key={customer._id} className="text-slate-700 dark:text-slate-200">
                <td className="px-5 py-4">
                  <p className="m-0 font-extrabold text-slate-900 dark:text-white">{customer.name}</p>
                  <p className="mb-0 mt-1 flex items-center gap-1 text-xs text-slate-500"><Phone size={12} /> {customer.phone}</p>
                  {isClosed && customer.finishedAt && (
                    <p className="mb-0 mt-1 flex items-center gap-1 text-xs text-slate-500"><CalendarDays size={12} /> Closed on {new Date(customer.finishedAt).toLocaleDateString('en-IN')}</p>
                  )}
                </td>
                <td className="px-4 py-4"><TypeBadge type={customer.type} /></td>
                <td className="px-4 py-4">
                  <p className="m-0 flex items-center gap-1 font-bold"><WalletCards size={14} className="text-[#4f90ff]" /> {formatMoney(customer.totalAmount)}</p>
                  <p className="mb-0 mt-1 flex items-center gap-1 text-xs text-slate-500"><IndianRupee size={12} /> {formatMoney(customer.dailyCollectionAmount)} / day</p>
                </td>
                <td className="px-4 py-4">
                  <p className="m-0 flex items-center gap-1 font-bold text-[#4f90ff]"><IndianRupee size={14} /> {formatMoney(customer.totalCollected)}</p>
                  <p className="mb-0 mt-1 flex items-center gap-1 text-xs text-slate-500"><ListChecks size={12} /> {customer.entriesCount || 0} entries</p>
                </td>
                <td className="px-4 py-4"><StatusBadge status={customer.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <IconButton label="View customer" tone="blue" onClick={() => onView(customer)}><Eye size={16} /></IconButton>
                    <IconButton label="Edit customer" tone="amber" onClick={() => onEdit(customer)}><Pencil size={16} /></IconButton>
                    {!isClosed && (
                      <IconButton label="Close customer" tone="red" disabled={busyId === customer._id} onClick={() => onClose(customer)}>
                        {busyId === customer._id ? <LoaderCircle className="animate-spin" size={15} /> : <XCircle size={16} />}
                      </IconButton>
                    )}
                    {isClosed && (
                      <IconButton label="Reactivate customer" tone="blue" disabled={busyId === customer._id} onClick={() => onReactivate(customer)}>
                        {busyId === customer._id ? <LoaderCircle className="animate-spin" size={15} /> : <RotateCcw size={16} />}
                      </IconButton>
                    )}
                    {closedOnly && !isClosed && <span className="text-xs text-slate-400">-</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function FinanceAddCustomerPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  function set(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setSuccess('');
    if (!form.name.trim() || !form.phone.trim() || !form.totalAmount || !form.dailyCollectionAmount || !form.startDate) {
      setFormError('Fill all customer fields');
      return;
    }
    setSaving(true);
    try {
      await financeApi.createCustomer(form);
      setForm(initialForm());
      setSuccess('Customer added successfully');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FinancePage title="Customers" description="Add Loan, Chit or Deposit customers and manage customer accounts.">
      <FinanceCustomerNav />
      <FinanceCard className="mx-auto max-w-2xl p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#4f90ff] dark:bg-blue-950">
            <UserPlus size={20} />
          </span>
          <div>
            <h2 className="m-0 text-base font-black text-slate-900 dark:text-white">Add new customer</h2>
            <p className="mb-0 mt-0.5 text-xs text-slate-500">Set the daily collection plan.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            <IconLabel icon={UserRound}>Name</IconLabel>
            <input value={form.name} onChange={set('name')} className={`${fieldClass} mt-1.5`} placeholder="Customer name" maxLength={120} />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            <IconLabel icon={Phone}>Phone</IconLabel>
            <input value={form.phone} onChange={set('phone')} className={`${fieldClass} mt-1.5`} placeholder="Phone number" inputMode="tel" maxLength={20} />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            <IconLabel icon={ClipboardList}>Type</IconLabel>
            <select value={form.type} onChange={set('type')} className={`${fieldClass} mt-1.5`}>
              <option value="Loan">Loan</option>
              <option value="Chit">Chit</option>
              <option value="Deposit">Deposit</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              <IconLabel icon={WalletCards}>Total amount</IconLabel>
              <input type="number" min="0.01" step="0.01" value={form.totalAmount} onChange={set('totalAmount')} className={`${fieldClass} mt-1.5`} placeholder="0.00" />
            </label>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              <IconLabel icon={IndianRupee}>Daily amount</IconLabel>
              <input type="number" min="0.01" step="0.01" value={form.dailyCollectionAmount} onChange={set('dailyCollectionAmount')} className={`${fieldClass} mt-1.5`} placeholder="0.00" />
            </label>
          </div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            <IconLabel icon={CalendarDays}>Start date</IconLabel>
            <input type="date" value={form.startDate} onChange={set('startDate')} className={`${fieldClass} mt-1.5`} />
          </label>
          {formError && <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-950/40">{formError}</p>}
          {success && (
            <p className="m-0 flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-950/40">
              <CheckCircle2 size={15} /> {success}
              <button type="button" onClick={() => navigate('/finance/customers/all')} className="inline-flex items-center gap-1 font-black underline underline-offset-2"><ListChecks size={13} /> View all</button>
            </p>
          )}
          <button type="submit" disabled={saving} className={`${primaryButton} w-full`}>
            {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}
            {saving ? 'Adding...' : 'Add customer'}
          </button>
        </form>
      </FinanceCard>
    </FinancePage>
  );
}

export function FinanceAllCustomersPage() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [viewCustomer, setViewCustomer] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await financeApi.customers('All');
      setCustomers(data.customers);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function replaceCustomer(updated) {
    setCustomers((current) => (current || []).map((item) => (item._id === updated._id ? updated : item)));
    setViewCustomer((current) => (current?._id === updated._id ? updated : current));
  }

  async function updateStatus(customer, status) {
    setBusyId(customer._id);
    setError('');
    try {
      replaceCustomer(await financeApi.updateCustomerStatus(customer._id, status));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  async function saveEdit(customer, form) {
    setEditError('');
    if (!form.name.trim() || !form.phone.trim() || !form.totalAmount || !form.dailyCollectionAmount || !form.startDate) {
      setEditError('Fill all customer fields');
      return;
    }
    setEditSaving(true);
    try {
      const updated = await financeApi.updateCustomer(customer._id, form);
      replaceCustomer(updated);
      setEditCustomer(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <FinancePage
      title="Customers"
      description="All active and closed finance customers in one list."
      action={<Link to="/finance/customers/add" className={primaryButton}><UserPlus size={17} /> Add customer</Link>}
    >
      <FinanceCustomerNav />
      <FinanceCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div>
            <h2 className="m-0 inline-flex items-center gap-2 text-base font-black text-slate-900 dark:text-white"><UsersRound size={18} className="text-[#4f90ff]" /> All customers</h2>
            <p className="mb-0 mt-1 text-xs text-slate-500">{customers?.length || 0} customer(s)</p>
          </div>
          <StatusBadge status="Active" />
        </div>
        {!customers && !error && <LoadingState />}
        {error && <div className="p-5"><ErrorState message={error} onRetry={load} /></div>}
        <CustomerTable
          customers={customers}
          busyId={busyId}
          onView={setViewCustomer}
          onEdit={(customer) => { setEditError(''); setEditCustomer(customer); }}
          onClose={(customer) => updateStatus(customer, 'Finished')}
          onReactivate={(customer) => updateStatus(customer, 'Active')}
          emptyTitle="No customers"
          emptyDescription="Add your first finance customer to start daily collections."
        />
      </FinanceCard>
      <CustomerViewModal customer={viewCustomer} onClose={() => setViewCustomer(null)} />
      <CustomerEditModal customer={editCustomer} saving={editSaving} error={editError} onClose={() => setEditCustomer(null)} onSave={saveEdit} />
    </FinancePage>
  );
}

export function FinanceClosedCustomersPage() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [viewCustomer, setViewCustomer] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await financeApi.customers('Finished');
      setCustomers(data.customers);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function replaceCustomer(updated) {
    setCustomers((current) => (current || []).map((item) => (item._id === updated._id ? updated : item)));
    setViewCustomer((current) => (current?._id === updated._id ? updated : current));
  }

  async function reactivate(customer) {
    setBusyId(customer._id);
    setError('');
    try {
      await financeApi.updateCustomerStatus(customer._id, 'Active');
      setCustomers((current) => (current || []).filter((item) => item._id !== customer._id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  async function saveEdit(customer, form) {
    setEditError('');
    if (!form.name.trim() || !form.phone.trim() || !form.totalAmount || !form.dailyCollectionAmount || !form.startDate) {
      setEditError('Fill all customer fields');
      return;
    }
    setEditSaving(true);
    try {
      replaceCustomer(await financeApi.updateCustomer(customer._id, form));
      setEditCustomer(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <FinancePage title="Closed Customers" description="Completed customer accounts with their lifetime collection totals.">
      <FinanceCustomerNav />
      <FinanceCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div>
            <h2 className="m-0 inline-flex items-center gap-2 text-base font-black text-slate-900 dark:text-white"><XCircle size={18} className="text-[#4f90ff]" /> Closed accounts</h2>
            <p className="mb-0 mt-1 text-xs text-slate-500">{customers?.length || 0} customer(s)</p>
          </div>
          <StatusBadge status="Finished" />
        </div>
        {!customers && !error && <LoadingState />}
        {error && <div className="p-5"><ErrorState message={error} onRetry={load} /></div>}
        <CustomerTable
          customers={customers}
          busyId={busyId}
          onView={setViewCustomer}
          onEdit={(customer) => { setEditError(''); setEditCustomer(customer); }}
          onClose={() => {}}
          onReactivate={reactivate}
          emptyTitle="No closed customers"
          emptyDescription="Closed customers will appear here."
          closedOnly
        />
      </FinanceCard>
      <CustomerViewModal customer={viewCustomer} onClose={() => setViewCustomer(null)} />
      <CustomerEditModal customer={editCustomer} saving={editSaving} error={editError} onClose={() => setEditCustomer(null)} onSave={saveEdit} />
    </FinancePage>
  );
}

export function FinanceCustomersPage() {
  return <FinanceAllCustomersPage />;
}
