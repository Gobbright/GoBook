import { useState, useEffect } from 'react';
import { Search, Download, Eye, Edit, AlertCircle, Heart, Users, TrendingUp } from 'lucide-react';
import { fetchAdminSection } from '../adminService.js';
import { AdminLayout } from '../AdminLayout.jsx';

export function CategoryHospitalPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const result = await fetchAdminSection('employees');
      setData(result);
    } catch (err) {
      console.error('Failed to load hospital data:', err);
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
      row.department?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  }) || [];

  if (loading) {
    return <LoadingSpinner text="Loading hospital operations..." />;
  }

  return (
    <AdminLayout>
      <div className="bg-gradient-to-br from-red-50 to-pink-50 min-h-screen">
        {/* Header with Medical Theme */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 md:px-6 py-4 md:py-6 border-b border-red-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <div>
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="p-1.5 md:p-2 bg-white/20 rounded-lg">
                  <Heart size={18} className="md:w-6 md:h-6" />
                </div>
                <h1 className="text-lg md:text-3xl font-extrabold">Hospital Operations</h1>
              </div>
              <p className="text-xs md:text-base text-red-100">Manage medical facilities, staff, and patient care</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="px-3 md:px-4 py-2 bg-white text-red-600 rounded-lg flex items-center gap-1 md:gap-2 hover:bg-red-50 transition font-semibold text-xs md:text-sm">
                <Download size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-7xl mx-auto">
          <QuickStat
            icon={<Users size={20} />}
            label="Total Staff"
            value={data?.count || 0}
            color="red"
          />
          <QuickStat
            icon={<Heart size={20} />}
            label="Doctors"
            value={filteredRows.filter(r => r.designation === 'Doctor').length}
            color="pink"
          />
          <QuickStat
            icon={<TrendingUp size={20} />}
            label="Departments"
            value={[...new Set(data?.rows?.map(r => r.department))].length || 0}
            color="orange"
          />
          <QuickStat
            icon={<AlertCircle size={20} />}
            label="Status"
            value="Operational"
            color="red"
          />
        </div>

        {/* Search & Filter */}
        <div className="px-4 md:px-6 pb-4 md:pb-6 max-w-7xl mx-auto">
          <div className="bg-white border border-red-200 rounded-lg p-3 md:p-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 md:w-4 md:h-4" />
              <input
                type="text"
                placeholder="Search by staff name or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-red-200 rounded-lg text-sm focus:border-red-400 focus:ring-4 focus:ring-red-500/10 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="px-4 md:px-6 pb-4 md:pb-6 max-w-7xl mx-auto">
          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {filteredRows.length === 0 ? (
              <div className="bg-white border border-red-200 rounded-lg p-6 text-center text-slate-400">No staff members found</div>
            ) : (
              filteredRows.map((row) => (
                <div key={row.id} className="bg-white border border-red-200 rounded-lg p-4 space-y-3">
                  <div className="border-b border-red-100 pb-3">
                    <p className="text-xs font-bold uppercase text-red-600">Staff Name</p>
                    <p className="font-bold text-slate-900 text-sm mt-1">{row.name || '—'}</p>
                  </div>
                  <div className="border-b border-red-100 pb-3">
                    <p className="text-xs font-bold uppercase text-red-600">Department</p>
                    <p className="text-sm text-slate-600 mt-1">{row.department || '—'}</p>
                  </div>
                  <div className="border-b border-red-100 pb-3">
                    <p className="text-xs font-bold uppercase text-red-600">Designation</p>
                    <div className="mt-1">
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 inline-block">
                        {row.designation || 'Staff'}
                      </span>
                    </div>
                  </div>
                  <div className="pb-3">
                    <p className="text-xs font-bold uppercase text-red-600">Status</p>
                    <div className="mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold inline-block ${
                        row.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {row.status || 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-red-100">
                    <button className="flex-1 p-2 text-red-600 hover:bg-red-50 rounded text-xs font-medium">
                      <Eye size={14} className="mx-auto" />
                    </button>
                    <button className="flex-1 p-2 text-red-600 hover:bg-red-50 rounded text-xs font-medium">
                      <Edit size={14} className="mx-auto" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block bg-white border border-red-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-hidden">
              <table className="w-full table-fixed [&_td]:break-words [&_th]:break-words [&_td]:whitespace-normal [&_th]:whitespace-normal">
                <thead className="bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-bold text-red-900 uppercase tracking-wide">Staff Name</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-red-900 uppercase tracking-wide">Department</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-red-900 uppercase tracking-wide">Designation</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-red-900 uppercase tracking-wide">Status</th>
                    <th className="px-3 py-3 text-right text-xs font-bold text-red-900 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                        No staff members found
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-red-50/50 transition">
                        <td className="px-3 py-3 text-sm font-semibold text-slate-900">{row.name || '—'}</td>
                        <td className="px-3 py-3 text-sm text-slate-600">{row.department || '—'}</td>
                        <td className="px-3 py-3 text-sm">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            {row.designation || 'Staff'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            row.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {row.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-right flex justify-end gap-2">
                          <button className="p-1 text-red-600 hover:bg-red-50 rounded transition">
                            <Eye size={16} />
                          </button>
                          <button className="p-1 text-red-600 hover:bg-red-50 rounded transition">
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

        {/* Footer Info */}
        <div className="px-4 md:px-6 pb-4 md:pb-6 text-center text-xs md:text-sm text-slate-500 max-w-7xl mx-auto">
          Showing {filteredRows.length} of {data?.count || 0} staff members
        </div>
      </div>
    </AdminLayout>
  );
}

function QuickStat({ icon, label, value, color }) {
  const colorClass = {
    red: 'bg-red-50 border-red-200 text-red-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  }[color] || 'bg-red-50 border-red-200 text-red-700';

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
      <div className="bg-gradient-to-br from-red-50 to-pink-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full" />
          </div>
          <p className="text-red-600 font-medium">{text}</p>
        </div>
      </div>
    </AdminLayout>
  );
}
