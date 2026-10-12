import { connectDatabase, disconnectDatabase } from '../src/services/database.js';
import { AppUser } from '../src/models/AppUser.js';
import { expectedTrialEndsAt } from '../src/services/trialWindow.js';

async function main() {
  await connectDatabase();
  const now = new Date();
  const users = await AppUser.find({
    isPlatformOwner: { $ne: true },
    $or: [
      { subscriptionStatus: 'trial' },
      { subscriptionStatus: 'expired', billingStatus: 'TRIAL_EXPIRED' },
    ],
  });

  let repaired = 0;
  for (const user of users) {
    const expectedEnd = expectedTrialEndsAt(user);
    if (!expectedEnd || expectedEnd <= now) continue;

    const storedEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
    if (storedEnd && storedEnd >= expectedEnd && user.subscriptionStatus === 'trial' && user.billingStatus === 'TRIAL_ACTIVE') continue;

    user.subscriptionStatus = 'trial';
    user.billingStatus = 'TRIAL_ACTIVE';
    user.trialEndsAt = expectedEnd;
    if (!user.trialStartedAt) user.trialStartedAt = user.subscriptionStartDate || user.trialClaimedAt || user.createdAt || now;
    if (user.status === 'Expired') user.status = 'Active';
    await user.save();
    repaired += 1;
  }

  console.log(`Trial window repair complete. Updated ${repaired} account${repaired === 1 ? '' : 's'}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
