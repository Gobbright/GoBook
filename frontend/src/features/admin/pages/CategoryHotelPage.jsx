import { useState, useEffect } from 'react';
import { Search, RefreshCw, Download, Eye, Edit, Building2, DoorOpen, Users, Calendar } from 'lucide-react';
import { fetchAdminSection } from '../adminService.js';
import { AdminLayout } from '../AdminLayout.jsx';

export function CategoryHotelPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const result = await fetchAdminSection('warehouses');
      setData(result);
    } catch (err) {
      console.error('Failed to load hotel data:', err);
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
      row.city?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  }) || [];

  if (loading) {
    return <LoadingSpinner text="Loading hotel data..." />;
  }

  return (
    <AdminLayout>
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen">
        {/* Header with Hotel Theme */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 md:px-6 py-4 md:py-6 border-b border-amber-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <div>
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="p-1.5 md:p-2 bg-white/20 rounded-lg">
                  <Building2 size={18} className="md:w-6 md:h-6" />
                </div>
                <h1 className="text-lg md:text-3xl font-extrabold">Hotel Management</h1>
              </div>
              <p className="text-xs md:text-base text-amber-100">Manage properties, rooms, guests, and reservations</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={loadData} className="px-3 md:px-4 py-2 bg-white/20 text-white rounded-lg flex items-center gap-1 md:gap-2 hover:bg-white/30 transition text-xs md:text-sm">
                <RefreshCw size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Refresh</span>
              </button>
              <button className="px-3 md:px-4 py-2 bg-white text-amber-600 rounded-lg flex items-center gap-1 md:gap-2 hover:bg-amber-50 transition font-semibold text-xs md:text-sm">
                <Download size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <QuickStat
            icon={<Building2 size={20} />}
            label="Total Properties"
            value={data?.count || 0}
            color="amber"
          />
          <QuickStat
            icon={<DoorOpen size={20} />}
            label="Available Rooms"
            value={filteredRows.length}
            color="orange"
          />
          <QuickStat
            icon={<Users size={20} />}
            label="Locations"
            value={[...new Set(data?.rows?.map(r => r.city))].length || 0}
            color="yellow"
          />
          <QuickStat
            icon={<Calendar size={20} />}
            label="Bookings"
            value="Active"
            color="amber"
          />
        </div>

        {/* Search & Filter */}
        <div className="px-4 md:px-6 pb-4 md:pb-6">
          <div className="bg-white border border-amber-200 rounded-lg p-3 md:p-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 md:w-4 md:h-4" />
              <input
                type="text"
                placeholder="Search by property name or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-amber-200 rounded-lg text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="px-4 md:px-6 pb-4 md:pb-6">
          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {filteredRows.length === 0 ? (
              <div className="bg-white border border-amber-200 rounded-lg p-6 text-center text-slate-400">No properties found</div>
            ) : (
              filteredRows.map((row) => (
                <div key={row.id} className="bg-white border border-amber-200 rounded-lg p-4 space-y-3">
                  <div className="border-b border-amber-100 pb-3">
                    <p className="text-xs font-bold uppercase text-amber-600">Property Name</p>
                    <p className="font-bold text-slate-900 text-sm mt-1">{row.name || '—'}</p>
                  </div>
                  <div className="border-b border-amber-100 pb-3">
                    <p className="text-xs font-bold uppercase text-amber-600">City</p>
                    <p className="text-sm text-slate-600 mt-1">{row.city || '—'}</p>
                  </div>
                  <div className="border-b border-amber-100 pb-3">
                    <p className="text-xs font-bold uppercase text-amber-600">Property Code</p>
                    <p className="font-mono text-sm text-slate-600 mt-1">{row.code || '—'}</p>
                  </div>
                  <div className="pb-3">
                    <p className="text-xs font-bold uppercase text-amber-600">Status</p>
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
                  <div className="flex gap-2 pt-3 border-t border-amber-100">
                    <button className="flex-1 p-2 text-amber-600 hover:bg-amber-50 rounded text-xs font-medium">
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
          <div className="hidden md:block bg-white border border-amber-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wide">Property Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wide">City</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wide">Property Code</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-amber-900 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No properties found
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-amber-50/50 transition">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{row.city || '—'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{row.code || '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            row.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {row.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right flex justify-end gap-2">
                          <button className="p-1 text-amber-600 hover:bg-amber-50 rounded transition">
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

        {/* Footer Info */}
        <div className="px-4 md:px-6 pb-4 md:pb-6 text-center text-xs md:text-sm text-slate-500">
          Showing {filteredRows.length} of {data?.count || 0} properties
        </div>
      </div>
    </AdminLayout>
  );
}

function QuickStat({ icon, label, value, color }) {
  const colorClass = {
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  }[color] || 'bg-amber-50 border-amber-200 text-amber-700';

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
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full" />
          </div>
          <p className="text-amber-600 font-medium">{text}</p>
        </div>
      </div>
    </AdminLayout>
  );
}
