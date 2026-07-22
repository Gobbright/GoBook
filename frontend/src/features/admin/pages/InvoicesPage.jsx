import { useState, useEffect } from 'react';
import { Search, Download, Plus, Edit, Eye } from 'lucide-react';
import { fetchAdminSection } from '../adminService.js';
import { AdminLayout } from '../AdminLayout.jsx';

export function InvoicesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  async function loadData() {
    setLoading(true);
    try {
      const result = await fetchAdminSection('invoices');
      setData(result);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = data?.rows?.filter(row => {
    const matchesSearch = search.toLowerCase() === '' ||
      row.number?.toLowerCase().includes(search.toLowerCase()) ||
      row.customerName?.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = statusFilter === 'all' || row.status === statusFilter;

    return matchesSearch && matchesFilter;
  }) || [];

  const totalAmount = filteredRows.reduce((sum, row) => {
    const amount = parseFloat(row.grandTotal) || 0;
    return sum + amount;
  }, 0);

  if (loading) {
    return <LoadingSpinner text="Loading invoices..." />;
  }

  return (
    <AdminLayout>
      <div className="bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 md:py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">Invoices & Billing</h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">Manage all invoices and billing information</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-1 md:gap-2 hover:bg-blue-700 transition text-xs md:text-sm">
              <Plus size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">New</span>
            </button>
            <button className="px-3 md:px-4 py-2 bg-slate-900 text-white rounded-lg flex items-center gap-1 md:gap-2 hover:bg-slate-800 transition text-xs md:text-sm">
              <Download size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice number or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-7xl mx-auto">
        <StatCard label="Total Invoices" value={data?.count || 0} />
        <StatCard label="Total Amount" value={`₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
        <StatCard label="Issued" value={data?.rows?.filter(r => r.status === 'issued').length || 0} />
        <StatCard label="Paid" value={data?.rows?.filter(r => r.status === 'paid').length || 0} />
      </div>

      {/* Table */}
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {filteredRows.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400">No invoices found</div>
          ) : (
            filteredRows.map((row) => (
              <div key={row.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Invoice Number</p>
                  <p className="font-bold text-slate-900 text-sm mt-1">#{row.number || '—'}</p>
                </div>
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Customer Name</p>
                  <p className="text-sm text-slate-600 mt-1">{row.customerName || '—'}</p>
                </div>
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Document Type</p>
                  <p className="text-sm text-slate-600 mt-1">{row.documentType || '—'}</p>
                </div>
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Amount</p>
                  <p className="font-bold text-slate-900 text-sm mt-1">₹{parseFloat(row.grandTotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                </div>
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={row.status} />
                  </div>
                </div>
                <div className="pb-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Date</p>
                  <p className="text-sm text-slate-600 mt-1">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</p>
                </div>
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button className="flex-1 p-2 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium">
                    <Eye size={14} className="mx-auto" />
                  </button>
                  <button className="flex-1 p-2 text-amber-600 hover:bg-amber-50 rounded text-xs font-medium">
                    <Edit size={14} className="mx-auto" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-hidden">
            <table className="w-full table-fixed [&_td]:break-words [&_th]:break-words [&_td]:whitespace-normal [&_th]:whitespace-normal">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase">Invoice #</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase">Customer</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase">Type</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-slate-600 uppercase">Amount</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase">Date</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-3 text-sm font-semibold text-slate-900">{row.number || '—'}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">{row.customerName || '—'}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">{row.documentType || '—'}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-900 text-right">
                        ₹{parseFloat(row.grandTotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-right flex justify-end gap-2">
                        <button className="p-1 text-blue-600 hover:bg-blue-50 rounded transition">
                          <Eye size={16} />
                        </button>
                        <button className="p-1 text-amber-600 hover:bg-amber-50 rounded transition">
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
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

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-extrabold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    issued: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColors[status] || 'bg-slate-100 text-slate-700'}`}>
      {status || 'unknown'}
    </span>
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


