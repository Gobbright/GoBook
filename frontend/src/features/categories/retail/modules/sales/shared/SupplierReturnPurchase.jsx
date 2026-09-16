import { useEffect, useState } from 'react';
import { api } from '../../../../../../services/api.js';

export function SupplierReturnPurchase({ purchaseId, returnId, onSelect }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [purchases, setPurchases] = useState([]);
  const [purchase, setPurchase] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      api.listSupplierReturnPurchases({ search, page }).then((data) => {
        if (active) { setPurchases(data.data || []); setError(''); }
      }).catch((err) => { if (active) setError(err.message); })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [search, page]);
  useEffect(() => {
    let active = true;
    setPurchase(null);
    if (purchaseId) api.getSupplierReturnPurchase(purchaseId, returnId).then((data) => {
      if (active) setPurchase(data);
    }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [purchaseId, returnId]);
  async function choose(id) {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSupplierReturnPurchase(id, returnId);
      if (!data.items.some((item) => item.remainingQty > 0)) throw new Error('This purchase has already been fully returned.');
      setPurchase(data);
      onSelect(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return <section className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
    <h4 className="m-0 mb-2 font-semibold">Return against a purchase</h4>
    <p className="mb-3 text-xs text-slate-600">Select the original purchase. Supplier, rates and tax are copied from it. Adjust returned quantities below or remove items you are keeping.</p>
    <input aria-label="Search purchases" className="w-full rounded border border-slate-200 bg-white p-2 text-sm" placeholder="Search purchase number, supplier or supplier invoice" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
    <div className="my-2 max-h-40 overflow-auto">
      {purchases.map((row) => <button type="button" disabled={loading} key={row._id} onClick={() => choose(row._id)} className={`my-1 w-full rounded border p-2 text-left text-sm ${purchaseId === row._id ? 'border-blue-500 bg-blue-100' : 'border-slate-200 bg-white'}`}>
        {row.number} · {row.customer?.name} · {row.meta?.date}{row.extra?.vendorInvoiceNo ? ` · Supplier invoice: ${row.extra.vendorInvoiceNo}` : ''}
      </button>)}
      {!loading && !purchases.length && <p className="text-sm">No matching purchases.</p>}
    </div>
    <div className="flex gap-3 text-xs"><button type="button" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button type="button" disabled={purchases.length < 50 || loading} onClick={() => setPage(page + 1)}>Next</button>{loading && <span>Loading…</span>}</div>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    {purchase && <div className="mt-3 overflow-x-auto"><p className="text-sm font-semibold">Selected: {purchase.number} · {purchase.customer?.name}</p><table className="w-full text-left text-xs"><thead><tr><th>Item / variant</th><th>Purchased</th><th>Previously returned</th><th>Available to return</th></tr></thead><tbody>{purchase.items.map((item, index) => <tr key={index}><td className="py-1">{item.description} {item.size}</td><td>{item.purchasedQty}</td><td>{item.returnedQty}</td><td>{item.remainingQty}</td></tr>)}</tbody></table></div>}
    <p className="mt-3 text-xs text-slate-600">Saving reduces stock and adjusts the supplier ledger. It does not record a cash or bank refund.</p>
  </section>;
}
