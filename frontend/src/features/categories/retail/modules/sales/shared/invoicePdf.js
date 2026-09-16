import templateCss from './invoiceDocument.css?raw';
import { API_BASE_URL } from '../../../../../../services/apiBase.js';
import { getToken } from '../../../../../../services/authToken.js';

export const invoiceCss = `
html, body { margin: 0; padding: 0; background: white; }
* { box-sizing: border-box; }
img { display: block; }
${templateCss}
.erp-invoice-page { height: auto; min-height: 297mm; display: block; overflow: visible; }
.erp-body-section, .erp-items-wrap { display: block; height: auto; overflow: visible; }
.erp-items-table, .erp-filler-row { height: auto; }
.erp-items-table tfoot { display: table-row-group; }
.erp-items-table thead { display: table-header-group; break-inside: avoid; }
.erp-top-section, .erp-bottom-section, .erp-amount-words { break-inside: avoid; }
.erp-bottom-main { grid-template-rows: minmax(29mm, auto) minmax(22mm, auto) minmax(10mm, auto); }
.erp-company-copy h2, .erp-customer-block h2 { white-space: normal; overflow-wrap: anywhere; }
.erp-logo-box img { max-width: 100%; }
.erp-receipt-page { min-height: 0; page: auto; }
.erp-receipt-items tr, .erp-receipt-totals { break-inside: avoid; }
.erp-invoice-page, .erp-receipt-page { margin: 0; box-shadow: none; }
`;

function asDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read invoice image.'));
    reader.readAsDataURL(blob);
  });
}

export async function prepareInvoicePdf(element, signal) {
  const source = element.querySelector('.erp-receipt-page, .erp-invoice-page');
  if (!source) throw new Error('Invoice template is unavailable.');
  const clone = source.cloneNode(true);
  // Only the invoice is submitted. Embed assets so the PDF service needs no network access.
  await Promise.all(Array.from(clone.querySelectorAll('img'), async (img) => {
    const url = new URL(img.getAttribute('src'), window.location.href);
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error('Unable to load an invoice logo, QR code, or signature.');
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('An invoice image has an invalid format.');
    img.src = await asDataUrl(blob);
    img.removeAttribute('srcset');
    img.removeAttribute('crossorigin');
  }));
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/documents/pdf`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ html: clone.outerHTML, css: invoiceCss, format: source.classList.contains('erp-receipt-page') ? 'thermal80' : 'a4' }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Unable to prepare invoice PDF. Please retry.');
  }
  return response.blob();
}

export { asDataUrl };

export function downloadInvoicePdf(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
