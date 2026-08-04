import { SERVER_ORIGIN } from '../../../services/apiBase.js';
import { formatMoney } from './FinanceUi.jsx';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function line(value) {
  return escapeHtml(value || '-');
}

function receiptNumber(settings, bill) {
  const prefix = settings?.financeReceiptPrefix || settings?.invoicePrefix || 'FIN-';
  return bill.receiptNumber || `${prefix}${String(bill.date || '').replaceAll('-', '')}-${bill.serial || Date.now()}`;
}

export function financeBillHtml(settings = {}, bill = {}, options = {}) {
  const amount = Number(bill.amount) || 0;
  const logo = settings.logoUrl ? `${SERVER_ORIGIN}${settings.logoUrl}` : '';
  const address = [settings.address, settings.city, settings.state, settings.pincode].filter(Boolean).join(', ');
  const shellStyle = options.responsive
    ? 'width:100%;max-width:720px;box-sizing:border-box;padding:clamp(16px,4vw,30px);font-family:Arial,sans-serif;color:#111827;background:#ffffff;overflow-wrap:anywhere;'
    : 'width:720px;box-sizing:border-box;padding:30px;font-family:Arial,sans-serif;color:#111827;background:#ffffff;overflow-wrap:anywhere;';
  return `
    <div style="${shellStyle}">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:18px 24px;border-bottom:2px solid #2563eb;padding-bottom:18px;">
        <div style="display:flex;gap:14px;align-items:flex-start;min-width:220px;flex:1 1 360px;">
          ${logo ? `<img src="${escapeHtml(logo)}" style="width:58px;height:58px;object-fit:contain;border:1px solid #e5e7eb;border-radius:10px;" />` : ''}
          <div>
            <div style="font-size:22px;font-weight:800;">${line(settings.businessName || 'Finance Business')}</div>
            <div style="font-size:12px;color:#4b5563;margin-top:4px;line-height:1.5;">${line(address)}</div>
            <div style="font-size:12px;color:#4b5563;">Phone: ${line(settings.phone)}</div>
            ${settings.gstin ? `<div style="font-size:12px;color:#4b5563;">GSTIN: ${line(settings.gstin)}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;min-width:180px;flex:1 1 180px;">
          <div style="font-size:11px;font-weight:800;color:#2563eb;letter-spacing:1.5px;">FINANCE RECEIPT</div>
          <div style="font-size:18px;font-weight:800;margin-top:8px;">${line(receiptNumber(settings, bill))}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:5px;">Date: ${line(bill.date)}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:14px;margin-top:22px;">
        <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;">
          <div style="font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;">Customer</div>
          <div style="font-size:18px;font-weight:800;margin-top:8px;">${line(bill.customerName)}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">Phone: ${line(bill.phone)}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">Type: ${line(bill.type)}</div>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;">
          <div style="font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;">Payment</div>
          <div style="font-size:clamp(20px,5vw,28px);font-weight:900;color:#2563eb;margin-top:8px;">${escapeHtml(formatMoney(amount))}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">Mode: ${line(bill.paymentMode || 'Cash')}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">Source: ${line(bill.source || 'Manual Bill')}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:22px;font-size:13px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="text-align:left;padding:10px;border:1px solid #e5e7eb;">Description</th>
            <th style="text-align:right;padding:10px;border:1px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:12px;border:1px solid #e5e7eb;">${line(bill.description || 'Finance collection payment')}</td>
            <td style="padding:12px;border:1px solid #e5e7eb;text-align:right;font-weight:800;">${escapeHtml(formatMoney(amount))}</td>
          </tr>
          <tr>
            <td style="padding:12px;border:1px solid #e5e7eb;text-align:right;font-weight:800;">Total Paid</td>
            <td style="padding:12px;border:1px solid #e5e7eb;text-align:right;font-weight:900;color:#2563eb;">${escapeHtml(formatMoney(amount))}</td>
          </tr>
        </tbody>
      </table>

      ${bill.note ? `<div style="margin-top:18px;font-size:12px;color:#4b5563;"><strong>Note:</strong> ${line(bill.note)}</div>` : ''}
      <div style="margin-top:30px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:20px;align-items:flex-end;">
        <div style="font-size:12px;color:#4b5563;">${line(settings.financeBillFooter || 'Thank you for your payment.')}</div>
        <div style="text-align:center;font-size:12px;color:#4b5563;">
          <div style="width:150px;border-top:1px solid #9ca3af;margin-bottom:6px;"></div>
          Authorized Signature
        </div>
      </div>
    </div>
  `;
}

export async function downloadFinanceBillPdf(settings, bill, filename) {
  const html2pdf = (await import('html2pdf.js')).default;
  const host = document.createElement('div');
  host.innerHTML = financeBillHtml(settings, bill);
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  document.body.appendChild(host);
  try {
    await html2pdf()
      .set({
        margin: 8,
        filename: filename || `${receiptNumber(settings, bill)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(host.firstElementChild)
      .save();
  } finally {
    host.remove();
  }
}
