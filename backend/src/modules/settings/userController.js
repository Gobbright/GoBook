import bcrypt from 'bcryptjs';

import { AppUser } from '../../models/AppUser.js';
import { httpError } from '../../utils/httpError.js';
import { isBusinessSuperAdmin } from '../../utils/tenantScope.js';

const SALT_ROUNDS = 10;
const USER_WRITE_FIELDS = ['name', 'email', 'role', 'branch', 'phone', 'status', 'businessName'];
const MODULE_PERMISSIONS = ['billing', 'purchase', 'accounting', 'employee-management', 'inventory', 'crm', 'reports', 'data-management', 'settings'];

const ROLE_STYLES = {
  'Super Admin':       { bg: '#1e293b', text: '#f1f5f9' },
  'Branch Manager':    { bg: '#dbeafe', text: '#1d4ed8' },
  'Accountant':        { bg: '#d1fae5', text: '#065f46' },
  'Sales Executive':   { bg: '#fef3c7', text: '#92400e' },
  'Inventory Manager': { bg: '#fce7f3', text: '#9d174d' },
};

const ROLE_MODULE_PRESETS = {
  'Super Admin': MODULE_PERMISSIONS,
  'Accountant': ['accounting', 'reports'],
  'Sales Executive': ['billing', 'crm', 'reports'],
  'Inventory Manager': ['inventory', 'reports'],
  'Branch Manager': ['billing', 'crm', 'inventory', 'reports'],
};

function canManageBranchUsers(user = {}) {
  return user.role === 'Branch Manager' && Boolean(user.branch);
}

function canManageUsers(user = {}) {
  return isBusinessSuperAdmin(user) || canManageBranchUsers(user);
}

async function managementActor(req) {
  const actor = await AppUser.findById(req.user.id).select('role accountType permissions branch businessId category').lean();
  if (!actor) throw httpError(404, 'User not found');
  return {
    ...req.user,
    ...actor,
    id: req.user.id,
    businessId: req.user.businessId || actor.businessId,
    isSuperAdmin: req.user.isSuperAdmin || actor.accountType === 'owner' || actor.role === 'Super Admin',
  };
}

function managedUsersFilter(actor, extra = {}) {
  const filter = { businessId: actor.businessId, ...extra };
  if (!isBusinessSuperAdmin(actor)) {
    filter.$and = [
      ...(Array.isArray(filter.$and) ? filter.$and : []),
      { branch: actor.branch },
      { accountType: { $ne: 'owner' } },
      { role: { $ne: 'Super Admin' } },
    ];
  }
  return filter;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function validatePassword(password) {
  if (!password) throw httpError(400, 'Password is required');
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw httpError(400, 'Password must include at least one letter and one number');
  }
}

async function buildUserPayload(body, { requirePassword = false } = {}) {
  const payload = {};
  for (const field of USER_WRITE_FIELDS) {
    if (body[field] !== undefined) payload[field] = normalizeText(body[field]);
  }

  if (payload.email) payload.email = payload.email.toLowerCase();

  const password = normalizeText(body.password);
  if (requirePassword && !password) {
    throw httpError(400, 'Password is required');
  }
  if (password) {
    if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
    payload.password = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const requestedModules = Array.isArray(body.permissions?.modules)
    ? body.permissions.modules
    : Array.isArray(body.modules)
      ? body.modules
      : null;
  const modules = requestedModules
    ? requestedModules.filter((moduleKey) => MODULE_PERMISSIONS.includes(moduleKey))
    : ROLE_MODULE_PRESETS[payload.role] || [];
  const requestedActions = body.permissions?.actions && typeof body.permissions.actions === 'object'
    ? body.permissions.actions
    : {};
  payload.permissions = {
    modules: payload.role === 'Super Admin' ? MODULE_PERMISSIONS : modules,
    actions: {
      view: true,
      create: requestedActions.create !== false,
      edit: requestedActions.edit !== false,
      delete: Boolean(requestedActions.delete),
      export: Boolean(requestedActions.export),
      manageUsers: payload.role === 'Branch Manager' || Boolean(requestedActions.manageUsers),
    },
  };

  return payload;
}

function toSafeUser(user) {
  const safe = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete safe.password;
  delete safe.resetOtpHash;
  delete safe.resetOtpExpiresAt;
  delete safe.resetOtpAttempts;
  return safe;
}

// GET /api/settings/users?search=&role=
export async function listUsers(req, res, next) {
  try {
    const actor = await managementActor(req);
    if (!canManageUsers(actor)) {
      return next(httpError(403, 'You do not have permission to view users'));
    }
    const { search, role } = req.query;
    const filter = managedUsersFilter(actor);
    if (role && role !== 'All Roles') filter.role = role;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
      ];
    }
    const users = await AppUser.find(filter).sort({ name: 1 }).lean();
    const total    = users.length;
    const active   = users.filter((u) => u.status === 'Active').length;

    // Role distribution
    const roleDist = {};
    for (const u of users) {
      roleDist[u.role] = (roleDist[u.role] || 0) + 1;
    }
    const rolesOverview = Object.entries(roleDist).map(([label, count]) => ({
      label,
      count,
      pct: `${Math.round((count / (total || 1)) * 100)}%`,
      ...(ROLE_STYLES[label] ?? {}),
    }));

    res.json({ users, stats: { total, active, inactive: total - active }, rolesOverview });
  } catch (err) {
    next(err);
  }
}

