import mongoose from 'mongoose';

import { env } from '../src/config/env.js';
import { AppUser } from '../src/models/AppUser.js';

await mongoose.connect(env.mongodbUri, { dbName: env.mongodbDbName });
const rows = await AppUser.find({ email: /^adminseed\+/ })
  .select('name email phone businessName category subscriptionPlan subscriptionAmount status authProvider createdAt lastLogin')
  .lean();
const normalize = (value) => String(value || '').toLowerCase();
const counts = {
  all: rows.length,
  active: rows.filter((row) => normalize(row.status) === 'active').length,
  trial: rows.filter((row) => !row.subscriptionPlan).length,
  expired: rows.filter((row) => normalize(row.status) === 'expired').length,
  blocked: rows.filter((row) => normalize(row.status) === 'blocked').length,
  deleted: rows.filter((row) => normalize(row.status) === 'deleted').length,
};
const dashboardCounts = {
  activeUsers: await AppUser.countDocuments({ email: /^adminseed\+/, status: /^active$/i }),
  blockedUsers: await AppUser.countDocuments({ email: /^adminseed\+/, status: /^blocked$/i }),
  expiredUsers: await AppUser.countDocuments({ email: /^adminseed\+/, status: /^expired$/i }),
  deletedUsers: await AppUser.countDocuments({ email: /^adminseed\+/, status: /^deleted$/i }),
};
const categories = [...new Set(rows.map((row) => row.category))].sort();
const providers = [...new Set(rows.map((row) => row.authProvider))].sort();
const plans = [...new Set(rows.map((row) => row.subscriptionPlan || 'trial'))].sort();
const missingRequired = rows.filter((row) => !row.name || !row.email || !row.businessName || !row.category || !row.status);
console.log(JSON.stringify({ counts, dashboardCounts, categories, providers, plans, missingRequired: missingRequired.length }, null, 2));
await mongoose.disconnect();