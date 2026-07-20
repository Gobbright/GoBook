import { Branch } from '../../models/Branch.js';
import { httpError } from '../../utils/httpError.js';

// GET /api/settings/branches?search=
export async function listBranches(req, res, next) {
  try {
    const { search } = req.query;
    const filter = { userId: req.user.id };
    if (search) {
      filter.$or = [{ name: new RegExp(search, 'i') }, { code: new RegExp(search, 'i') }, { manager: new RegExp(search, 'i') }];
    }
    const branches = await Branch.find(filter).sort({ name: 1 }).lean();
    const total     = branches.length;
    const active    = branches.filter((b) => b.status === 'Active').length;
    const totalUsers    = branches.reduce((a, b) => a + (b.users || 0), 0);
    const totalRevenue  = branches.reduce((a, b) => a + (b.revenue || 0), 0);
    res.json({ branches, stats: { total, active, inactive: total - active, totalUsers, totalRevenue } });
  } catch (err) {
    next(err);
  }
}

// POST /api/settings/branches
export async function createBranch(req, res, next) {
  try {
    const branch = await Branch.create({ ...req.body, userId: req.user.id });
    res.status(201).json(branch);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Branch code already exists'));
    next(err);
  }
}

// PUT /api/settings/branches/:id
export async function updateBranch(req, res, next) {
  try {
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();
    if (!branch) return next(httpError(404, 'Branch not found'));
    res.json(branch);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/settings/branches/:id
export async function deleteBranch(req, res, next) {
  try {
    const branch = await Branch.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!branch) return next(httpError(404, 'Branch not found'));
    res.json({ message: 'Branch deleted' });
  } catch (err) {
    next(err);
  }
}
