import { useEffect, useMemo, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { CheckCircle2, Monitor, ReceiptText, Smartphone } from 'lucide-react';

import { apiClient } from '../../../../../services/apiClient.js';
import { InvoiceReactPdfDocument } from '../../../retail/modules/sales/shared/InvoiceReactPdfDocument.jsx';
import {
  DEFAULT_NORMAL_INVOICE_DESIGN,
  getInvoiceThermalTemplate,
  updateInvoiceThermalTemplate,
} from '../../../../../utils/invoiceDesignSettings.js';

function notifySettingsUpdated(settings) {
  window.dispatchEvent(new CustomEvent('gobook:settings-updated', { detail: { settings } }));
}

const TEMPLATE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'a4', label: 'A4' },
  { key: 'standard', label: 'Standard' },
  { key: 'retail', label: 'Retail' },
  { key: 'thermal', label: '80mm' },
];

function normalDesign(template, elements) {
  return {
    ...DEFAULT_NORMAL_INVOICE_DESIGN,
    template,
    elements: {
      ...DEFAULT_NORMAL_INVOICE_DESIGN.elements,
      ...elements,
    },
  };
}

const A4_PROFESSIONAL_DESIGN = normalDesign('professional', {});
const A4_COMPACT_LEDGER_DESIGN = normalDesign('compact-ledger', {
  title: { visible: true, x: 20, y: 12, w: 380, h: 24, z: 1 },
  header: { visible: true, x: 20, y: 44, w: 250, h: 70, z: 2 },
  meta: { visible: true, x: 282, y: 44, w: 118, h: 92, z: 3 },
  party: { visible: true, x: 20, y: 124, w: 250, h: 62, z: 4 },
  items: { visible: true, x: 20, y: 196, w: 380, h: 224, z: 5 },
  amountWords: { visible: true, x: 20, y: 430, w: 250, h: 32, z: 6 },
  totals: { visible: true, x: 282, y: 430, w: 118, h: 72, z: 7 },
  bank: { visible: true, x: 20, y: 472, w: 162, h: 58, z: 8 },
  paymentQr: { visible: true, x: 196, y: 464, w: 62, h: 62, z: 9 },
  terms: { visible: true, x: 20, y: 538, w: 184, h: 36, z: 10 },
  notes: { visible: true, x: 216, y: 538, w: 184, h: 36, z: 11 },
  signature: { visible: true, x: 286, y: 520, w: 114, h: 24, z: 12 },
  footer: { visible: true, x: 20, y: 574, w: 380, h: 18, z: 13 },
});
const A4_MODERN_SPLIT_DESIGN = normalDesign('modern-split', {
  header: { visible: true, x: 20, y: 16, w: 210, h: 92, z: 1 },
  title: { visible: true, x: 246, y: 16, w: 154, h: 36, z: 2 },
  meta: { visible: true, x: 246, y: 60, w: 154, h: 104, z: 3 },
  party: { visible: true, x: 20, y: 116, w: 210, h: 82, z: 4 },
  items: { visible: true, x: 20, y: 214, w: 380, h: 192, z: 5 },
  totals: { visible: true, x: 278, y: 414, w: 122, h: 72, z: 6 },
  amountWords: { visible: true, x: 20, y: 414, w: 242, h: 42, z: 7 },
  bank: { visible: true, x: 20, y: 466, w: 140, h: 60, z: 8 },
  paymentQr: { visible: true, x: 174, y: 460, w: 70, h: 70, z: 9 },
  terms: { visible: true, x: 20, y: 536, w: 184, h: 38, z: 10 },
  notes: { visible: true, x: 216, y: 536, w: 184, h: 38, z: 11 },
  signature: { visible: true, x: 286, y: 494, w: 114, h: 28, z: 12 },
  footer: { visible: true, x: 20, y: 574, w: 380, h: 18, z: 13 },
});
const A4_RETAIL_DETAILED_DESIGN = normalDesign('retail-detailed', {
  title: { visible: true, x: 20, y: 14, w: 380, h: 26, z: 1 },
  header: { visible: true, x: 20, y: 48, w: 178, h: 96, z: 2 },
  meta: { visible: true, x: 210, y: 48, w: 190, h: 96, z: 3 },
  party: { visible: true, x: 20, y: 154, w: 380, h: 52, z: 4 },
  items: { visible: true, x: 20, y: 216, w: 380, h: 214, z: 5 },
  amountWords: { visible: true, x: 20, y: 440, w: 236, h: 34, z: 6 },
  totals: { visible: true, x: 268, y: 438, w: 132, h: 76, z: 7 },
  bank: { visible: true, x: 20, y: 484, w: 144, h: 48, z: 8 },
  paymentQr: { visible: true, x: 178, y: 478, w: 62, h: 62, z: 9 },
  terms: { visible: true, x: 20, y: 542, w: 184, h: 32, z: 10 },
  notes: { visible: true, x: 216, y: 542, w: 184, h: 32, z: 11 },
  signature: { visible: true, x: 286, y: 518, w: 114, h: 22, z: 12 },
  footer: { visible: true, x: 20, y: 574, w: 380, h: 18, z: 13 },
});

