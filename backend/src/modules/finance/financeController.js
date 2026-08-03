import { DateTime } from 'luxon';
import mongoose from 'mongoose';

import { FinanceCollection } from '../../models/FinanceCollection.js';
import { FinanceCustomer } from '../../models/FinanceCustomer.js';
import { httpError } from '../../utils/httpError.js';

const ZONE = 'Asia/Kolkata';
const TYPES = ['Loan', 'Chit', 'Deposit'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

function todayString() {
  return DateTime.now().setZone(ZONE).toISODate();
}

function validDate(value) {
  return DATE_PATTERN.test(value) && DateTime.fromISO(value, { zone: ZONE }).isValid;
}

function validMonth(value) {
  return MONTH_PATTERN.test(value) && DateTime.fromFormat(value, 'yyyy-MM', { zone: ZONE }).isValid;
}

function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw httpError(400, `${label} must be greater than zero`);
  return Math.round(number * 100) / 100;
}

function customerPayload(body) {
  const name = String(body.name ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const type = String(body.type ?? '').trim();
  const startDate = String(body.startDate ?? '').trim();

  if (!name) throw httpError(400, 'Customer name is required');
  if (!phone) throw httpError(400, 'Phone number is required');
  if (!TYPES.includes(type)) throw httpError(400, 'Type must be Loan, Chit or Deposit');
  if (!validDate(startDate)) throw httpError(400, 'Enter a valid start date');

  return {
    name,
    phone,
    type,
    totalAmount: positiveNumber(body.totalAmount, 'Total amount'),
    dailyCollectionAmount: positiveNumber(body.dailyCollectionAmount, 'Daily collection amount'),
    startDate,
  };
}

async function totalsByCustomer(userId, customerIds = []) {
  if (customerIds.length === 0) return new Map();
  const match = {
    userId: new mongoose.Types.ObjectId(userId),
    customerId: { $in: customerIds },
  };
  const rows = await FinanceCollection.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$customerId',
        totalCollected: { $sum: '$amount' },
        entriesCount: { $sum: 1 },
        lastPaymentDate: { $max: '$date' },
      },
    },
  ]);
  return new Map(rows.map((row) => [String(row._id), row]));
}

function serializeCustomers(customers, totals) {
  return customers.map((customer) => {
    const total = totals.get(String(customer._id));
    const totalCollected = total?.totalCollected || 0;
    return {
      ...customer,
      totalCollected,
      remainingAmount: Math.max(0, customer.totalAmount - totalCollected),
      entriesCount: total?.entriesCount || 0,
      lastPaymentDate: total?.lastPaymentDate || '',
    };
  });
}

