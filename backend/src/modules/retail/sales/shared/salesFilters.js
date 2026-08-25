// Shared filter-building helpers for the sales/billing "Invoice" model, reused
// across Bills Register, Receivables, Quotations, Credit/Debit Notes, Delivery
// Challans, E-Invoice and E-Way Bill list endpoints (they all read/write the
// same Invoice collection, distinguished only by documentType).
import { Types } from 'mongoose';

// Unlike .find()/.countDocuments(), .aggregate() does not auto-cast query
// values against the schema, so userId (a plain string on req.user.id) must
// be cast to ObjectId explicitly before it's usable in a $match/$lookup.
function toObjectId(id) {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
}

export function escapeRegex(str) {
  return String(str ?? '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BILLABLE_TYPES = ['invoice', 'bill-of-supply'];

// The saved grand-total field has drifted across app versions; mirror the same
// fallback chain used elsewhere (see paymentController.js::calcInvoiceTotal).
const TOTAL_EXPR = {
  $ifNull: [
    '$totals.finalTotal',
    { $ifNull: ['$totals.grandTotal', { $ifNull: ['$totals.total', { $ifNull: ['$totals.subTotal', 0] }] }] },
  ],
};

export function isBillableDocType(documentType) {
  return !documentType || BILLABLE_TYPES.includes(documentType);
}

// Resolves the documentType condition for the Mongo match, applying gstType
// (With/Without GST) as a narrowing override — only meaningful when the base
// set spans both billable types (Bills Register / Receivables).
function resolveDocumentTypeCondition(query, baseDocumentType) {
  const { gstType } = query;
  if (gstType === 'with' || gstType === 'without') {
    return gstType === 'without' ? 'bill-of-supply' : 'invoice';
  }
  return baseDocumentType;
}

// Builds a plain Mongo match object (usable directly in .find() or as a
// pipeline $match stage). Does NOT cover paymentStatus, which depends on a
// computed field from paymentStatusStages() and must be matched afterwards.
export function buildSalesMatchStage(query, userId, baseDocumentType, baseMatch = null) {
  const {
    search, dateFrom, dateTo, paymentMethod, customer, city, state,
    supplyType, amountMin, amountMax, itemType, hsn, productName, barcode,
    irnStatus, ewbStatus,
  } = query;

  const match = baseMatch ? { ...baseMatch } : { userId: toObjectId(userId) };

  const documentType = resolveDocumentTypeCondition(query, baseDocumentType);
  if (documentType) match.documentType = documentType;

  const andConditions = [];

  if (search) {
    andConditions.push({
      $or: [
        { number: new RegExp(escapeRegex(search), 'i') },
        { 'customer.name': new RegExp(escapeRegex(search), 'i') },
        { 'extra.irn': new RegExp(escapeRegex(search), 'i') },
      ],
    });
  }

  if (dateFrom || dateTo) {
    const range = {};
    if (dateFrom) range.$gte = dateFrom;
    if (dateTo) range.$lte = dateTo;
    match['meta.date'] = range;
  }

  if (paymentMethod) match.paymentMethod = new RegExp(`^${escapeRegex(paymentMethod)}$`, 'i');
  if (customer) match['customer.name'] = new RegExp(`^${escapeRegex(customer)}$`, 'i');
  if (city) match['customer.city'] = new RegExp(escapeRegex(city), 'i');
  if (state) match['customer.state'] = new RegExp(escapeRegex(state), 'i');
  if (supplyType) match.supplyType = supplyType;

  if (irnStatus === 'yes') match['extra.irn'] = { $exists: true, $nin: [null, ''] };
  else if (irnStatus === 'no') andConditions.push({ $or: [{ 'extra.irn': { $exists: false } }, { 'extra.irn': { $in: [null, ''] } }] });

  if (ewbStatus === 'yes') match['extra.ewbNumber'] = { $exists: true, $nin: [null, ''] };
  else if (ewbStatus === 'no') andConditions.push({ $or: [{ 'extra.ewbNumber': { $exists: false } }, { 'extra.ewbNumber': { $in: [null, ''] } }] });

  const itemConditions = {};
  if (itemType === 'Product' || itemType === 'Service') itemConditions.itemType = itemType;
  if (hsn) itemConditions.hsn = new RegExp(escapeRegex(hsn), 'i');
  if (productName) itemConditions.description = new RegExp(escapeRegex(productName), 'i');
  if (barcode) itemConditions.barcode = new RegExp(escapeRegex(barcode), 'i');
  if (Object.keys(itemConditions).length) match.items = { $elemMatch: itemConditions };

  const exprConditions = [];
  const min = amountMin !== undefined && amountMin !== '' ? Number(amountMin) : null;
  const max = amountMax !== undefined && amountMax !== '' ? Number(amountMax) : null;
  if (Number.isFinite(min)) exprConditions.push({ $gte: [TOTAL_EXPR, min] });
  if (Number.isFinite(max)) exprConditions.push({ $lte: [TOTAL_EXPR, max] });
  if (exprConditions.length) match.$expr = { $and: exprConditions };

  if (andConditions.length) match.$and = andConditions;

  return match;
}

// Pipeline fragment attaching totalPaid / balance / payStatus, mirroring the
// in-memory logic previously in paymentController.js::listOutstanding.
export function paymentStatusStages(userId) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return [
    {
      $lookup: {
        from: 'payments',
        let: { invId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$invoiceId', '$$invId'] } } },
          { $group: { _id: null, totalPaid: { $sum: '$amount' } } },
        ],
        as: '_paymentAgg',
      },
    },
    {
      $addFields: {
        totalPaid: {
          $let: {
            vars: { paymentTotal: { $ifNull: [{ $arrayElemAt: ['$_paymentAgg.totalPaid', 0] }, 0] } },
            in: {
              $cond: [
                { $gt: ['$$paymentTotal', 0] },
                '$$paymentTotal',
                { $max: [0, { $ifNull: ['$advanceReceived', 0] }] },
              ],
            },
          },
        },
      },
    },
    { $addFields: { invoiceTotal: TOTAL_EXPR } },
    { $addFields: { balance: { $max: [0, { $subtract: ['$invoiceTotal', '$totalPaid'] }] } } },
    {
      $addFields: {
        payStatus: {
          $switch: {
            branches: [
              { case: { $lte: ['$balance', 0] }, then: 'Paid' },
              { case: { $gt: ['$totalPaid', 0] }, then: 'Partial' },
              { case: { $and: [{ $ne: [{ $ifNull: ['$meta.dueDate', ''] }, ''] }, { $lt: ['$meta.dueDate', todayStr] }] }, then: 'Overdue' },
            ],
            default: 'Unpaid',
          },
        },
      },
    },
    { $project: { _paymentAgg: 0 } },
  ];
}

// Full pipeline: match -> (optional payment-status attach + filter) -> sort -> facet(data/total).
// `stats` (optional) is a $group spec (without _id) computed over the fully-matched,
// pre-pagination set, returned as `stats` in the facet result.
export function buildSalesAggregationPipeline(query, userId, baseDocumentType, { includePayment = false, stats = null, baseMatch = null } = {}) {
  const { page = 1, limit = 50, paymentStatus } = query;
  const pipeline = [{ $match: buildSalesMatchStage(query, userId, baseDocumentType, baseMatch) }];

  if (includePayment) {
    pipeline.push(...paymentStatusStages(userId));
    if (paymentStatus && paymentStatus !== 'All') {
      pipeline.push({ $match: { payStatus: paymentStatus } });
    }
  }

  pipeline.push({ $sort: { createdAt: -1, _id: -1 } });

  const skip = (Number(page) - 1) * Number(limit);
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: Number(limit) }],
      count: [{ $count: 'total' }],
      ...(stats ? { stats: [{ $group: { _id: null, ...stats } }] } : {}),
    },
  });

  return pipeline;
}

export function unwrapFacetResult(result, { stats = null } = {}) {
  const facet = result?.[0] ?? { data: [], count: [], stats: [] };
  const total = facet.count?.[0]?.total ?? 0;
  const out = { data: facet.data ?? [], total };
  if (stats) out.stats = facet.stats?.[0] ?? stats.defaultValue ?? {};
  return out;
}
