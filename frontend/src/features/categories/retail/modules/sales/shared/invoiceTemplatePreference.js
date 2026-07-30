const TEMPLATE_KEY = 'gobook.invoicePrintTemplate';
const VALID_TEMPLATES = new Set(['modern', 'classic']);

export function getInvoicePrintTemplate(defaultValue = 'modern') {
  try {
    const stored = localStorage.getItem(TEMPLATE_KEY);
    return VALID_TEMPLATES.has(stored) ? stored : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setInvoicePrintTemplate(value) {
  if (!VALID_TEMPLATES.has(value)) return;
  try {
    localStorage.setItem(TEMPLATE_KEY, value);
  } catch {
    // The current page state still holds the selection if storage is unavailable.
  }
}
