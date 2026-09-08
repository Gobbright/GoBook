const TEMPLATE_KEY = 'gobook.invoicePrintTemplate';
const MASTER_INVOICE_TEMPLATE = 'classic';

export function getInvoicePrintTemplate(defaultValue = 'classic') {
  return MASTER_INVOICE_TEMPLATE;
}

export function setInvoicePrintTemplate(value) {
  try {
    localStorage.setItem(TEMPLATE_KEY, MASTER_INVOICE_TEMPLATE);
  } catch {
    // The current page state still holds the selection if storage is unavailable.
  }
}

export { MASTER_INVOICE_TEMPLATE };