const INVOICE_TEMPLATE_CARDS = [
  {
    key: 'normal-professional',
    title: 'Normal - Professional',
    group: 'standard',
    tags: ['retail', 'a4'],
    invoicePrintFormat: 'normal',
    invoiceNormalTemplate: 'professional',
    invoiceThermalTemplate: 'standard',
    shape: 'normal',
    formatLabel: 'A4 invoice',
    description: 'Detailed tax invoice for email, PDF, and printed bills.',
    normalDesign: A4_PROFESSIONAL_DESIGN,
  },
  {
    key: 'normal-compact-ledger',
    title: 'A4 - Compact Ledger',
    group: 'standard',
    tags: ['retail', 'a4'],
    invoicePrintFormat: 'normal',
    invoiceNormalTemplate: 'compact-ledger',
    invoiceThermalTemplate: 'standard',
    shape: 'normalCompact',
    formatLabel: 'A4 invoice',
    description: 'Dense item table with compact header and accounting-friendly totals.',
    normalDesign: A4_COMPACT_LEDGER_DESIGN,
  },
  {
    key: 'normal-modern-split',
    title: 'A4 - Modern Split',
    group: 'standard',
    tags: ['retail', 'a4'],
    invoicePrintFormat: 'normal',
    invoiceNormalTemplate: 'modern-split',
    invoiceThermalTemplate: 'standard',
    shape: 'normalModern',
    formatLabel: 'A4 invoice',
    description: 'Balanced two-column header with clean customer and invoice sections.',
    normalDesign: A4_MODERN_SPLIT_DESIGN,
  },
  {
    key: 'normal-retail-detailed',
    title: 'A4 - Retail Detailed',
    group: 'retail',
    tags: ['retail', 'a4'],
    invoicePrintFormat: 'normal',
    invoiceNormalTemplate: 'retail-detailed',
    invoiceThermalTemplate: 'standard',
    shape: 'normalRetail',
    formatLabel: 'A4 invoice',
    description: 'Retail-friendly A4 bill with larger product area and clear payment blocks.',
    normalDesign: A4_RETAIL_DETAILED_DESIGN,
  },
  {
    key: 'thermal-standard',
    title: 'Default 80mm Bill',
    group: 'standard',
    tags: ['retail', 'thermal'],
    invoicePrintFormat: 'thermal80',
    invoiceThermalTemplate: 'standard',
    shape: 'thermalStandard',
    formatLabel: '80mm receipt',
    description: 'Your current default 80mm receipt layout for sales preview and printing.',
  },
  {
    key: 'thermal-boxed',
    title: 'POS Retail - Standard',
    group: 'retail',
    tags: ['thermal'],
    invoicePrintFormat: 'thermal80',
    invoiceThermalTemplate: 'boxed',
    shape: 'thermalBoxed',
    formatLabel: '80mm receipt',
    description: 'Boxed POS receipt with a stronger retail invoice structure.',
  },
];

