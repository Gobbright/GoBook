import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

import { api } from '../../../../../services/api.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]';
const LABEL = 'block text-[12px] font-medium text-[#374151] mb-1';

const CODE39_PATTERNS = {
  0: 'nnnwwnwnn', 1: 'wnnwnnnnw', 2: 'nnwwnnnnw', 3: 'wnwwnnnnn', 4: 'nnnwwnnnw',
  5: 'wnnwwnnnn', 6: 'nnwwwnnnn', 7: 'nnnwnnwnw', 8: 'wnnwnnwnn', 9: 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '$': 'nwnwnwnnn',
  '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn', '*': 'nwnnwnwnn',
};

function normalizeBarcodeValue(value) {
  const raw = String(value || '').trim().toUpperCase();
  return raw.replace(/[^0-9A-Z ./$+%-]/g, '-').slice(0, 32) || 'NO-CODE';
}

// Deterministic 12-digit code derived from the given text: same input always
// produces the same digits (djb2 hash, expanded to fill the length).
function hashToDigits(text, length = 12) {
  let hash = 5381;
  const str = String(text || '');
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  let digits = String(hash);
  while (digits.length < length) {
    hash = ((hash << 5) + hash + 1) >>> 0;
    digits += String(hash);
  }
  return digits.slice(0, length);
}

// Products that share brand, size, fabric, type and price get the same barcode;
// any difference in those attributes produces a different barcode.
function genBarcodeForProduct(product = {}) {
  const key = [product.brand, product.size, product.fabric, product.type, product.rate]
    .map((v) => String(v ?? '').trim().toLowerCase())
    .join('|');
  return hashToDigits(key);
}

