import { useState, useEffect } from 'react';
import { Search, Download, Eye, Edit, Settings, BarChart3, IndianRupee, Package, Users } from 'lucide-react';
import { fetchAdminSection } from '../adminService.js';
import { AdminLayout } from '../AdminLayout.jsx';

export function CategoryBusinessPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const result = await fetchAdminSection('businesses');
      setData(result);
    } catch (err) {
      console.error('Failed to load businesses:', err);
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
      row.category?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  }) || [];

  if (loading) {
    return <LoadingSpinner text="Loading business data..." />;
  }

  return (
    <AdminLayout>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
        {/* Header with Brand Color */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 md:px-6 py-4 md:py-6 border-b border-blue-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <div>
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="p-1.5 md:p-2 bg-white/20 rounded-lg">
                  <BarChart3 size={18} className="md:w-6 md:h-6" />
                </div>
                <h1 className="text-lg md:text-3xl font-extrabold">Business Management</h1>
              </div>
              <p className="text-xs md:text-base text-blue-100">Manage all retail businesses and commerce operations</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="px-3 md:px-4 py-2 bg-white text-blue-600 rounded-lg flex items-center gap-1 md:gap-2 hover:bg-blue-50 transition font-semibold text-xs md:text-sm">
                <Download size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-7xl mx-auto">
          <QuickStat
            icon={<Package size={20} />}
            label="Total Businesses"
            value={data?.count || 0}
            color="blue"
          />
          <QuickStat
            icon={<Users size={20} />}
            label="Active"
            value={filteredRows.length}
            color="green"
          />
          <QuickStat
            icon={<IndianRupee size={20} />}
            label="Categories"
            value={[...new Set(data?.rows?.map(r => r.category))].length || 0}
            color="purple"
          />
          <QuickStat
            icon={<Settings size={20} />}
            label="Configurations"
            value="Complete"
            color="indigo"
          />
        </div>

        {/* Search & Filter */}
        <div className="px-4 md:px-6 pb-4 md:pb-6 max-w-7xl mx-auto">
          <div className="bg-white border border-blue-200 rounded-lg p-3 md:p-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 md:w-4 md:h-4" />
              <input
                type="text"
                placeholder="Search by business name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-blue-200 rounded-lg text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="px-4 md:px-6 pb-4 md:pb-6 max-w-7xl mx-auto">
          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {filteredRows.length === 0 ? (
              <div className="bg-white border border-blue-200 rounded-lg p-6 text-center text-slate-400">No businesses found</div>
            ) : (
              filteredRows.map((row) => (
                <div key={row.id} className="bg-white border border-blue-200 rounded-lg p-4 space-y-3">
                  <div className="border-b border-blue-100 pb-3">
                    <p className="text-xs font-bold uppercase text-blue-600">Business Name</p>
                    <p className="font-bold text-slate-900 text-sm mt-1">{row.name || '—'}</p>
                  </div>
                  <div className="border-b border-blue-100 pb-3">
                    <p className="text-xs font-bold uppercase text-blue-600">Category</p>
                    <div className="mt-1">
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 inline-block">
                        {row.category || 'Retail'}
                      </span>
                    </div>
                  </div>
                  <div className="pb-3">
                    <p className="text-xs font-bold uppercase text-blue-600">Created Date</p>
                    <p className="text-sm text-slate-600 mt-1">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</p>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-blue-100">
                    <button className="flex-1 p-2 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium">
                      <Eye size={14} className="mx-auto" />
                    </button>
                    <button className="flex-1 p-2 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium">
                      <Edit size={14} className="mx-auto" />
                    </button>
                    <button className="flex-1 p-2 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium">
                      <Settings size={14} className="mx-auto" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block bg-white border border-blue-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-hidden">
              <table className="w-full table-fixed [&_td]:break-words [&_th]:break-words [&_td]:whitespace-normal [&_th]:whitespace-normal">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-bold text-blue-900 uppercase tracking-wide">Business Name</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-blue-900 uppercase tracking-wide">Category</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-blue-900 uppercase tracking-wide">Created Date</th>
                    <th className="px-3 py-3 text-right text-xs font-bold text-blue-900 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                        No businesses found
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-blue-50/50 transition">
                        <td className="px-3 py-3 text-sm font-semibold text-slate-900">{row.name || '—'}</td>
                        <td className="px-3 py-3 text-sm">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                            {row.category || 'Retail'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600">
                          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-right flex justify-end gap-2">
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded transition">
                            <Eye size={16} />
                          </button>
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded transition">
                            <Edit size={16} />
                          </button>
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded transition">
                            <Settings size={16} />
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

        {/* Footer Info */}
        <div className="px-6 pb-6 text-center text-sm text-slate-500 max-w-7xl mx-auto">
          Showing {filteredRows.length} of {data?.count || 0} businesses
        </div>
      </div>
    </AdminLayout>
  );
}

function QuickStat({ icon, label, value, color }) {
  const colorClass = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  }[color] || 'bg-blue-50 border-blue-200 text-blue-700';

  return (
    <div className={`border rounded-lg p-4 ${colorClass}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/50 rounded-lg">
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold opacity-75">{label}</p>
          <p className="text-2xl font-extrabold mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner({ text }) {
  return (
    <AdminLayout>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full" />
          </div>
          <p className="text-blue-600 font-medium">{text}</p>
        </div>
      </div>
    </AdminLayout>
  );
}