function TemplateIcon({ template }) {
  if (template.invoicePrintFormat === 'normal') return <Monitor size={16} />;
  if (template.invoiceThermalTemplate === 'boxed') return <ReceiptText size={16} />;
  return <Smartphone size={16} />;
}

function activeNormalTemplate(settings = {}) {
  return settings.invoiceNormalTemplate
    || settings.invoiceDesignSettings?.normal?.template
    || 'professional';
}

function templatePreviewData(template) {
  const isThermal80 = template.invoicePrintFormat === 'thermal80';
  const invoiceDesignSettings = isThermal80
    ? updateInvoiceThermalTemplate({}, template.invoiceThermalTemplate)
    : { normal: template.normalDesign };
  const visibleItems = [
    { key: 'shirt', title: 'Cotton Shirt', lines: ['Cotton Shirt', 'HSN: 6205'], qty: '1', rate: 899, amount: 899 },
    { key: 'jeans', title: 'Denim Jeans', lines: ['Denim Jeans', 'Size: 32'], qty: '1', rate: 1299, amount: 1299 },
    { key: 'belt', title: 'Leather Belt', lines: ['Leather Belt'], qty: '1', rate: 399, amount: 399 },
    { key: 'bag', title: 'Shopping Bag', lines: ['Shopping Bag'], qty: '1', rate: 25, amount: 25 },
  ];
  const taxRows = [
    { label: 'CGST 2.5%', amount: 65.55 },
    { label: 'SGST 2.5%', amount: 65.55 },
  ];
  return {
    filename: `${template.key}.pdf`,
    printFormat: template.invoicePrintFormat,
    invoicePrintFormat: template.invoicePrintFormat,
    invoiceNormalTemplate: template.invoiceNormalTemplate,
    invoiceThermalTemplate: template.invoiceThermalTemplate,
    invoiceDesignSettings,
    isThermal80,
    previewTitle: 'TAX INVOICE',
    businessName: 'GoBook Business',
    businessDescription: 'Retail Store',
    businessAddress: ['12, Main Road', 'Chennai - 600001', 'Tamil Nadu'],
    bizPhone: '98765 43210',
    bizEmail: 'sales@gobook.in',
    bizGstin: '33ABCDE1234F1Z5',
    customerName: 'Walk-in Customer',
    customerAddress: ['Chennai, Tamil Nadu'],
    customerGstin: '',
    customerPhone: '90000 00000',
    visibleItems,
    taxRows,
    taxSummary: [{ rate: 5, taxable: 2622, cgst: 65.55, sgst: 65.55, totalTax: 131.1 }],
    visibleBankRows: [
      ['A/C No.', '1234567890'],
      ['IFSC', 'HDFC0001234'],
      ['Bank', 'HDFC Bank'],
    ],
    taxableTotal: 2622,
    roundOff: -0.1,
    finalTotal: 2753,
    amountWords: 'Rupees Two Thousand Seven Hundred Fifty Three only',
    termLines: ['Goods once sold will not be taken back.'],
    noteLines: ['Thank you for your business.'],
    showLogo: false,
    showAmountWords: true,
    showBankDetails: true,
    showPaymentQr: false,
    showTerms: true,
    showNotes: true,
    showSignature: true,
    showGoBookBranding: true,
    leftMeta: [
      { label: 'Invoice No.', value: 'INV-000124' },
      { label: 'P.O. No.', value: 'PO-1024' },
      { label: 'Challan No.', value: '' },
      { label: 'Bill Pay Status', value: 'Paid' },
      { label: 'Bill Credit', value: '0 Days' },
      { label: 'Location', value: 'Counter 1' },
    ],
    rightMeta: [
      { label: 'Invoice Date', value: '05 Oct 2026 11:56 AM' },
      { label: 'P.O. Date', value: '05 Oct 2026' },
      { label: 'Pay. Mode', value: 'UPI' },
      { label: 'Salesman', value: 'Counter 1' },
      { label: 'Due Date', value: '05 Oct 2026' },
      { label: 'Operator', value: 'Fradrick' },
    ],
  };
}