// POST /api/settings/users
export async function createUser(req, res, next) {
  try {
    const actor = await managementActor(req);
    if (!canManageUsers(actor)) {
      return next(httpError(403, 'You do not have permission to add users'));
    }
    const owner = await AppUser.findOne({ businessId: actor.businessId, accountType: 'owner' })
      .select('businessName subscriptionStatus subscriptionExpiresAt category accountType role')
      .lean();
    const payload = await buildUserPayload(req.body, { requirePassword: true });
    if (!payload.name || !payload.email) {
      return next(httpError(400, 'Name, email and password are required'));
    }
    const existingEmail = await AppUser.exists({ email: payload.email });
    if (existingEmail) return next(httpError(409, 'Email already registered. Use another email address.'));
    if (!isBusinessSuperAdmin(actor)) {
      if (payload.role === 'Super Admin') return next(httpError(403, 'Branch Manager cannot create Super Admin users'));
      payload.branch = actor.branch;
      payload.permissions.actions.manageUsers = payload.role === 'Branch Manager';
    }
    payload.businessId = actor.businessId;
    payload.businessName = owner?.businessName || payload.businessName || '';
    payload.category = owner?.category || actor.category || 'retail';
    payload.accountType = isBusinessSuperAdmin(actor) && payload.role === 'Super Admin' ? 'owner' : 'member';
    payload.parentUserId = actor.id;
    payload.subscriptionPlan = '';
    payload.subscriptionStatus = owner?.subscriptionStatus || '';
    payload.subscriptionExpiresAt = owner?.subscriptionExpiresAt;
    payload.onboardingCompleted = true;
    payload.emailVerified = true;
    const user = await AppUser.create(payload);
    res.status(201).json(toSafeUser(user));
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Email already registered. Use another email address.'));
    next(err);
  }
}

// PUT /api/settings/users/:id
export async function updateUser(req, res, next) {
  try {
    const actor = await managementActor(req);
    if (!canManageUsers(actor)) {
      return next(httpError(403, 'You do not have permission to update users'));
    }
    const payload = await buildUserPayload(req.body);
    if (payload.name === '' || payload.email === '') {
      return next(httpError(400, 'Name and email cannot be empty'));
    }
    if (payload.email) {
      const existingEmail = await AppUser.exists({ email: payload.email, _id: { $ne: req.params.id } });
      if (existingEmail) return next(httpError(409, 'Email already registered. Use another email address.'));
    }
    if (!isBusinessSuperAdmin(actor)) {
      if (payload.role === 'Super Admin') return next(httpError(403, 'Branch Manager cannot create Super Admin users'));
      payload.branch = actor.branch;
      payload.accountType = 'member';
      payload.permissions.actions.manageUsers = payload.role === 'Branch Manager';
    } else {
      payload.accountType = payload.role === 'Super Admin' ? 'owner' : 'member';
    }
    const user = await AppUser.findOneAndUpdate(
      managedUsersFilter(actor, { _id: req.params.id }),
      { $set: payload },
      { new: true, runValidators: true },
    ).lean();
    if (!user) return next(httpError(404, 'User not found'));
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/settings/users/:id
export async function deleteUser(req, res, next) {
  try {
    const actor = await managementActor(req);
    if (!canManageUsers(actor)) {
      return next(httpError(403, 'You do not have permission to delete users'));
    }
    if (req.params.id === req.user.id) {
      return next(httpError(400, 'You cannot delete your own account'));
    }
    const user = await AppUser.findOneAndDelete(managedUsersFilter(actor, { _id: req.params.id, accountType: { $ne: 'owner' } })).lean();
    if (!user) return next(httpError(404, 'User not found'));
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}
