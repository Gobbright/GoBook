// One-off: backfills `businessId` on Invoice documents (invoices, quotations,
// credit/debit notes, delivery challans, e-invoices, e-way bills) created
// before document numbering was scoped to the business. Safe to re-run —
// only touches documents that still lack a businessId.
import { AppUser } from '../src/models/AppUser.js';
import { Invoice } from '../src/models/Invoice.js';
import { connectDatabase, disconnectDatabase } from '../src/services/database.js';

async function run() {
  await connectDatabase();

  const orphaned = await Invoice.find({ businessId: { $exists: false } }).select('_id userId number documentType');
  console.log(`Found ${orphaned.length} document(s) without a businessId.`);

  const userCache = new Map();
  let updated = 0;
  let skipped = 0;

  for (const doc of orphaned) {
    const userKey = String(doc.userId);
    if (!userCache.has(userKey)) {
      const user = await AppUser.findById(doc.userId).select('businessId email');
      userCache.set(userKey, user ?? null);
    }
    const user = userCache.get(userKey);

    if (!user?.businessId) {
      skipped++;
      console.log(`  -> skipped ${doc.documentType} "${doc.number}" (${doc._id}): owning user has no businessId`);
      continue;
    }

    await Invoice.updateOne({ _id: doc._id }, { $set: { businessId: user.businessId } });
    updated++;
  }

  console.log(`Updated ${updated} document(s). Skipped ${skipped}.`);
  await disconnectDatabase();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
