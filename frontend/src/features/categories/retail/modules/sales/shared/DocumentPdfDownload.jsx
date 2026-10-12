import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../../../../services/api.js';
import { documentConfigs } from '../documentConfigs.js';
import { DocumentPreviewModal } from './DocumentPreviewModal.jsx';

export function calcDocumentTotals(items = [], charges = [], additionalDiscount, tds, tcs, advanceReceived, showGst = true) {
  const acc = { subtotal: 0, discount: 0, taxable: 0, totalGst: 0, grandTotal: 0, gstByRate: {} };

  items.forEach((item) => {
    const gross = (Number(item.qty) || 0) * (Number(item.rate) || 0);
    const discountAmt = gross * ((Number(item.discount) || 0) / 100);
    const taxable = gross - discountAmt;
    const gstAmt = showGst ? taxable * ((Number(item.gstRate) || 0) / 100) : 0;
    const rate = Number(item.gstRate) || 0;

    acc.subtotal += gross;
    acc.discount += discountAmt;
    acc.taxable += taxable;
    acc.totalGst += gstAmt;
    acc.grandTotal += taxable + gstAmt;
    if (!acc.gstByRate[rate]) acc.gstByRate[rate] = { taxable: 0, gst: 0 };
    acc.gstByRate[rate].taxable += taxable;
    acc.gstByRate[rate].gst += gstAmt;
  });

  const chargesSubtotal = charges.reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0);
  const chargesGst = showGst
    ? charges.reduce((sum, charge) => sum + (Number(charge.amount) || 0) * ((Number(charge.gstRate) || 0) / 100), 0)
    : 0;

  const preDisc = showGst
    ? acc.grandTotal + chargesSubtotal + chargesGst
    : acc.taxable + chargesSubtotal;
  const addDiscAmt = additionalDiscount?.value
    ? (additionalDiscount.type === 'percent'
      ? preDisc * (Number(additionalDiscount.value) / 100)
      : Math.min(Number(additionalDiscount.value), preDisc))
    : 0;
  const invoiceTotal = preDisc - addDiscAmt;
  const tdsAmt = tds?.enabled ? acc.taxable * ((Number(tds.rate) || 0) / 100) : 0;
  const tcsAmt = tcs?.enabled ? invoiceTotal * ((Number(tcs.rate) || 0) / 100) : 0;
  const netPayable = invoiceTotal - tdsAmt + tcsAmt;
  const roundOff = Math.round(netPayable) - netPayable;
  const finalTotal = Math.round(netPayable);
  const balanceDue = finalTotal - (Number(advanceReceived) || 0);

  return { ...acc, chargesSubtotal, chargesGst, preDisc, addDiscAmt, invoiceTotal, tdsAmt, tcsAmt, netPayable, roundOff, finalTotal, balanceDue };
}

function applySavedTotalOverride(calculatedTotals, savedTotals) {
  if (!savedTotals?.manualTotalOverride) return calculatedTotals;
  const finalTotal = Number(savedTotals.finalTotal ?? savedTotals.manualTotal);
  if (!Number.isFinite(finalTotal) || finalTotal < 0) return calculatedTotals;
  return {
    ...calculatedTotals,
    calculatedFinalTotal: savedTotals.calculatedFinalTotal ?? calculatedTotals.finalTotal,
    finalTotal,
    manualTotal: finalTotal,
    manualTotalOverride: true,
    roundOff: finalTotal - calculatedTotals.netPayable,
    balanceDue: calculatedTotals.balanceDue + (finalTotal - calculatedTotals.finalTotal),
  };
}

function normalizeProduct(product = {}) {
  const description = product.description || product.name || product.productName || '';
  return {
    ...product,
    _id: product._id ?? product.id ?? description,
    id: product.id ?? product._id ?? description,
    description,
    code: product.code || product.sku || '',
  };
}

function findCatalogProductForItem(products = [], item = {}) {
  const text = (value) => String(value || '').trim().toLowerCase();
  const productId = item.productId ? String(item.productId) : '';
  const code = text(item.productCode || item.code);
  const description = text(item.description);
  return products.find((product) => productId && String(product._id || product.id) === productId)
    || products.find((product) => code && text(product.code) === code)
    || products.find((product) => description && text(product.description) === description)
    || null;
}

function catalogVariantForItem(product = {}, item = {}) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (!variants.length) return null;
  const text = (value) => String(value || '').trim().toLowerCase();
  const size = text(item.size || item.modelName || item.modelNumber);
  const barcode = text(item.barcode);
  const rate = Number(item.rate) || 0;
  return variants.find((variant) => barcode && text(variant.barcode) === barcode && (!size || text(variant.size || variant.modelName) === size))
    || variants.find((variant) => size && text(variant.size || variant.modelName) === size && (!rate || Number(variant.rate) === rate))
    || variants.find((variant) => size && text(variant.size || variant.modelName) === size)
    || null;
}

