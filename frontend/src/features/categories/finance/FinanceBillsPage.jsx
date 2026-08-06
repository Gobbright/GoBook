import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Download, Eye, FileText, IndianRupee, LoaderCircle, Phone,
  ReceiptText, UserRound, X,
} from 'lucide-react';

import { SelectDropdown } from '../../../components/forms/SelectDropdown.jsx';
import { FinanceBillNav } from './FinanceBillNav.jsx';
import { downloadFinanceBillPdf, financeBillHtml } from './financeBillPdf.js';
import { financeApi } from './financeApi.js';
import {
  EmptyState, ErrorState, FinanceCard, FinancePage, LoadingState, TypeBadge,
  fieldClass, formatMoney, indiaToday, primaryButton,
} from './FinanceUi.jsx';

const manualInitial = () => ({
  customerName: '',
  phone: '',
  type: 'Loan',
  date: indiaToday(),
  amount: '',
  paymentMode: 'Cash',
  description: 'Finance collection payment',
  note: '',
});

function billFromCustomer(customer, date, index = 0) {
  return {
    customerName: customer.name,
    phone: customer.phone,
    type: customer.type,
    date,
    amount: customer.collectedAmount,
    paymentMode: 'Cash',
    source: 'Auto Collection Entry',
    description: `${customer.type} collection payment`,
    serial: `${String(index + 1).padStart(3, '0')}`,
  };
}

function FinanceBillPreviewModal({ settings, bill, onClose, onDownload, downloading }) {
  if (!bill) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div>
            <h2 className="m-0 inline-flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
              <Eye size={18} className="text-[#4f90ff]" /> View bill
            </h2>
            <p className="mb-0 mt-1 text-xs text-slate-500">{bill.customerName} - {formatMoney(bill.amount)}</p>
          </div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <button type="button" disabled={downloading} onClick={onDownload} className={primaryButton}>
                {downloading ? <LoaderCircle className="animate-spin" size={17} /> : <Download size={17} />}
                PDF
              </button>
            )}
            <button type="button" aria-label="Close bill preview" onClick={onClose} className="inline-grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-auto bg-slate-100 p-4 dark:bg-slate-950">
          <div className="mx-auto w-full max-w-[720px] origin-top overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="max-w-full overflow-auto" dangerouslySetInnerHTML={{ __html: financeBillHtml(settings || {}, bill, { responsive: true }) }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BillSummary({ title, amount, children }) {
  return (
    <FinanceCard className="mb-5 overflow-hidden bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="m-0 inline-flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
            <ReceiptText size={18} className="text-[#4f90ff]" /> {title}
          </h2>
          {children}
        </div>
        <p className="m-0 text-2xl font-black text-[#4f90ff]">{formatMoney(amount)}</p>
      </div>
    </FinanceCard>
  );
}

