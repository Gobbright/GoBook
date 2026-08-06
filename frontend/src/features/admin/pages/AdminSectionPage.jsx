import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { safeNavigate } from '../../../routes/navigation.js';
import { Database, Download, Search } from 'lucide-react';

import { AdminLayout } from '../AdminLayout.jsx';
import { fetchAdminSection, isAdminAuthenticated } from '../adminService.js';
import { DataTable } from '../components/DataTable.jsx';

const SECTION_GROUPS = {
  usersBusinesses: {
    title: 'Users & Businesses',
    subtitle: 'All app users, business profiles and business settings from DB',
    sections: ['users', 'businesses', 'businessSettings'],
  },
  customers: {
    title: 'Customers & Vendors',
    subtitle: 'Customer, vendor and lead records from DB',
    sections: ['customers', 'vendors', 'leads', 'followUps'],
  },
  accounting: {
    title: 'Accounting',
    subtitle: 'Ledger, voucher, cash book and bank book records',
    sections: ['ledgerAccounts', 'journalEntries', 'accountingVouchers', 'accountingPostings', 'cashBook', 'bankBook'],
  },
  hr: {
    title: 'HR & Payroll',
    subtitle: 'Employees, attendance, leave and payroll records',
    sections: ['employees', 'attendance', 'leaves', 'payroll', 'documents'],
  },
  inventory: {
    title: 'Inventory & Stock',
    subtitle: 'Products, warehouses, stock-in and stock-out records',
    sections: ['products', 'warehouses', 'stockIns', 'stockOuts'],
  },
  reports: {
    title: 'Reports & Analytics',
    subtitle: 'GST, sales, campaigns and analytics records',
    sections: ['gstr1', 'gstr3b', 'gstReconciliation', 'salesRecords', 'emailCampaigns', 'whatsAppCampaigns'],
  },
};

export function AdminSectionPage({ group }) {
  const navigate = useNavigate();
  const config = SECTION_GROUPS[group] || SECTION_GROUPS.customers;
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function loadData() {
    if (!isAdminAuthenticated()) {
      safeNavigate(navigate, '/admin-login');
      return;
    }

    setLoading(true);
    setError('');
    const results = await Promise.allSettled(config.sections.map((sectionKey) => fetchAdminSection(sectionKey)));
    const loadedSections = results
      .map((result, index) => {
        if (result.status === 'fulfilled') return result.value;
        return {
          key: config.sections[index],
          label: config.sections[index].replace(/([A-Z])/g, ' $1').trim(),
          count: 0,
          fields: ['status'],
          rows: [],
        };
      })
      .filter(Boolean);

    setSections(loadedSections);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [group]);

  const filteredSections = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sections;
    return sections.filter((section) => (
      section.label.toLowerCase().includes(term) ||
      section.fields.some((field) => field.toLowerCase().includes(term)) ||
      section.rows.some((row) => Object.values(row).some((value) => String(value || '').toLowerCase().includes(term)))
    ));
  }, [query, sections]);

  const totalRecords = sections.reduce((sum, section) => sum + (section.count || 0), 0);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100 dark:text-slate-100">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 md:py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <div>
              <h1 data-admin-hide className="m-0 text-lg md:text-2xl font-extrabold text-slate-900 dark:text-slate-100">{config.title}</h1>
              <p data-admin-hide className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">{config.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="px-3 md:px-4 py-2 bg-slate-900 text-white rounded-lg flex items-center gap-1 md:gap-2 hover:bg-slate-800 transition border-0 cursor-pointer text-xs md:text-sm">
                <Download size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 md:p-4">
              <p className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">Total Records</p>
              <p className="m-0 text-lg md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">{totalRecords}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 md:p-4">
              <p className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">DB Modules</p>
              <p className="m-0 text-lg md:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">{sections.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 md:p-4">
              <p className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">Visible Tables</p>
              <p className="m-0 text-lg md:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{filteredSections.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 md:px-4 py-2 md:py-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 md:w-4 md:h-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this page data..."
                className="w-full pl-8 md:pl-9 pr-3 md:pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none"
              />
            </div>
          </div>

          {loading && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
              Loading {config.title.toLowerCase()}...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && filteredSections.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center">
              <Database size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="m-0 text-slate-500 dark:text-slate-400 font-medium">No records found</p>
            </div>
          )}

          {!loading && !error && filteredSections.map((section) => (
            <DataTable key={section.key} section={section} />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}



