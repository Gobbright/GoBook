import { connectDatabase, disconnectDatabase } from '../src/services/database.js';
import { AdminRecord } from '../src/models/AdminRecord.js';

const command = String(process.argv[2] || '').toLowerCase();
const status = command === 'enable' ? 'Enabled' : command === 'disable' ? 'Disabled' : '';

if (!status) {
  throw new Error('Usage: node scripts/setRazorpayPaymentControl.js enable|disable');
}

try {
  await connectDatabase();
  const setting = await AdminRecord.findOneAndUpdate(
    { kind: 'paymentSettings' },
    {
      $set: {
        group: 'Settings',
        title: 'Razorpay Payment Control',
        status,
        target: 'All Users',
        notes: status === 'Enabled' ? 'Razorpay checkout is enabled by an administrator.' : 'Razorpay checkout is disabled by an administrator.',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
  console.log(`Razorpay payment control: ${setting.status}`);
} finally {
  await disconnectDatabase();
}
