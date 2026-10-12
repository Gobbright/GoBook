import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Document as PdfDocument,
  Page as PdfPage,
  Path as PdfPath,
  Rect as PdfRect,
  StyleSheet as PdfStyleSheet,
  Svg as PdfSvg,
  Text as PdfText,
  View as PdfView,
  pdf,
} from '@react-pdf/renderer';

import { api } from '../../../../../services/api.js';
const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]';
const LABEL = 'block text-[12px] font-medium text-[#374151] mb-1';

const CODE39_PATTERNS = {
  0: 'nnnwwnwnn', 1: 'wnnwnnnnw', 2: 'nnwwnnnnw', 3: 'wnwwnnnnn', 4: 'nnnwwnnnw',
  5: 'wnnwwnnnn', 6: 'nnwwwnnnn', 7: 'nnnwnnwnw', 8: 'wnnwnnwnn', 9: 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '$': 'nwnwnwnnn',
  '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn', '*': 'nwnnwnwnn',
};

const MM_TO_PT = 72 / 25.4;
const mm = (value) => value * MM_TO_PT;
const BARCODE_CUSTOMIZATION_KEY = 'gobook.barcode.label.customization.v6';
const LABEL_DESIGN_WIDTH = 280;
const BARCODE_LABEL_SIZE_PRESETS = [
  { key: 'compact35', name: 'Compact 35 x 18.5 mm - 2 per row', widthMm: 35, heightMm: 18.5, columns: 2, gapMm: 3, pageHeightMm: 24 },
  { key: 'standard38', name: 'Standard 38 x 25 mm - 2 per row', widthMm: 38, heightMm: 25, columns: 2, gapMm: 0, pageHeightMm: 31 },
  { key: 'medium50', name: 'Medium 50 x 25 mm - 1 per row', widthMm: 50, heightMm: 25, columns: 1, gapMm: 0, pageHeightMm: 31 },
  { key: 'wide70', name: 'Wide 70 x 25 mm - 1 per row', widthMm: 70, heightMm: 25, columns: 1, gapMm: 0, pageHeightMm: 31 },
];
const DEFAULT_BARCODE_LABEL_SIZE = 'compact35';
const DEFAULT_BARCODE_CUSTOMIZATION = {
  labelSize: DEFAULT_BARCODE_LABEL_SIZE,
  elements: {
    shopName: { visible: true, x: 230, y: 8, w: 38, h: 16, z: 1 },
    productName: { visible: true, x: 74, y: 74, w: 142, h: 24, z: 2 },
    brandName: { visible: true, x: 48, y: 102, w: 116, h: 16, z: 3 },
    variant: { visible: true, x: 52, y: 122, w: 58, h: 18, z: 4 },
    price: { visible: true, x: 186, y: 104, w: 82, h: 18, z: 4 },
    barcode: { visible: true, x: 86, y: 18, w: 122, h: 46, z: 5 },
    barcodeNumber: { visible: true, x: 82, y: 62, w: 128, h: 14, align: 'center', z: 6 },
  },
  manualText: {
    shopName: 'Shop Name',
  },
};

function getBarcodeLabelSizePreset(key) {
  return BARCODE_LABEL_SIZE_PRESETS.find((preset) => preset.key === key) || BARCODE_LABEL_SIZE_PRESETS[0];
}

function getLabelDesignHeight(preset = getBarcodeLabelSizePreset(DEFAULT_BARCODE_LABEL_SIZE)) {
  return Math.round(LABEL_DESIGN_WIDTH * preset.heightMm / preset.widthMm);
}

function normalizeBarcodeCustomization(value = {}) {
  const labelSize = BARCODE_LABEL_SIZE_PRESETS.some((preset) => preset.key === value.labelSize) ? value.labelSize : DEFAULT_BARCODE_LABEL_SIZE;
  const labelPreset = getBarcodeLabelSizePreset(labelSize);
  const labelDesignHeight = getLabelDesignHeight(labelPreset);
  const incomingElements = value.elements || {};
  const elements = Object.fromEntries(Object.entries(DEFAULT_BARCODE_CUSTOMIZATION.elements).map(([key, defaults]) => {
    const incoming = incomingElements[key] || {};
    const align = ['left', 'center', 'right'].includes(incoming.align) ? incoming.align : defaults.align;
    return [key, {
      ...defaults,
      ...incoming,
      visible: incoming.visible ?? defaults.visible,
      w: Math.max(key === 'barcode' ? 80 : 40, Math.min(LABEL_DESIGN_WIDTH, Number(incoming.w ?? defaults.w) || defaults.w)),
      h: Math.max(key === 'barcode' ? 28 : 12, Math.min(labelDesignHeight, Number(incoming.h ?? defaults.h) || defaults.h)),
      z: Number.isFinite(Number(incoming.z)) ? Number(incoming.z) : defaults.z,
      ...(align ? { align } : {}),
    }];
  }).map(([key, element]) => [key, {
    ...element,
    x: Math.max(0, Math.min(LABEL_DESIGN_WIDTH - element.w, Number(element.x ?? DEFAULT_BARCODE_CUSTOMIZATION.elements[key].x) || 0)),
    y: Math.max(0, Math.min(labelDesignHeight - element.h, Number(element.y ?? DEFAULT_BARCODE_CUSTOMIZATION.elements[key].y) || 0)),
  }]));
  return {
    ...DEFAULT_BARCODE_CUSTOMIZATION,
    ...value,
    labelSize,
    manualText: {
      ...DEFAULT_BARCODE_CUSTOMIZATION.manualText,
      ...(value.manualText || {}),
    },
    elements,
  };
}

