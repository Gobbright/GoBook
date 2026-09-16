import { connectDatabase, disconnectDatabase } from '../src/services/database.js';
import { AppUser } from '../src/models/AppUser.js';

async function run() {
  await connectDatabase();
  const users = await AppUser.find({
    $or: [{ isPlatformOwner: true }, { role: 'Super Admin' }, { accountType: 'owner' }],
  }).select('name email role accountType isPlatformOwner status').lean();
  console.table(users.map((user) => ({
    name: user.name,
    email: user.email,
    role: user.role,
    accountType: user.accountType,
    platformOwner: user.isPlatformOwner,
    status: user.status,
  })));
  await disconnectDatabase();
}

run().catch((error) => {
  console.error('Failed:', error.message);
  process.exitCode = 1;
});
