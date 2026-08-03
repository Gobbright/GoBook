import { Types } from 'mongoose';

import { AuditLog } from '../../models/AuditLog.js';

function escapeRegex(str) {
  return String(str ?? '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toObjectId(id) {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
}

// GET /api/audit-logs?dateFrom=&dateTo=&action=&modelName=&performedBy=&search=&page=&limit=
export async function listAuditLogs(req, res, next) {
  try {
    const {
      dateFrom, dateTo, action, modelName, performedBy, search,
      page = 1, limit = 50,
    } = req.query;

    const match = { businessId: toObjectId(req.user.businessId) };
    if (action) match.action = action;
    if (modelName) match.modelName = modelName;
    if (performedBy) match['performedBy.userId'] = toObjectId(performedBy);
    if (dateFrom || dateTo) {
      // performedAt is stored as an absolute UTC instant, but the date picker
      // means "today" in IST (this is an India-focused app) — anchor the
      // day boundaries to +05:30 explicitly rather than UTC, otherwise
      // anything before 5:30am IST gets misfiled under the previous day.
      match.performedAt = {};
      if (dateFrom) match.performedAt.$gte = new Date(`${dateFrom}T00:00:00.000+05:30`);
      if (dateTo) match.performedAt.$lte = new Date(`${dateTo}T23:59:59.999+05:30`);
    }
    if (search) {
      match.$or = [
        { documentLabel: new RegExp(escapeRegex(search), 'i') },
        { modelName: new RegExp(escapeRegex(search), 'i') },
        { 'performedBy.email': new RegExp(escapeRegex(search), 'i') },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total, stats] = await Promise.all([
      AuditLog.find(match).sort({ performedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      AuditLog.countDocuments(match),
      AuditLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            creates: { $sum: { $cond: [{ $eq: ['$action', 'create'] }, 1, 0] } },
            updates: { $sum: { $cond: [{ $eq: ['$action', 'update'] }, 1, 0] } },
            deletes: { $sum: { $cond: [{ $eq: ['$action', 'delete'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    res.json({
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      stats: stats[0] ?? { total: 0, creates: 0, updates: 0, deletes: 0 },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/audit-logs/models
export async function listAuditModelNames(req, res, next) {
  try {
    const names = await AuditLog.distinct('modelName', { businessId: toObjectId(req.user.businessId) });
    res.json(names.sort());
  } catch (err) {
    next(err);
  }
}
