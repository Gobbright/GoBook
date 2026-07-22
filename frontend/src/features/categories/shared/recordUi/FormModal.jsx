import { useState } from 'react';

export function emptyForm(fields) {
  return Object.fromEntries(fields.map((f) => [f.key, f.default ?? '']));
}

export function FieldInput({ field, value, onChange, lookupOptions }) {
  const common = {
    id: `field-${field.key}`,
    value: value ?? '',
    onChange: (e) => onChange(e.target.value),
    required: !!field.required,
    className: 'w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white',
  };
  if (field.type === 'select') {
    return (
      <select {...common}>
        <option value="">— Select —</option>
        {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return <textarea {...common} rows={field.rows || 2} />;
  }
  if (field.type === 'lookup') {
    const listId = `lookup-${field.key}`;
    const options = lookupOptions?.[field.lookupModule] ?? [];
    return (
      <>
        <input {...common} type="text" list={listId} placeholder={field.placeholder || `Search or type ${field.label.toLowerCase()}...`} autoComplete="off" />
        <datalist id={listId}>
          {options.map((opt) => <option key={opt} value={opt} />)}
        </datalist>
      </>
    );
  }
  return <input {...common} type={field.type || 'text'} />;
}

// Shared add/edit modal shell used across every module-records-backed page —
// keeps the data-entry mechanics (validation, save/cancel, lookup datalists)
// consistent even though each page's outer browsing layout (calendar/board/dashboard) differs.
export function FormModal({ title, fields, initial, lookupOptions, onSubmit, onClose, submitLabel = 'Save' }) {
  const [form, setForm] = useState(() => ({ ...emptyForm(fields), ...(initial || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-130 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#edf2f7]">
          <h3 className="m-0 text-[15px] font-semibold text-[#111827]">{title}</h3>
          <button type="button" onClick={onClose} className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-lg leading-none font-[inherit]">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {fields.map((field) => (
              <div key={field.key} className={`flex flex-col gap-1 ${field.full ? 'sm:col-span-2' : ''}`}>
                <label htmlFor={`field-${field.key}`} className="text-xs text-[#536173] font-medium">
                  {field.label}{field.required && <span className="text-blue-600"> *</span>}
                </label>
                <FieldInput field={field} value={form[field.key]} onChange={(v) => set(field.key, v)} lookupOptions={lookupOptions} />
              </div>
            ))}
          </div>
          {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
              {saving ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
