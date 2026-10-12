import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../../../../services/api.js';

function lineKey(item, index) {
  return String(item._id || item.id || item.lineId || item.productId || `${item.description || 'item'}-${item.size || ''}-${item.rate || ''}-${index}`);
}

function itemLabel(item = {}) {
  return [item.description, item.size, item.brand, item.material]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value, index, arr) => arr.findIndex((part) => part.toLowerCase() === value.toLowerCase()) === index)
    .join(' / ');
}

export function SupplierReturnPurchase({ purchaseId, returnId, onSelect }) {
  const [search, setSearch] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [page, setPage] = useState(1);
  const [purchases, setPurchases] = useState([]);
  const [purchase, setPurchase] = useState(null);
  const [selectedLines, setSelectedLines] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const returnableItems = useMemo(
    () => (purchase?.items || []).filter((item) => Number(item.remainingQty) > 0),
    [purchase],
  );

  const filteredItems = useMemo(() => {
    const needle = itemSearch.trim().toLowerCase();
    if (!needle) return returnableItems;
    return returnableItems.filter((item) => [
      item.description,
      item.size,
      item.brand,
      item.material,
      item.hsn,
      item.barcode,
    ].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [itemSearch, returnableItems]);

  const selectedCount = Object.keys(selectedLines).filter((key) => Number(selectedLines[key]) > 0).length;
  const hasPurchaseFilter = Boolean(search.trim() || purchaseDate);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!hasPurchaseFilter) {
        setPurchases([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      api.listSupplierReturnPurchases({ search, date: purchaseDate, page })
        .then((data) => {
          if (active) {
            setPurchases(data.data || []);
            setError('');
          }
        })
        .catch((err) => {
          if (active) setError(err.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, purchaseDate, page, hasPurchaseFilter]);

  useEffect(() => {
    let active = true;
    setPurchase(null);
    setSelectedLines({});
    setItemSearch('');
    if (purchaseId) {
      api.getSupplierReturnPurchase(purchaseId, returnId)
        .then((data) => {
          if (active) setPurchase(data);
        })
        .catch((err) => {
          if (active) setError(err.message);
        });
    }
    return () => {
      active = false;
    };
  }, [purchaseId, returnId]);

  async function choose(id) {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSupplierReturnPurchase(id, returnId);
      if (!data.items.some((item) => item.remainingQty > 0)) throw new Error('This purchase has already been fully returned.');
      setPurchase(data);
      setSelectedLines({});
      setItemSearch('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleLine(item, index) {
    const key = lineKey(item, index);
    setSelectedLines((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: String(item.remainingQty || 1) };
    });
  }

  function updateLineQty(item, index, value) {
    const key = lineKey(item, index);
    const max = Number(item.remainingQty) || 0;
    const qty = Math.min(max, Math.max(0, Number(value) || 0));
    setSelectedLines((prev) => ({ ...prev, [key]: qty ? String(qty) : '' }));
  }

  function selectVisibleItems() {
    setSelectedLines((prev) => {
      const next = { ...prev };
      filteredItems.forEach((item) => {
        const sourceIndex = returnableItems.indexOf(item);
        next[lineKey(item, sourceIndex)] = String(item.remainingQty || 1);
      });
      return next;
    });
  }

  function addSelectedItems() {
    if (!purchase) return;
    const selectedItems = returnableItems
      .map((item, index) => ({ item, key: lineKey(item, index) }))
      .filter(({ key }) => selectedLines[key] && Number(selectedLines[key]) > 0)
      .map(({ item, key }) => ({
        ...item,
        remainingQty: Math.min(Number(item.remainingQty) || 0, Number(selectedLines[key]) || 0),
      }));
    if (!selectedItems.length) {
      setError('Select at least one item to return.');
      return;
    }
    setError('');
    onSelect({ ...purchase, items: selectedItems });
  }

  return (
    <section className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
      <h4 className="m-0 mb-2 font-semibold">Return against a purchase</h4>
      <p className="mb-3 text-xs text-slate-600">Select the original purchase, then choose only the lines that are being returned. Supplier, rates and tax are copied from the purchase.</p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Search invoice / vendor</span>
          <input
            aria-label="Search purchases"
            className="w-full rounded border border-slate-200 bg-white p-2 text-sm"
            placeholder="Purchase no, vendor name or supplier invoice"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Purchase date</span>
          <input
            aria-label="Filter purchases by date"
            className="w-full rounded border border-slate-200 bg-white p-2 text-sm"
            type="date"
            value={purchaseDate}
            onChange={(event) => {
              setPurchaseDate(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <button
          type="button"
          className="rounded border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
          disabled={!search && !purchaseDate}
          onClick={() => {
            setSearch('');
            setPurchaseDate('');
            setPage(1);
            setPurchases([]);
          }}
        >
          Clear filters
        </button>
      </div>

      <div className="my-2 max-h-40 overflow-auto">
        {purchases.map((row) => (
          <button
            type="button"
            disabled={loading}
            key={row._id}
            onClick={() => choose(row._id)}
            className={`my-1 w-full rounded border p-2 text-left text-sm ${purchase?._id === row._id || purchaseId === row._id ? 'border-blue-500 bg-blue-100' : 'border-slate-200 bg-white'}`}
          >
            {row.number} - {row.customer?.name} - {row.meta?.date}{row.extra?.vendorInvoiceNo ? ` - Supplier invoice: ${row.extra.vendorInvoiceNo}` : ''}
          </button>
        ))}
        {!loading && hasPurchaseFilter && !purchases.length && <p className="rounded border border-dashed border-blue-200 bg-white/70 p-3 text-sm text-slate-500">No matching purchases.</p>}
      </div>

      {hasPurchaseFilter && <div className="flex gap-3 text-xs">
        <button type="button" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page}</span>
        <button type="button" disabled={purchases.length < 50 || loading} onClick={() => setPage(page + 1)}>Next</button>
        {loading && <span>Loading...</span>}
      </div>}

      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      {purchase && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-blue-100 p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="m-0 text-sm font-semibold">Selected: {purchase.number} - {purchase.customer?.name}</p>
              <p className="m-0 mt-1 text-xs text-slate-500">{returnableItems.length} returnable item(s) - {selectedCount} selected</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700" onClick={selectVisibleItems}>Select visible</button>
              <button type="button" className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600" onClick={() => setSelectedLines({})}>Clear</button>
              <button type="button" className="rounded border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={!selectedCount} onClick={addSelectedItems}>Add selected items</button>
            </div>
          </div>

          <div className="p-3">
            <input
              aria-label="Search purchase items"
              className="mb-3 w-full rounded border border-slate-200 bg-white p-2 text-sm"
              placeholder="Search item, size, brand, material or HSN"
              value={itemSearch}
              onChange={(event) => setItemSearch(event.target.value)}
            />

            <div className="max-h-72 overflow-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="w-10 p-2">Pick</th>
                    <th className="p-2">Item / variant</th>
                    <th className="p-2 text-right">Purchased</th>
                    <th className="p-2 text-right">Returned</th>
                    <th className="p-2 text-right">Available</th>
                    <th className="p-2 text-right">Return qty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const sourceIndex = returnableItems.indexOf(item);
                    const key = lineKey(item, sourceIndex);
                    const checked = Boolean(selectedLines[key]);
                    return (
                      <tr key={key} className={checked ? 'bg-blue-50' : ''}>
                        <td className="border-t border-slate-100 p-2">
                          <input type="checkbox" checked={checked} onChange={() => toggleLine(item, sourceIndex)} />
                        </td>
                        <td className="border-t border-slate-100 p-2 font-medium text-slate-900">{itemLabel(item)}</td>
                        <td className="border-t border-slate-100 p-2 text-right">{item.purchasedQty}</td>
                        <td className="border-t border-slate-100 p-2 text-right">{item.returnedQty}</td>
                        <td className="border-t border-slate-100 p-2 text-right font-semibold">{item.remainingQty}</td>
                        <td className="border-t border-slate-100 p-2 text-right">
                          <input
                            aria-label={`Return quantity for ${itemLabel(item)}`}
                            className="w-24 rounded border border-slate-200 bg-white p-1.5 text-right"
                            disabled={!checked}
                            min="0.001"
                            max={item.remainingQty}
                            step="any"
                            type="number"
                            value={selectedLines[key] || ''}
                            onChange={(event) => updateLineQty(item, sourceIndex, event.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredItems.length && (
                    <tr>
                      <td className="p-4 text-center text-slate-500" colSpan={6}>No returnable items match your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
