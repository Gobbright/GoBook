import { ModuleRecord } from '../../models/ModuleRecord.js';
import { httpError } from '../../utils/httpError.js';

// GET /api/module-records?moduleKey=hospital/patients
export async function listRecords(req, res, next) {
  try {
    const { moduleKey } = req.query;
    if (!moduleKey) return next(httpError(400, 'moduleKey is required'));
    const records = await ModuleRecord.find({ userId: req.user.id, moduleKey }).sort({ createdAt: -1 }).lean();
    res.json({ records });
  } catch (err) {
    next(err);
  }
}

// POST /api/module-records
export async function createRecord(req, res, next) {
  try {
    const { moduleKey, data } = req.body;
    if (!moduleKey) return next(httpError(400, 'moduleKey is required'));
    const record = await ModuleRecord.create({ userId: req.user.id, moduleKey, data: data || {} });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

// PUT /api/module-records/:id
export async function updateRecord(req, res, next) {
  try {
    const record = await ModuleRecord.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { data: req.body.data || {} } },
      { new: true, runValidators: true },
    ).lean();
    if (!record) return next(httpError(404, 'Record not found'));
    res.json(record);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/module-records/:id
export async function deleteRecord(req, res, next) {
  try {
    const record = await ModuleRecord.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!record) return next(httpError(404, 'Record not found'));
    res.json({ message: 'Record deleted' });
  } catch (err) {
    next(err);
  }
}
