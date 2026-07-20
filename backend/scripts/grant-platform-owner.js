// One-off: grants platform-owner (site owner) access to a specific account.
// Run: node scripts/grant-platform-owner.js you@example.com
import { connectDatabase, disconnectDatabase } from '../src/services/database.js';
import { AppUser } from '../src/models/AppUser.js';

const email = process.argv[2]?.trim().toLowerCase();

async function run() {
  if (!email) {
    console.error('Usage: node scripts/grant-platform-owner.js <email>');
    process.exit(1);
  }

  await connectDatabase();

  const user = await AppUser.findOneAndUpdate(
    { email },
    { $set: { isPlatformOwner: true } },
    { new: true },
  );

  if (!user) {
    console.error(`No user found with email ${email}`);
  } else {
    console.log(`Granted platform-owner access to ${user.email} (${user._id}).`);
  }

  await disconnectDatabase();
}

run().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
