export const INVOICE_OPTION_KEYS = [
  'invoiceShowLogo', 'invoiceShowAmountWords', 'invoiceShowBankDetails',
  'invoiceShowPaymentQr', 'invoiceShowNotes', 'invoiceShowTerms',
  'invoiceShowSignature', 'invoiceShowGoBookBranding',
];

function normalizeSettings(settings = {}) {
  const source = settings?.settings || settings?.data || settings || {};
  if (typeof source.invoiceLayoutSettings === 'string') {
    try {
      return { ...source, invoiceLayoutSettings: JSON.parse(source.invoiceLayoutSettings) };
    } catch {
      return { ...source, invoiceLayoutSettings: {} };
    }
  }
  return source;
}

function isEnabled(value) {
  return value !== false && value !== 'false' && value !== 0 && value !== '0';
}

export function getInvoiceLayoutSettings(settings = {}, format = settings.invoicePrintFormat) {
  const normalized = normalizeSettings(settings);
  const layout = format === 'thermal80' ? 'thermal80' : 'normal';
  const profile = normalized.invoiceLayoutSettings?.[layout] || {};
  return Object.fromEntries(INVOICE_OPTION_KEYS.map((key) => [key, isEnabled(profile[key] ?? normalized[key])]));
}

export function updateInvoiceLayoutSettings(settings, key, value) {
  const normalized = normalizeSettings(settings);
  const layout = normalized.invoicePrintFormat === 'thermal80' ? 'thermal80' : 'normal';
  return {
    normal: getInvoiceLayoutSettings(normalized, 'normal'),
    thermal80: getInvoiceLayoutSettings(normalized, 'thermal80'),
    [layout]: { ...getInvoiceLayoutSettings(normalized, layout), [key]: value },
  };
}
