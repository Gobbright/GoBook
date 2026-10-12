export const INVOICE_DESIGN_WIDTH = 320;
export const INVOICE_DESIGN_HEIGHT = 620;
export const NORMAL_INVOICE_DESIGN_WIDTH = 420;
export const NORMAL_INVOICE_DESIGN_HEIGHT = 594;

export const INVOICE_DESIGN_ELEMENTS = [
  { key: 'header', label: 'Shop Header' },
  { key: 'title', label: 'Bill Title' },
  { key: 'meta', label: 'Invoice Details' },
  { key: 'party', label: 'Customer' },
  { key: 'items', label: 'Item Table' },
  { key: 'totals', label: 'Totals' },
  { key: 'amountWords', label: 'Amount Words' },
  { key: 'bank', label: 'Bank Details' },
  { key: 'paymentQr', label: 'Payment QR' },
  { key: 'terms', label: 'Terms' },
  { key: 'notes', label: 'Notes' },
  { key: 'signature', label: 'Signature' },
  { key: 'footer', label: 'Footer' },
];

export const INVOICE_LOCKED_BLOCKS = [
  { key: 'header', label: 'Shop Header', description: 'Business name, logo, address, phone and GSTIN' },
  { key: 'title', label: 'Bill Title', description: 'Tax invoice heading' },
  { key: 'meta', label: 'Invoice Details', description: 'Invoice number, date, payment and sales details' },
  { key: 'party', label: 'Customer', description: 'Customer name, address and GST details' },
  { key: 'items', label: 'Item Table', description: 'Products, quantity, rate, GST and amount columns' },
  { key: 'totals', label: 'Tax Summary & Totals', description: 'Tax summary, round off and grand total' },
];

export const INVOICE_OPTIONAL_BLOCKS = [
  { key: 'amountWords', label: 'Amount Words', settingKey: 'invoiceShowAmountWords' },
  { key: 'bank', label: 'Bank Details', settingKey: 'invoiceShowBankDetails' },
  { key: 'paymentQr', label: 'Payment QR', settingKey: 'invoiceShowPaymentQr' },
  { key: 'terms', label: 'Terms', settingKey: 'invoiceShowTerms' },
  { key: 'notes', label: 'Notes', settingKey: 'invoiceShowNotes' },
  { key: 'signature', label: 'Authorized Signature', settingKey: 'invoiceShowSignature' },
  { key: 'footer', label: 'GoBook Footer', settingKey: 'invoiceShowGoBookBranding' },
];

export const DEFAULT_INVOICE_BLOCK_ORDER = ['amountWords', 'bank', 'paymentQr', 'terms', 'notes', 'signature', 'footer'];

export const DEFAULT_THERMAL_INVOICE_DESIGN = {
  designWidth: INVOICE_DESIGN_WIDTH,
  designHeight: INVOICE_DESIGN_HEIGHT,
  elements: {
    header: { visible: true, x: 16, y: 12, w: 288, h: 72, z: 1 },
    title: { visible: true, x: 16, y: 92, w: 288, h: 28, z: 2 },
    meta: { visible: true, x: 16, y: 130, w: 288, h: 58, z: 3 },
    party: { visible: true, x: 16, y: 198, w: 288, h: 48, z: 4 },
    items: { visible: true, x: 16, y: 258, w: 288, h: 86, z: 5 },
    totals: { visible: true, x: 16, y: 354, w: 288, h: 54, z: 6 },
    amountWords: { visible: true, x: 16, y: 420, w: 288, h: 42, z: 7 },
    bank: { visible: false, x: 16, y: 472, w: 136, h: 44, z: 8 },
    paymentQr: { visible: true, x: 125, y: 468, w: 70, h: 70, z: 9 },
    terms: { visible: true, x: 16, y: 548, w: 136, h: 48, z: 10 },
    notes: { visible: true, x: 168, y: 548, w: 136, h: 48, z: 11 },
    signature: { visible: true, x: 96, y: 580, w: 128, h: 20, z: 12 },
    footer: { visible: true, x: 16, y: 602, w: 288, h: 18, z: 13 },
  },
};

export const DEFAULT_NORMAL_INVOICE_DESIGN = {
  designWidth: NORMAL_INVOICE_DESIGN_WIDTH,
  designHeight: NORMAL_INVOICE_DESIGN_HEIGHT,
  elements: {
    title: { visible: true, x: 20, y: 12, w: 380, h: 28, z: 1 },
    header: { visible: true, x: 20, y: 48, w: 170, h: 78, z: 2 },
    meta: { visible: true, x: 198, y: 48, w: 202, h: 126, z: 3 },
    party: { visible: true, x: 20, y: 134, w: 170, h: 72, z: 4 },
    items: { visible: true, x: 20, y: 218, w: 380, h: 188, z: 5 },
    amountWords: { visible: true, x: 20, y: 420, w: 380, h: 32, z: 6 },
    totals: { visible: true, x: 286, y: 406, w: 114, h: 64, z: 7 },
    bank: { visible: true, x: 20, y: 472, w: 130, h: 58, z: 8 },
    paymentQr: { visible: true, x: 175, y: 464, w: 70, h: 70, z: 9 },
    terms: { visible: true, x: 20, y: 535, w: 178, h: 38, z: 10 },
    notes: { visible: true, x: 216, y: 535, w: 178, h: 38, z: 11 },
    signature: { visible: true, x: 288, y: 568, w: 112, h: 18, z: 12 },
    footer: { visible: true, x: 20, y: 574, w: 380, h: 20, z: 13 },
  },
};