function InvoiceTemplateThumbnail({ template }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setPreviewUrl('');
    setFailed(false);
    pdf(<InvoiceReactPdfDocument data={templatePreviewData(template)} />)
      .toBlob()
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [template]);

  const isThermal80 = template.invoicePrintFormat === 'thermal80';
  const frameWidth = isThermal80 ? 'w-[178px]' : 'w-[210px]';
  const pageLabel = isThermal80 ? '80mm receipt preview' : 'A4 invoice preview';

  return (
    <div className={`mx-auto grid h-[300px] ${frameWidth} place-items-center overflow-hidden bg-[#eef2f7] p-2`}>
      {previewUrl ? (
        <iframe
          title={`${template.title} ${pageLabel}`}
          src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          className="h-full w-full border-0 bg-white shadow-sm"
          tabIndex={-1}
          aria-label={pageLabel}
          style={{ pointerEvents: 'none' }}
        />
      ) : (
        <div className="grid h-full w-full place-items-center border border-dashed border-[#cbd5e1] bg-white text-[11px] font-semibold text-[#64748b]">
          {failed ? 'Preview unavailable' : 'Preparing preview...'}
        </div>
      )}
    </div>
  );
}

function renderTemplateThumbnail(template) {
  return <InvoiceTemplateThumbnail template={template} />;
}

