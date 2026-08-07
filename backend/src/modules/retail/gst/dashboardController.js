import { Gstr1 } from '../../../models/Gstr1.js';
import { Gstr3b } from '../../../models/Gstr3b.js';
import { buildGstr3bFromSales, mergeDraftGstr3b, taxTotal } from '../../../services/gstFromSales.js';
import { getActiveGstin } from '../../../utils/gst.js';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function periodFromDate(date) {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function recentPeriods(count, offset = 0) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index - offset, 1);
    return periodFromDate(date);
  }).reverse();
}

function dueDateStr(period, day) {
  const [mon, yr] = period.split(' ');
  const mIdx = MONTHS.indexOf(mon);
  const nextMonth = new Date(Number(yr), mIdx + 1, day);
  return nextMonth.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(period, day) {
  const [mon, yr] = period.split(' ');
  const mIdx = MONTHS.indexOf(mon);
  const due = new Date(Number(yr), mIdx + 1, day);
  return Math.max(0, Math.ceil((due - Date.now()) / 86_400_000));
}

function netItc(record) {
  return taxTotal(record?.itcAvailable || []) - taxTotal(record?.itcReversed || []);
}

// GET /api/gst/dashboard
export async function getGstDashboard(req, res, next) {
  try {
    const currentPeriod = periodFromDate(new Date());
    const trendPeriods = recentPeriods(6);
    const calendarPeriods = recentPeriods(3);
    const gstin = await getActiveGstin(req.user.id);

    const [savedGstr1, savedGstr3b] = await Promise.all([
      Gstr1.find({ userId: req.user.id, gstin, period: { $in: calendarPeriods } }).lean(),
      Gstr3b.find({ userId: req.user.id, gstin, period: { $in: [...new Set([...trendPeriods, ...calendarPeriods, currentPeriod])] } }).lean(),
    ]);

    const generatedTrend = await Promise.all(trendPeriods.map((period) => buildGstr3bFromSales({ userId: req.user.id, period, gstin })));
    const monthlyTrend = trendPeriods.map((period, index) => {
      const saved = savedGstr3b.find((record) => record.period === period);
      const record = mergeDraftGstr3b(saved, generatedTrend[index]);
      return {
        month: period.slice(0, 3),
        output: taxTotal(record.outwardRows),
        itc: netItc(record),
      };
    });

    const currentSaved = savedGstr3b.find((record) => record.period === currentPeriod);
    const currentGenerated = await buildGstr3bFromSales({ userId: req.user.id, period: currentPeriod, gstin });
    const current = mergeDraftGstr3b(currentSaved, currentGenerated);
    const outputTax = taxTotal(current.outwardRows);
    const itcAvail = netItc(current);

    const filingCalendar = [];
    for (const period of calendarPeriods) {
      const g1 = savedGstr1.find((record) => record.period === period);
      const g3b = savedGstr3b.find((record) => record.period === period);
      filingCalendar.push({
        return: 'GSTR-1',
        period,
        dueDate: dueDateStr(period, 11),
        status: g1?.status === 'filed' ? 'filed' : 'pending',
        daysLeft: daysUntil(period, 11),
        arn: g1?.arn ?? null,
        href: '#gstr-1',
      });
      filingCalendar.push({
        return: 'GSTR-3B',
        period,
        dueDate: dueDateStr(period, 20),
        status: g3b?.status === 'filed' ? 'filed' : 'pending',
        daysLeft: daysUntil(period, 20),
        arn: g3b?.arn ?? null,
        href: '#gstr-3b',
      });
    }

    res.json({
      gstin,
      currentPeriod,
      stats: {
        outputTax,
        itcAvailable: itcAvail,
        netTaxPayable: Math.max(0, outputTax - itcAvail),
        pendingFilings: filingCalendar.filter((filing) => filing.status === 'pending').length,
      },
      filingCalendar,
      monthlyTrend,
    });
  } catch (err) {
    next(err);
  }
}
