import { useState, useEffect } from 'react';
import { Search, RefreshCw, Download, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { fetchAdminSection } from '../adminService.js';
import { AdminLayout } from '../AdminLayout.jsx';

export function ProductsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setategoryFilter] = useState('all');

  async function loadData() {
    setLoading(true);
    try {
      const result = await fetchAdminSection('products');
      setData(result);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = data?.rows?.filter(row => {
    const matchesSearch = search.toLowerCase() === '' ||
      row.name?.toLowerCase().includes(search.toLowerCase()) ||
      row.sku?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || row.category === categoryFilter;

    return matchesSearch && matchesCategory;
  }) || [];

  const totalValue = filteredRows.reduce((sum, row) => {
    const stock = parseFloat(row.stock) || 0;
    const price = parseFloat(row.sellingPrice) || 0;
    return sum + (stock * price);
  }, 0);

  const outOfStock = filteredRows.filter(r => (parseFloat(r.stock) || 0) === 0).length;

  if (loading) {
    return <LoadingSpinner text="Loading products..." />;
  }

  return (
    <AdminLayout>
      <div className="bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 md:py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">Products & Inventory</h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">Manage product catalog and stock levels</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-1 md:gap-2 hover:bg-blue-700 transition text-xs md:text-sm">
              <Plus size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Add</span>
            </button>
            <button onClick={loadData} className="px-3 md:px-4 py-2 bg-blue-100 text-blue-600 rounded-lg flex items-center gap-1 md:gap-2 hover:bg-blue-200 transition text-xs md:text-sm">
              <RefreshCw size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Refresh</span>
            </button>
            <button className="px-3 md:px-4 py-2 bg-slate-900 text-white rounded-lg flex items-center gap-1 md:gap-2 hover:bg-slate-800 transition text-xs md:text-sm">
              <Download size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setategoryFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none"
          >
            <option value="all">All Categories</option>
            {[...new Set(data?.rows?.map(r => r.category)?.filter(Boolean))].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Total Products" value={data?.count || 0} />
        <StatCard label="Stock Value" value={`₹${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
        <StatCard label="In Stock" value={filteredRows.filter(r => (parseFloat(r.stock) || 0) > 0).length} />
        <StatCard label="Out of Stock" value={outOfStock} highlight={outOfStock > 0} />
      </div>

      {/* Table */}
      <div className="p-4 md:p-6">
        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {filteredRows.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400">No products found</div>
          ) : (
            filteredRows.map((row) => {
              const stock = parseFloat(row.stock) || 0;
              const isLowStock = stock > 0 && stock < 10;
              const isOutOfStock = stock === 0;

              return (
                <div key={row.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-bold uppercase text-slate-500">Product Name</p>
                    <p className="font-bold text-slate-900 text-sm mt-1">{row.name || '—'}</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-bold uppercase text-slate-500">SKU</p>
                    <p className="font-mono text-sm text-slate-600 mt-1">{row.sku || '—'}</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-bold uppercase text-slate-500">Category</p>
                    <p className="text-sm text-slate-600 mt-1">{row.category || '—'}</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-bold uppercase text-slate-500">Stock Quantity</p>
                    <p className={`text-sm font-bold mt-1 ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-green-600'}`}>{stock}</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-bold uppercase text-slate-500">Selling Price</p>
                    <p className="font-bold text-slate-900 text-sm mt-1">₹{parseFloat(row.sellingPrice || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="pb-3">
                    <p className="text-xs font-bold uppercase text-slate-500">Status</p>
                    <div className="mt-1">
                      {isOutOfStock ? (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 inline-block">Out of Stock</span>
                      ) : isLowStock ? (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 inline-block">Low Stock</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 inline-block">In Stock</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button className="flex-1 p-2 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium">
                      <Eye size={14} className="mx-auto" />
                    </button>
                    <button className="flex-1 p-2 text-amber-600 hover:bg-amber-50 rounded text-xs font-medium">
                      <Edit size={14} className="mx-auto" />
                    </button>
                    <button className="flex-1 p-2 text-red-600 hover:bg-red-50 rounded text-xs font-medium">
                      <Trash2 size={14} className="mx-auto" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Product Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No products found
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const stock = parseFloat(row.stock) || 0;
                    const isLowStock = stock > 0 && stock < 10;
                    const isOutOfStock = stock === 0;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.name || '—'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{row.sku || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{row.category || '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-right">
                          <span className={isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-slate-900'}>
                            {stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">
                          ₹{parseFloat(row.sellingPrice || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {isOutOfStock ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Out of Stock</span>
                          ) : isLowStock ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Low Stock</span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">In Stock</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right flex justify-end gap-2">
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded transition">
                            <Eye size={16} />
                          </button>
                          <button className="p-1 text-amber-600 hover:bg-amber-50 rounded transition">
                            <Edit size={16} />
                          </button>
                          <button className="p-1 text-red-600 hover:bg-red-50 rounded transition">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div className={`border rounded-lg p-4 ${highlight ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
      <p className={`text-sm font-medium ${highlight ? 'text-red-600' : 'text-slate-500'}`}>{label}</p>
      <p className={`text-2xl font-extrabold mt-1 ${highlight ? 'text-red-900' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function LoadingSpinner({ text }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin mb-4">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
        <p className="text-slate-600 font-medium">{text}</p>
      </div>
    </div>
  );
}


