import { useMemo, useState } from 'react';
import { Edit3, Eye, EyeOff, FileSpreadsheet, FileText, Search, Trash2, X } from 'lucide-react';

import { deleteAdminTableRow, updateAdminTableRow } from '../adminService.js';
import { SelectDropdown } from '../../../components/forms/SelectDropdown.jsx';

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return String(value.name || value.email || value.id || value._id || JSON.stringify(value)).substring(0, 80);
  return String(value);
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return parsed.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function titleize(field) {
  return field.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()).trim();
}

function getSourceKey(section) {
  if (section.sourceKey) return section.sourceKey;
  if (section.key?.startsWith('users-')) return 'users';
  if (section.key?.startsWith('subscription-')) return section.key.endsWith('history') ? 'payments' : 'users';
  if (section.key?.startsWith('user-details-')) return section.key.endsWith('payments') ? 'payments' : 'users';
  return section.key || '';
}

function downloadFile(name, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}


const FIELD_BASE_CLASS = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const SELECT_BASE_CLASS = `${FIELD_BASE_CLASS} cursor-pointer`;
const STATUS_OPTIONS = ['Active', 'Inactive', 'Trial', 'Expired', 'Blocked', 'Deleted', 'Pending', 'Successful', 'Failed', 'Scheduled', 'Ready', 'Draft', 'Enabled', 'Disabled'];

function isDateField(field) {
  return /date|expiry|expires|createdat|updatedat/i.test(field);
}

function isNumberField(field) {
  return /amount|price|stock|count|days|period|total|revenue|number|qty|quantity/i.test(field);
}

function toDateInputValue(value) {
  if (!value) return '';
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(String(value))) return String(value);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

