import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Payment } from '../src/models/Payment.js';
import { AdminRecord } from '../src/models/AdminRecord.js';
import { AppUser } from '../src/models/AppUser.js';
import { Invoice } from '../src/models/Invoice.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const ADMIN_RECORD_TYPES = {
  renewalReminder: { group: 'Notifications', title: 'Renewal Reminder', status: 'Scheduled' },
  expiryReminder: { group: 'Notifications', title: 'Expiry Reminder', status: 'Scheduled' },
  paymentReminder: { group: 'Notifications', title: 'Payment Reminder', status: 'Pending' },
  sendNotification: { group: 'Notifications', title: 'Send Notification', status: 'Draft' },
};

async function seedPayments() {
  console.log('Seeding payments...');

  // Create sample users
  const users = [];
  for (let i = 1; i <= 10; i++) {
    users.push({
      name: `Customer ${i}`,
      email: `customer${i}@example.com`,
      emailVerified: true,
      authProvider: 'email',
      businessName: `Business ${i}`,
      category: 'retail',
      status: i % 3 === 0 ? 'Expired' : 'Active',
    });
  }
  const createdUsers = await AppUser.insertMany(users);
  console.log(`✓ Created ${createdUsers.length} users`);

  // Create sample invoices
  const invoices = [];
  for (let i = 1; i <= 10; i++) {
    invoices.push({
      userId: createdUsers[i - 1]._id,
      number: `INV-${1000 + i}`,
      documentType: 'Invoice',
      customerName: `Customer ${i}`,
      grandTotal: 10000 + (i * 1000),
      status: 'Paid',
      date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
    });
  }
  const createdInvoices = await Invoice.insertMany(invoices);
  console.log(`✓ Created ${createdInvoices.length} invoices`);

  // Create payments
  const payments = [];
  for (let i = 0; i < 10; i++) {
    payments.push({
      userId: createdUsers[i]._id,
      invoiceId: createdInvoices[i]._id,
      invoiceNumber: `INV-${1000 + i + 1}`,
      customerName: `Customer ${i + 1}`,
      amount: 5000 + ((i + 1) * 1000),
      method: i % 2 === 0 ? 'Online' : 'Cheque',
      date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().slice(0, 10),
      reference: `REF-${100000 + i}`,
      notes: `Payment for invoice #${1000 + i + 1}`,
    });
  }
  await Payment.insertMany(payments);
  console.log('✓ Added 10 payments');
}

async function seedAdminRecords() {
  console.log('Seeding admin records...');
  const types = Object.entries(ADMIN_RECORD_TYPES);

  for (const [kind, config] of types) {
    const records = [];
    for (let i = 1; i <= 10; i++) {
      records.push({
        kind,
        group: config.group,
        title: `${config.title} #${i}`,
        status: config.status,
        amount: Math.random() * 10000,
        target: i % 2 === 0 ? 'Active Users' : 'All Users',
        notes: `${config.title} record ${i} data`,
        scheduledDate: new Date(Date.now() + i * 86400000).toISOString().slice(0, 10),
      });
    }
    await AdminRecord.insertMany(records);
    console.log(`✓ Added 10 ${config.title} records`);
  }
}

async function main() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in .env file');
    }
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await Payment.deleteMany({});
    await Invoice.deleteMany({});
    await AppUser.deleteMany({});
    await AdminRecord.deleteMany({});
    console.log('Cleared existing data');

    await seedPayments();
    await seedAdminRecords();

    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error.message);
    process.exit(1);
  }
}

main();
