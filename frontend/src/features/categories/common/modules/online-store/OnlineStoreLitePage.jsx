import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Package,
  RefreshCw,
  Save,
  ShoppingBag,
  Store,
  ToggleLeft,
  X,
} from 'lucide-react';

import { api } from '../../../../../services/api.js';

const themeOptions = [
  ['modern', 'Modern'],
  ['classic', 'Classic'],
  ['minimal', 'Minimal'],
  ['retail', 'Retail'],
  ['fashion', 'Fashion'],
  ['grocery', 'Grocery'],
  ['electronics', 'Electronics'],
];

const sectionKeys = ['setup', 'theme', 'products', 'orders', 'reports'];

const fieldClass = 'h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function Stat({ label, value, icon: Icon, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border ${tones[tone] || tones.blue}`}>
        <Icon size={17} />
      </div>
      <div className="text-2xl font-bold text-slate-950 dark:text-white">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase text-slate-500">{label}</div>
    </div>
  );
}

function StatusPill({ enabled }) {
  return (
    <span className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-bold ${enabled ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>
      <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {enabled ? 'Store Live' : 'Store Off'}
    </span>
  );
}

export function OnlineStoreLitePage() {
  const navigate = useNavigate();
  const { section } = useParams();
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState({});
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingProductId, setEditingProductId] = useState(null);
  const [viewingOrderId, setViewingOrderId] = useState(null);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [settingsData, productData, orderData, reportData] = await Promise.all([
        api.getOnlineStoreSettings(),
        api.listOnlineStoreProducts(),
        api.listOnlineStoreOrders(),
        api.getOnlineStoreReports(),
      ]);
      setSettings(settingsData.settings);
      setStats(settingsData.stats || {});
      setProducts(productData.products || []);
      setOrders(orderData.orders || []);
      setReports(reportData);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load Online Store');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!section || !sectionKeys.includes(section)) navigate('/online-store/setup', { replace: true });
  }, [navigate, section]);

  const publicUrl = useMemo(() => settings?.publicUrl || '', [settings]);
  const activeSection = sectionKeys.includes(section) ? section : 'setup';
  const featureEnabled = Boolean(settings?.featureEnabled);
  const pendingOrders = orders.filter((order) => order.status === 'Pending').length;
  const onlineProducts = products.filter((product) => product.showOnline).length;
  const editingProduct = products.find((product) => product.id === editingProductId);
  const viewingOrder = orders.find((order) => order.id === viewingOrderId);

  function updateSettings(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateTheme(key, value) {
    setSettings((current) => ({ ...current, theme: { ...(current?.theme || {}), [key]: value } }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const result = await api.updateOnlineStoreSettings(settings);
      setSettings(result.settings);
      setMessage('Online store settings saved.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save store settings');
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product) {
    try {
      setError('');
      const result = await api.updateOnlineStoreProduct(product.id, {
        showOnline: !product.showOnline,
        featured: product.featured,
        title: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        sortOrder: product.sortOrder,
      });
      setProducts((current) => current.map((item) => (item.id === product.id ? result.product : item)));
      await load();
    } catch (toggleError) {
      setError(toggleError.message || 'Unable to update product visibility');
    }
  }

  function updateProductDraft(id, key, value) {
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, [key]: value } : product)));
  }

  async function saveProduct(product) {
    try {
      setError('');
      const result = await api.updateOnlineStoreProduct(product.id, {
        showOnline: product.showOnline,
        featured: product.featured,
        title: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        sortOrder: product.sortOrder,
      });
      setProducts((current) => current.map((item) => (item.id === product.id ? result.product : item)));
      setMessage('Product online details saved.');
      setEditingProductId(null);
    } catch (saveError) {
      setError(saveError.message || 'Unable to save product');
    }
  }

  async function setOrderStatus(order, status) {
    try {
      setError('');
      const result = await api.updateOnlineStoreOrderStatus(order.id, status);
      setOrders((current) => current.map((item) => (item.id === order.id ? result.order : item)));
      await load();
    } catch (statusError) {
      setError(statusError.message || 'Unable to update order');
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:p-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Store size={18} /></span>
                <StatusPill enabled={settings?.enabled && featureEnabled} />
              </div>
              <h1 className="m-0 text-2xl font-bold tracking-normal">Online Store</h1>
              <p className="m-0 mt-1 text-sm font-medium text-slate-500">Control your public store, online products, customer orders, and store reports.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {publicUrl ? (
                <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 no-underline hover:bg-slate-100">
                  <ExternalLink size={15} /> View store
                </a>
              ) : null}
              <button type="button" onClick={load} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {!featureEnabled ? <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Online Store is installed but disabled by feature flag. Current GoBook modules are not affected.</div> : null}
        {error ? <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
        {message ? <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</div> : null}

        {loading && !settings ? <div className="grid min-h-64 place-items-center"><RefreshCw className="animate-spin text-blue-600" size={34} /></div> : null}

        {settings ? (
          <>
            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <Stat label="Online products" value={onlineProducts || stats.onlineProducts || 0} icon={Package} tone="blue" />
              <Stat label="Pending orders" value={pendingOrders || stats.pendingOrders || 0} icon={ShoppingBag} tone="amber" />
              <Stat label="Revenue" value={money(reports?.totals?.totalRevenue || 0)} icon={BarChart3} tone="emerald" />
            </div>

            {activeSection === 'setup' ? (
              <form onSubmit={saveSettings} className="grid gap-5 xl:grid-cols-[1fr_380px]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="m-0 text-lg font-bold">Store setup</h2>
                      <p className="m-0 mt-1 text-sm text-slate-500">Basic details shown on the public store.</p>
                    </div>
                    <button type="submit" disabled={saving || !featureEnabled} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm disabled:opacity-50"><Save size={15} />Save</button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">Store enabled<select disabled={!featureEnabled} value={settings.enabled ? 'yes' : 'no'} onChange={(event) => updateSettings('enabled', event.target.value === 'yes')} className={fieldClass}><option value="no">No</option><option value="yes">Yes</option></select></label>
                    <label className="grid gap-1 text-xs font-bold uppercase text-slate-500 md:col-span-2">Store name<input disabled={!featureEnabled} value={settings.storeName || ''} onChange={(event) => updateSettings('storeName', event.target.value)} className={fieldClass} /></label>
                    <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">Public slug<input disabled={!featureEnabled} value={settings.slug || ''} onChange={(event) => updateSettings('slug', event.target.value)} className={fieldClass} /></label>
                    <label className="grid gap-1 text-xs font-bold uppercase text-slate-500 md:col-span-2">Tagline<input disabled={!featureEnabled} value={settings.tagline || ''} onChange={(event) => updateSettings('tagline', event.target.value)} className={fieldClass} /></label>
                    <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">Phone<input disabled={!featureEnabled} value={settings.phone || ''} onChange={(event) => updateSettings('phone', event.target.value)} className={fieldClass} /></label>
                    <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">Email<input disabled={!featureEnabled} value={settings.email || ''} onChange={(event) => updateSettings('email', event.target.value)} className={fieldClass} /></label>
                  </div>
                </section>

                <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="m-0 text-lg font-bold">Public link</h2>
                  <p className="mt-1 text-sm text-slate-500">Share this link with customers after the store is live.</p>
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><LinkIcon size={14} /> Store URL</div>
                    <div className="break-all text-sm font-bold text-slate-900">{publicUrl || 'Public link will appear here'}</div>
                  </div>
                  {publicUrl ? <a href={publicUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white no-underline"><ExternalLink size={15} />Open public store</a> : null}
                </aside>
              </form>
            ) : null}

            {activeSection === 'theme' ? (
              <form onSubmit={saveSettings} className="grid gap-5 xl:grid-cols-[1fr_420px]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="m-0 text-lg font-bold">Store theme</h2>
                      <p className="m-0 mt-1 text-sm text-slate-500">Choose the public store look and brand color.</p>
                    </div>
                    <button type="submit" disabled={saving || !featureEnabled} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm disabled:opacity-50"><Save size={15} />Save theme</button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">Theme<select disabled={!featureEnabled} value={settings.theme?.name || 'modern'} onChange={(event) => updateTheme('name', event.target.value)} className={fieldClass}>{themeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">Primary color<input disabled={!featureEnabled} value={settings.theme?.primaryColor || '#2563eb'} onChange={(event) => updateTheme('primaryColor', event.target.value)} className={fieldClass} /></label>
                  </div>
                </section>

                <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="m-0 text-lg font-bold">Preview</h2>
                  <p className="mt-1 text-sm text-slate-500">Quick sample of the color customers will see.</p>
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                    <div className="p-5 text-white" style={{ background: settings.theme?.primaryColor || '#2563eb' }}>
                      <div className="text-xs font-bold uppercase opacity-80">{settings.theme?.name || 'modern'}</div>
                      <div className="mt-2 text-2xl font-bold">{settings.storeName || 'Online Store'}</div>
                    </div>
                    <div className="bg-white p-4">
                      <div className="h-3 w-28 rounded bg-slate-200" />
                      <div className="mt-3 h-9 w-32 rounded-lg" style={{ background: settings.theme?.primaryColor || '#2563eb' }} />
                    </div>
                  </div>
                </aside>
              </form>
            ) : null}

            {activeSection === 'products' ? (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
                  <div>
                    <h2 className="m-0 text-lg font-bold">Products to show online</h2>
                    <p className="m-0 mt-1 text-sm text-slate-500">Choose products and edit customer-facing details.</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{onlineProducts} shown</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950/40">
                        <th className="px-5 py-3 text-left">Product</th>
                        <th className="px-5 py-3 text-left">Online details</th>
                        <th className="px-5 py-3 text-right">Rate</th>
                        <th className="px-5 py-3 text-center">Status</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.slice(0, 30).map((product) => (
                        <tr key={product.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                          <td className="px-5 py-4">
                            <div className="font-bold">{product.name}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">{product.code || product.category || 'Product'}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="max-w-xl">
                              <div className="line-clamp-1 text-sm font-bold text-slate-800 dark:text-slate-100">{product.name || 'No online title'}</div>
                              <div className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{product.description || 'No online description'}</div>
                              {product.imageUrl ? <div className="mt-1 line-clamp-1 text-xs font-semibold text-blue-600">{product.imageUrl}</div> : null}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right font-bold">{money(product.rate)}</td>
                          <td className="px-5 py-4 text-center">
                            <button type="button" disabled={!featureEnabled} onClick={() => toggleProduct(product)} className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold disabled:opacity-50 ${product.showOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {product.showOnline ? <Eye size={14} /> : <EyeOff size={14} />}
                              {product.showOnline ? 'Shown' : 'Hidden'}
                            </button>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button type="button" disabled={!featureEnabled} onClick={() => setEditingProductId(product.id)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white disabled:opacity-50">
                              <Edit3 size={14} /> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {activeSection === 'orders' ? (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                  <h2 className="m-0 text-lg font-bold">Online orders</h2>
                  <p className="m-0 mt-1 text-sm text-slate-500">Confirming reduces stock. Converting creates a GoBook sales invoice.</p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orders.slice(0, 12).map((order) => (
                    <div key={order.id} className="grid gap-3 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{order.orderNo}</strong>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{order.status}</span>
                          {order.invoiceNo ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Invoice {order.invoiceNo}</span> : null}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{order.customerName} - {money(order.grandTotal)}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setViewingOrderId(order.id)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Details</button>
                        {order.status === 'Pending' ? <button type="button" disabled={!featureEnabled} onClick={() => setOrderStatus(order, 'Confirmed')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Confirm & reduce stock</button> : null}
                        {['Pending', 'Confirmed'].includes(order.status) ? <button type="button" disabled={!featureEnabled} onClick={() => setOrderStatus(order, 'Converted')} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Convert to invoice</button> : null}
                        {order.invoiceId ? <button type="button" onClick={() => navigate(`/billing/invoice/${order.invoiceId}/view`)} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">View invoice</button> : null}
                        {order.status !== 'Cancelled' && !order.invoiceId ? <button type="button" disabled={!featureEnabled} onClick={() => setOrderStatus(order, 'Cancelled')} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Cancel</button> : null}
                      </div>
                    </div>
                  ))}
                  {!orders.length ? <div className="p-10 text-center text-sm font-semibold text-slate-500">No online orders yet.</div> : null}
                </div>
              </section>
            ) : null}

            {activeSection === 'reports' ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-5">
                  <h2 className="m-0 text-lg font-bold">Basic online store reports</h2>
                  <p className="m-0 mt-1 text-sm text-slate-500">Simple order and revenue overview for Online Store.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <Stat label="Total orders" value={reports?.totals?.totalOrders || 0} icon={Store} />
                  <Stat label="Revenue" value={money(reports?.totals?.totalRevenue || 0)} icon={ShoppingBag} tone="emerald" />
                  <Stat label="Confirmed" value={reports?.totals?.Confirmed?.count || 0} icon={CheckCircle2} tone="blue" />
                  <Stat label="Cancelled" value={reports?.totals?.Cancelled?.count || 0} icon={ToggleLeft} tone="slate" />
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {editingProduct ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
                <div>
                  <h2 className="m-0 text-xl font-bold">Edit online product</h2>
                  <p className="m-0 mt-1 text-sm font-semibold text-slate-500">{editingProduct.code || editingProduct.category || 'Product'}</p>
                </div>
                <button type="button" onClick={() => setEditingProductId(null)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-4 p-5">
                <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
                  Online title
                  <input disabled={!featureEnabled} value={editingProduct.name || ''} onChange={(event) => updateProductDraft(editingProduct.id, 'name', event.target.value)} className={fieldClass} placeholder="Online title" />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
                  Online description
                  <textarea disabled={!featureEnabled} value={editingProduct.description || ''} onChange={(event) => updateProductDraft(editingProduct.id, 'description', event.target.value)} className="min-h-28 rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="Online description" />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
                  Image URL
                  <input disabled={!featureEnabled} value={editingProduct.imageUrl || ''} onChange={(event) => updateProductDraft(editingProduct.id, 'imageUrl', event.target.value)} className={fieldClass} placeholder="https://..." />
                </label>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
                    Sort order
                    <input disabled={!featureEnabled} type="number" value={editingProduct.sortOrder || 0} onChange={(event) => updateProductDraft(editingProduct.id, 'sortOrder', Number(event.target.value || 0))} className={fieldClass} />
                  </label>
                  <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
                    Online visibility
                    <select disabled={!featureEnabled} value={editingProduct.showOnline ? 'yes' : 'no'} onChange={(event) => updateProductDraft(editingProduct.id, 'showOnline', event.target.value === 'yes')} className={fieldClass}>
                      <option value="yes">Shown</option>
                      <option value="no">Hidden</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
                    Rate
                    <input disabled value={money(editingProduct.rate)} className={fieldClass} />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                <button type="button" onClick={() => setEditingProductId(null)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="button" disabled={!featureEnabled} onClick={() => saveProduct(editingProduct)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm disabled:opacity-50">
                  <Save size={15} /> Save product
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {viewingOrder ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{viewingOrder.status}</span>
                    {viewingOrder.invoiceNo ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Invoice {viewingOrder.invoiceNo}</span> : null}
                  </div>
                  <h2 className="m-0 text-xl font-bold">{viewingOrder.orderNo}</h2>
                  <p className="m-0 mt-1 text-sm font-semibold text-slate-500">{new Date(viewingOrder.createdAt).toLocaleString('en-IN')}</p>
                </div>
                <button type="button" onClick={() => setViewingOrderId(null)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <X size={18} />
                </button>
              </div>

              <div className="grid max-h-[70vh] gap-5 overflow-y-auto p-5 lg:grid-cols-[1fr_320px]">
                <section>
                  <h3 className="m-0 mb-3 text-sm font-bold uppercase text-slate-500">Items</h3>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3 text-left">Product</th>
                          <th className="px-4 py-3 text-right">Qty</th>
                          <th className="px-4 py-3 text-right">Rate</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewingOrder.items || []).map((item) => (
                          <tr key={`${item.productId}-${item.code || item.name}`} className="border-t border-slate-100">
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">{item.code || 'Online product'}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">{item.qty}</td>
                            <td className="px-4 py-3 text-right font-semibold">{money(item.rate)}</td>
                            <td className="px-4 py-3 text-right font-bold">{money(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex justify-between text-sm font-semibold text-slate-600">
                        <span>Subtotal</span>
                        <span>{money(viewingOrder.subtotal)}</span>
                      </div>
                      <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-bold text-slate-950">
                        <span>Total</span>
                        <span>{money(viewingOrder.grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <aside className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="m-0 mb-3 text-sm font-bold uppercase text-slate-500">Customer</h3>
                    <div className="space-y-2 text-sm font-semibold text-slate-700">
                      <div>{viewingOrder.customerName || '-'}</div>
                      <div>{viewingOrder.customerPhone || '-'}</div>
                      <div>{viewingOrder.customerEmail || '-'}</div>
                      <div className="leading-6">{viewingOrder.deliveryAddress || '-'}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="m-0 mb-3 text-sm font-bold uppercase text-slate-500">GoBook status</h3>
                    <div className="space-y-2 text-sm font-semibold text-slate-700">
                      <div>Stock: {viewingOrder.stockReducedAt ? 'Reduced' : 'Not reduced'}</div>
                      <div>Customer: {viewingOrder.customerId ? 'Linked' : 'Not linked'}</div>
                      <div>Invoice: {viewingOrder.invoiceNo || 'Not created'}</div>
                    </div>
                  </div>
                  {viewingOrder.invoiceId ? (
                    <button type="button" onClick={() => navigate(`/billing/invoice/${viewingOrder.invoiceId}/view`)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white">
                      <ExternalLink size={15} /> View sales invoice
                    </button>
                  ) : null}
                </aside>
              </div>

              <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                <button type="button" onClick={() => setViewingOrderId(null)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
