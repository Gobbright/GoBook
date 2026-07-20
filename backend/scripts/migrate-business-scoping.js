// One-off migration: backfills `businessId` on any AppUser created before
// multi-tenant scoping existed, creating one Business per orphaned user.
// Safe to re-run — it only touches users that still lack a businessId.
import { connectDatabase, disconnectDatabase } from '../src/services/database.js';
import { AppUser } from '../src/models/AppUser.js';
import { Business } from '../src/models/Business.js';

async function run() {
  await connectDatabase();

  const orphanedUsers = await AppUser.find({ businessId: { $exists: false } });
  console.log(`Found ${orphanedUsers.length} user(s) without a businessId.`);

  for (const user of orphanedUsers) {
    const name = user.businessName?.trim() || `${user.name}'s Business`;
    const business = await Business.create({ name });
    user.businessId = business._id;
    await user.save();
    console.log(`  -> ${user.email} joined new business "${business.name}" (${business._id})`);
  }

  console.log('Migration complete.');
  await disconnectDatabase();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
