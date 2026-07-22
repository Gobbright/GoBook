import { useState, useEffect } from 'react';
import { Search, Download, Edit, Trash2, Eye } from 'lucide-react';
import { fetchAdminSection } from '../adminService.js';
import { AdminLayout } from '../AdminLayout.jsx';

export function UsersManagementPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAdminSection('users');
      setData(result);
    } catch (err) {
      console.error('Failed to load users:', err);
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
      row.email?.toLowerCase().includes(search.toLowerCase());

    const status = String(row.status || '').toLowerCase();
    const matchesFilter = filter === 'all' || (filter === 'inactive' ? status !== 'active' : status === filter);

    return matchesSearch && matchesFilter;
  }) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full" />
          </div>
          <p className="text-slate-600 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 md:py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">Users & Businesses</h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">Manage all user accounts and business data</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="px-3 md:px-4 py-2 bg-slate-900 text-white rounded-lg flex items-center gap-2 hover:bg-slate-800 transition text-xs md:text-sm">
              <Download size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none"
          >
            <option value="all">All Users</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive / Restricted</option>
            <option value="blocked">Blocked</option>
            <option value="expired">Expired</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 max-w-6xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-lg p-4 md:p-5">
          <p className="text-xs md:text-sm text-slate-500 font-medium">Total Users</p>
          <p className="text-xl md:text-2xl font-extrabold text-slate-900 mt-2">{data?.count || 0}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 md:p-5">
          <p className="text-xs md:text-sm text-slate-500 font-medium">Active</p>
          <p className="text-xl md:text-2xl font-extrabold text-green-600 mt-2">
            {data?.rows?.filter(r => String(r.status || '').toLowerCase() === 'active').length || 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 md:p-5">
          <p className="text-xs md:text-sm text-slate-500 font-medium">Inactive</p>
          <p className="text-xl md:text-2xl font-extrabold text-red-600 mt-2">
            {data?.rows?.filter(r => String(r.status || '').toLowerCase() !== 'active').length || 0}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {filteredRows.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400">No users found</div>
          ) : (
            filteredRows.map((row) => (
              <div key={row.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Name</p>
                  <p className="font-bold text-slate-900 text-sm mt-1">{row.name || '—'}</p>
                </div>
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Email</p>
                  <p className="text-sm text-slate-600 mt-1 break-all">{row.email || '—'}</p>
                </div>
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Business Name</p>
                  <p className="text-sm text-slate-600 mt-1">{row.businessName || '—'}</p>
                </div>
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Status</p>
                  <div className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold inline-block ${
                      String(row.status || '').toLowerCase() === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {row.status || 'inactive'}
                    </span>
                  </div>
                </div>
                <div className="pb-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Last Login</p>
                  <p className="text-sm text-slate-600 mt-1">{row.lastLogin ? new Date(row.lastLogin).toLocaleDateString() : '—'}</p>
                </div>
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button className="flex-1 p-2 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium" title="View">
                    <Eye size={14} className="mx-auto" />
                  </button>
                  <button className="flex-1 p-2 text-amber-600 hover:bg-amber-50 rounded text-xs font-medium" title="Edit">
                    <Edit size={14} className="mx-auto" />
                  </button>
                  <button className="flex-1 p-2 text-red-600 hover:bg-red-50 rounded text-xs font-medium" title="Delete">
                    <Trash2 size={14} className="mx-auto" />
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
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Name</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Email</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Business</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Last Login</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-3 text-sm font-medium text-slate-900">{row.name || '—'}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">{row.email || '—'}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">{row.businessName || '—'}</td>
                      <td className="px-3 py-3 text-sm">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          String(row.status || '').toLowerCase() === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {row.status || 'inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {row.lastLogin ? new Date(row.lastLogin).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-right flex justify-end gap-2">
                        <button className="p-1 text-blue-600 hover:bg-blue-50 rounded transition" title="View">
                          <Eye size={16} />
                        </button>
                        <button className="p-1 text-amber-600 hover:bg-amber-50 rounded transition" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button className="p-1 text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                          <Trash2 size={16} />
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







