import mongoose from 'mongoose';

import { env } from '../src/config/env.js';
import { AppUser } from '../src/models/AppUser.js';
import { FinanceCollection } from '../src/models/FinanceCollection.js';
import { FinanceCustomer } from '../src/models/FinanceCustomer.js';

const DEFAULT_TARGET = 'Kutty Anbu 4';
const target = process.argv.slice(2).join(' ').trim() || DEFAULT_TARGET;

const rows = [
  ['Arun Kumar', 'Loan', 50000, 500, '2026-07-01'],
  ['Meena Priya', 'Chit', 30000, 300, '2026-07-02'],
  ['Suresh Babu', 'Deposit', 25000, 250, '2026-07-03'],
  ['Divya Lakshmi', 'Loan', 45000, 450, '2026-07-04'],
  ['Karthik Raja', 'Chit', 20000, 200, '2026-07-05'],
  ['Nandhini S', 'Deposit', 18000, 180, '2026-07-06'],
  ['Prakash M', 'Loan', 60000, 600, '2026-07-07'],
  ['Revathi K', 'Chit', 36000, 360, '2026-07-08'],
  ['Balaji V', 'Deposit', 22000, 220, '2026-07-09'],
  ['Gayathri R', 'Loan', 52000, 520, '2026-07-10'],
  ['Vignesh P', 'Chit', 28000, 280, '2026-07-11'],
  ['Saranya D', 'Deposit', 24000, 240, '2026-07-12'],
  ['Mohan Raj', 'Loan', 40000, 400, '2026-07-13'],
  ['Keerthana N', 'Chit', 32000, 320, '2026-07-14'],
  ['Ramesh T', 'Deposit', 26000, 260, '2026-07-15'],
  ['Priyanka J', 'Loan', 48000, 480, '2026-07-16'],
  ['Senthil Kumar', 'Chit', 12000, 1200, '2026-07-01'],
  ['Latha S', 'Deposit', 15000, 1500, '2026-07-02'],
  ['Murugan P', 'Loan', 10000, 1000, '2026-07-03'],
  ['Anitha B', 'Chit', 8000, 800, '2026-07-04'],
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findTargetUser() {
  const exact = new RegExp(`^${escapeRegex(target)}$`, 'i');
  const query = {
    category: 'finance',
    status: { $ne: 'Deleted' },
    $or: [
      { name: exact },
      { businessName: exact },
      { email: target.toLowerCase() },
    ],
  };

  const user = await AppUser.findOne(query);
  if (user) return user;

  const financeUsers = await AppUser.find({ category: 'finance', status: { $ne: 'Deleted' } })
    .select('name email businessName status')
    .sort({ createdAt: 1 })
    .lean();

  throw new Error(`Finance user '${target}' was not found. Finance users: ${financeUsers.map((item) => `${item.name} <${item.email}>`).join(', ') || 'none'}`);
}

function collectionDatesFor(index) {
  if (index >= 16) return ['2026-07-20', '2026-07-22', '2026-07-24', '2026-07-26', '2026-07-28'];
  const count = (index % 5) + 1;
  return ['2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31'].slice(0, count);
}

async function seedCustomer(user, row, index) {
  const [name, type, totalAmount, dailyCollectionAmount, startDate] = row;
  const phone = `99000041${String(index + 1).padStart(2, '0')}`;
  const closed = index >= 16;

  const customer = await FinanceCustomer.findOneAndUpdate(
    { userId: user._id, phone },
    {
      $set: {
        userId: user._id,
        name,
        phone,
        type,
        totalAmount,
        dailyCollectionAmount,
        startDate,
        status: closed ? 'Finished' : 'Active',
        finishedAt: closed ? new Date('2026-07-29T10:00:00+05:30') : null,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const dates = collectionDatesFor(index);
  const amount = closed ? Math.floor(totalAmount / dates.length) : dailyCollectionAmount;
  const remainder = closed ? totalAmount - (amount * dates.length) : 0;

  await Promise.all(dates.map((date, dateIndex) => FinanceCollection.findOneAndUpdate(
    { userId: user._id, customerId: customer._id, date },
    {
      $set: {
        userId: user._id,
        customerId: customer._id,
        date,
        amount: amount + (dateIndex === dates.length - 1 ? remainder : 0),
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  )));

  return customer;
}

async function main() {
  await mongoose.connect(env.mongodbUri, { dbName: env.mongodbDbName });
  const user = await findTargetUser();

  const customers = [];
  for (const [index, row] of rows.entries()) {
    customers.push(await seedCustomer(user, row, index));
  }

  const customerIds = customers.map((customer) => customer._id);
  const [activeCount, closedCount, collectionCount] = await Promise.all([
    FinanceCustomer.countDocuments({ userId: user._id, _id: { $in: customerIds }, status: 'Active' }),
    FinanceCustomer.countDocuments({ userId: user._id, _id: { $in: customerIds }, status: 'Finished' }),
    FinanceCollection.countDocuments({ userId: user._id, customerId: { $in: customerIds } }),
  ]);

  console.log(JSON.stringify({
    user: { id: String(user._id), name: user.name, email: user.email, category: user.category },
    customersSeeded: customers.length,
    activeCount,
    closedCount,
    collectionCount,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
