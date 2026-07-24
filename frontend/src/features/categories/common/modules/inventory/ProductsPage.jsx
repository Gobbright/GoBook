import { useEffect, useRef, useState } from 'react';
import { IndianRupee } from 'lucide-react';

import { api } from '../../../../../services/api.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]';
const LABEL = 'block text-[12px] font-medium text-[#374151] mb-1';

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['Nos', 'Pcs', 'Kg', 'Box', 'Ltr', 'Mtr', 'Set'];

const EMPTY_FORM = { description: '', code: '', hsn: '', category: '', brand: '', unit: 'Nos', rate: '', gstRate: 18, stock: 0, minStockLevel: 0, barcode: '', status: 'Active' };

function genBarcode() {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
}

function formatINR(v) { return '₹ ' + Number(v).toLocaleString('en-IN'); }

const EditIcon = () => (
  <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TrashIcon = () => (
  <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);
const UploadIcon = () => (
  <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);

function ProductModal({ mode, initial, nextCode, initialBarcode = '', categories, brands, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    if (mode === 'add') return { ...EMPTY_FORM, code: nextCode ?? '', barcode: initialBarcode || genBarcode() };
    return initial ?? EMPTY_FORM;
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  useEffect(() => {
    if (mode !== 'add') return;
    if (nextCode) {
      setForm((prev) => ({ ...prev, code: prev.code || nextCode }));
      return;
    }

    let active = true;
    api.invProductNextCode()
      .then(({ code }) => {
        if (!active || !code) return;
        setForm((prev) => ({ ...prev, code: prev.code || code }));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [mode, nextCode]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.description.trim()) return setErr('Product name is required');
    if (!form.rate || Number(form.rate) < 0) return setErr('Valid sale price is required');
    setSaving(true);
    setErr('');
    try {
      const payload = {
        ...form,
        code: form.code?.trim() || nextCode || '',
        rate: Number(form.rate),
        stock: Number(form.stock),
        minStockLevel: Number(form.minStockLevel),
        gstRate: Number(form.gstRate),
      };
      const result = mode === 'add' ? await api.invCreateProduct(payload) : await api.invUpdateProduct(initial._id, payload);
      onSave(result);
    } catch (e) {
      setErr(e.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-130 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2f7]">
          <h2 className="text-[16px] font-bold text-[#111827]">{mode === 'add' ? 'Add Product' : 'Edit Product'}</h2>
          <button onClick={onClose} className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-lg leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {err && <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 text-[12px] rounded-md">{err}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={LABEL}>Product Name *</label>
              <input className={INPUT} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Wireless Mouse" />
            </div>
            <div>
              <label className={LABEL}>HSN / SAC</label>
              <input className={INPUT} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} placeholder="e.g. 8471" />
            </div>
            <div>
              <label className={LABEL}>Category</label>
              <input className={INPUT} value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Electronics" list="cat-list" />
              <datalist id="cat-list">{categories.filter((c) => c !== 'All Categories').map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className={LABEL}>Brand</label>
              <input className={INPUT} value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Samsung" list="brand-list" />
              <datalist id="brand-list">{brands.map((b) => <option key={b} value={b} />)}</datalist>
            </div>
            <div>
              <label className={LABEL}>Unit</label>
              <select className={INPUT} value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Sale Price (₹) *</label>
              <input className={INPUT} type="number" min="0" step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className={LABEL}>GST Rate (%)</label>
              <select className={INPUT} value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)}>
                {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Current Stock</label>
              <input className={INPUT} type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Min. Stock Level</label>
              <input className={INPUT} type="number" min="0" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Barcode</label>
              <div className="flex gap-1.5">
                <input className={INPUT} value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="Auto-generated" />
                {mode === 'add' && (
                  <button type="button" title="Regenerate" onClick={() => set('barcode', genBarcode())} className="px-2 border border-[#dbe4ef] rounded-md text-[#536173] hover:bg-gray-50 bg-white cursor-pointer text-[16px] leading-none">↺</button>
                )}
              </div>
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <select className={INPUT} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-5 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
              {saving ? 'Saving...' : mode === 'add' ? 'Add Product' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProductsPage() {
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('All Categories');
  const [categories, setCategories] = useState(['All Categories']);
  const [brands, setBrands]         = useState([]);
  const [products, setProducts]     = useState([]);
  const [stats, setStats]           = useState(null);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [modal, setModal]           = useState(null); // null | { mode: 'add' } | { mode: 'edit', data: obj }
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [scanCode, setScanCode] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const fileInputRef = useRef(null);

  const LIMIT = 5;

  function loadStats() {
    api.invProductStats().then(setStats).catch(() => {});
  }

  function loadCategories() {
    api.invProductCategories().then((cats) => setCategories(['All Categories', ...cats])).catch(() => {});
  }

  function loadBrands() {
    api.invProductBrands().then(setBrands).catch(() => {});
  }

  function loadProducts() {
    setLoading(true);
    setError('');
    const params = { page, limit: LIMIT };
    if (search) params.search = search;
    if (category !== 'All Categories') params.category = category;
    api.invListProducts(params)
      .then((res) => { setProducts(res.data); setTotal(res.total); })
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadStats(); loadCategories(); loadBrands(); }, []);
  useEffect(() => { loadProducts(); }, [search, category, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave(saved) {
    setModal(null);
    setSearch('');
    setCategory('All Categories');
    setPage(1);
    loadStats();
    loadCategories();
    loadBrands();
    api.invListProducts({ page: 1, limit: LIMIT })
      .then((res) => {
        setProducts(res.data);
        setTotal(res.total);
      })
      .catch(() => loadProducts());
  }

  function openAddModal() {
    setModal({ mode: 'add', nextCode: '' });
  }

  function findProductByScan(rows = [], value = '') {
    const needle = String(value || '').trim().toLowerCase();
    const text = (input) => String(input || '').trim().toLowerCase();
    return rows.find((row) => text(row.barcode) === needle)
      || rows.find((row) => text(row.code) === needle)
      || rows.find((row) => text(row.description) === needle)
      || null;
  }

  async function handleScanSubmit(e) {
    e.preventDefault();
    const code = scanCode.trim();
    if (!code) return;
    setScanMessage('');
    try {
      const result = await api.invListProducts({ search: code, page: 1, limit: 20 });
      const rows = Array.isArray(result?.data) ? result.data : [];
      const match = findProductByScan(rows, code);
      if (match) {
        setSearch(match.barcode || match.code || match.description || code);
        setCategory('All Categories');
        setPage(1);
        setScanMessage(`Found product: ${match.description}`);
      } else {
        setModal({ mode: 'add', nextCode: '', initialBarcode: code });
        setScanMessage('New barcode scanned. Add product details once to save it.');
      }
    } catch (err) {
      setScanMessage(err.message || 'Unable to scan product');
    } finally {
      setScanCode('');
    }
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPendingFile(file);
  }

  async function confirmImport() {
    const file = pendingFile;
    if (!file) return;
    setPendingFile(null);
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await api.invImportProducts(formData);
      setImportResult(result);
      loadStats();
      loadCategories();
      loadBrands();
      loadProducts();
    } catch (e) {
      setImportResult({ error: e.message || 'Import failed' });
    } finally {
      setImporting(false);
    }
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this product?')) return;
    api.invDeleteProduct(id)
      .then(() => { setProducts((prev) => prev.filter((p) => p._id !== id)); loadStats(); })
      .catch(() => alert('Failed to delete product'));
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="p-7">
      {modal && (
        <ProductModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.data : null}
          nextCode={modal.nextCode}
          initialBarcode={modal.initialBarcode || ''}
          categories={categories}
          brands={brands}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {pendingFile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && setPendingFile(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-100 mx-4 p-6">
            <h2 className="text-[16px] font-bold text-[#111827] mb-2">Import Products</h2>
            <p className="text-[13px] text-[#536173] mb-5">
              Import products from <span className="font-medium text-[#111827]">{pendingFile.name}</span>? Existing products with matching codes will be updated.
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setPendingFile(null)} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">No</button>
              <button type="button" onClick={confirmImport} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]">Yes, Import</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-5">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Products</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Manage all your products and inventory items</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-60"
            type="button"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon />
            {importing ? 'Importing...' : 'Import Excel'}
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]"
            type="button"
            onClick={openAddModal}
          >
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            Add Product
          </button>
        </div>
      </div>

      <form onSubmit={handleScanSubmit} className="mb-5 bg-white border border-[#dfe7f1] rounded-xl p-4 flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <label className={LABEL}>Scan Product Barcode</label>
          <input
            className={INPUT}
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            placeholder="Scan barcode here and press Enter"
            autoComplete="off"
          />
          {scanMessage && <div className="mt-1.5 text-[12px] text-blue-700">{scanMessage}</div>}
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]"
        >
          Scan / Add
        </button>
      </form>

      {importResult && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-[13px] border ${importResult.error ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
          {importResult.error ? (
            <div>{importResult.error}</div>
          ) : (
            <>
              <div className="font-medium">
                Import complete: {importResult.imported} added, {importResult.updated} updated
                {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}.
              </div>
              {importResult.errors?.length > 0 && (
                <ul className="mt-1.5 list-disc pl-5 text-[12px]">
                  {importResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                  {importResult.errors.length > 5 && <li>...and {importResult.errors.length - 5} more</li>}
                </ul>
              )}
            </>
          )}
          <button type="button" onClick={() => setImportResult(null)} className="mt-1.5 text-[12px] underline bg-transparent border-0 cursor-pointer p-0 text-inherit font-[inherit]">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Products',     value: stats ? stats.total.toLocaleString('en-IN') : '—',        sub: 'Active',          color: '#2563eb', bg: '#eff6ff', icon: <svg fill="none" height="20" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> },
          { label: 'Low Stock Items',     value: stats ? stats.lowStock.toLocaleString('en-IN') : '—',     sub: 'Alert',           color: '#f59e0b', bg: '#fffbeb', icon: <svg fill="none" height="20" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg> },
          { label: 'Out of Stock Items',  value: stats ? stats.outOfStock.toLocaleString('en-IN') : '—',   sub: 'Out of Stock',    color: '#ef4444', bg: '#fef2f2', icon: <svg fill="none" height="20" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24" width="20"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg> },
          { label: 'Total Value',         value: stats ? formatINR(stats.totalValue) : '—',                sub: 'Inventory Value', color: '#7c3aed', bg: '#f5f3ff', icon: <IndianRupee size={20} color="#7c3aed" /> },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-none" style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
              <div className="text-[17px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[#536173] mt-0.5">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7] flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none font-[inherit] text-[#374151] bg-white cursor-pointer" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {error && <div className="px-5 py-4 text-[13px] text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Product Name</th>
                <th className={TH}>HSN / SAC</th>
                <th className={TH}>Category</th>
                <th className={TH}>Brand</th>
                <th className={TH}>Sale Price</th>
                <th className={TH}>GST</th>
                <th className={TH}>Stock</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-[13px] text-[#536173]">No products found</td></tr>
              ) : products.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-[#111827]`}>{row.description}</td>
                  <td className={`${TD} text-[#536173] font-mono`}>{row.hsn || '-'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.category || '—'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.brand || '—'}</td>
                  <td className={`${TD} font-medium text-[#111827]`}>{formatCurrency(row.rate)}</td>
                  <td className={`${TD} text-[#536173]`}>{Number(row.gstRate ?? 0)}%</td>
                  <td className={`${TD} text-[#111827]`}>{row.stock}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{row.status}</span>
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-1">
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-yellow-50 text-yellow-500 bg-transparent border-0 cursor-pointer" type="button" title="Edit" onClick={() => setModal({ mode: 'edit', data: row })}>
                        <EditIcon />
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer" type="button" title="Delete" onClick={() => handleDelete(row._id)}>
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#edf2f7] flex flex-wrap justify-between gap-2 text-[13px] text-[#536173]">
          <span>Showing {products.length === 0 ? 0 : (page - 1) * LIMIT + 1} to {(page - 1) * LIMIT + products.length} of {total} entries</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`px-2.5 py-1 rounded text-[12px] font-[inherit] cursor-pointer border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`} type="button" onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}

