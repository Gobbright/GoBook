import { useEffect, useState } from 'react';
import { api } from '../../../../../../services/api.js';

export function SalesReturnInvoice({ invoiceId, returnId, onSelect }) {
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [rows, setRows] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.listSalesReturnInvoices({ search, date, page: 1 });
        if (active) setRows(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (active) setError(err.message || 'Unable to load sales invoices');
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [search, date]);

  useEffect(() => {
    let active = true;
    if (invoiceId) api.getSalesReturnInvoice(invoiceId, returnId).then((data) => {
      if (active) setInvoice(data);
    }).catch(() => {});
    return () => { active = false; };
  }, [invoiceId, returnId]);

  async function choose(id) {
    try {
      setError('');
      const data = await api.getSalesReturnInvoice(id, returnId);
      if (!data.items.some((item) => item.remainingQty > 0)) throw new Error('This invoice has already been fully returned.');
      setInvoice(data);
      onSelect(data);
    } catch (err) {
      setError(err.message || 'Unable to select invoice');
    }
  }

  return <section className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
      <input className="rounded-md border border-blue-100 px-3 py-2 text-sm" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      <input className="rounded-md border border-blue-100 px-3 py-2 text-sm" placeholder="Search invoice, customer, phone" value={search} onChange={(event) => setSearch(event.target.value)} />
    </div>
    <p className="mb-3 text-xs text-slate-600">Select the original sales invoice. Customer, rates and tax are copied from it. Adjust returned quantities below or remove items the customer is keeping.</p>
    {error && <p className="rounded border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
    <div className="max-h-44 overflow-y-auto rounded-md border border-blue-100 bg-white">
      {loading ? <p className="p-3 text-sm text-slate-500">Loading...</p> : rows.length ? rows.map((row) => (
        <button key={row._id} type="button" className="grid w-full grid-cols-[1fr_auto] gap-3 border-0 border-b border-blue-50 bg-white px-3 py-2 text-left hover:bg-blue-50" onClick={() => choose(row._id)}>
          <span><strong className="block text-sm text-slate-900">{row.number}</strong><small className="text-xs text-slate-500">{row.customer?.name || 'Walk-in Customer'} · {row.meta?.date || '-'}</small></span>
          <span className="text-sm font-semibold text-slate-900">₹{Number(row.totals?.finalTotal || row.totals?.grandTotal || 0).toLocaleString('en-IN')}</span>
        </button>
      )) : <p className="p-3 text-sm text-slate-500">No sales invoices found.</p>}
    </div>
    {invoice && <div className="mt-3 overflow-x-auto"><p className="text-sm font-semibold">Selected: {invoice.number} · {invoice.customer?.name}</p><table className="w-full text-left text-xs"><thead><tr><th>Item / variant</th><th>Sold</th><th>Previously returned</th><th>Available to return</th></tr></thead><tbody>{invoice.items.map((item, index) => <tr key={index}><td className="py-1">{item.description} {item.size}</td><td>{item.soldQty}</td><td>{item.returnedQty}</td><td>{item.remainingQty}</td></tr>)}</tbody></table></div>}
  </section>;
}
