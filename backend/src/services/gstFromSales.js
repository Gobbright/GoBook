import { Invoice } from '../models/Invoice.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const OUTWARD_DOC_TYPES = ['invoice', 'bill-of-supply', 'e-invoice', 'e-way-bill', 'credit-note', 'debit-note'];
const PURCHASE_DOC_TYPES = ['purchase-entry'];

export const EMPTY_OUTWARD_ROWS = [
  { key: 'a', label: 'Outward taxable supplies (other than zero rated, nil rated and exempted)', taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'b', label: 'Outward taxable supplies (zero rated)', taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'c', label: 'Other outward supplies (nil rated, exempted)', taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'd', label: 'Inward supplies liable to reverse charge', taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'e', label: 'Non-GST outward supplies', taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
];

export const EMPTY_ITC_AVAILABLE = [
  { key: 'A(1)', label: 'Import of goods', cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'A(2)', label: 'Import of services', cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'A(3)', label: 'Inward supplies from ISD', cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'A(5)', label: 'All other ITC (incl. from GSTR-2B)', cgst: 0, sgst: 0, igst: 0, cess: 0 },
];

export const EMPTY_ITC_REVERSED = [
  { key: 'B(1)', label: 'As per Rule 42 & 43 of CGST Rules', cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { key: 'B(2)', label: 'Other reversals', cgst: 0, sgst: 0, igst: 0, cess: 0 },
];

function r2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function parsePeriod(period) {
  const [monthName, yearText] = String(period || '').trim().split(/\s+/);
  const monthIdx = MONTH_NAMES.findIndex((name) => name.toLowerCase() === String(monthName || '').toLowerCase());
  const year = Number(yearText);
  if (monthIdx === -1 || !year) return null;
  return {
    monthIdx,
    year,
    monthPrefix: `${year}-${String(monthIdx + 1).padStart(2, '0')}`,
  };
}

export function periodsForFy(fy) {
  const startYear = Number(String(fy || '').split('-')[0]);
  if (!startYear) return [];
  return Array.from({ length: 12 }, (_, index) => {
    const monthIdx = (3 + index) % 12;
    const year = monthIdx >= 3 ? startYear : startYear + 1;
    return `${MONTH_NAMES[monthIdx]} ${year}`;
  });
}

function taxMultiplier(documentType) {
  if (documentType === 'credit-note') return -1;
  return 1;
}

function shouldIncludeGst(documentType) {
  return documentType !== 'bill-of-supply';
}

function lineAmounts(item, isInterstate, includeGst, multiplier = 1) {
  const qty = Number(item.qty) || 1;
  const rate = Number(item.rate) || 0;
  const discount = Number(item.discount) || 0;
  const gstRate = includeGst ? Number(item.gstRate) || 0 : 0;
  const taxable = r2(rate * qty * (1 - discount / 100) * multiplier);
  const totalTax = r2(Math.abs(taxable) * gstRate / 100) * Math.sign(multiplier || 1);
  return {
    qty,
    rate: gstRate,
    taxable,
    cgst: isInterstate ? 0 : r2(totalTax / 2),
    sgst: isInterstate ? 0 : r2(totalTax / 2),
    igst: isInterstate ? r2(totalTax) : 0,
  };
}

function addTax(target, source) {
  target.taxable = r2((target.taxable || 0) + (source.taxable || 0));
  target.cgst = r2((target.cgst || 0) + (source.cgst || 0));
  target.sgst = r2((target.sgst || 0) + (source.sgst || 0));
  target.igst = r2((target.igst || 0) + (source.igst || 0));
  target.cess = r2((target.cess || 0) + (source.cess || 0));
}

function sumRows(rows, fields = ['taxable', 'cgst', 'sgst', 'igst', 'cess']) {
  return rows.reduce((acc, row) => {
    for (const field of fields) acc[field] = r2((acc[field] || 0) + (Number(row[field]) || 0));
    return acc;
  }, Object.fromEntries(fields.map((field) => [field, 0])));
}

async function findSalesDocsForPeriod(userId, period, documentTypes) {
  const parsed = parsePeriod(period);
  if (!parsed) return [];

  return Invoice.find({
    userId,
    documentType: { $in: documentTypes },
    'meta.date': { $regex: `^${parsed.monthPrefix}` },
  }).lean();
}

export async function buildGstr1FromSales({ userId, period, filingType = 'monthly', gstin }) {
  const docs = await findSalesDocsForPeriod(userId, period, OUTWARD_DOC_TYPES);
  const b2b = [];
  const b2csMap = {};
  const hsnMap = {};
  const noteTotals = {
    credit: { taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
    debit: { taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
  };

  for (const doc of docs) {
    const documentType = doc.documentType || 'invoice';
    const multiplier = taxMultiplier(documentType);
    const includeGst = shouldIncludeGst(documentType);
    const isInterstate = String(doc.supplyType || '').toLowerCase() === 'interstate';
    const customerGstin = String(doc.customer?.gstin || '').trim();
    const customerState = doc.customer?.state || '';
    const customerName = doc.customer?.name || '';
    const docTotal = { taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 };
    let dominantRate = 0;

    for (const item of doc.items ?? []) {
      const line = lineAmounts(item, isInterstate, includeGst, multiplier);
      dominantRate = line.rate || dominantRate;
      addTax(docTotal, line);

      const hsnCode = String(item.hsn || '9999').trim();
      const hsnKey = `${hsnCode}||${line.rate}`;
      if (!hsnMap[hsnKey]) {
        hsnMap[hsnKey] = {
          hsn: hsnCode,
          desc: item.description || '',
          uqc: item.unit || 'Nos',
          qty: 0,
          value: 0,
          taxable: 0,
          rate: line.rate,
          cgst: 0,
          sgst: 0,
          igst: 0,
        };
      }
      hsnMap[hsnKey].qty = r2(hsnMap[hsnKey].qty + (line.qty * multiplier));
      hsnMap[hsnKey].value = r2(hsnMap[hsnKey].value + line.taxable + line.cgst + line.sgst + line.igst);
      hsnMap[hsnKey].taxable = r2(hsnMap[hsnKey].taxable + line.taxable);
      hsnMap[hsnKey].cgst = r2(hsnMap[hsnKey].cgst + line.cgst);
      hsnMap[hsnKey].sgst = r2(hsnMap[hsnKey].sgst + line.sgst);
      hsnMap[hsnKey].igst = r2(hsnMap[hsnKey].igst + line.igst);
    }

    for (const charge of doc.charges ?? []) {
      const amount = Number(charge.amount) || 0;
      const gstRate = includeGst ? Number(charge.gstRate) || 0 : 0;
      const taxable = r2(amount * multiplier);
      const tax = r2(Math.abs(taxable) * gstRate / 100) * Math.sign(multiplier || 1);
      addTax(docTotal, {
        taxable,
        cgst: isInterstate ? 0 : r2(tax / 2),
        sgst: isInterstate ? 0 : r2(tax / 2),
        igst: isInterstate ? r2(tax) : 0,
        cess: 0,
      });
      dominantRate = gstRate || dominantRate;
    }

    if (documentType === 'credit-note') addTax(noteTotals.credit, docTotal);
    if (documentType === 'debit-note') addTax(noteTotals.debit, docTotal);

    const value = r2(docTotal.taxable + docTotal.cgst + docTotal.sgst + docTotal.igst);
    if (customerGstin) {
      b2b.push({
        gstin: customerGstin,
        name: customerName,
        invoiceNo: doc.number,
        date: doc.meta?.date || '',
        value,
        taxable: r2(docTotal.taxable),
        rate: dominantRate,
        cgst: r2(docTotal.cgst),
        sgst: r2(docTotal.sgst),
        igst: r2(docTotal.igst),
      });
    } else {
      const supplyType = isInterstate ? 'Interstate' : 'Intrastate';
      const key = `${customerState || 'N/A'}||${dominantRate}||${supplyType}`;
      if (!b2csMap[key]) {
        b2csMap[key] = { state: customerState || 'N/A', type: supplyType, supplyType, rate: dominantRate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      }
      b2csMap[key].taxable = r2(b2csMap[key].taxable + docTotal.taxable);
      b2csMap[key].cgst = r2(b2csMap[key].cgst + docTotal.cgst);
      b2csMap[key].sgst = r2(b2csMap[key].sgst + docTotal.sgst);
      b2csMap[key].igst = r2(b2csMap[key].igst + docTotal.igst);
    }
  }

  return {
    gstin,
    period,
    filingType,
    status: 'draft',
    b2b,
    b2cs: Object.values(b2csMap),
    hsn: Object.values(hsnMap),
    invoiceCount: docs.length,
    noteTotals,
    source: 'sales',
  };
}

export async function buildGstr3bFromSales({ userId, period, gstin }) {
  const gstr1 = await buildGstr1FromSales({ userId, period, gstin });
  const taxableRows = [...gstr1.b2b, ...gstr1.b2cs];
  const outward = EMPTY_OUTWARD_ROWS.map((row) => ({ ...row }));
  const rowA = outward.find((row) => row.key === 'a');
  addTax(rowA, sumRows(taxableRows));

  const purchases = await findSalesDocsForPeriod(userId, period, PURCHASE_DOC_TYPES);
  const itcAvailable = EMPTY_ITC_AVAILABLE.map((row) => ({ ...row }));
  const allOtherItc = itcAvailable.find((row) => row.key === 'A(5)');

  for (const purchase of purchases) {
    const isInterstate = String(purchase.supplyType || '').toLowerCase() === 'interstate';
    for (const item of purchase.items ?? []) {
      const line = lineAmounts(item, isInterstate, true, 1);
      allOtherItc.cgst = r2(allOtherItc.cgst + line.cgst);
      allOtherItc.sgst = r2(allOtherItc.sgst + line.sgst);
      allOtherItc.igst = r2(allOtherItc.igst + line.igst);
    }
    for (const charge of purchase.charges ?? []) {
      const amount = Number(charge.amount) || 0;
      const gstRate = Number(charge.gstRate) || 0;
      const tax = r2(amount * gstRate / 100);
      allOtherItc.cgst = r2(allOtherItc.cgst + (isInterstate ? 0 : tax / 2));
      allOtherItc.sgst = r2(allOtherItc.sgst + (isInterstate ? 0 : tax / 2));
      allOtherItc.igst = r2(allOtherItc.igst + (isInterstate ? tax : 0));
    }
  }

  return {
    gstin,
    period,
    status: 'draft',
    outwardRows: outward,
    itcAvailable,
    itcReversed: EMPTY_ITC_REVERSED.map((row) => ({ ...row })),
    lateFeeCgst: 0,
    lateFeeSgst: 0,
    purchaseCount: purchases.length,
    source: 'sales',
  };
}

export async function buildPurchaseReconciliationFromSales({ userId, period, gstin, type = '2b' }) {
  const purchases = await findSalesDocsForPeriod(userId, period, PURCHASE_DOC_TYPES);
  const entries = purchases.map((purchase) => {
    let itcBooks = 0;
    const isInterstate = String(purchase.supplyType || '').toLowerCase() === 'interstate';
    let invoiceValue = 0;

    for (const item of purchase.items ?? []) {
      const line = lineAmounts(item, isInterstate, true, 1);
      invoiceValue = r2(invoiceValue + line.taxable + line.cgst + line.sgst + line.igst);
      itcBooks = r2(itcBooks + line.cgst + line.sgst + line.igst);
    }

    for (const charge of purchase.charges ?? []) {
      const amount = Number(charge.amount) || 0;
      const gstRate = Number(charge.gstRate) || 0;
      const tax = r2(amount * gstRate / 100);
      invoiceValue = r2(invoiceValue + amount + tax);
      itcBooks = r2(itcBooks + tax);
    }

    return {
      supplier: purchase.customer?.name || 'Unknown Vendor',
      gstin: purchase.customer?.gstin || '',
      invoiceNo: purchase.extra?.vendorInvoiceNo || purchase.number,
      date: purchase.meta?.date || '',
      invoiceValue,
      itcBooks,
      itcGstr2b: 0,
      diff: itcBooks,
      status: itcBooks > 0 ? 'not_in_2b' : 'matched',
      resolution: 'none',
    };
  });

  return { gstin, period, type, entries, source: 'sales' };
}

export async function buildGstr9FromSales({ userId, fy, gstin }) {
  const periods = periodsForFy(fy);
  const gstr1Docs = await Promise.all(periods.map((period) => buildGstr1FromSales({ userId, period, gstin })));
  const gstr3bDocs = await Promise.all(periods.map((period) => buildGstr3bFromSales({ userId, period, gstin })));
  return { periods, gstr1Docs, gstr3bDocs };
}

export function taxTotal(rows = []) {
  return rows.reduce((sum, row) => sum + (Number(row.cgst) || 0) + (Number(row.sgst) || 0) + (Number(row.igst) || 0), 0);
}

export function mergeDraftGstr3b(saved, generated) {
  if (!saved) return generated;
  if (saved.status === 'filed') return saved;

  return {
    ...generated,
    ...saved,
    outwardRows: generated.outwardRows,
    itcAvailable: saved.itcAvailable?.length ? saved.itcAvailable : generated.itcAvailable,
    itcReversed: saved.itcReversed?.length ? saved.itcReversed : generated.itcReversed,
    lateFeeCgst: saved.lateFeeCgst ?? generated.lateFeeCgst,
    lateFeeSgst: saved.lateFeeSgst ?? generated.lateFeeSgst,
    source: 'sales+draft',
  };
}

