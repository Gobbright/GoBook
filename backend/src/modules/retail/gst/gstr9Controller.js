import { Gstr3b } from '../../../models/Gstr3b.js';
import {
  buildGstr9FromSales,
  mergeDraftGstr3b,
  periodsForFy,
} from '../../../services/gstFromSales.js';
import { httpError } from '../../../utils/httpError.js';
import { getActiveGstin } from '../../../utils/gst.js';

function sumFields(rows, fields) {
  const out = {};
  for (const field of fields) out[field] = 0;
  for (const row of rows) {
    for (const field of fields) out[field] += Number(row[field]) || 0;
  }
  return out;
}

const TAX_FIELDS = ['cgst', 'sgst', 'igst', 'cess'];
const ZERO_TAX = { cgst: 0, sgst: 0, igst: 0, cess: 0 };

// GET /api/gst/gstr9?fy=2026-27
export async function getGstr9(req, res, next) {
  try {
    const { fy } = req.query;
    if (!fy) return next(httpError(400, 'fy is required'));

    const gstin = await getActiveGstin(req.user.id);
    const periods = periodsForFy(fy);
    if (periods.length === 0) return next(httpError(400, 'fy must be like "2026-27"'));

    const [{ gstr1Docs, gstr3bDocs: generated3b }, saved3bDocs] = await Promise.all([
      buildGstr9FromSales({ userId: req.user.id, fy, gstin }),
      Gstr3b.find({ gstin, period: { $in: periods } }).lean(),
    ]);

    const gstr3bDocs = generated3b.map((generated) => {
      const saved = saved3bDocs.find((record) => record.period === generated.period);
      return mergeDraftGstr3b(saved, generated);
    });

    const b2b = sumFields(gstr1Docs.flatMap((doc) => doc.b2b ?? []), ['taxable', ...TAX_FIELDS]);
    const b2cs = sumFields(gstr1Docs.flatMap((doc) => doc.b2cs ?? []), ['taxable', ...TAX_FIELDS]);
    const creditNotes = sumFields(gstr1Docs.map((doc) => doc.noteTotals?.credit ?? {}), ['taxable', ...TAX_FIELDS]);
    const debitNotes = sumFields(gstr1Docs.map((doc) => doc.noteTotals?.debit ?? {}), ['taxable', ...TAX_FIELDS]);

    const outwardByKey = {};
    const itcAvailByKey = {};
    const itcRevByKey = {};
    let lateFee = 0;

    for (const doc of gstr3bDocs) {
      for (const row of doc.outwardRows ?? []) {
        const acc = outwardByKey[row.key] ?? (outwardByKey[row.key] = { taxable: 0, ...ZERO_TAX });
        acc.taxable += row.taxable ?? 0;
        for (const field of TAX_FIELDS) acc[field] += row[field] ?? 0;
      }
      for (const row of doc.itcAvailable ?? []) {
        const acc = itcAvailByKey[row.key] ?? (itcAvailByKey[row.key] = { ...ZERO_TAX });
        for (const field of TAX_FIELDS) acc[field] += row[field] ?? 0;
      }
      for (const row of doc.itcReversed ?? []) {
        const acc = itcRevByKey[row.key] ?? (itcRevByKey[row.key] = { ...ZERO_TAX });
        for (const field of TAX_FIELDS) acc[field] += row[field] ?? 0;
      }
      lateFee += (doc.lateFeeCgst ?? 0) + (doc.lateFeeSgst ?? 0);
    }

    const zeroOut = { taxable: 0, ...ZERO_TAX };
    const rcm = outwardByKey.d ?? zeroOut;
    const nilExempt = outwardByKey.c ?? zeroOut;
    const nonGst = outwardByKey.e ?? zeroOut;

    const table4 = [
      { sno: '4A', desc: 'Supplies made to un-registered persons (B2C)', taxable: b2cs.taxable, cgst: b2cs.cgst, sgst: b2cs.sgst, igst: b2cs.igst, cess: 0 },
      { sno: '4B', desc: 'Supplies made to registered persons (B2B)', taxable: b2b.taxable, cgst: b2b.cgst, sgst: b2b.sgst, igst: b2b.igst, cess: 0 },
      { sno: '4C', desc: 'Zero rated supply (Export) on payment of tax', taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
      { sno: '4D', desc: 'Supplies to SEZs on payment of tax', taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
      { sno: '4E', desc: 'Deemed exports', taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
      { sno: '4F', desc: 'Advances on which tax has been paid', taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
      { sno: '4G', desc: 'Inward supplies on which tax is paid on reverse charge', taxable: rcm.taxable, cgst: rcm.cgst, sgst: rcm.sgst, igst: rcm.igst, cess: rcm.cess },
      { sno: '4I', desc: 'Credit notes issued', taxable: Math.abs(creditNotes.taxable), cgst: Math.abs(creditNotes.cgst), sgst: Math.abs(creditNotes.sgst), igst: Math.abs(creditNotes.igst), cess: 0 },
      { sno: '4J', desc: 'Debit notes issued', taxable: debitNotes.taxable, cgst: debitNotes.cgst, sgst: debitNotes.sgst, igst: debitNotes.igst, cess: 0 },
      { sno: '4K', desc: 'Supplies / tax declared through amendments', taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
      { sno: '4L', desc: 'Supplies / tax reduced through amendments', taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
    ];

    const table5 = [
      { cat: '5A - Taxable supplies excluding nil rated, exempted', taxable: b2b.taxable + b2cs.taxable, cgst: b2b.cgst + b2cs.cgst, sgst: b2b.sgst + b2cs.sgst, igst: b2b.igst + b2cs.igst },
      { cat: '5B - Zero rated supply without payment of tax', taxable: 0, cgst: 0, sgst: 0, igst: 0 },
      { cat: '5C - Nil rated, exempted', taxable: nilExempt.taxable, cgst: 0, sgst: 0, igst: 0 },
      { cat: '5D - Non-GST supply', taxable: nonGst.taxable, cgst: 0, sgst: 0, igst: 0 },
    ];

    const a1 = itcAvailByKey['A(1)'] ?? ZERO_TAX;
    const a2 = itcAvailByKey['A(2)'] ?? ZERO_TAX;
    const a3 = itcAvailByKey['A(3)'] ?? ZERO_TAX;
    const a5 = itcAvailByKey['A(5)'] ?? ZERO_TAX;
    const itcTotal = sumFields([a1, a2, a3, a5], TAX_FIELDS);
    const table6 = [
      { sno: '6A', desc: 'Total ITC available as declared in GSTR-3B', ...itcTotal },
      { sno: '6B', desc: 'ITC availed on goods and services', cgst: a2.cgst + a3.cgst + a5.cgst, sgst: a2.sgst + a3.sgst + a5.sgst, igst: a2.igst + a3.igst + a5.igst, cess: a2.cess + a3.cess + a5.cess },
      { sno: '6C', desc: 'ITC availed on capital goods', cgst: 0, sgst: 0, igst: 0, cess: 0 },
      { sno: '6D', desc: 'ITC availed on import of goods', ...a1 },
    ];

    const b1 = itcRevByKey['B(1)'] ?? ZERO_TAX;
    const b2 = itcRevByKey['B(2)'] ?? ZERO_TAX;
    const table7 = [
      { sno: '7A', desc: 'As per Rule 42 & 43 of CGST Rules', ...b1 },
      { sno: '7B', desc: 'Other reversals', ...b2 },
    ];
    const reversalTotal = sumFields([b1, b2], TAX_FIELDS);
    const outwardTotal = sumFields(Object.values(outwardByKey), ['taxable', ...TAX_FIELDS]);

    const netItc = {};
    const paidViaItc = {};
    const paidCash = {};
    for (const field of TAX_FIELDS) {
      netItc[field] = Math.max(0, itcTotal[field] - reversalTotal[field]);
      paidViaItc[field] = Math.min(netItc[field], outwardTotal[field]);
      paidCash[field] = Math.max(0, outwardTotal[field] - paidViaItc[field]);
    }

    const table9 = [
      { desc: 'Total tax payable as declared in GSTR-3B returns', cgst: outwardTotal.cgst, sgst: outwardTotal.sgst, igst: outwardTotal.igst, cess: outwardTotal.cess, interest: 0, late: 0 },
      { desc: 'Paid through ITC (CGST, SGST, IGST, Cess)', cgst: paidViaItc.cgst, sgst: paidViaItc.sgst, igst: paidViaItc.igst, cess: paidViaItc.cess, interest: 0, late: 0 },
      { desc: 'Tax paid in cash', cgst: paidCash.cgst, sgst: paidCash.sgst, igst: paidCash.igst, cess: paidCash.cess, interest: 0, late: lateFee },
    ];

    res.json({
      fy,
      gstin,
      periods,
      overview: {
        turnover: outwardTotal.taxable,
        outputTax: outwardTotal.cgst + outwardTotal.sgst + outwardTotal.igst,
        itcClaimed: itcTotal.cgst + itcTotal.sgst + itcTotal.igst,
        cashPaid: paidCash.cgst + paidCash.sgst + paidCash.igst,
      },
      table4,
      table5,
      table6,
      table7,
      table9,
    });
  } catch (err) {
    next(err);
  }
}
