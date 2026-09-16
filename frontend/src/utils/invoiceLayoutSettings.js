export const INVOICE_OPTION_KEYS = [
  'invoiceShowLogo', 'invoiceShowAmountWords', 'invoiceShowBankDetails',
  'invoiceShowPaymentQr', 'invoiceShowNotes', 'invoiceShowTerms',
  'invoiceShowSignature', 'invoiceShowGoBookBranding',
];

export function getInvoiceLayoutSettings(settings = {}, format = settings.invoicePrintFormat) {
  const layout = format === 'thermal80' ? 'thermal80' : 'normal';
  const profile = settings.invoiceLayoutSettings?.[layout] || {};
  return Object.fromEntries(INVOICE_OPTION_KEYS.map((key) => [key, (profile[key] ?? settings[key]) !== false]));
}

export function updateInvoiceLayoutSettings(settings, key, value) {
  const layout = settings.invoicePrintFormat === 'thermal80' ? 'thermal80' : 'normal';
  return {
    normal: getInvoiceLayoutSettings(settings, 'normal'),
    thermal80: getInvoiceLayoutSettings(settings, 'thermal80'),
    [layout]: { ...getInvoiceLayoutSettings(settings, layout), [key]: value },
  };
}
