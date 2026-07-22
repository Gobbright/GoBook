import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { env } from '../src/config/env.js';
import { AppUser } from '../src/models/AppUser.js';

const users = [
  ['Aarav Retail', 'retail', 'starter', 999, 'Active', 'email', 'Owner', 'Chennai'],
  ['Meera School', 'school', 'professional', 2499, 'Active', 'google', 'Principal', 'Coimbatore'],
  ['Kavin Hospital', 'hospital', 'enterprise', 4999, 'Expired', 'email', 'Admin', 'Madurai'],
  ['Nisha Hotel', 'hotel', 'starter', 999, 'Active', 'google', 'Manager', 'Salem'],
  ['Rohan Manufacturing', 'manufacturing', 'professional', 2499, 'Blocked', 'email', 'Operations', 'Erode'],
  ['Priya Construction', 'construction', 'enterprise', 4999, 'Active', 'email', 'Project Head', 'Trichy'],
  ['Sanjay NGO', 'ngo', '', 0, 'Active', 'google', 'Coordinator', 'Tirunelveli'],
  ['Divya Automobile', 'automobile', 'starter', 999, 'Deleted', 'email', 'Service Lead', 'Vellore'],
  ['Vikram Retail Pro', 'retail', 'professional', 2499, 'Active', 'email', 'Sales Executive', 'Bengaluru'],
  ['Anika Enterprise', 'hotel', 'enterprise', 4999, 'Active', 'google', 'Finance Admin', 'Hyderabad'],
];

await mongoose.connect(env.mongodbUri, { dbName: env.mongodbDbName });
const password = await bcrypt.hash('AdminSeed@123', 10);
const now = new Date();
let changed = 0;

for (let i = 0; i < users.length; i += 1) {
  const [name, category, plan, amount, status, authProvider, role, city] = users[i];
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '.');
  const email = `adminseed+${slug}@gobook.test`;
  const result = await AppUser.updateOne(
    { email },
    {
      $set: {
        name,
        email,
        password,
        authProvider,
        emailVerified: true,
        businessName: `${name} Business`,
        category,
        subscriptionPlan: plan,
        subscriptionAmount: amount,
        onboardingCompleted: true,
        role,
        branch: city,
        phone: `90000${String(i + 1).padStart(5, '0')}`,
        status,
        lastLogin: new Date(now.getTime() - i * 86400000).toISOString(),
        isPlatformOwner: false,
      },
      $setOnInsert: {
        createdAt: new Date(now.getTime() - i * 86400000 * 3),
      },
    },
    { upsert: true },
  );
  if (result.upsertedCount || result.modifiedCount) changed += 1;
}

const seeded = await AppUser.find({ email: /^adminseed\+/ })
  .select('name email category subscriptionPlan subscriptionAmount status authProvider businessName createdAt lastLogin')
  .sort({ email: 1 })
  .lean();
const counts = await AppUser.aggregate([
  { $match: { email: /^adminseed\+/ } },
  { $group: { _id: { category: '$category', status: '$status', plan: '$subscriptionPlan' }, count: { $sum: 1 } } },
  { $sort: { '_id.category': 1 } },
]);

console.log(JSON.stringify({ seededCount: seeded.length, changed, counts, users: seeded.map((u) => ({ name: u.name, email: u.email, category: u.category, plan: u.subscriptionPlan, status: u.status, provider: u.authProvider })) }, null, 2));
await mongoose.disconnect();