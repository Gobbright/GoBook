import { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import { fetchAdminSection } from '../adminService.js';
import { AdminLayout } from '../AdminLayout.jsx';
import { DataTable } from '../components/DataTable.jsx';

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
      setError(err.message || 'Failed to load users');
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

  const tableSection = {
    key: 'users-management',
    sourceKey: 'users',
    label: 'All Users',
    count: filteredRows.length,
    fields: ['name', 'email', 'phone', 'businessName', 'category', 'subscriptionPlan', 'subscriptionAmount', 'status', 'createdAt', 'lastLogin'],
    rows: filteredRows,
  };

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
        <DataTable section={tableSection} onChanged={loadData} />
      </div>
      </div>
    </AdminLayout>
  );
}







