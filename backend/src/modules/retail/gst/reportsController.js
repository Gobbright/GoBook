import { Gstr3b } from '../../../models/Gstr3b.js';
import {
  buildGstr1FromSales,
  buildGstr3bFromSales,
  mergeDraftGstr3b,
  taxTotal,
} from '../../../services/gstFromSales.js';
import { httpError } from '../../../utils/httpError.js';
import { getActiveGstin } from '../../../utils/gst.js';

const TREND_PERIODS = [
  'January 2026', 'February 2026', 'March 2026',
  'April 2026', 'May 2026', 'June 2026',
];

function addRate(rateMap, row, countInvoice = false) {
  const rate = Number(row.rate) || 0;
  if (!rateMap[rate]) rateMap[rate] = { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, invoices: 0 };
  rateMap[rate].taxable += Number(row.taxable) || 0;
  rateMap[rate].cgst += Number(row.cgst) || 0;
  rateMap[rate].sgst += Number(row.sgst) || 0;
  rateMap[rate].igst += Number(row.igst) || 0;
  if (countInvoice) rateMap[rate].invoices += 1;
}

// GET /api/gst/reports?type=hsn-summary&period=May+2026
export async function getReport(req, res, next) {
  try {
    const { type, period } = req.query;
    if (!type || !period) return next(httpError(400, 'type and period are required'));

    const gstin = await getActiveGstin(req.user.id);
    const gstr1 = await buildGstr1FromSales({ userId: req.user.id, period, gstin });

    switch (type) {
      case 'hsn-summary':
        return res.json({ data: gstr1.hsn ?? [] });

      case 'tax-rate': {
        const rateMap = {};
        for (const row of gstr1.b2b ?? []) addRate(rateMap, row, true);
        for (const row of gstr1.b2cs ?? []) addRate(rateMap, row, false);
        return res.json({ data: Object.values(rateMap).sort((a, b) => a.rate - b.rate) });
      }

      case 'state-wise': {
        const stateMap = {};
        for (const row of gstr1.b2cs ?? []) {
          const key = `${row.state}-${row.type || row.supplyType}`;
          if (!stateMap[key]) stateMap[key] = { state: row.state, type: row.type || row.supplyType, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
          stateMap[key].taxable += row.taxable || 0;
          stateMap[key].cgst += row.cgst || 0;
          stateMap[key].sgst += row.sgst || 0;
          stateMap[key].igst += row.igst || 0;
        }
        return res.json({ data: Object.values(stateMap) });
      }

      case 'customer': {
        const custMap = {};
        for (const row of gstr1.b2b ?? []) {
          if (!custMap[row.gstin]) {
            custMap[row.gstin] = { name: row.name, gstin: row.gstin, invoices: 0, taxable: 0, tax: 0, lastInv: '' };
          }
          custMap[row.gstin].invoices += 1;
          custMap[row.gstin].taxable += row.taxable || 0;
          custMap[row.gstin].tax += (row.cgst || 0) + (row.sgst || 0) + (row.igst || 0);
          if (!custMap[row.gstin].lastInv || row.date > custMap[row.gstin].lastInv) custMap[row.gstin].lastInv = row.date;
        }
        return res.json({ data: Object.values(custMap) });
      }

      case 'itc': {
        const savedRecords = await Gstr3b.find({ userId: req.user.id, gstin, period: { $in: TREND_PERIODS } }).lean();
        const generatedRecords = await Promise.all(TREND_PERIODS.map((p) => buildGstr3bFromSales({ userId: req.user.id, period: p, gstin })));
        const data = TREND_PERIODS.map((p, index) => {
          const saved = savedRecords.find((record) => record.period === p);
          const record = mergeDraftGstr3b(saved, generatedRecords[index]);
          const available = taxTotal(record.itcAvailable);
          const reversal = taxTotal(record.itcReversed);
          return {
            month: p.slice(0, 3),
            available,
            utilised: available - reversal,
            reversal,
            net: available - reversal,
          };
        });
        return res.json({ data });
      }

      default:
        return res.json({ data: [] });
    }
  } catch (err) {
    next(err);
  }
}
