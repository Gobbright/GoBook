import { useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { DataTable } from '../../../components/common/DataTable.jsx';
import { PageHeader } from '../../../components/common/PageHeader.jsx';
import { useLoad } from '../../../hooks/useLoad.js';
import { payrollService } from '../../../services/payrollService.js';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function SalaryEditor({ record, onClose, onSaved }) {
  const [form, setForm] = useState({
    basic: String(record.basic ?? 0),
    allowances: String(record.allowances ?? 0),
    deductions: String(record.deductions ?? 0),
    status: record.status || 'Pending',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const net = Math.max(0, Number(form.basic || 0) + Number(form.allowances || 0) - Number(form.deductions || 0));

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    const payload = {
      basic: Number(form.basic),
      allowances: Number(form.allowances),
      deductions: Number(form.deductions),
      status: form.status,
    };
    if (Object.values(payload).slice(0, 3).some((value) => !Number.isFinite(value) || value < 0)) {
      setError('Enter valid non-negative salary amounts');
      return;
    }
    setSaving(true);
    try {
      const saved = await payrollService.update(record._id, payload);
      onSaved(saved);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="employee-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="employee-modal" role="dialog" aria-modal="true" aria-labelledby="salary-editor-title">
        <div className="employee-modal-head">
          <div>
            <h2 id="salary-editor-title">Edit Salary</h2>
            <p>{record.name} - {record.employeeId} - {record.month}</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close salary editor" title="Close"><X size={18} /></button>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <div className="field"><label htmlFor="salary-basic">Basic Salary</label><input id="salary-basic" type="number" min="0" step="1" value={form.basic} onChange={(event) => update('basic', event.target.value)} required /></div>
          <div className="field"><label htmlFor="salary-allowances">Allowances</label><input id="salary-allowances" type="number" min="0" step="1" value={form.allowances} onChange={(event) => update('allowances', event.target.value)} required /></div>
          <div className="field"><label htmlFor="salary-deductions">Deductions</label><input id="salary-deductions" type="number" min="0" step="1" value={form.deductions} onChange={(event) => update('deductions', event.target.value)} required /></div>
          <div className="field"><label htmlFor="salary-status">Status</label><select id="salary-status" value={form.status} onChange={(event) => update('status', event.target.value)}><option value="Pending">Pending</option><option value="Paid">Paid</option></select></div>
          <div className="salary-net field-full"><span>Net Salary</span><strong>{money.format(net)}</strong></div>
          {error && <p className="error field-full">{error}</p>}
          <div className="employee-modal-actions field-full"><button className="btn" type="button" onClick={onClose}>Cancel</button><button className="btn primary" type="submit" disabled={saving}><Save size={15} />{saving ? 'Saving...' : 'Save Salary'}</button></div>
        </form>
      </section>
    </div>
  );
}

export default function Salary() {
  const { data, loading, error, setData } = useLoad(payrollService.adminPayroll, []);
  const [editing, setEditing] = useState(null);
  const columns = [
    { key: 'month', label: 'Month' },
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'name', label: 'Name' },
    { key: 'basic', label: 'Basic', render: (row) => money.format(row.basic || 0) },
    { key: 'allowances', label: 'Allowances', render: (row) => money.format(row.allowances || 0) },
    { key: 'deductions', label: 'Deductions', render: (row) => money.format(row.deductions || 0) },
    { key: 'net', label: 'Net', render: (row) => money.format(row.net || 0) },
    { key: 'status', label: 'Status' },
  ];

  function handleSaved(saved) {
    setData((current) => ({
      ...current,
      data: (current?.data || []).map((record) => record._id === saved._id ? saved : record),
    }));
    setEditing(null);
  }

  return (
    <>
      {editing && <SalaryEditor record={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
      <PageHeader title="Payroll Salary" subtitle="Review and edit employee salary records" />
      {error && <p className="error">{error}</p>}
      {loading ? <div className="card">Loading...</div> : (
        <DataTable
          columns={columns}
          rows={data?.data || []}
          empty="No payroll records found"
          actions={(record) => <button className="icon-btn" type="button" title="Edit" aria-label="Edit salary" onClick={() => setEditing(record)}><Pencil size={15} /></button>}
        />
      )}
    </>
  );
}