export function FinanceAutoBillPage() {
  const [date, setDate] = useState(() => indiaToday());
  const [settings, setSettings] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');
  const [previewBill, setPreviewBill] = useState(null);

  const load = useCallback(async () => {
    setError('');
    setData(null);
    try {
      const [settingsData, entryData] = await Promise.all([
        financeApi.settings(),
        financeApi.collectionEntry(date || indiaToday()),
      ]);
      setSettings(settingsData);
      setData(entryData);
    } catch (err) {
      setError(err.message);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const paidCustomers = useMemo(() => (
    data?.customers.filter((customer) => customer.paid) || []
  ), [data]);

  function viewOne(customer, index) {
    setPreviewBill(billFromCustomer(customer, date, index));
  }

  async function downloadPreview() {
    if (!previewBill) return;
    setDownloading('preview');
    try {
      await downloadFinanceBillPdf(settings, previewBill, `${previewBill.customerName}-${previewBill.date}-finance-bill.pdf`);
    } finally {
      setDownloading('');
    }
  }

  async function downloadOne(customer, index) {
    setDownloading(customer._id);
    try {
      const bill = billFromCustomer(customer, date, index);
      await downloadFinanceBillPdf(settings, bill, `${bill.customerName}-${date}-finance-bill.pdf`);
    } finally {
      setDownloading('');
    }
  }

  async function downloadAll() {
    setDownloading('all');
    try {
      for (const [index, customer] of paidCustomers.entries()) {
        const bill = billFromCustomer(customer, date, index);
        // eslint-disable-next-line no-await-in-loop
        await downloadFinanceBillPdf(settings, bill, `${bill.customerName}-${date}-finance-bill.pdf`);
      }
    } finally {
      setDownloading('');
    }
  }

  return (
    <FinancePage
      title="Auto Bill"
      description="Saved collection entries become finance bill PDFs automatically."
      action={(
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <CalendarDays size={17} className="text-[#4f90ff]" />
          <span className="hidden sm:inline">Bill date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value || indiaToday())}
            className="border-0 bg-transparent text-sm font-extrabold text-slate-800 outline-none dark:text-white"
          />
        </label>
      )}
    >
      <FinanceBillNav />
      {data && (
        <BillSummary title={`Auto bills for ${date}`} amount={paidCustomers.reduce((sum, item) => sum + Number(item.collectedAmount || 0), 0)}>
          <p className="mb-0 mt-1 text-xs text-slate-500">{paidCustomers.length} saved collection bill(s) ready for PDF.</p>
        </BillSummary>
      )}

      <FinanceCard className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="m-0 inline-flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
              <FileText size={18} className="text-[#4f90ff]" /> Saved entry bills
            </h2>
            <p className="mb-0 mt-1 text-xs text-slate-500">Enter collections first; paid rows appear here for PDF download.</p>
          </div>
          <button type="button" disabled={!paidCustomers.length || downloading === 'all'} onClick={downloadAll} className={primaryButton}>
            {downloading === 'all' ? <LoaderCircle className="animate-spin" size={17} /> : <Download size={17} />}
            {downloading === 'all' ? 'Downloading...' : 'Download all'}
          </button>
        </div>
        {!data && !error && <LoadingState />}
        {error && <div className="p-5"><ErrorState message={error} onRetry={load} /></div>}
        {data && paidCustomers.length === 0 && <EmptyState title="No auto bills yet" description="Save a collection entry for this date, then return here to download its bill PDF." />}
        {paidCustomers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paidCustomers.map((customer, index) => (
                  <tr key={customer._id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-5 py-4 font-extrabold text-slate-900 dark:text-white">{customer.name}</td>
                    <td className="px-4 py-4"><TypeBadge type={customer.type} /></td>
                    <td className="px-4 py-4 text-xs text-slate-500">{customer.phone}</td>
                    <td className="px-5 py-4 text-right font-black text-[#4f90ff]">{formatMoney(customer.collectedAmount)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => viewOne(customer, index)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          <Eye size={15} />
                          View
                        </button>
                        <button type="button" disabled={downloading === customer._id} onClick={() => downloadOne(customer, index)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {downloading === customer._id ? <LoaderCircle className="animate-spin" size={15} /> : <Download size={15} />}
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FinanceCard>
      <FinanceBillPreviewModal
        settings={settings}
        bill={previewBill}
        onClose={() => setPreviewBill(null)}
        onDownload={downloadPreview}
        downloading={downloading === 'preview'}
      />
    </FinancePage>
  );
}

export function FinanceManualBillPage() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(manualInitial);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [manualReceiptId] = useState(() => Date.now());

  useEffect(() => {
    financeApi.settings().then(setSettings).catch((err) => setError(err.message));
  }, []);

  const liveBill = useMemo(() => ({
    ...form,
    amount: Number(form.amount) || 0,
    customerName: form.customerName.trim() || 'Customer Name',
    phone: form.phone.trim() || 'Phone number',
    type: form.type || 'Loan',
    date: form.date || indiaToday(),
    paymentMode: form.paymentMode || 'Cash',
    description: form.description || 'Finance collection payment',
    source: 'Manual Bill Entry',
    receiptNumber: `${settings?.financeReceiptPrefix || 'FIN-'}MAN-${manualReceiptId}`,
  }), [form, manualReceiptId, settings?.financeReceiptPrefix]);

  function set(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function manualBill() {
    const amount = Number(form.amount);
    if (!form.customerName.trim() || !form.date || !Number.isFinite(amount) || amount <= 0) {
      setError('Fill customer name, valid date and amount greater than zero');
      return null;
    }
    return {
      ...liveBill,
      amount,
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
    };
  }

  async function downloadManualBill(bill) {
    setDownloading(true);
    try {
      await downloadFinanceBillPdf(settings || {}, bill, `${bill.customerName}-${bill.date}-manual-finance-bill.pdf`);
      setSuccess('Manual bill PDF generated');
    } catch (err) {
      setError(err.message || 'Unable to generate bill PDF');
    } finally {
      setDownloading(false);
    }
  }

  async function generate(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    const bill = manualBill();
    if (bill) await downloadManualBill(bill);
  }

  return (
    <FinancePage title="Manual Bill" description="Enter a bill manually and generate the finance bill PDF.">
      <FinanceBillNav />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        <FinanceCard className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#4f90ff] dark:bg-blue-950">
              <FileText size={20} />
            </span>
            <div>
              <h2 className="m-0 text-base font-black text-slate-900 dark:text-white">Manual bill entry</h2>
              <p className="mb-0 mt-0.5 text-xs text-slate-500">Use this for payments that are not saved through daily collection entry.</p>
            </div>
          </div>
          <form onSubmit={generate} className="space-y-3">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5"><UserRound size={14} /> Customer name</span>
              <input value={form.customerName} onChange={set('customerName')} className={`${fieldClass} mt-1.5`} placeholder="Customer name" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5"><Phone size={14} /> Phone</span>
                <input value={form.phone} onChange={set('phone')} className={`${fieldClass} mt-1.5`} placeholder="Phone number" />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5"><FileText size={14} /> Type</span>
                <SelectDropdown value={form.type} onChange={(v) => setForm((current) => ({ ...current, type: v }))} buttonClassName={`${fieldClass} mt-1.5`} options={['Loan', 'Chit', 'Deposit', 'Other']} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> Date</span>
                <input type="date" value={form.date} onChange={set('date')} className={`${fieldClass} mt-1.5`} />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5"><IndianRupee size={14} /> Amount</span>
                <input type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} className={`${fieldClass} mt-1.5`} placeholder="0.00" />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5"><ReceiptText size={14} /> Payment mode</span>
                <SelectDropdown value={form.paymentMode} onChange={(v) => setForm((current) => ({ ...current, paymentMode: v }))} buttonClassName={`${fieldClass} mt-1.5`} options={['Cash', 'UPI', 'Bank Transfer', 'Cheque']} />
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              Description
              <input value={form.description} onChange={set('description')} className={`${fieldClass} mt-1.5`} />
            </label>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              Note
              <input value={form.note} onChange={set('note')} className={`${fieldClass} mt-1.5`} placeholder="Optional" />
            </label>
            {error && <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-950/40">{error}</p>}
            {success && <p className="m-0 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-950/40">{success}</p>}
            <button type="submit" disabled={downloading} className={`${primaryButton} w-full`}>
              {downloading ? <LoaderCircle className="animate-spin" size={17} /> : <Download size={17} />}
              {downloading ? 'Generating...' : 'Generate bill PDF'}
            </button>
          </form>
        </FinanceCard>

        <FinanceCard className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
            <div>
              <h2 className="m-0 inline-flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
                <Eye size={18} className="text-[#4f90ff]" /> Bill view
              </h2>
              <p className="mb-0 mt-1 text-xs text-slate-500">{liveBill.customerName} - {formatMoney(liveBill.amount)}</p>
            </div>
          </div>
          <div className="overflow-auto bg-slate-100 p-4 dark:bg-slate-950">
            <div className="mx-auto w-full max-w-[720px] overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="max-w-full overflow-auto" dangerouslySetInnerHTML={{ __html: financeBillHtml(settings || {}, liveBill, { responsive: true }) }} />
            </div>
          </div>
        </FinanceCard>
      </div>
    </FinancePage>
  );
}
