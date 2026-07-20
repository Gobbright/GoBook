import { useState } from 'react';
import { X } from 'lucide-react';
import { formatCurrency } from '../../../../../../utils/formatCurrency.js';
import { api } from '../../../../../../services/api.js';
import { useFocusTrap } from '../../../../../../hooks/useFocusTrap.js';

const WA_ICON = (
  <svg fill="currentColor" height="15" viewBox="0 0 24 24" width="15">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export function ShareModal({ doc, onClose }) {
  const [emailTo, setEmailTo] = useState(doc.customer?.email || '');
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState(null);

  const modalRef = useFocusTrap({ onClose });

  const phone   = (doc.customer?.phone || '').replace(/\D/g, '');
  const total   = doc.total ?? doc.grandTotal ?? 0;
  const message = `Hi ${doc.customer?.name || 'Customer'}, your document ${doc.number} for ${formatCurrency(total)} is ready. Thank you for your business!`;

  function handleWhatsApp() {
    const num = phone ? `91${phone.slice(-10)}` : '';
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  async function handleEmail() {
    if (!emailTo.trim()) return;
    setSending(true);
    setResult(null);
    try {
      await api.sendInvoiceEmail(doc.id, { toEmail: emailTo.trim() });
      setResult({ ok: true, msg: `Sent to ${emailTo.trim()}` });
    } catch (err) {
      setResult({ ok: false, msg: err.message || 'Failed to send email' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
    >
      <div ref={modalRef} role="dialog" aria-modal="true" className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#edf2f7]">
          <div>
            <div className="font-semibold text-[#111827] text-[15px]">Share Document</div>
            <div className="text-xs text-[#536173] mt-0.5">{doc.number} · {doc.customer?.name || 'Walk-in customer'}</div>
          </div>
          <button type="button" className="text-[#94a3b8] hover:text-[#374151] p-1" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* WhatsApp */}
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold text-[#536173] uppercase tracking-wide">WhatsApp</div>
            <div className="text-[13px] text-[#374151] bg-[#f8fafc] rounded-md px-3 py-2 border border-[#edf2f7] leading-relaxed">{message}</div>
            <button
              type="button"
              disabled={!phone}
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[13px] font-semibold text-white cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#16a34a' }}
            >
              {WA_ICON}
              Send via WhatsApp
            </button>
            {!phone && <div className="text-xs text-amber-600">No phone number on this document</div>}
          </div>

          <div className="border-t border-[#edf2f7]" />

          {/* Email */}
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold text-[#536173] uppercase tracking-wide">Email</div>
            <input
              type="email"
              className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] w-full"
              placeholder="Customer email address"
              value={emailTo}
              onChange={(e) => { setEmailTo(e.target.value); setResult(null); }}
            />
            <button
              type="button"
              disabled={sending || !emailTo.trim()}
              onClick={handleEmail}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending…' : 'Send via Email'}
            </button>
            {result && (
              <div className={`text-xs px-3 py-2 rounded-md ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {result.msg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
