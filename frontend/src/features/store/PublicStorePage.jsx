import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Search, ShoppingBag, ShoppingCart, Store, Trash2 } from 'lucide-react';

import { API_BASE_URL } from '../../services/apiBase.js';

const inputClass = 'h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50';

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function ProductImage({ product, className = '' }) {
  if (product?.imageUrl) {
    return <img src={product.imageUrl} alt={product.name} className={`h-full w-full object-cover ${className}`} />;
  }
  return (
    <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 text-slate-400 ${className}`}>
      <ShoppingBag size={42} strokeWidth={1.6} />
    </div>
  );
}

export function PublicStorePage() {
  const { slug, productId } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [productDetail, setProductDetail] = useState(null);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ customerName: '', customerPhone: '', customerEmail: '', deliveryAddress: '', notes: '' });
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState('products');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`${API_BASE_URL}/store/${encodeURIComponent(slug)}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Store is not available');
        if (!active) return;
        setStore(data.store);
        setProducts(data.products || []);
        if (productId) {
          const detailResponse = await fetch(`${API_BASE_URL}/store/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}`);
          const detailData = await detailResponse.json().catch(() => ({}));
          if (detailResponse.ok) setProductDetail(detailData.product);
        } else {
          setProductDetail(null);
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Store is not available');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [slug, productId]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + (Number(item.rate || 0) * Number(item.qty || 1)), 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + Number(item.qty || 0), 0), [cart]);
  const primary = store?.theme?.primaryColor || '#2563eb';
  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return products;
    return products.filter((product) => [product.name, product.description, product.category, product.code].filter(Boolean).join(' ').toLowerCase().includes(search));
  }, [products, query]);

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      return [...current, { ...product, qty: 1 }];
    });
    setMessage('');
    setError('');
  }

  function changeQty(productIdValue, delta) {
    setCart((current) => current
      .map((item) => (item.id === productIdValue ? { ...item, qty: Math.max(1, Number(item.qty || 1) + delta) } : item)));
  }

  function removeFromCart(productIdValue) {
    setCart((current) => current.filter((item) => item.id !== productIdValue));
  }

  async function placeOrder(event) {
    event.preventDefault();
    if (!cart.length) return;
    try {
      setPlacing(true);
      setError('');
      setMessage('');
      const response = await fetch(`${API_BASE_URL}/store/${encodeURIComponent(slug)}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...customer,
          items: cart.map((item) => ({ productId: item.id, qty: item.qty })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Order could not be placed');
      setCart([]);
      setCustomer({ customerName: '', customerPhone: '', customerEmail: '', deliveryAddress: '', notes: '' });
      setMessage(`Order placed successfully. Order No: ${data.order?.orderNo || ''}`);
      setPage('products');
    } catch (orderError) {
      setError(orderError.message || 'Order could not be placed');
    } finally {
      setPlacing(false);
    }
  }

  function updateCustomer(key, value) {
    setCustomer((current) => ({ ...current, [key]: value }));
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 text-sm font-black text-slate-500">Loading store...</main>;
  }

  if (error && !store) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
        <div className="rounded-xl border border-slate-200 bg-white px-8 py-7 shadow-sm">
          <Store className="mx-auto mb-3 text-slate-300" size={34} />
          <h1 className="m-0 text-2xl font-black text-slate-950">Store unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] pt-[77px] text-slate-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm" style={{ background: primary }}>
              <Store size={21} />
            </div>
            <div className="min-w-0">
              <h1 className="m-0 truncate text-xl font-black tracking-normal sm:text-2xl">{store.storeName}</h1>
              <p className="m-0 mt-0.5 text-xs font-semibold text-slate-500 sm:text-sm">{store.tagline || 'Online Store'}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setPage('products')} title="Products" className={`grid h-11 w-11 place-items-center rounded-xl border-0 transition ${page === 'products' ? 'text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`} style={page === 'products' ? { background: primary } : undefined}>
              <ShoppingBag size={18} />
            </button>
            <button type="button" onClick={() => setPage('checkout')} title="Cart" className={`relative grid h-11 w-11 place-items-center rounded-xl border-0 transition ${page === 'checkout' ? 'text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`} style={page === 'checkout' ? { background: primary } : undefined}>
              <ShoppingCart size={18} />
              {itemCount ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">{itemCount}</span> : null}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1720px] px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        {message ? <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">{message}</div> : null}
        {error ? <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">{error}</div> : null}

        {productDetail ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <Link to={`/store/${slug}`} className="inline-flex items-center gap-2 text-sm font-black no-underline" style={{ color: primary }}>
              <ArrowLeft size={16} /> Back to products
            </Link>
            <div className="mt-5 grid gap-6 lg:grid-cols-[420px_1fr]">
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="aspect-square">
                  <ProductImage product={productDetail} />
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <p className="m-0 text-sm font-black text-slate-400">{productDetail.category || productDetail.code || 'Product'}</p>
                <h2 className="m-0 mt-2 text-3xl font-black leading-tight tracking-normal sm:text-4xl">{productDetail.name}</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{productDetail.description || 'Available online'}</p>
                <div className="mt-5 text-3xl font-black">{formatMoney(productDetail.rate)}</div>
                <button type="button" onClick={() => addToCart(productDetail)} className="mt-6 inline-flex h-12 w-fit items-center gap-2 rounded-xl px-5 text-sm font-black text-white shadow-sm" style={{ background: primary }}>
                  <ShoppingCart size={17} /> Add to cart
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {page === 'products' ? <section id="products">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="m-0 text-2xl font-black tracking-normal">Products</h2>
              <p className="m-0 mt-1 text-sm font-medium text-slate-500">{filteredProducts.length} available items</p>
            </div>
            <label className="relative block w-full sm:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <article key={product.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Link to={`/store/${slug}/product/${product.id}`} className="block aspect-[5/4] overflow-hidden no-underline">
                  <ProductImage product={product} className="transition duration-300 group-hover:scale-105" />
                </Link>
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate text-[11px] font-black uppercase text-slate-400">{product.category || product.code || 'Product'}</span>
                    {product.stock > 0 ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700">In stock</span> : null}
                  </div>
                  <Link to={`/store/${slug}/product/${product.id}`} className="line-clamp-2 min-h-12 text-base font-black leading-6 tracking-normal text-slate-950 no-underline">
                    {product.name}
                  </Link>
                  <p className="m-0 mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{product.description || 'Available online'}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <strong className="text-base">{formatMoney(product.rate)}</strong>
                    <button type="button" onClick={() => addToCart(product)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-black text-white shadow-sm transition hover:brightness-95" style={{ background: primary }}>
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!filteredProducts.length ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">No products found.</div> : null}
        </section> : null}

        {page === 'checkout' ? <section id="cart" className="mt-7">
          <button type="button" onClick={() => setPage('products')} className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
            <ArrowLeft size={16} /> Back to products
          </button>
          <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-2xl font-black tracking-normal">Cart</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{itemCount} items</span>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {cart.map((item) => (
                <div key={item.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div>
                    <strong className="line-clamp-1">{item.name}</strong>
                    <div className="mt-1 text-sm font-semibold text-slate-500">{formatMoney(item.rate)}</div>
                  </div>
                  <div className="inline-flex h-10 w-fit items-center rounded-xl border border-slate-200">
                    <button type="button" onClick={() => changeQty(item.id, -1)} className="grid h-10 w-10 place-items-center text-slate-600"><Minus size={15} /></button>
                    <span className="min-w-8 text-center text-sm font-black">{item.qty}</span>
                    <button type="button" onClick={() => changeQty(item.id, 1)} className="grid h-10 w-10 place-items-center text-slate-600"><Plus size={15} /></button>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <strong>{formatMoney(Number(item.rate || 0) * item.qty)}</strong>
                    <button type="button" onClick={() => removeFromCart(item.id)} className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
            {!cart.length ? <p className="mt-4 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-slate-500">Cart is empty.</p> : null}
            <div className="mt-5 flex justify-between rounded-xl bg-slate-950 px-4 py-4 text-lg font-black text-white">
              <span>Total</span>
              <span>{formatMoney(total)}</span>
            </div>
          </div>

          <form onSubmit={placeOrder} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="m-0 text-2xl font-black tracking-normal">Place order</h2>
            <div className="mt-4 grid gap-3">
              <input required value={customer.customerName} onChange={(event) => updateCustomer('customerName', event.target.value)} placeholder="Name" className={inputClass} />
              <input required value={customer.customerPhone} onChange={(event) => updateCustomer('customerPhone', event.target.value)} placeholder="Phone" className={inputClass} />
              <input value={customer.customerEmail} onChange={(event) => updateCustomer('customerEmail', event.target.value)} placeholder="Email optional" className={inputClass} />
              <textarea value={customer.deliveryAddress} onChange={(event) => updateCustomer('deliveryAddress', event.target.value)} placeholder="Address" className="min-h-28 rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
              <textarea value={customer.notes} onChange={(event) => updateCustomer('notes', event.target.value)} placeholder="Notes optional" className="min-h-20 rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
              <button disabled={!cart.length || placing} className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50" style={{ background: primary }}>
                <ShoppingCart size={17} /> {placing ? 'Placing...' : 'Place order'}
              </button>
            </div>
          </form>
          </div>
        </section> : null}
      </section>
    </main>
  );
}