export async function getDashboard(req, res, next) {
  try {
    const today = todayString();
    const monthStart = `${today.slice(0, 7)}-01`;
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const [todaySummary, monthSummary, dueCustomers, activeCustomersCount, finishedCustomers] = await Promise.all([
      FinanceCollection.aggregate([
        { $match: { userId, date: today } },
        { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      FinanceCollection.aggregate([
        { $match: { userId, date: { $gte: monthStart, $lte: today } } },
        { $group: { _id: null, amount: { $sum: '$amount' } } },
      ]),
      FinanceCustomer.find({ userId: req.user.id, status: 'Active', startDate: { $lte: today } }).select('_id').lean(),
      FinanceCustomer.countDocuments({ userId: req.user.id, status: 'Active' }),
      FinanceCustomer.countDocuments({ userId: req.user.id, status: 'Finished' }),
    ]);

    const paidTodayIds = await FinanceCollection.distinct('customerId', {
      userId: req.user.id,
      date: today,
      customerId: { $in: dueCustomers.map((customer) => customer._id) },
    });

    res.json({
      date: today,
      todayCollectedAmount: todaySummary[0]?.amount || 0,
      todayEntriesCount: todaySummary[0]?.count || 0,
      monthTotalCollection: monthSummary[0]?.amount || 0,
      pendingTodayCount: Math.max(0, dueCustomers.length - paidTodayIds.length),
      activeCustomersCount,
      finishedCustomersCount: finishedCustomers,
    });
  } catch (err) {
    next(err);
  }
}

export async function listCustomers(req, res, next) {
  try {
    const status = String(req.query.status || 'Active');
    if (!['Active', 'Finished', 'All'].includes(status)) return next(httpError(400, 'Invalid customer status'));
    const filter = { userId: req.user.id };
    if (status !== 'All') filter.status = status;
    const customers = await FinanceCustomer.find(filter).sort({ status: 1, name: 1 }).lean();
    const totals = await totalsByCustomer(req.user.id, customers.map((customer) => customer._id));
    res.json({ customers: serializeCustomers(customers, totals) });
  } catch (err) {
    next(err);
  }
}

export async function createCustomer(req, res, next) {
  try {
    const payload = customerPayload(req.body);
    const existing = await FinanceCustomer.findOne({ userId: req.user.id, phone: payload.phone }).lean();
    if (existing) return next(httpError(409, 'A finance customer with this phone number already exists'));
    const customer = await FinanceCustomer.create({ ...payload, userId: req.user.id });
    res.status(201).json({ ...customer.toObject(), totalCollected: 0, remainingAmount: customer.totalAmount });
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'A finance customer with this phone number already exists'));
    next(err);
  }
}


export async function updateCustomer(req, res, next) {
  try {
    const payload = customerPayload(req.body);
    const existing = await FinanceCustomer.findOne({
      userId: req.user.id,
      phone: payload.phone,
      _id: { $ne: req.params.id },
    }).lean();
    if (existing) return next(httpError(409, 'A finance customer with this phone number already exists'));

    const totals = await totalsByCustomer(req.user.id, [new mongoose.Types.ObjectId(req.params.id)]);
    const totalCollected = totals.get(String(req.params.id))?.totalCollected || 0;
    if (payload.totalAmount < totalCollected) {
      return next(httpError(400, `Total amount cannot be less than the already collected amount of ${totalCollected}`));
    }

    const customer = await FinanceCustomer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: payload },
      { new: true, runValidators: true },
    ).lean();
    if (!customer) return next(httpError(404, 'Finance customer not found'));
    const updatedTotals = await totalsByCustomer(req.user.id, [customer._id]);
    res.json(serializeCustomers([customer], updatedTotals)[0]);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'A finance customer with this phone number already exists'));
    next(err);
  }
}
export async function updateCustomerStatus(req, res, next) {
  try {
    const status = String(req.body.status || '');
    if (!['Active', 'Finished'].includes(status)) return next(httpError(400, 'Status must be Active or Finished'));
    const customer = await FinanceCustomer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { status, finishedAt: status === 'Finished' ? new Date() : null } },
      { new: true, runValidators: true },
    ).lean();
    if (!customer) return next(httpError(404, 'Finance customer not found'));
    const totals = await totalsByCustomer(req.user.id, [customer._id]);
    res.json(serializeCustomers([customer], totals)[0]);
  } catch (err) {
    next(err);
  }
}

export async function getCollectionEntry(req, res, next) {
  try {
    const date = String(req.query.date || todayString());
    if (!validDate(date)) return next(httpError(400, 'Enter a valid collection date'));
    const [customers, entries] = await Promise.all([
      FinanceCustomer.find({ userId: req.user.id, status: 'Active', startDate: { $lte: date } }).sort({ name: 1 }).lean(),
      FinanceCollection.find({ userId: req.user.id, date }).lean(),
    ]);
    const entryMap = new Map(entries.map((entry) => [String(entry.customerId), entry]));
    res.json({
      date,
      totalCollected: entries.reduce((sum, entry) => sum + entry.amount, 0),
      customers: customers.map((customer) => {
        const entry = entryMap.get(String(customer._id));
        return {
          ...customer,
          entryId: entry?._id || null,
          collectedAmount: entry?.amount || 0,
          paid: Boolean(entry),
        };
      }),
    });
  } catch (err) {
    next(err);
  }
}

