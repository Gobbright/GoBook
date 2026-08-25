import { Branch } from '../../models/Branch.js';
import { AppUser } from '../../models/AppUser.js';
import { httpError } from '../../utils/httpError.js';
import { isBusinessSuperAdmin, scopedOwnerQuery } from '../../utils/tenantScope.js';

const BRANCH_LIMIT = 3;
const UNLIMITED_BRANCH_PLANS = ['advanced', 'enterprise'];
const BRANCH_WRITE_FIELDS = ['name', 'code', 'manager', 'phone', 'email', 'city', 'status', 'users', 'revenue'];

async function branchActor(req) {
  const actor = await AppUser.findById(req.user.id).select('role accountType permissions branch businessId subscriptionPlan').lean();
  return actor ? { ...req.user, ...actor, id: req.user.id, isSuperAdmin: req.user.isSuperAdmin || actor.accountType === 'owner' || actor.role === 'Super Admin' } : req.user;
}

async function ownerPlan(req) {
  const owner = await AppUser.findOne({ businessId: req.user.businessId, accountType: 'owner' }).select('subscriptionPlan').lean();
  return owner?.subscriptionPlan || req.user.subscriptionPlan || '';
}

async function enforceBranchLimit(req) {
  const plan = await ownerPlan(req);
  if (UNLIMITED_BRANCH_PLANS.includes(plan)) return;

  const filter = await scopedOwnerQuery(req, { model: Branch, ownerField: 'userId' });
  const count = await Branch.countDocuments(filter);
  if (count >= BRANCH_LIMIT) {
    throw httpError(402, `Branch limit reached. You can create up to ${BRANCH_LIMIT} branches in this plan. Upgrade to Advanced for unlimited branches.`);
  }
}

async function ownerUserId(req) {
  if (!req.user.businessId) return req.user.id;
  const owner = await AppUser.findOne({ businessId: req.user.businessId, accountType: 'owner' }).select('_id').lean();
  return owner?._id || req.user.id;
}

function normalizeBranchPayload(body = {}) {
  const payload = {};
  for (const field of BRANCH_WRITE_FIELDS) {
    if (body[field] !== undefined) payload[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
  }
  if (payload.code) payload.code = payload.code.toUpperCase();
  if (payload.email) payload.email = payload.email.toLowerCase();
  if (payload.users !== undefined) payload.users = Number(payload.users) || 0;
  if (payload.revenue !== undefined) payload.revenue = Number(payload.revenue) || 0;
  return payload;
}

async function assertBranchCodeAvailable(req, code, ignoreId = null) {
  if (!code) throw httpError(400, 'Branch code is required');
  const filter = await scopedOwnerQuery(req, { model: Branch, ownerField: 'userId' });
  const duplicateFilter = { ...filter, code };
  if (ignoreId) duplicateFilter._id = { $ne: ignoreId };
  const existing = await Branch.exists(duplicateFilter);
  if (existing) throw httpError(409, 'Branch code already exists');
}

function duplicateBranchError(err) {
  if (err.code !== 11000) return null;
  const fields = Object.keys(err.keyPattern || {});
  if (fields.includes('code')) return httpError(409, 'Branch code already exists');
  return httpError(409, 'Branch already exists');
}

// GET /api/settings/branches?search=
export async function listBranches(req, res, next) {
  try {
    const actor = await branchActor(req);
    const { search } = req.query;
    let filter;
    if (isBusinessSuperAdmin(actor)) {
      filter = await scopedOwnerQuery(req, { model: Branch, ownerField: 'userId' });
    } else if (actor.branch && actor.businessId) {
      const owner = await AppUser.findOne({ businessId: actor.businessId, accountType: 'owner' }).select('_id').lean();
      filter = {
        userId: owner?._id || null,
        $or: [{ code: actor.branch }, { name: actor.branch }],
      };
    } else {
      filter = { _id: null };
    }
    if (search) {
      const searchOr = [{ name: new RegExp(search, 'i') }, { code: new RegExp(search, 'i') }, { manager: new RegExp(search, 'i') }];
      filter = filter.$or ? { $and: [filter, { $or: searchOr }] } : { ...filter, $or: searchOr };
    }
    const branches = await Branch.find(filter).sort({ name: 1 }).lean();
    const total     = branches.length;
    const active    = branches.filter((b) => b.status === 'Active').length;
    const branchUserCounts = await AppUser.aggregate([
      { $match: { businessId: req.user.businessId, branch: { $nin: ['', null] } } },
      { $group: { _id: '$branch', count: { $sum: 1 } } },
    ]);
    const usersByBranch = branchUserCounts.reduce((map, row) => {
      map.set(row._id, row.count);
      return map;
    }, new Map());
    const branchesWithUsers = branches.map((branch) => ({
      ...branch,
      users: usersByBranch.get(branch.code) || usersByBranch.get(branch.name) || branch.users || 0,
    }));
    const totalUsers    = branchesWithUsers.reduce((a, b) => a + (b.users || 0), 0);
    const totalRevenue  = branches.reduce((a, b) => a + (b.revenue || 0), 0);
    res.json({ branches: branchesWithUsers, stats: { total, active, inactive: total - active, totalUsers, totalRevenue } });
  } catch (err) {
    next(err);
  }
}

// POST /api/settings/branches
export async function createBranch(req, res, next) {
  try {
    if (!isBusinessSuperAdmin(req.user)) return next(httpError(403, 'Only Super Admin can add branches'));
    await enforceBranchLimit(req);
    const payload = normalizeBranchPayload(req.body);
    if (!payload.name) return next(httpError(400, 'Branch name is required'));
    await assertBranchCodeAvailable(req, payload.code);
    const branch = await Branch.create({ ...payload, userId: await ownerUserId(req) });
    res.status(201).json(branch);
  } catch (err) {
    const duplicateError = duplicateBranchError(err);
    if (duplicateError) return next(duplicateError);
    next(err);
  }
}

// PUT /api/settings/branches/:id
export async function updateBranch(req, res, next) {
  try {
    if (!isBusinessSuperAdmin(req.user)) return next(httpError(403, 'Only Super Admin can update branches'));
    const payload = normalizeBranchPayload(req.body);
    if (payload.code) await assertBranchCodeAvailable(req, payload.code, req.params.id);
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, ...(await scopedOwnerQuery(req, { model: Branch, ownerField: 'userId' })) },
      { $set: payload },
      { new: true, runValidators: true },
    ).lean();
    if (!branch) return next(httpError(404, 'Branch not found'));
    res.json(branch);
  } catch (err) {
    const duplicateError = duplicateBranchError(err);
    if (duplicateError) return next(duplicateError);
    next(err);
  }
}

// DELETE /api/settings/branches/:id
export async function deleteBranch(req, res, next) {
  try {
    if (!isBusinessSuperAdmin(req.user)) return next(httpError(403, 'Only Super Admin can delete branches'));
    const branch = await Branch.findOneAndDelete({ _id: req.params.id, ...(await scopedOwnerQuery(req, { model: Branch, ownerField: 'userId' })) }).lean();
    if (!branch) return next(httpError(404, 'Branch not found'));
    res.json({ message: 'Branch deleted' });
  } catch (err) {
    next(err);
  }
}