export const DEFAULT_INVOICE_DESIGN = DEFAULT_THERMAL_INVOICE_DESIGN;

function layoutKey(format) {
  return format === 'thermal80' ? 'thermal80' : 'normal';
}

export function getInvoiceDesignDimensions(format = 'normal') {
  return layoutKey(format) === 'thermal80'
    ? { width: INVOICE_DESIGN_WIDTH, height: INVOICE_DESIGN_HEIGHT }
    : { width: NORMAL_INVOICE_DESIGN_WIDTH, height: NORMAL_INVOICE_DESIGN_HEIGHT };
}

function getDefaultDesign(format = 'normal') {
  return layoutKey(format) === 'thermal80' ? DEFAULT_THERMAL_INVOICE_DESIGN : DEFAULT_NORMAL_INVOICE_DESIGN;
}

function isLegacyThermalNormalProfile(profile = {}) {
  const elements = profile.elements || {};
  return !profile.designWidth
    && !profile.designHeight
    && elements.header?.w === 288
    && elements.title?.y === 98
    && elements.items?.y === 266
    && elements.footer?.y === 562;
}

function normalizeSettings(settings = {}) {
  const source = settings?.settings || settings?.data || settings || {};
  if (typeof source.invoiceDesignSettings === 'string') {
    try {
      return { ...source, invoiceDesignSettings: JSON.parse(source.invoiceDesignSettings) };
    } catch {
      return { ...source, invoiceDesignSettings: {} };
    }
  }
  return source;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function getInvoiceDesignSettings(settings = {}, format = settings.invoicePrintFormat) {
  const normalized = normalizeSettings(settings);
  const layout = layoutKey(format);
  const defaultsProfile = getDefaultDesign(layout);
  const dimensions = getInvoiceDesignDimensions(layout);
  let profile = normalized.invoiceDesignSettings?.[layout] || {};
  if (layout === 'normal' && isLegacyThermalNormalProfile(profile)) {
    profile = {};
  }
  const incomingElements = profile.elements || {};
  const elements = Object.fromEntries(INVOICE_DESIGN_ELEMENTS.map(({ key }) => {
    const defaults = defaultsProfile.elements[key];
    const incoming = incomingElements[key] || {};
    const w = clamp(incoming.w ?? defaults.w, 42, dimensions.width);
    const h = clamp(incoming.h ?? defaults.h, 20, dimensions.height);
    return [key, {
      ...defaults,
      ...incoming,
      visible: incoming.visible ?? defaults.visible,
      w,
      h,
      x: clamp(incoming.x ?? defaults.x, 0, dimensions.width - w),
      y: clamp(incoming.y ?? defaults.y, 0, dimensions.height - h),
      z: Number.isFinite(Number(incoming.z)) ? Number(incoming.z) : defaults.z,
    }];
  }));
  return { ...defaultsProfile, ...profile, elements };
}

export function updateInvoiceDesignSettings(settings = {}, format = settings.invoicePrintFormat, elementKey, patch = {}) {
  const normalized = normalizeSettings(settings);
  const layout = layoutKey(format);
  const current = getInvoiceDesignSettings(normalized, layout);
  return {
    ...(normalized.invoiceDesignSettings || {}),
    [layout]: {
      ...current,
      elements: {
        ...current.elements,
        [elementKey]: {
          ...current.elements[elementKey],
          ...patch,
        },
      },
    },
  };
}

export function resetInvoiceDesignSettings(settings = {}, format = settings.invoicePrintFormat) {
  const normalized = normalizeSettings(settings);
  const layout = layoutKey(format);
  return {
    ...(normalized.invoiceDesignSettings || {}),
    [layout]: {
      ...getDefaultDesign(layout),
      blockOrder: DEFAULT_INVOICE_BLOCK_ORDER,
    },
  };
}

export function getInvoiceBlockOrder(settings = {}, format = settings.invoicePrintFormat) {
  const normalized = normalizeSettings(settings);
  const layout = layoutKey(format);
  const saved = normalized.invoiceDesignSettings?.[layout]?.blockOrder;
  const allowed = new Set(INVOICE_OPTIONAL_BLOCKS.map((block) => block.key));
  const incoming = Array.isArray(saved) ? saved.filter((key) => allowed.has(key)) : [];
  return [...incoming, ...DEFAULT_INVOICE_BLOCK_ORDER.filter((key) => !incoming.includes(key))];
}

export function getInvoiceThermalTemplate(settings = {}) {
  const normalized = normalizeSettings(settings);
  return normalized.invoiceThermalTemplate
    || normalized.invoiceDesignSettings?.thermal80?.template
    || 'standard';
}

export function updateInvoiceThermalTemplate(settings = {}, template = 'standard') {
  const normalized = normalizeSettings(settings);
  const currentThermal = normalized.invoiceDesignSettings?.thermal80 || getInvoiceDesignSettings(normalized, 'thermal80');
  return {
    ...(normalized.invoiceDesignSettings || {}),
    thermal80: {
      ...currentThermal,
      template,
    },
  };
}

export function updateInvoiceBlockOrder(settings = {}, format = settings.invoicePrintFormat, blockOrder = DEFAULT_INVOICE_BLOCK_ORDER) {
  const normalized = normalizeSettings(settings);
  const layout = layoutKey(format);
  return {
    ...(normalized.invoiceDesignSettings || {}),
    [layout]: {
      ...getInvoiceDesignSettings(normalized, layout),
      ...(normalized.invoiceDesignSettings?.[layout] || {}),
      blockOrder,
    },
  };
}