export function DataTable({ section, onChanged, rowActions }) {
  const sourceKey = getSourceKey(section);
  const allFields = section.fields || [];
  const isUsersTable = sourceKey === 'users';
  const viewFields = section.viewFields || (isUsersTable ? Array.from(new Set(['id', ...allFields, 'role', 'authProvider', 'updatedAt', 'lastLogin', 'password'])) : allFields);
  const editFields = isUsersTable ? Array.from(new Set(['name', 'email', 'password', 'phone', 'businessName', 'category', 'role', 'subscriptionPlan', 'subscriptionAmount', 'status', ...allFields.filter((field) => !['id', 'createdAt', 'updatedAt', 'lastLogin', 'authProvider'].includes(field))])) : allFields;
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [viewingRow, setViewingRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const statusValues = useMemo(() => {
    const values = new Set((section.rows || []).map((row) => row.status).filter(Boolean).map(String));
    return ['all', ...Array.from(values)];
  }, [section.rows]);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (section.rows || []).filter((row) => {
      const matchesStatus = statusFilter === 'all' || String(row.status || '').toLowerCase() === statusFilter.toLowerCase();
      const matchesSearch = !term || Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [query, section.rows, statusFilter]);

  function exportExcel() {
    const csv = [allFields.map(titleize).map(escapeCsv).join(',')]
      .concat(rows.map((row) => allFields.map((field) => escapeCsv(formatValue(row[field]))).join(',')))
      .join('\n');
    downloadFile(`${section.label || 'admin-data'}.csv`, 'text/csv;charset=utf-8', csv);
  }

  function exportPdf() {
    const html = `
      <html><head><title>${section.label}</title><style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111827} h1{font-size:20px}
        table{border-collapse:collapse;width:100%;font-size:11px} th,td{border:1px solid #d1d5db;padding:6px;text-align:left} th{background:#f3f4f6}
      </style></head><body><h1>${section.label}</h1><table><thead><tr>${allFields.map((field) => `<th>${titleize(field)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${allFields.map((field) => `<td>${formatValue(row[field])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  function openView(row) {
    setActionError('');
    setViewingRow(row);
  }

  function openEdit(row) {
    setActionError('');
    setEditingRow(row);
    setShowPassword(false);
    setForm({ ...Object.fromEntries(allFields.map((field) => [field, row[field] ?? ''])), ...(isUsersTable ? { password: '' } : {}) });
  }

  async function saveEdit() {
    if (!editingRow?.id || !sourceKey) return;
    setSaving(true);
    setActionError('');
    try {
      const payload = { ...form };
      if (isUsersTable && !String(payload.password || '').trim()) delete payload.password;
      await updateAdminTableRow(sourceKey, editingRow.id, payload);
      setEditingRow(null);
      await onChanged?.();
    } catch (err) {
      setActionError(err.message || 'Unable to update record');
    } finally {
      setSaving(false);
    }
  }


  function renderEditField(field) {
    const value = form[field] ?? '';
    const label = titleize(field);
    const updateField = (nextValue) => setForm((current) => ({ ...current, [field]: nextValue }));

    if (isUsersTable && field === 'password') {
      return (
        <label key={field} className="text-sm font-semibold text-slate-600 dark:text-slate-300 md:col-span-2">
          New / Reset Password
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              value={value}
              onChange={(event) => updateField(event.target.value)}
              className={`${FIELD_BASE_CLASS} pr-11`}
              placeholder="Enter new password to update"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border-0 bg-transparent p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <span className="mt-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">Current password cannot be viewed because it is encrypted. Type a new password here to reset it.</span>
        </label>
      );
    }
    if (/status/i.test(field)) {
      const options = Array.from(new Set([...STATUS_OPTIONS, ...statusValues.filter((status) => status !== 'all')])).filter(Boolean);
      return (
        <label key={field} className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {label}
          <div className="mt-1">
            <SelectDropdown value={value} onChange={updateField} options={options} />
          </div>
        </label>
      );
    }

    if (isDateField(field)) {
      return (
        <label key={field} className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {label}
          <input type="date" value={toDateInputValue(value)} onChange={(event) => updateField(event.target.value)} className={FIELD_BASE_CLASS} />
        </label>
      );
    }

    return (
      <label key={field} className="text-sm font-semibold text-slate-600 dark:text-slate-300">
        {label}
        <input type={isNumberField(field) ? 'number' : 'text'} value={value} onChange={(event) => updateField(event.target.value)} className={FIELD_BASE_CLASS} />
      </label>
    );
  }
  async function confirmDelete() {
    if (!deleteRow?.id || !sourceKey) return;
    setSaving(true);
    setActionError('');
    try {
      await deleteAdminTableRow(sourceKey, deleteRow.id);
      setDeleteRow(null);
      await onChanged?.();
    } catch (err) {
      setActionError(err.message || 'Unable to delete record');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <div className="px-3 sm:px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 bg-slate-50 dark:bg-slate-800">
        <div>
          <h3 className="m-0 text-[14px] font-extrabold text-slate-900 dark:text-slate-100">{section.label}</h3>
          <p className="m-0 text-[11px] text-slate-500 dark:text-slate-400 mt-1">{section.count?.toLocaleString?.() || rows.length} total records - Showing {rows.length.toLocaleString()}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(220px,1fr)_140px_auto_auto] gap-2 sm:items-center w-full xl:w-auto">
          <div className="relative min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search table..." className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
          </div>
          <SelectDropdown
            className="w-40 flex-none"
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusValues.map((status) => ({ value: status, label: status === 'all' ? 'All Filter' : status }))}
          />
          <button onClick={exportPdf} className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold inline-flex items-center justify-center gap-2"><FileText size={15} /> PDF</button>
          <button onClick={exportExcel} className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold inline-flex items-center justify-center gap-2"><FileSpreadsheet size={15} /> Excel</button>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-3 p-3">
        {rows.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center text-slate-400 text-[13px]">No records found</div>
        ) : (
          rows.map((row, index) => (
              <div key={row.id || index} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                {allFields.map((field, fieldIndex) => (
              <div key={field} className={fieldIndex < allFields.length - 1 ? 'border-b border-slate-200 dark:border-slate-700 pb-3' : 'pb-0'}>
                <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{titleize(field)}</p>
                <p className="text-[13px] text-slate-700 dark:text-slate-300 mt-1 break-all">
                  {field.toLowerCase().includes('date') ? formatDate(row[field]) : formatValue(row[field])}
                </p>
              </div>
            ))}
                <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button onClick={() => openView(row)} className="flex-1 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md border-0 bg-transparent cursor-pointer text-[12px] font-bold" title="View">
                    <Eye size={14} className="mx-auto" />
                  </button>
                  {rowActions?.(row, 'mobile')}
                  {!section.readOnly && <button onClick={() => openEdit(row)} className="flex-1 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md border-0 bg-transparent cursor-pointer text-[12px] font-bold" title="Edit">
                    <Edit3 size={14} className="mx-auto" />
                  </button>}
                  {!section.readOnly && <button onClick={() => { setActionError(''); setDeleteRow(row); }} className="flex-1 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 rounded-md border-0 bg-transparent cursor-pointer text-[12px] font-bold" title="Delete">
                    <Trash2 size={14} className="mx-auto" />
                  </button>}
                </div>
              </div>
            )
          )
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-hidden">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                {allFields.map((field) => <th key={field} className="px-3 py-3 text-left text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide break-words">{titleize(field)}</th>)}
                <th className={`${rowActions ? 'w-48' : 'w-28'} px-3 py-3 text-right text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length === 0 ? (
                <tr><td colSpan={allFields.length + 1} className="px-6 py-8 text-center text-slate-400 text-[13px]">No records found</td></tr>
              ) : (
                rows.map((row, index) => (
                    <tr key={row.id || index} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors">
                      {allFields.map((field) => <td key={field} className="px-3 py-3 text-[12px] text-slate-700 dark:text-slate-300 break-words align-top" title={String(row[field] ?? '')}>{field.toLowerCase().includes('date') ? formatDate(row[field]) : formatValue(row[field])}</td>)}
                      <td className={`${rowActions ? 'w-48' : 'w-28'} px-3 py-3 text-right align-top bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800`}>
                        <button onClick={() => openView(row)} className="p-1.5 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md border-0 bg-transparent cursor-pointer" title="View"><Eye size={16} /></button>
                        {rowActions?.(row, 'desktop')}
                        {!section.readOnly && <button onClick={() => openEdit(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md border-0 bg-transparent cursor-pointer" title="Edit"><Edit3 size={16} /></button>}
                        {!section.readOnly && <button onClick={() => { setActionError(''); setDeleteRow(row); }} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-md border-0 bg-transparent cursor-pointer" title="Delete"><Trash2 size={16} /></button>}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingRow && (
        <Modal title={`View ${section.label}`} onClose={() => setViewingRow(null)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {viewFields.map((field) => (
              <div key={field} className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2">
                <p className="m-0 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{titleize(field)}</p>
                <p className="m-0 mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100 break-words">{field === 'password' ? 'Encrypted - reset from Edit User' : field.toLowerCase().includes('date') ? formatDate(viewingRow[field]) : formatValue(viewingRow[field])}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {editingRow && (
        <Modal title={`Edit ${section.label}`} onClose={() => setEditingRow(null)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {editFields.map(renderEditField)}
          </div>
          {actionError && <p className="text-sm font-bold text-red-600">{actionError}</p>}
          <div className="flex justify-end gap-2 mt-4"><button onClick={() => setEditingRow(null)} className="px-4 py-2 rounded-md border">Cancel</button><button onClick={saveEdit} disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 text-white border-0">{saving ? 'Saving...' : 'Confirm & Save'}</button></div>
        </Modal>
      )}

      {deleteRow && (
        <Modal title="Confirm Delete" onClose={() => setDeleteRow(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-300">Are you sure you want to delete this record? Confirm panna apram DB-la delete aagum.</p>
          {actionError && <p className="text-sm font-bold text-red-600">{actionError}</p>}
          <div className="flex justify-end gap-2 mt-4"><button onClick={() => setDeleteRow(null)} className="px-4 py-2 rounded-md border">Cancel</button><button onClick={confirmDelete} disabled={saving} className="px-4 py-2 rounded-md bg-red-600 text-white border-0">{saving ? 'Deleting...' : 'Confirm Delete'}</button></div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-full max-w-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-4"><h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-slate-100">{title}</h3><button onClick={onClose} className="p-2 rounded-md border-0 bg-transparent"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