export async function upsertCollection(req, res, next) {
  try {
    const date = String(req.body.date || todayString());
    if (!validDate(date)) return next(httpError(400, 'Enter a valid collection date'));
    const amount = positiveNumber(req.body.amount, 'Collection amount');
    const customer = await FinanceCustomer.findOne({
      _id: req.params.customerId,
      userId: req.user.id,
      status: 'Active',
      startDate: { $lte: date },
    }).lean();
    if (!customer) return next(httpError(404, 'Active finance customer not found for this date'));

    const otherEntries = await FinanceCollection.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          customerId: customer._id,
          date: { $ne: date },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const remainingBeforeThisDate = Math.max(0, customer.totalAmount - (otherEntries[0]?.total || 0));
    if (amount > remainingBeforeThisDate) {
      return next(httpError(400, `Collection amount exceeds the remaining plan amount of ${remainingBeforeThisDate}`));
    }

    const entry = await FinanceCollection.findOneAndUpdate(
      { userId: req.user.id, customerId: customer._id, date },
      { $set: { amount } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();
    res.json(entry);
  } catch (err) {
    next(err);
  }
}

export async function getReminders(req, res, next) {
  try {
    const today = todayString();
    const customers = await FinanceCustomer.find({
      userId: req.user.id,
      status: 'Active',
      startDate: { $lte: today },
    }).sort({ name: 1 }).lean();
    const totals = await totalsByCustomer(req.user.id, customers.map((customer) => customer._id));
    const paidTodayIds = new Set((await FinanceCollection.distinct('customerId', {
      userId: req.user.id,
      date: today,
      customerId: { $in: customers.map((customer) => customer._id) },
    })).map(String));
    const enriched = serializeCustomers(customers, totals);
    const todayDate = DateTime.fromISO(today, { zone: ZONE });
    const dueToday = enriched.filter((customer) => !paidTodayIds.has(String(customer._id)));
    const overdue = enriched.flatMap((customer) => {
      const reference = customer.lastPaymentDate || customer.startDate;
      const daysWithoutPayment = Math.max(
        0,
        Math.floor(todayDate.diff(DateTime.fromISO(reference, { zone: ZONE }), 'days').days),
      );
      return daysWithoutPayment >= 3 && !paidTodayIds.has(String(customer._id))
        ? [{ ...customer, daysWithoutPayment }]
        : [];
    });
    res.json({ date: today, dueToday, overdue });
  } catch (err) {
    next(err);
  }
}

export async function getReports(req, res, next) {
  try {
    const today = todayString();
    const month = String(req.query.month || today.slice(0, 7));
    if (!validMonth(month)) return next(httpError(400, 'Enter a valid report month'));
    const monthDate = DateTime.fromFormat(month, 'yyyy-MM', { zone: ZONE });
    const monthStart = `${month}-01`;
    const monthEnd = month === today.slice(0, 7) ? today : monthDate.endOf('month').toISODate();
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const [todayRows, dayRows, reportCustomers] = await Promise.all([
      FinanceCollection.aggregate([
        { $match: { userId, date: today } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      FinanceCollection.aggregate([
        { $match: { userId, date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: '$date', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      FinanceCustomer.find({ userId: req.user.id }).sort({ name: 1 }).lean(),
    ]);
    const reportTotals = await totalsByCustomer(
      req.user.id,
      reportCustomers.map((customer) => customer._id),
    );

    const dayMap = new Map(dayRows.map((row) => [row._id, row]));
    const totalDays = DateTime.fromISO(monthEnd, { zone: ZONE }).day;
    const dayBreakdown = Array.from({ length: totalDays }, (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, '0')}`;
      return { date, total: dayMap.get(date)?.total || 0, count: dayMap.get(date)?.count || 0 };
    });

    res.json({
      date: today,
      month,
      todayTotal: todayRows[0]?.total || 0,
      todayEntriesCount: todayRows[0]?.count || 0,
      monthTotal: dayRows.reduce((sum, row) => sum + row.total, 0),
      dayBreakdown,
      customerTotals: serializeCustomers(reportCustomers, reportTotals)
        .map((customer) => ({
          customerId: customer._id,
          name: customer.name,
          phone: customer.phone,
          type: customer.type,
          status: customer.status,
          totalAmount: customer.totalAmount,
          totalCollected: customer.totalCollected,
          remainingAmount: customer.remainingAmount,
          entriesCount: customer.entriesCount,
          lastPaymentDate: customer.lastPaymentDate,
        }))
        .sort((a, b) => b.totalCollected - a.totalCollected || a.name.localeCompare(b.name)),
    });
  } catch (err) {
    next(err);
  }
}

