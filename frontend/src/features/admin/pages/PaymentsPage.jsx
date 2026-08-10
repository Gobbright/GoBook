import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { safeNavigate } from '../../../routes/navigation.js';
import { Download, Mail, RefreshCw, Search } from 'lucide-react';

import { AdminLayout } from '../AdminLayout.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { downloadAdminStorageFile, fetchSubscriptionPayments, isAdminAuthenticated, sendSubscriptionPaymentInvoice } from '../adminService.js';

const PAYMENT_VIEWS = {
  all: { title: 'All Payments', subtitle: 'All payment transactions from DB', status: 'all' },
  pending: { title: 'Pending Payments', subtitle: 'Payments waiting for completion', status: 'pending' },
  successful: { title: 'Successful Payments', subtitle: 'Completed payment transactions', status: 'success' },
  failed: { title: 'Failed Payments', subtitle: 'Failed payment transactions', status: 'failed' },
  reports: { title: 'Payment Reports', subtitle: 'Payment summary and transaction report', status: 'all' },
};

function normalize(value) {
  return String(value || '').toLowerCase();
}

export function PaymentsPage({ type = 'all' }) {
  const navigate = useNavigate();
  const view = PAYMENT_VIEWS[type] || PAYMENT_VIEWS.all;
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [invoiceActionId, setInvoiceActionId] = useState('');
  const [invoiceMessage, setInvoiceMessage] = useState('');

  async function loadData() {
    if (!isAdminAuthenticated()) {
      safeNavigate(navigate, '/admin-login');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await fetchSubscriptionPayments(view.status);
      setSection(result);
    } catch (err) {
      setError(err.message || 'Failed to load payments from DB');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [type]);

  async function sendInvoice(row) {
    if (normalize(row.status) !== 'successful' || !row.id) return;
    try {
      setInvoiceActionId(row.id);
      setError('');
      setInvoiceMessage('');
      const result = await sendSubscriptionPaymentInvoice(row.id);
      setInvoiceMessage(result.message || 'Invoice sent successfully');
      await loadData();
    } catch (invoiceError) {
      setError(invoiceError.message || 'Unable to send invoice');
    } finally {
      setInvoiceActionId('');
    }
  }

  function paymentActions(row, mode) {
    const successful = normalize(row.status) === 'successful';
    const sending = invoiceActionId === row.id;
    const compact = mode === 'mobile' ? 'flex-1 justify-center' : '';
    return <>
      <button
        type="button"
        onClick={() => sendInvoice(row)}
        disabled={!successful || sending}
        className={`${compact} inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30`}
        title={successful ? (row.invoiceEmailStatus === 'sent' ? 'Resend invoice email' : 'Send invoice email') : 'Available after successful payment'}
      >
        {sending ? <RefreshCw size={13} className="animate-spin" /> : <Mail size={13} />}
        {row.invoiceEmailStatus === 'sent' ? 'Resend' : 'Send Invoice'}
      </button>
      {row.invoicePdfFileId ? <button
        type="button"
        onClick={() => downloadAdminStorageFile(row.invoicePdfFileId)}
        className={`${compact} ml-1 inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1.5 text-[11px] font-bold text-blue-700 transition hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30`}
        title="Download invoice PDF"
      >
        <Download size={13} /> PDF
      </button> : null}
    </>;
  }

  const rows = useMemo(() => {
    const allRows = section?.rows || [];
    const byStatus = allRows;
    const term = query.trim().toLowerCase();
    if (!term) return byStatus;
    return byStatus.filter((row) => Object.values(row).some((value) => normalize(value).includes(term)));
  }, [query, section]);

  const tableSection = {
    key: `payments-${type}`,
    label: view.title,
    count: rows.length,
    readOnly: true,
    fields: ['customerName', 'email', 'businessName', 'category', 'tier', 'amount', 'status', 'invoiceNumber', 'invoiceEmailStatus', 'paidAt'],
    viewFields: ['customerName', 'email', 'businessName', 'category', 'tier', 'amount', 'status', 'mode', 'orderId', 'paymentId', 'invoiceNumber', 'invoiceEmailStatus', 'invoiceEmailSentAt', 'paidAt', 'createdAt'],
    rows,
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 md:py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <div>
              <p data-admin-hide className="m-0 text-[10px] md:text-[12px] font-black uppercase tracking-wide text-blue-600 dark:text-blue-400">Payments</p>
              <h1 data-admin-hide className="m-0 text-lg md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{view.title}</h1>
              <p data-admin-hide className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">{view.subtitle}</p>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-7xl mx-auto">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 md:px-4 py-2 md:py-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 md:w-4 md:h-4" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payment data..." className="w-full pl-8 md:pl-9 pr-3 md:pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none" />
            </div>
          </section>

          {loading && <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Loading payments...</div>}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm font-bold text-red-700">{error}</div>}
          {invoiceMessage && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">{invoiceMessage}</div>}
          {!loading && <DataTable section={tableSection} rowActions={paymentActions} />}
        </main>
      </div>
    </AdminLayout>
  );
}

