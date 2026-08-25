import { Types } from 'mongoose';

import { AppUser } from '../models/AppUser.js';
import { isBusinessSuperAdmin, scopedOwnerValues } from './tenantScope.js';

function normalizeBranch(value) {
  const branch = String(value ?? '').trim();
  return branch && branch !== 'all' && branch !== 'All Branches' ? branch : '';
}

function toObjectId(value) {
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : value;
}

export async function resolveBranchScope(req) {
  const actor = await AppUser.findById(req.user.id).select('role accountType permissions branch businessId').lean();
  const current = actor ? {
    ...req.user,
    ...actor,
    id: req.user.id,
    businessId: req.user.businessId || actor.businessId,
    isSuperAdmin: req.user.isSuperAdmin || actor.accountType === 'owner' || actor.role === 'Super Admin',
  } : req.user;

  const requestedBranch = normalizeBranch(req.query?.branch ?? req.body?.branchFilter ?? req.body?.branch);
  const branch = isBusinessSuperAdmin(current) ? requestedBranch : normalizeBranch(current.branch);
  return { actor: current, branch, isAllBranches: isBusinessSuperAdmin(current) && !branch };
}

export async function branchScopedQuery(req, collection, extra = {}) {
  const scope = await resolveBranchScope(req);
  const modelName = collection.model.modelName;
  const hasBranchPath = Boolean(collection.model.schema.path('branch'));
  const branchUsers = scope.branch && scope.actor.businessId
    ? await AppUser.find({ businessId: scope.actor.businessId, branch: scope.branch }).select('_id').lean()
    : [];
  const branchUserIds = branchUsers.map((user) => user._id);
  const ownerValues = branchUserIds.length
    && hasBranchPath
    && ['userId', 'ownerUserId', 'createdBy'].includes(collection.ownerField)
    ? branchUserIds
    : await scopedOwnerValues({ ...req, user: scope.actor }, collection.ownerField);
  const query = { ...extra };

  if (ownerValues.length === 0) query[collection.ownerField] = null;
  else if (ownerValues.length === 1) query[collection.ownerField] = ownerValues[0];
  else query[collection.ownerField] = { $in: ownerValues };

  if (!scope.branch) return query;

  if (modelName === 'Branch') {
    query.$and = [
      ...(query.$and || []),
      { $or: [{ code: scope.branch }, { name: scope.branch }] },
    ];
    return query;
  }

  if (modelName === 'BusinessSettings') return query;

  if (collection.ownerField === 'userId' || collection.ownerField === 'ownerUserId' || collection.ownerField === 'createdBy') {
    const ownerBranchClause = branchUserIds.length
      ? { [collection.ownerField]: { $in: branchUserIds } }
      : { [collection.ownerField]: null };
    const branchClause = hasBranchPath ? { branch: scope.branch } : ownerBranchClause;
    query.$and = [
      ...(query.$and || []),
      { $or: hasBranchPath ? [branchClause, ownerBranchClause] : [ownerBranchClause] },
    ];
    return query;
  }

  if (hasBranchPath) query.branch = scope.branch;
  return query;
}

export async function branchScopedAggregateMatch(req, collection, extra = {}) {
  const query = await branchScopedQuery(req, collection, extra);
  const casted = { ...query };
  const ownerValue = casted[collection.ownerField];
  const schemaType = collection.model.schema.path(collection.ownerField);
  if (schemaType?.instance === 'ObjectId') {
    if (ownerValue?.$in) casted[collection.ownerField] = { $in: ownerValue.$in.map(toObjectId) };
    else casted[collection.ownerField] = toObjectId(ownerValue);
  }
  return casted;
}

export async function branchForNewRecord(req, requestedBranch = '') {
  const scope = await resolveBranchScope({ ...req, body: { branch: requestedBranch } });
  return scope.branch || normalizeBranch(requestedBranch);
}