function hydrateItemsWithCatalogVariantAttrs(items = [], products = []) {
  if (!Array.isArray(items) || !items.length || !Array.isArray(products) || !products.length) return items;
  return items.map((item) => {
    if (item.itemType === 'Service') return item;
    const product = findCatalogProductForItem(products, item);
    if (!product) return item;
    const variant = catalogVariantForItem(product, item) || {};
    return {
      ...item,
      brand: item.brand || item.other || item.variantBrand || variant.other || variant.brand || product.brand || '',
      material: item.material || item.fabric || item.variantMaterial || variant.material || variant.fabric || product.material || product.fabric || '',
      size: item.size || item.modelName || item.modelNumber || variant.size || variant.modelName || '',
      barcode: item.barcode || variant.barcode || '',
    };
  });
}

export function DocumentPdfDownload({ doc, bizSettings, onDone }) {
  const docBizSettings = doc.businessSettings || doc.businessSettingsSnapshot || null;
  const mergeTemplateSettings = (base = {}, current = {}) => ({
    ...base,
    ...current,
    invoicePrintFormat: current?.invoicePrintFormat || base?.invoicePrintFormat || 'normal',
    invoiceThermalTemplate: current?.invoiceThermalTemplate || current?.invoiceDesignSettings?.thermal80?.template || base?.invoiceThermalTemplate || base?.invoiceDesignSettings?.thermal80?.template || 'standard',
  });
  const [effectiveBizSettings, setEffectiveBizSettings] = useState(mergeTemplateSettings(docBizSettings || {}, bizSettings || {}));
  const [settingsReady, setSettingsReady] = useState(Boolean(docBizSettings || !doc.branch));
  const [products, setProducts] = useState([]);
  const documentType = doc.documentType || 'invoice';
  const config = documentConfigs[documentType] ?? documentConfigs.invoice;
  const docMeta = {
    ...doc.meta,
    number: doc.number,
    date: doc.meta?.date || doc.date || doc.createdAt,
  };
  const totals = useMemo(() => {
    const calculated = calcDocumentTotals(
      doc.items || [],
      doc.charges || [],
      doc.additionalDiscount,
      doc.tds,
      doc.tcs,
      doc.advanceReceived,
      config.showGst,
    );
    return applySavedTotalOverride(calculated, doc.totals);
  }, [doc, config.showGst]);

  useEffect(() => {
    let active = true;
    if (docBizSettings) {
      setEffectiveBizSettings(mergeTemplateSettings(docBizSettings, bizSettings || {}));
      setSettingsReady(true);
      return () => { active = false; };
    }
    if (!doc.branch) {
      setEffectiveBizSettings(mergeTemplateSettings({}, bizSettings || {}));
      setSettingsReady(true);
      return () => { active = false; };
    }
    setSettingsReady(false);
    api.getSettings({ branch: doc.branch })
      .then((settings) => {
        if (active) {
          setEffectiveBizSettings(mergeTemplateSettings(settings, bizSettings || {}));
          setSettingsReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setEffectiveBizSettings(mergeTemplateSettings({}, bizSettings || {}));
          setSettingsReady(true);
        }
      });
    return () => { active = false; };
  }, [docBizSettings, doc.branch, bizSettings]);

  useEffect(() => {
    let active = true;
    api.invListProducts()
      .then((res) => {
        const rows = Array.isArray(res) ? res : res?.data;
        if (active) setProducts(Array.isArray(rows) ? rows.map(normalizeProduct) : []);
      })
      .catch(() => {
        if (active) setProducts([]);
      });
    return () => { active = false; };
  }, []);

  const displayItems = useMemo(
    () => hydrateItemsWithCatalogVariantAttrs(doc.items || [], products),
    [doc.items, products],
  );

  if (!settingsReady) return null;

  return (
    <div className="pdf-download-stage">
      <DocumentPreviewModal
        embedded
        config={config}
        customer={doc.customer || {}}
        docMeta={docMeta}
        docExtra={doc.extra || {}}
        items={displayItems}
        charges={doc.charges || []}
        totals={totals}
        notes={doc.notes || ''}
        terms={doc.terms || ''}
        supplyType={doc.supplyType || 'intrastate'}
        bizSettings={effectiveBizSettings}
        shipping={doc.shipping || {}}
        sameShipping={doc.shipping?.sameAsBilling ?? true}
        tds={doc.tds}
        tcs={doc.tcs}
        advanceAmt={doc.advanceReceived || 0}
        paymentMethod={doc.paymentMethod || ''}
        paymentSplits={doc.paymentSplits || []}
        addDiscount={doc.additionalDiscount}
        downloadAsPdf
        pdfMode
        invoiceNumber={docMeta.number}
        onPdfDownloaded={onDone}
      />
    </div>
  );
}
