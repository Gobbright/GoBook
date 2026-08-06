import { useState } from 'react';
import { X, IndianRupee } from 'lucide-react';
import { api } from '../../../../../../services/api.js';
import { formatCurrency } from '../../../../../../utils/formatCurrency.js';
import { SelectDropdown } from '../../../../../../components/forms/SelectDropdown.jsx';
import { useFocusTrap } from '../../../../../../hooks/useFocusTrap.js';

const METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Online'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function RecordPaymentModal({ invoice, onClose, onSaved }) {
  const balance = invoice.balance ?? invoice.invoiceTotal ?? 0;

  const [form, setForm] = useState({
    amount:    balance > 0 ? String(balance) : '',
    date:      today(),
    method:    'Cash',
    reference: '',
    notes:     '',
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const modalRef = useFocusTrap({ onClose });

  function set(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    setError('');
  }

  async function handleSave() {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (balance > 0 && amt > balance + 0.01) {
      setError(`Amount cannot be more than balance due (${formatCurrency(balance)})`);
      return;
    }
    setSaving(true);
    try {
      await api.recordPayment(invoice.id, { ...form, amount: amt });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div ref={modalRef} role="dialog" aria-modal="true" className="bg-white rounded-xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2f7]">
          <div>
            <div className="text-[15px] font-700 text-[#111827] font-semibold">Record Payment</div>
            <div className="text-[12px] text-[#6b7280] mt-0.5">Invoice #{invoice.number} · {invoice.customer?.name || invoice.customerName || ''}</div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f3f4f6] text-[#9ca3af] hover:text-[#374151] bg-transparent border-0 cursor-pointer font-[inherit]">
            <X size={16} />
          </button>
        </div>

        {/* Balance info */}
        {balance > 0 && (
          <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-[13px] text-amber-700 font-medium">Balance Due</span>
            <span className="text-[15px] font-bold text-amber-800">{formatCurrency(balance)}</span>
          </div>
        )}

        <div className="mx-6 mt-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-[13px] text-blue-800">
          Allocation: <strong>{invoice.number}</strong>
        </div>

        {/* Form */}
        <div className="px-6 py-4 flex flex-col gap-4">

          {/* Amount */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Amount Received <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"><IndianRupee size={14} /></span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="w-full border border-[#dbe4ef] rounded-lg pl-8 pr-3 py-2 text-[14px] text-[#111827] font-[inherit] outline-none focus:border-blue-500"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Date + Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Payment Date</label>
              <input
                type="date"
                className="w-full border border-[#dbe4ef] rounded-lg px-3 py-2 text-[13px] text-[#111827] font-[inherit] outline-none focus:border-blue-500 bg-white"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Payment Method</label>
              <SelectDropdown
                buttonClassName="w-full border border-[#dbe4ef] rounded-lg px-3 py-2 text-[13px] font-[inherit] outline-none focus:border-blue-500 bg-white"
                value={form.method}
                onChange={(v) => set('method', v)}
                options={METHODS}
              />
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Reference / Transaction No. <span className="text-[#9ca3af] font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="UTR, Cheque no., Transaction ID…"
              className="w-full border border-[#dbe4ef] rounded-lg px-3 py-2 text-[13px] text-[#111827] font-[inherit] outline-none focus:border-blue-500"
              value={form.reference}
              onChange={(e) => set('reference', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Notes <span className="text-[#9ca3af] font-normal">(optional)</span></label>
            <textarea
              rows={2}
              placeholder="Any remarks…"
              className="w-full border border-[#dbe4ef] rounded-lg px-3 py-2 text-[13px] text-[#111827] font-[inherit] outline-none focus:border-blue-500 resize-none"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          {error && <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-[#dbe4ef] text-[13px] text-[#374151] bg-white hover:bg-[#f9fafb] font-[inherit] cursor-pointer font-medium">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 disabled:opacity-60 font-[inherit] cursor-pointer border-0"
          >
            {saving ? 'Saving…' : 'Save Payment'}
          </button>
        </div>

      </div>
    </div>
  );
}
