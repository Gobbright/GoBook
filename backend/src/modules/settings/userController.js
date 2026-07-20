import bcrypt from 'bcryptjs';

import { AppUser } from '../../models/AppUser.js';
import { httpError } from '../../utils/httpError.js';

const SALT_ROUNDS = 10;
const USER_WRITE_FIELDS = ['name', 'email', 'role', 'branch', 'phone', 'status', 'businessName'];

const ROLE_STYLES = {
  'Super Admin':       { bg: '#1e293b', text: '#f1f5f9' },
  'Branch Manager':    { bg: '#dbeafe', text: '#1d4ed8' },
  'Accountant':        { bg: '#d1fae5', text: '#065f46' },
  'Sales Executive':   { bg: '#fef3c7', text: '#92400e' },
  'Inventory Manager': { bg: '#fce7f3', text: '#9d174d' },
};

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : value;
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
    const { search, role } = req.query;
    const filter = { businessId: req.user.businessId };
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
    const payload = await buildUserPayload(req.body, { requirePassword: true });
    if (!payload.name || !payload.email) {
      return next(httpError(400, 'Name, email and password are required'));
    }
    payload.businessId = req.user.businessId;
    const user = await AppUser.create(payload);
    res.status(201).json(toSafeUser(user));
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Email already exists'));
    next(err);
  }
}

// PUT /api/settings/users/:id
export async function updateUser(req, res, next) {
  try {
    const payload = await buildUserPayload(req.body);
    if (payload.name === '' || payload.email === '') {
      return next(httpError(400, 'Name and email cannot be empty'));
    }
    const user = await AppUser.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.businessId },
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
    if (req.params.id === req.user.id) {
      return next(httpError(400, 'You cannot delete your own account'));
    }
    const user = await AppUser.findOneAndDelete({ _id: req.params.id, businessId: req.user.businessId }).lean();
    if (!user) return next(httpError(404, 'User not found'));
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}
