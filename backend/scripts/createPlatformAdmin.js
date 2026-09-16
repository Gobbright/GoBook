import bcrypt from 'bcryptjs';

import { connectDatabase, disconnectDatabase } from '../src/services/database.js';
import { AppUser } from '../src/models/AppUser.js';

const [email, password, name = 'Platform Admin'] = process.argv.slice(2);

async function run() {
  if (!email || !password) {
    throw new Error('Usage: node scripts/createPlatformAdmin.js <email> <password> [name]');
  }
  if (password.length < 12) throw new Error('Use a password with at least 12 characters');

  await connectDatabase();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await AppUser.findOneAndUpdate(
    { email: email.trim().toLowerCase() },
    {
      $set: {
        name: name.trim(), password: passwordHash, role: 'Super Admin', accountType: 'owner',
        isPlatformOwner: true, status: 'Active', emailVerified: true, onboardingCompleted: true, authProvider: 'email',
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).select('name email role accountType isPlatformOwner status');
  console.log(`Platform admin ready: ${user.email} (${user.name})`);
  await disconnectDatabase();
}

run().catch(async (error) => {
  console.error('Failed:', error.message);
  await disconnectDatabase().catch(() => {});
  process.exitCode = 1;
});