export function TemplatesPage() {
  const [settings, setSettings] = useState(null);
  const [savingKey, setSavingKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [templateFilter, setTemplateFilter] = useState('all');

  useEffect(() => {
    apiClient('/settings')
      .then((data) => setSettings(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredTemplates = useMemo(
    () => INVOICE_TEMPLATE_CARDS.filter((template) => (
      templateFilter === 'all' || template.group === templateFilter || template.tags.includes(templateFilter)
    )),
    [templateFilter],
  );
  const templateCount = (filter) => INVOICE_TEMPLATE_CARDS.filter((template) => (
    filter.key === 'all' || template.group === filter.key || template.tags.includes(filter.key)
  )).length;

  function isTemplateSelected(template) {
    if (!settings) return false;
    if (template.invoicePrintFormat === 'normal') {
      return activeNormalTemplate(settings) === template.invoiceNormalTemplate;
    }
    return getInvoiceThermalTemplate(settings) === template.invoiceThermalTemplate;
  }

  function normalizedDesignSettings(source = {}) {
    if (typeof source.invoiceDesignSettings === 'string') {
      try {
        return JSON.parse(source.invoiceDesignSettings);
      } catch {
        return {};
      }
    }
    return source.invoiceDesignSettings || {};
  }

  async function applyInvoiceTemplate(template) {
    if (!settings) return;
    const currentDesignSettings = normalizedDesignSettings(settings);
    const nextDesignSettings = template.invoicePrintFormat === 'normal'
      ? {
        ...currentDesignSettings,
        normal: template.normalDesign,
      }
      : updateInvoiceThermalTemplate(settings, template.invoiceThermalTemplate);
    const next = {
      ...settings,
      invoicePrintFormat: template.invoicePrintFormat,
      invoiceNormalTemplate: template.invoicePrintFormat === 'normal' ? template.invoiceNormalTemplate : activeNormalTemplate(settings),
      invoiceThermalTemplate: template.invoicePrintFormat === 'thermal80' ? template.invoiceThermalTemplate : getInvoiceThermalTemplate(settings),
      invoiceDesignSettings: nextDesignSettings,
    };
    setSavingKey(template.key);
    setSettings(next);
    notifySettingsUpdated(next);
    try {
      const updated = await apiClient('/settings', { method: 'PUT', body: JSON.stringify(next) });
      setSettings(updated);
      notifySettingsUpdated(updated);
    } catch {
      setSettings(settings);
      notifySettingsUpdated(settings);
    } finally {
      setSavingKey('');
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5">
        <div>
          <nav className="mb-1 flex items-center gap-1 text-[13px] text-[#536173]">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>&gt;</span><span>Settings</span><span>&gt;</span><span>Templates</span>
          </nav>
          <h1 className="m-0 text-[24px] font-bold text-[#071936]">Templates</h1>
          <p className="m-0 mt-1 text-[13px] text-[#536173]">Choose the bill and invoice template used across sales documents.</p>
          {loading && <p className="mt-1 text-xs text-blue-500">Loading templates...</p>}
        </div>
      </div>

      <div className="rounded-md border border-[#dfe7f1] bg-white shadow-sm">
        <div className="flex gap-2 overflow-x-auto border-b border-[#e5e7eb] bg-[#fbfdff] px-4 py-3">
          {TEMPLATE_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setTemplateFilter(filter.key)}
              className={`flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold font-[inherit] cursor-pointer transition-colors ${templateFilter === filter.key ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-[#e5e7eb] bg-white text-[#374151] hover:border-blue-200 hover:text-blue-700'}`}
            >
              <span>{filter.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${templateFilter === filter.key ? 'bg-white text-blue-700' : 'bg-[#f1f5f9] text-[#64748b]'}`}>{templateCount(filter)}</span>
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="m-0 text-[18px] font-semibold uppercase tracking-wide text-[#111827]">Retail</h2>
            <span className="text-[12px] font-medium text-[#64748b]">{filteredTemplates.length} templates</span>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((template) => {
              const selected = isTemplateSelected(template);
              const saving = savingKey === template.key;
              return (
                <button
                  key={template.key}
                  type="button"
                  disabled={loading || Boolean(savingKey)}
                  onClick={() => applyInvoiceTemplate(template)}
                  className={`group overflow-hidden rounded-md border bg-white text-left font-[inherit] cursor-pointer shadow-sm transition-all disabled:opacity-60 ${selected ? 'border-blue-500 shadow-[0_0_0_2px_rgba(37,99,235,.14)]' : 'border-[#e5e7eb] hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md'}`}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-[#eef2f7] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`grid h-8 w-8 place-items-center rounded-md ${selected ? 'bg-blue-50 text-blue-700' : 'bg-[#f1f5f9] text-[#475569]'}`}>
                        <TemplateIcon template={template} />
                      </span>
                      <span className="text-[12px] font-bold uppercase tracking-wide text-[#64748b]">{template.formatLabel}</span>
                    </div>
                    {selected && <CheckCircle2 size={18} className="text-blue-600" />}
                  </div>
                  <div className="grid h-[340px] place-items-center bg-[#f8fafc] px-4 py-5">
                    <div className="origin-center scale-[.88]">
                      {renderTemplateThumbnail(template)}
                    </div>
                  </div>
                  <div className="border-t border-[#eef2f7] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[16px] font-semibold text-[#111827]">{template.title}</div>
                        <div className="mt-1 min-h-[36px] text-[12.5px] leading-relaxed text-[#64748b]">{template.description}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${selected ? 'bg-blue-50 text-blue-700' : 'bg-[#f1f5f9] text-[#475569]'}`}>
                        {saving ? 'Saving' : selected ? 'Selected' : 'Available'}
                      </span>
                      <span className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${selected ? 'bg-blue-600 text-white' : 'bg-[#111827] text-white group-hover:bg-blue-600'}`}>
                        {selected ? 'In use' : 'Use template'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