function designToMm(value, axis, preset = getBarcodeLabelSizePreset(DEFAULT_BARCODE_LABEL_SIZE)) {
  const designHeight = getLabelDesignHeight(preset);
  return (Number(value) || 0) / (axis === 'x' ? LABEL_DESIGN_WIDTH : designHeight) * (axis === 'x' ? preset.widthMm : preset.heightMm);
}

function normalizeBarcodeValue(value) {
  const raw = String(value || '').trim().toUpperCase();
  return raw.replace(/[^0-9A-Z ./$+%-]/g, '-').slice(0, 32) || 'NO-CODE';
}

// Deterministic 12-digit code derived from the given text: same input always
// produces the same digits (djb2 hash, expanded to fill the length).
function hashToDigits(text, length = 12) {
  let hash = 5381;
  const str = String(text || '');
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  let digits = String(hash);
  while (digits.length < length) {
    hash = ((hash << 5) + hash + 1) >>> 0;
    digits += String(hash);
  }
  return digits.slice(0, length);
}

function currentBarcodePeriod(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}${year}`;
}

function ean13CheckDigit(first12Digits) {
  const sum = String(first12Digits)
    .slice(0, 12)
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

function productBarcodeIdentity(value = {}) {
  return [
    value.code,
    value.productCode,
    value.description,
    value.name,
    value.category,
    value.subCategory,
    value.itemGroup,
    value.productType,
    value.hsn,
    value.unit,
  ]
    .map((part) => String(part ?? '').trim().toLowerCase())
    .filter(Boolean)
    .join('|');
}

function variantBarcodeIdentity(value = {}) {
  return [
    value.brand,
    value.other,
    value.variantBrand,
    value.size,
    value.modelName,
    value.modelCode,
    value.modelFamily,
    value.modelNumber,
    value.material,
    value.fabric,
    value.colour,
    value.color,
    value.pattern,
    value.type,
    value.quality,
    value.ageGroup,
    value.gender,
    value.collection,
    value.processor,
    value.ram,
    value.storage,
    value.display,
    value.graphics,
    value.operatingSystem,
  ]
    .map((part) => String(part ?? '').trim().toLowerCase())
    .filter(Boolean)
    .join('|');
}

function genBarcodeForProduct(product = {}) {
  const productKey = productBarcodeIdentity(product);
  const variantKey = variantBarcodeIdentity(product) || 'base';
  const first12Digits = `${hashToDigits(`${productKey}|prefix`, 4)}${currentBarcodePeriod()}${hashToDigits(`${productKey}|series`, 2)}${hashToDigits(`${variantKey}|variant`, 2)}`;
  return `${first12Digits}${ean13CheckDigit(first12Digits)}`;
}

function code39BarRects(value, height = 34) {
  const encoded = `*${normalizeBarcodeValue(value)}*`;
  const bars = [];
  let x = 10;
  const narrow = 1;
  const wide = 2.15;

  encoded.split('').forEach((char, charIndex) => {
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];
    pattern.split('').forEach((part, index) => {
      const width = part === 'w' ? wide : narrow;
      if (index % 2 === 0) bars.push({ key: `${charIndex}-${index}`, x, y: 0, width, height });
      x += width;
    });
    x += narrow;
  });
  return { bars, width: x + 10, height };
}

function Code39Barcode({ value, height = 34, width: svgWidth = 260 }) {
  const { bars, width } = code39BarRects(value, height);
  return (
    <svg width={svgWidth} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block', shapeRendering: 'crispEdges' }}>
      {bars.map((bar) => <rect key={bar.key} x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill="#111827" />)}
    </svg>
  );
}

function BarcodePdfBars({ value, widthMm = 31, heightMm = 8 }) {
  const height = 32;
  const { bars, width } = code39BarRects(value, height);
  return (
    <PdfSvg width={mm(widthMm)} height={mm(heightMm)} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {bars.map((bar) => (
        <PdfRect key={bar.key} x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill="#111827" />
      ))}
    </PdfSvg>
  );
}

function pdfElementBox(element, preset, { includeHeight = true } = {}) {
  const box = {
    position: 'absolute',
    left: mm(designToMm(element.x, 'x', preset)),
    top: mm(designToMm(element.y, 'y', preset)),
    width: mm(designToMm(element.w, 'x', preset)),
  };
  if (includeHeight) box.height = mm(designToMm(element.h, 'y', preset));
  return box;
}

const barcodePdfStyles = PdfStyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    paddingTop: mm(2),
    paddingRight: mm(2),
    paddingBottom: mm(2),
    paddingLeft: mm(2),
  },
  label: {
    borderWidth: 0.75,
    borderColor: '#cbd5e1',
    borderRadius: 0,
    color: '#111827',
    fontFamily: 'Helvetica',
    overflow: 'hidden',
    position: 'relative',
  },
  labelGap: { marginRight: mm(3) },
  name: {
    fontSize: 5.4,
    fontWeight: 400,
    lineHeight: 1.05,
  },
  meta: {
    marginTop: mm(0.2),
    color: '#475569',
    fontSize: 4.8,
    lineHeight: 1.05,
  },
  price: {
    flexShrink: 0,
    fontSize: 5.6,
    fontWeight: 700,
    lineHeight: 1,
  },
  variant: {
    color: '#111827',
    fontSize: 5.2,
    fontWeight: 700,
    lineHeight: 1.05,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rupeeIcon: {
    marginRight: mm(0.4),
  },
  code: {
    color: '#475569',
    fontSize: 6.5,
    letterSpacing: 0.35,
    lineHeight: 1,
    textAlign: 'center',
  },
  codeLeft: {
    textAlign: 'left',
  },
  codeRight: {
    textAlign: 'right',
  },
  shopName: {
    fontSize: 5.6,
    fontWeight: 700,
    lineHeight: 1,
  },
});

function chunkRows(rows = [], perPage = 2) {
  const pages = [];
  for (let index = 0; index < rows.length; index += perPage) pages.push(rows.slice(index, index + perPage));
  return pages;
}

function barcodeBrandLabel(row = {}) {
  return String(row.other || row.brand || row.variantBrand || '').trim();
}

const BARCODE_LABEL_ELEMENT_DEFS = [
  { key: 'shopName', label: 'Shop / Brand' },
  { key: 'productName', label: 'Product' },
  { key: 'brandName', label: 'Brand' },
  { key: 'variant', label: 'Variant' },
  { key: 'price', label: 'Price' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'barcodeNumber', label: 'Number' },
];

function BarcodePdfDocument({ rows = [], customization = DEFAULT_BARCODE_CUSTOMIZATION }) {
  const options = normalizeBarcodeCustomization(customization);
  const labelPreset = getBarcodeLabelSizePreset(options.labelSize);
  const elements = options.elements;
  const positionedText = (key, text, style) => {
    const element = elements[key];
    if (!element?.visible || !text) return null;
    return (
      <PdfView key={key} style={pdfElementBox(element, labelPreset, { includeHeight: false })}>
        <PdfText style={style}>{text}</PdfText>
      </PdfView>
    );
  };
  return (
    <PdfDocument title="Barcode Labels">
      {chunkRows(rows, labelPreset.columns).map((pageRows, pageIndex) => (
        <PdfPage key={`barcode-page-${pageIndex}`} size={[mm(80), mm(labelPreset.pageHeightMm)]} style={barcodePdfStyles.page}>
          {pageRows.map((row, rowIndex) => {
            const barcodeVal = row.barcode || '';
            const price = formatLabelPrice(row);
            const brand = barcodeBrandLabel(row);
            const variant = printVariantLabel(row);
            const values = {
              shopName: options.manualText?.shopName || '',
              productName: row.description || '-',
              brandName: brand,
              variant,
              price,
              barcode: barcodeVal,
              barcodeNumber: normalizeBarcodeValue(barcodeVal),
            };
            return (
              <PdfView
                key={row.printKey || `${pageIndex}-${rowIndex}`}
                style={[
                  barcodePdfStyles.label,
                  { width: mm(labelPreset.widthMm), height: mm(labelPreset.heightMm) },
                  rowIndex < pageRows.length - 1 ? { marginRight: mm(labelPreset.gapMm) } : null,
                ]}
              >
                {BARCODE_LABEL_ELEMENT_DEFS
                  .map((def) => ({ ...def, element: elements[def.key] }))
                  .sort((a, b) => (a.element?.z || 0) - (b.element?.z || 0))
                  .map(({ key, element }) => {
                    if (!element?.visible) return null;
                    if (key === 'barcode') {
                      return (
                        <PdfView key={key} style={pdfElementBox(element, labelPreset)}>
                          <BarcodePdfBars value={barcodeVal} widthMm={designToMm(element.w, 'x', labelPreset)} heightMm={designToMm(element.h, 'y', labelPreset)} />
                        </PdfView>
                      );
                    }
                    if (key === 'barcodeNumber') {
                      return (
                        <PdfView key={key} style={pdfElementBox(element, labelPreset, { includeHeight: false })}>
                          <PdfText style={[barcodePdfStyles.code, { textAlign: element.align || 'center' }]}>{values[key]}</PdfText>
                        </PdfView>
                      );
                    }
                    if (key === 'price') {
                      return values.price ? (
                        <PdfView key={key} style={[pdfElementBox(element, labelPreset, { includeHeight: false }), barcodePdfStyles.priceRow]}>
                          <PdfSvg width={mm(2.3)} height={mm(2.7)} viewBox="0 0 12 14" style={barcodePdfStyles.rupeeIcon}>
                            <PdfPath d="M3 2h7M3 5h7M3 2h3.3c2.4 0 3.6 1.2 3.2 3C9.1 7 7.3 8 5 8H3l5 4" stroke="#111827" strokeWidth="1.25" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </PdfSvg>
                          <PdfText style={barcodePdfStyles.price}>{formatLabelPriceAmount(row)}</PdfText>
                        </PdfView>
                      ) : null;
                    }
                    const style = key === 'productName'
                      ? barcodePdfStyles.name
                      : key === 'shopName'
                        ? barcodePdfStyles.shopName
                        : key === 'variant'
                          ? barcodePdfStyles.variant
                          : key === 'price'
                            ? barcodePdfStyles.price
                            : barcodePdfStyles.meta;
                    return positionedText(key, values[key], style);
                  })}
              </PdfView>
            );
          })}
        </PdfPage>
      ))}
    </PdfDocument>
  );
}

function variantDisplayName(variant = {}) {
  return [
    variant.other,
    variant.brand,
    variant.size || variant.modelName,
    variant.material,
    variant.colour || variant.color,
    variant.type,
    variant.pattern,
    variant.modelCode,
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' / ');
}

function printVariantLabel(row = {}) {
  return [
    row.size || row.modelName,
    row.colour || row.color,
    row.type,
    row.pattern,
    row.modelCode,
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' / ') || `SKU: ${row.code || '-'}`;
}

function formatLabelPrice(row = {}) {
  const price = Number(row.rate || row.sellingPrice || row.mrp || row.purchasePrice || 0);
  return Number.isFinite(price) && price > 0 ? `₹${formatLabelPriceAmount(row)}` : '';
}

function formatLabelPriceAmount(row = {}) {
  const price = Number(row.rate || row.sellingPrice || row.mrp || row.purchasePrice || 0);
  return Number.isFinite(price) && price > 0 ? price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

function expandBarcodeRows(products = []) {
  return products.flatMap((product) => {
    const variants = Array.isArray(product.variants)
      ? product.variants.filter((variant) => variantDisplayName(variant) || variant.barcode)
      : [];
    if (!variants.length) {
      return [{
        ...product,
        barcode: product.barcode || '',
        rowKey: product._id,
        variantLabel: '',
        quantity: Number(product.stock) || 0,
        printedCount: Number(product.barcodePrintCount) || 0,
      }];
    }
    return variants.map((variant, index) => {
      const merged = { ...product, ...variant };
      const variantLabel = variantDisplayName(variant) || `Variant ${index + 1}`;
      return {
        ...product,
        ...variant,
        _id: product._id,
        parentId: product._id,
        variantIndex: index,
        rowKey: `${product._id || product.code || product.description}-variant-${index}`,
        description: product.description || variant.modelName || '',
        code: variant.modelCode || product.code || '',
        category: product.category || '',
        variantLabel,
        barcode: variant.barcode || '',
        quantity: Number(variant.stock) || 0,
        printedCount: Number(variant.barcodePrintCount) || 0,
      };
    });
  });
}

function labelsForRows(rows = [], countForRow = () => 1) {
  return rows.flatMap((row) => {
    const count = Math.max(0, Math.floor(Number(countForRow(row)) || 0));
    return Array.from({ length: count }, (_, index) => ({
      ...row,
      printKey: `${row.rowKey || row._id}-label-${index}`,
    }));
  });
}

const EditIcon = () => (
  <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = () => (
  <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);

const PrintIcon = () => (
  <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const actionButtonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-md border cursor-pointer font-[inherit]';

function EditModal({ product, onSave, onClose }) {
  const isVariantEdit = Number.isInteger(product.variantIndex);
  const [form, setForm] = useState({
    description: product.description || '',
    code:        product.code || '',
    category:    product.category || '',
    barcode:     product.barcode || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.description.trim()) return setErr('Product name is required');
    if (!form.code.trim()) return setErr('SKU / Code is required');
    setSaving(true);
    setErr('');
    try {
      const payload = isVariantEdit
        ? {
            description: form.description,
            category: form.category,
            variants: (product.variants || []).map((variant, index) => (
              index === product.variantIndex
                ? { ...variant, modelCode: form.code, barcode: form.barcode }
                : variant
            )),
          }
        : { ...form, barcode: form.barcode };
      const result = await api.invUpdateProduct(product._id, payload);
      onSave(result);
    } catch (e) {
      setErr(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-130 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2f7]">
          <h2 className="text-[16px] font-bold text-[#111827]">Edit Product Barcode</h2>
          <button onClick={onClose} className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-lg leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {err && <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 text-[12px] rounded-md">{err}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={LABEL}>Product Name *</label>
              <input className={INPUT} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>SKU / Code *</label>
              <input className={INPUT} value={form.code} onChange={(e) => set('code', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Category</label>
              <input className={INPUT} value={form.category} onChange={(e) => set('category', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Barcode</label>
              <div className="flex gap-2">
                <input className={INPUT} value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ItemTypeTabs({ value, onChange }) {
  return (
    <div className="inline-flex rounded-md border border-[#dbe4ef] bg-white p-0.5">
      {['Product', 'Service'].map((t) => (
        <button
          key={t}
          type="button"
          className={`px-3 py-1.5 text-[13px] font-medium rounded cursor-pointer font-[inherit] ${value === t ? 'bg-blue-600 text-white' : 'text-[#374151] hover:bg-gray-50'}`}
          onClick={() => onChange(t)}
        >
          {t === 'Product' ? 'Products' : 'Services'}
        </button>
      ))}
    </div>
  );
}

export function BarcodePage() {
  const [search, setSearch]         = useState('');
  const [itemType, setItemType]     = useState('Product');
  const [products, setProducts]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [editing, setEditing]       = useState(null);
  const [printJob, setPrintJob]     = useState(null);
  const [showDesigner, setShowDesigner] = useState(false);
  const designerRef = useRef(null);
  const interactionRef = useRef(null);
  const [labelCustomization, setLabelCustomization] = useState(() => {
    try {
      return normalizeBarcodeCustomization(JSON.parse(localStorage.getItem(BARCODE_CUSTOMIZATION_KEY) || '{}'));
    } catch {
      return DEFAULT_BARCODE_CUSTOMIZATION;
    }
  });

  const LIMIT = 5;
  const barcodeRows = expandBarcodeRows(products);
  const printRows = useMemo(() => printJob?.labels || [], [printJob]);
  const previewRow = barcodeRows[0] || {
    description: 'Track pant',
    other: 'Netplay',
    size: '34',
    rate: 599,
    barcode: '3515092636374',
    code: 'SKU-001',
  };
  const activeLabelPreset = getBarcodeLabelSizePreset(labelCustomization.labelSize);
  const activeLabelDesignHeight = getLabelDesignHeight(activeLabelPreset);

  useEffect(() => {
    localStorage.setItem(BARCODE_CUSTOMIZATION_KEY, JSON.stringify(labelCustomization));
  }, [labelCustomization]);

  function updateLabelCustomization(key, value) {
    setLabelCustomization((prev) => normalizeBarcodeCustomization({
      ...prev,
      elements: {
        ...prev.elements,
        [key]: { ...prev.elements[key], ...value },
      },
    }));
  }

  function updateLabelSize(labelSize) {
    setLabelCustomization((prev) => normalizeBarcodeCustomization({
      ...prev,
      labelSize,
    }));
  }

  function updateLabelManualText(key, value) {
    setLabelCustomization((prev) => normalizeBarcodeCustomization({
      ...prev,
      manualText: {
        ...(prev.manualText || {}),
        [key]: value,
      },
      elements: {
        ...prev.elements,
        ...(key === 'shopName' && value.trim()
          ? { shopName: { ...prev.elements.shopName, visible: true, z: nextLayer(prev.elements) } }
          : {}),
      },
    }));
  }

  function resetLabelCustomization() {
    setLabelCustomization(DEFAULT_BARCODE_CUSTOMIZATION);
  }

  function nextLayer(elements = labelCustomization.elements) {
    return Math.max(0, ...Object.values(elements).map((element) => Number(element.z) || 0)) + 1;
  }

  function bringLabelElementToFront(key) {
    updateLabelCustomization(key, { visible: true, z: nextLayer() });
  }

  function removeLabelElement(key) {
    updateLabelCustomization(key, { visible: false });
  }

  function moveLabelElement(key, x, y) {
    const element = labelCustomization.elements[key];
    if (!element) return;
    updateLabelCustomization(key, {
      x: Math.max(0, Math.min(LABEL_DESIGN_WIDTH - element.w, Math.round(x))),
      y: Math.max(0, Math.min(activeLabelDesignHeight - element.h, Math.round(y))),
    });
  }

  function startElementDrag(event, key) {
    const element = labelCustomization.elements[key];
    const surface = designerRef.current;
    if (!element || !surface) return;
    bringLabelElementToFront(key);
    const surfaceRect = surface.getBoundingClientRect();
    const scaleX = LABEL_DESIGN_WIDTH / surfaceRect.width;
    const scaleY = activeLabelDesignHeight / surfaceRect.height;
    interactionRef.current = {
      type: 'move',
      key,
      offsetX: (event.clientX - surfaceRect.left) * scaleX - element.x,
      offsetY: (event.clientY - surfaceRect.top) * scaleY - element.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function startElementResize(event, key) {
    event.stopPropagation();
    const element = labelCustomization.elements[key];
    const surface = designerRef.current;
    if (!element || !surface) return;
    bringLabelElementToFront(key);
    const surfaceRect = surface.getBoundingClientRect();
    const scaleX = LABEL_DESIGN_WIDTH / surfaceRect.width;
    const scaleY = activeLabelDesignHeight / surfaceRect.height;
    interactionRef.current = {
      type: 'resize',
      key,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startW: element.w,
      startH: element.h,
      scaleX,
      scaleY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function resizeLabelElement(key, width, height) {
    const element = labelCustomization.elements[key];
    if (!element) return;
    const minWidth = key === 'barcode' ? 80 : 40;
    const minHeight = key === 'barcode' ? 28 : 12;
    updateLabelCustomization(key, {
      w: Math.max(minWidth, Math.min(LABEL_DESIGN_WIDTH - element.x, Math.round(width))),
      h: Math.max(minHeight, Math.min(activeLabelDesignHeight - element.y, Math.round(height))),
    });
  }

  function handleDesignerPointerMove(event) {
    if (!interactionRef.current || !designerRef.current) return;
    if (interactionRef.current.type === 'resize') {
      resizeLabelElement(
        interactionRef.current.key,
        interactionRef.current.startW + (event.clientX - interactionRef.current.startClientX) * interactionRef.current.scaleX,
        interactionRef.current.startH + (event.clientY - interactionRef.current.startClientY) * interactionRef.current.scaleY,
      );
      return;
    }
    const surfaceRect = designerRef.current.getBoundingClientRect();
    const scaleX = LABEL_DESIGN_WIDTH / surfaceRect.width;
    const scaleY = activeLabelDesignHeight / surfaceRect.height;
    moveLabelElement(
      interactionRef.current.key,
      (event.clientX - surfaceRect.left) * scaleX - interactionRef.current.offsetX,
      (event.clientY - surfaceRect.top) * scaleY - interactionRef.current.offsetY,
    );
  }

  function endElementDrag() {
    interactionRef.current = null;
  }

  function handleFieldDragStart(event, key) {
    event.dataTransfer.setData('text/plain', key);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleDesignerDrop(event) {
    event.preventDefault();
    const key = event.dataTransfer.getData('text/plain');
    const element = labelCustomization.elements[key];
    const surface = designerRef.current;
    if (!key || !element || !surface) return;
    const surfaceRect = surface.getBoundingClientRect();
    const x = (event.clientX - surfaceRect.left) / surfaceRect.width * LABEL_DESIGN_WIDTH - element.w / 2;
    const y = (event.clientY - surfaceRect.top) / surfaceRect.height * activeLabelDesignHeight - element.h / 2;
    updateLabelCustomization(key, {
      visible: true,
      z: nextLayer(),
      x: Math.max(0, Math.min(LABEL_DESIGN_WIDTH - element.w, Math.round(x))),
      y: Math.max(0, Math.min(activeLabelDesignHeight - element.h, Math.round(y))),
    });
  }

  function loadProducts() {
    setLoading(true);
    setError('');
    const params = { page, limit: LIMIT, itemType };
    if (search) params.search = search;
    api.invListProducts(params)
      .then((res) => {
        setProducts(Array.isArray(res.data) ? res.data : []);
        setTotal(res.total);
      })
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadProducts(); }, [search, itemType, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!printRows.length) return undefined;
    let counted = false;
    let cancelled = false;
    let objectUrl = '';
    let printFrame = null;
    const cleanup = () => {
      if (counted || cancelled) return;
      counted = true;
      if (window.confirm('Did the barcode labels print successfully?')) {
        recordPrintedCounts(printJob?.increments || []);
      }
      setPrintJob(null);
    };
    const waitForPrintClose = () => {
      window.setTimeout(() => {
        window.addEventListener('focus', cleanup, { once: true });
        window.addEventListener('afterprint', cleanup, { once: true });
        printFrame?.contentWindow?.addEventListener?.('afterprint', cleanup, { once: true });
      }, 500);
    };
    pdf(<BarcodePdfDocument rows={printRows} customization={labelCustomization} />)
      .toBlob()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        printFrame = document.createElement('iframe');
        printFrame.title = 'Barcode labels';
        printFrame.style.position = 'fixed';
        printFrame.style.left = '-12000px';
        printFrame.style.top = '0';
        printFrame.style.width = '1px';
        printFrame.style.height = '1px';
        printFrame.style.border = '0';
        printFrame.onload = () => {
          if (cancelled) return;
          window.setTimeout(() => {
            if (cancelled) return;
            waitForPrintClose();
            try {
              printFrame.contentWindow.focus();
              printFrame.contentWindow.print();
            } catch {
              window.open(objectUrl, '_blank', 'noopener,noreferrer');
            }
          }, 350);
        };
        printFrame.src = objectUrl;
        document.body.appendChild(printFrame);
      })
      .catch((err) => {
        alert(err.message || 'Unable to prepare barcode labels. Please try again.');
        setPrintJob(null);
      });
    return () => {
      cancelled = true;
      if (printFrame?.parentNode) printFrame.parentNode.removeChild(printFrame);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [printRows, printJob, labelCustomization]);

  function handleSaved(updated) {
    setEditing(null);
    setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  }

  async function recordPrintedCounts(increments = []) {
    const validIncrements = increments.filter((item) => item?.id && Number(item.count) > 0);
    if (!validIncrements.length) return;
    try {
      const updatedById = new Map();
      for (const item of validIncrements) {
        const updated = await api.invRecordBarcodePrint(item.id, {
          count: item.count,
          ...(Number.isInteger(item.variantIndex) ? { variantIndex: item.variantIndex } : {}),
        });
        updatedById.set(updated._id, updated);
      }
      setProducts((prev) => prev.map((product) => updatedById.get(product._id) || product));
    } catch (err) {
      alert(err.message || 'Printed count was not saved');
    }
  }

  function buildPrintIncrement(row, count) {
    return {
      id: row.parentId || row._id,
      variantIndex: Number.isInteger(row.variantIndex) ? row.variantIndex : undefined,
      count,
    };
  }

  function printSingleLabel(row) {
    const availableQty = Math.max(0, Math.floor(Number(row.quantity) || 0));
    const defaultCount = availableQty > 0 ? availableQty : 2;
    const input = window.prompt('How many barcode labels do you want to print?', String(defaultCount));
    if (input == null) return;
    const labelCount = Math.max(0, Math.floor(Number(input)));
    if (!Number.isFinite(labelCount) || labelCount <= 0) {
      alert('Enter a valid number greater than 0');
      return;
    }
    setPrintJob({ layout: 'thermal80', labels: labelsForRows([row], () => labelCount), increments: [buildPrintIncrement(row, labelCount)] });
  }

  async function resetPrintedCounts() {
    if (!window.confirm('Clear all printed counts for this tab?')) return;
    try {
      await api.invResetBarcodePrintCounts({ itemType });
      loadProducts();
    } catch (err) {
      alert(err.message || 'Printed counts were not reset');
    }
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    api.invDeleteProduct(id)
      .then(() => setProducts((prev) => prev.filter((p) => p._id !== id)))
      .catch(() => alert('Failed to delete product'));
  }

  const labelElements = [
    { key: 'shopName', label: 'Shop / Brand', value: labelCustomization.manualText?.shopName || '' },
    { key: 'productName', label: 'Product', value: previewRow.description || '-' },
    { key: 'brandName', label: 'Brand', value: barcodeBrandLabel(previewRow) || 'Brand' },
    { key: 'variant', label: 'Variant', value: printVariantLabel(previewRow) },
    { key: 'price', label: 'Price', value: formatLabelPrice(previewRow) || '₹599.00' },
    { key: 'barcode', label: 'Barcode', value: previewRow.barcode || '' },
    { key: 'barcodeNumber', label: 'Number', value: normalizeBarcodeValue(previewRow.barcode || '') },
  ];

  function previewElementClass(key) {
    if (key === 'productName') return 'font-normal text-[12px] text-[#111827] text-center';
    if (key === 'shopName') return 'font-extrabold text-[10px] text-[#111827] text-center';
    if (key === 'variant') return 'font-extrabold text-[11px] text-[#111827]';
    if (key === 'price') return 'font-extrabold text-[11px] text-[#111827]';
    if (key === 'barcodeNumber') return 'text-[10px] tracking-[0.04em] text-[#475569]';
    return 'text-[10px] text-[#475569]';
  }

  function renderDesignerElement(item) {
    const element = labelCustomization.elements[item.key];
    if (!element?.visible) return null;
    const style = {
      left: `${element.x / LABEL_DESIGN_WIDTH * 100}%`,
      top: `${element.y / activeLabelDesignHeight * 100}%`,
      width: `${element.w / LABEL_DESIGN_WIDTH * 100}%`,
      height: `${element.h / activeLabelDesignHeight * 100}%`,
      textAlign: item.key === 'barcodeNumber' ? element.align || 'center' : undefined,
    };
    return (
      <div
        key={item.key}
        className={`absolute select-none overflow-hidden rounded-sm border border-dashed border-blue-300 bg-blue-50/40 px-1 leading-tight cursor-move ${previewElementClass(item.key)}`}
        style={{ ...style, zIndex: element.z || 1 }}
        onPointerDown={(event) => startElementDrag(event, item.key)}
      >
        {item.key === 'barcode'
          ? <Code39Barcode value={item.value} height={Math.max(18, element.h - 8)} width="100%" />
          : item.value}
        <span
          className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize border-b-2 border-r-2 border-blue-500 bg-white/80"
          onPointerDown={(event) => startElementResize(event, item.key)}
          title="Resize"
        />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="p-7">
      {editing && <EditModal product={editing} onSave={handleSaved} onClose={() => setEditing(null)} />}
      {printRows.length > 0 && (
        <div className="barcode-print-area barcode-print-thermal80">
          <div className="barcode-print-sheet">
            {printRows.map((row) => {
              const barcodeVal = row.barcode || '';
              return (
                <div className="barcode-label-card" key={row.printKey || row.rowKey || row._id}>
                  <div className="barcode-label-main">
                    <div className="barcode-label-top">
                      <div>
                        <div className="barcode-label-name">{row.description}</div>
                        <div className="barcode-label-meta">{printVariantLabel(row)}</div>
                      </div>
                      {formatLabelPrice(row) && <div className="barcode-label-price">{formatLabelPrice(row)}</div>}
                    </div>
                    <Code39Barcode value={barcodeVal} height={38} />
                    <div className="barcode-label-code">{normalizeBarcodeValue(barcodeVal)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-5">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Barcode</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Generate and manage barcodes for products</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-md cursor-pointer hover:bg-blue-100 font-[inherit]"
            type="button"
            onClick={() => setShowDesigner(true)}
          >
            Customize
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-md cursor-pointer hover:bg-red-100 font-[inherit]"
            type="button"
            onClick={resetPrintedCounts}
            disabled={!barcodeRows.length}
          >
            Reset Printed
          </button>
        </div>
      </div>

      {showDesigner && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 px-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-xl border border-[#dfe7f1] bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[#edf2f7] px-5 py-4">
              <div>
                <div className="text-[17px] font-bold text-[#111827]">Barcode Designer</div>
                <div className="text-[12px] text-[#536173]">Drag each part inside the fixed 80mm label. The same position is used while printing.</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#374151] hover:bg-gray-50 font-[inherit]" onClick={resetLabelCustomization}>Reset</button>
                <button type="button" className="rounded-md border border-blue-600 bg-blue-600 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700 font-[inherit]" onClick={() => setShowDesigner(false)}>Done</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-[1fr_360px]">
              <div className="rounded-xl border border-[#dfe7f1] bg-white p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1 rounded-lg border border-[#edf2f7] bg-[#f8fafc] px-3 py-2 text-[13px] font-medium text-[#374151]">
                    Sticker size
                    <select
                      className="h-9 rounded-md border border-[#dbe4ef] bg-white px-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]"
                      value={labelCustomization.labelSize}
                      onChange={(event) => updateLabelSize(event.target.value)}
                    >
                      {BARCODE_LABEL_SIZE_PRESETS.map((preset) => (
                        <option key={preset.key} value={preset.key}>{preset.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 rounded-lg border border-[#edf2f7] bg-[#f8fafc] px-3 py-2 text-[13px] font-medium text-[#374151]">
                    Shop / Brand text
                    <input
                      className="h-9 rounded-md border border-[#dbe4ef] bg-white px-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]"
                      value={labelCustomization.manualText?.shopName || ''}
                      onChange={(event) => updateLabelManualText('shopName', event.target.value)}
                      placeholder="Type shop or brand name"
                    />
                  </label>
                  {labelElements.map((item) => {
                    const element = labelCustomization.elements[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        draggable
                        onDragStart={(event) => handleFieldDragStart(event, item.key)}
                        onClick={() => bringLabelElementToFront(item.key)}
                        className={`rounded-lg border px-3 py-2 text-left font-[inherit] cursor-grab active:cursor-grabbing ${element?.visible ? 'border-blue-200 bg-blue-50' : 'border-[#edf2f7] bg-[#f8fafc]'}`}
                        title="Drag this field onto the label"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold text-[#374151]">{item.label}</span>
                          <span className="text-[10px] font-semibold uppercase text-[#64748b]">{element?.visible ? 'On label' : 'Drag to add'}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-[#64748b]">
                          X {element?.x ?? 0}, Y {element?.y ?? 0}, W {element?.w ?? 0}, H {element?.h ?? 0}
                        </div>
                        {element?.visible && (
                          <span
                            role="button"
                            tabIndex={0}
                            className="mt-2 inline-flex rounded-md border border-red-100 bg-white px-2 py-1 text-[11px] font-semibold text-red-600"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeLabelElement(item.key);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                removeLabelElement(item.key);
                              }
                            }}
                          >
                            Remove
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <label className="flex flex-col gap-1 rounded-lg border border-[#edf2f7] bg-[#f8fafc] px-3 py-2 text-[13px] font-medium text-[#374151]">
                    Barcode number alignment
                    <select className="h-9 rounded-md border border-[#dbe4ef] bg-white px-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" value={labelCustomization.elements.barcodeNumber.align || 'center'} onChange={(e) => updateLabelCustomization('barcodeNumber', { align: e.target.value })} disabled={!labelCustomization.elements.barcodeNumber.visible}>
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-[#dfe7f1] bg-white p-4">
                <div className="mb-3 text-[13px] font-bold text-[#111827]">Drag Preview</div>
                <div ref={designerRef} className="relative mx-auto touch-none overflow-hidden border border-[#cbd5e1] bg-white text-[#111827]" style={{ width: LABEL_DESIGN_WIDTH, height: activeLabelDesignHeight }} onPointerMove={handleDesignerPointerMove} onPointerUp={endElementDrag} onPointerCancel={endElementDrag} onDragOver={(event) => event.preventDefault()} onDrop={handleDesignerDrop}>
                  {labelElements.slice().sort((a, b) => (labelCustomization.elements[a.key]?.z || 0) - (labelCustomization.elements[b.key]?.z || 0)).map(renderDesignerElement)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7] flex-wrap">
          <ItemTypeTabs value={itemType} onChange={(t) => { setItemType(t); setPage(1); }} />
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
              <circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/>
            </svg>
            <input
              className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {error && (
          <div className="px-5 py-4 text-[13px] text-red-600">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Product Name</th>
                <th className={TH}>SKU / Code</th>
                <th className={TH}>Barcode</th>
                <th className={TH}>Qty</th>
                <th className={TH}>Printed</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : barcodeRows.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-[#536173]">No products found</td></tr>
              ) : barcodeRows.map((row) => {
                const barcodeVal = row.barcode || '';
                return (
                  <tr key={row.rowKey || row._id} className="hover:bg-gray-50">
                    <td className={`${TD} font-medium text-[#111827]`}>
                      <div className="flex flex-col gap-0.5">
                        <span>{row.description}</span>
                        {row.variantLabel && <span className="text-[11px] font-medium text-[#536173]">{row.variantLabel}</span>}
                      </div>
                    </td>
                    <td className={`${TD} text-[#536173]`}>{row.code}</td>
                    <td className={TD}>
                      <div className="flex flex-col gap-0.5">
                        <Code39Barcode value={barcodeVal} />
                        <span className="text-[10px] text-[#536173] tracking-widest">{barcodeVal}</span>
                      </div>
                    </td>
                    <td className={`${TD} text-[#111827] font-semibold`}>{row.quantity}</td>
                    <td className={`${TD} text-[#111827] font-semibold`}>{row.printedCount}</td>
                    <td className={TD}>
                      <div className="flex items-center gap-1.5">
                        <button title="Print" aria-label="Print" onClick={() => printSingleLabel(row)} className={`${actionButtonClass} text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100`}><PrintIcon /></button>
                        <button title="Edit" aria-label="Edit" onClick={() => setEditing(row)} className={`${actionButtonClass} text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100`}><EditIcon /></button>
                        <button title="Delete" aria-label="Delete" onClick={() => handleDelete(row._id)} className={`${actionButtonClass} text-red-600 bg-red-50 border-red-200 hover:bg-red-100`}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#edf2f7] flex flex-wrap justify-between gap-2 text-[13px] text-[#536173]">
          <span>Showing {barcodeRows.length === 0 ? 0 : (page - 1) * LIMIT + 1} to {(page - 1) * LIMIT + barcodeRows.length} of {total} products</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40"
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >←</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`px-2.5 py-1 rounded text-[12px] font-[inherit] cursor-pointer border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`}
                type="button"
                onClick={() => setPage(p)}
              >{p}</button>
            ))}
            <button
              className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40"
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