function Code39Barcode({ value, height = 34 }) {
  const encoded = `*${normalizeBarcodeValue(value)}*`;
  const bars = [];
  let x = 0;
  const narrow = 2;
  const wide = 5;

  encoded.split('').forEach((char, charIndex) => {
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];
    pattern.split('').forEach((part, index) => {
      const width = part === 'w' ? wide : narrow;
      if (index % 2 === 0) bars.push(<rect key={`${charIndex}-${index}`} x={x} y={0} width={width} height={height} fill="#111827" />);
      x += width;
    });
    x += narrow;
  });

  return (
    <svg width="150" height={height} viewBox={`0 0 ${x} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {bars}
    </svg>
  );
}

function qrPayload(product) {
  return JSON.stringify({
    code: product.code || '',
    barcode: product.barcode || product.code || '',
    name: product.description || '',
  });
}

function QRPattern({ value }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(String(value), { width: 64, margin: 1, color: { dark: '#111827', light: '#ffffff' } })
      .then(setDataUrl)
      .catch(() => {});
  }, [value]);

  if (!dataUrl) return <div style={{ width: 64, height: 64 }} />;
  return <img src={dataUrl} alt="QR" width={64} height={64} style={{ display: 'block' }} />;
}

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

function EditModal({ product, onSave, onClose }) {
  const [form, setForm] = useState({
    description: product.description || '',
    code:        product.code || '',
    category:    product.category || '',
    barcode:     product.barcode || product.code || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.description.trim()) return setErr('Product name is required');
    if (!form.code.trim()) return setErr('SKU / Code is required');
    setSaving(true);
    setErr('');
    try {
      const result = await api.invUpdateProduct(product._id, form);
      onSave(result);
    } catch (e) {
      setErr(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-130 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2f7]">
          <h2 className="text-[16px] font-bold text-[#111827]">Edit Product Barcode</h2>
          <button onClick={onClose} className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-lg leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {err && <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 text-[12px] rounded-md">{err}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={LABEL}>Product Name *</label>
              <input className={INPUT} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>SKU / Code *</label>
              <input className={INPUT} value={form.code} onChange={(e) => set('code', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Category</label>
              <input className={INPUT} value={form.category} onChange={(e) => set('category', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Barcode</label>
              <div className="flex gap-2">
                <input className={INPUT} value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
                <button
                  type="button"
                  className="px-3 py-2 text-[12px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md cursor-pointer hover:bg-blue-100 font-[inherit]"
                  onClick={() => set('barcode', genBarcodeForProduct(product))}
                >
                  Regenerate
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ItemTypeTabs({ value, onChange }) {
  return (
    <div className="inline-flex rounded-md border border-[#dbe4ef] bg-white p-0.5">
      {['Product', 'Service'].map((t) => (
        <button
          key={t}
          type="button"
          className={`px-3 py-1.5 text-[13px] font-medium rounded cursor-pointer font-[inherit] ${value === t ? 'bg-blue-600 text-white' : 'text-[#374151] hover:bg-gray-50'}`}
          onClick={() => onChange(t)}
        >
          {t === 'Product' ? 'Products' : 'Services'}
        </button>
      ))}
    </div>
  );
}

export function BarcodePage() {
  const [search, setSearch]         = useState('');
  const [itemType, setItemType]     = useState('Product');
  const [category, setCategory]     = useState('All Categories');
  const [categories, setCategories] = useState([]);
  const [products, setProducts]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [editing, setEditing]       = useState(null);
  const [printRows, setPrintRows]   = useState([]);

  const LIMIT = 5;

  useEffect(() => {
    api.invProductCategories()
      .then((cats) => setCategories(['All Categories', ...cats]))
      .catch(() => {});
  }, []);

  function loadProducts() {
    setLoading(true);
    setError('');
    const params = { page, limit: LIMIT, itemType };
    if (search) params.search = search;
    if (category !== 'All Categories') params.category = category;
    api.invListProducts(params)
      .then((res) => { setProducts(res.data); setTotal(res.total); })
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadProducts(); }, [search, category, itemType, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!printRows.length) return undefined;
    const cleanup = () => {
      document.body.classList.remove('barcode-printing');
      setPrintRows([]);
      window.removeEventListener('afterprint', cleanup);
    };
    document.body.classList.add('barcode-printing');
    window.addEventListener('afterprint', cleanup);
    const timer = window.setTimeout(() => window.print(), 100);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', cleanup);
      document.body.classList.remove('barcode-printing');
    };
  }, [printRows]);

  function handleSaved(updated) {
    setEditing(null);
    setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    api.invDeleteProduct(id)
      .then(() => setProducts((prev) => prev.filter((p) => p._id !== id)))
      .catch(() => alert('Failed to delete product'));
  }

  async function generateMissingBarcodes() {
    const missing = products.filter((product) => !product.barcode);
    if (!missing.length) return alert('All visible products already have barcodes');
    try {
      const updated = await Promise.all(missing.map((product) => (
        api.invUpdateProduct(product._id, { barcode: normalizeBarcodeValue(genBarcodeForProduct(product)) })
      )));
      setProducts((prev) => prev.map((product) => updated.find((u) => u._id === product._id) || product));
    } catch {
      alert('Failed to generate barcodes');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="p-7">
      {editing && <EditModal product={editing} onSave={handleSaved} onClose={() => setEditing(null)} />}
      {printRows.length > 0 && (
        <div className="barcode-print-area">
          <div className="barcode-print-sheet">
            {printRows.map((row) => {
              const barcodeVal = row.barcode || row.code || '';
              return (
                <div className="barcode-label-card" key={row._id}>
                  <div className="barcode-label-main">
                    <div className="barcode-label-name">{row.description}</div>
                    <div className="barcode-label-meta">SKU: {row.code || '-'}</div>
                    <Code39Barcode value={barcodeVal} height={38} />
                    <div className="barcode-label-code">{normalizeBarcodeValue(barcodeVal)}</div>
                  </div>
                  <div className="barcode-label-qr">
                    <QRPattern value={qrPayload(row)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-5">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Barcode / QR Code</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Generate and manage barcodes / QR codes for products</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-blue-700 bg-blue-50 rounded-md cursor-pointer hover:bg-blue-100 border border-blue-200 font-[inherit]"
            type="button"
            onClick={generateMissingBarcodes}
          >
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            Generate Missing
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]"
            type="button"
            onClick={() => setPrintRows(products.filter((product) => product.barcode || product.code))}
            disabled={!products.length}
          >
            Print Labels
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7] flex-wrap">
          <ItemTypeTabs value={itemType} onChange={(t) => { setItemType(t); setPage(1); }} />
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
              <circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/>
            </svg>
            <input
              className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]"
              placeholder="Search name, SKU, barcode..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none font-[inherit] text-[#374151] bg-white cursor-pointer"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {error && (
          <div className="px-5 py-4 text-[13px] text-red-600">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Product Name</th>
                <th className={TH}>SKU / Code</th>
                <th className={TH}>Barcode</th>
                <th className={TH}>QR Code</th>
                <th className={TH}>Category</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-[#536173]">No products found</td></tr>
              ) : products.map((row) => {
                const barcodeVal = row.barcode || row.code;
                return (
                  <tr key={row._id} className="hover:bg-gray-50">
                    <td className={`${TD} font-medium text-[#111827]`}>{row.description}</td>
                    <td className={`${TD} text-[#536173]`}>{row.code}</td>
                    <td className={TD}>
                      <div className="flex flex-col gap-0.5">
                        <Code39Barcode value={barcodeVal} />
                        <span className="text-[10px] text-[#536173] tracking-widest">{barcodeVal}</span>
                      </div>
                    </td>
                    <td className={TD}>
                      <QRPattern value={qrPayload(row)} />
                    </td>
                    <td className={`${TD} text-[#536173]`}>{row.category || '—'}</td>
                    <td className={TD}>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setPrintRows([row])} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 cursor-pointer font-[inherit]">Print</button>
                        <button onClick={() => setEditing(row)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 cursor-pointer font-[inherit]"><EditIcon /> Edit</button>
                        <button onClick={() => handleDelete(row._id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 cursor-pointer font-[inherit]"><TrashIcon /> Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#edf2f7] flex flex-wrap justify-between gap-2 text-[13px] text-[#536173]">
          <span>Showing {products.length === 0 ? 0 : (page - 1) * LIMIT + 1} to {(page - 1) * LIMIT + products.length} of {total} entries</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40"
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >←</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`px-2.5 py-1 rounded text-[12px] font-[inherit] cursor-pointer border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`}
                type="button"
                onClick={() => setPage(p)}
              >{p}</button>
            ))}
            <button
              className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40"
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
