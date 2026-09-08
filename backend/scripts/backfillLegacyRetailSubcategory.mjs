import 'dotenv/config';

import { connectDatabase, disconnectDatabase } from '../src/services/database.js';
import { AppUser } from '../src/models/AppUser.js';
import { Business } from '../src/models/Business.js';
import { BusinessSettings } from '../src/models/BusinessSettings.js';

const LEGACY_RETAIL_SUBCATEGORY = 'electronics-technology';
const missingSubcategory = {
  $or: [
    { retailSubcategory: { $exists: false } },
    { retailSubcategory: '' },
    { retailSubcategory: null },
  ],
};

try {
  await connectDatabase();

  const retailUsers = await AppUser.find({ category: 'retail' }).select('_id businessId').lean();
  const retailUserIds = retailUsers.map((user) => user._id);
  const retailBusinessIds = [...new Set(retailUsers.map((user) => String(user.businessId || '')).filter(Boolean))];

  const [users, businesses, settings] = await Promise.all([
    AppUser.updateMany(
      { category: 'retail', ...missingSubcategory },
      { $set: { retailSubcategory: LEGACY_RETAIL_SUBCATEGORY } },
    ),
    Business.updateMany(
      { _id: { $in: retailBusinessIds }, category: 'retail', ...missingSubcategory },
      { $set: { retailSubcategory: LEGACY_RETAIL_SUBCATEGORY } },
    ),
    retailUserIds.length
      ? BusinessSettings.updateMany(
        { userId: { $in: retailUserIds }, ...missingSubcategory },
        { $set: { retailSubcategory: LEGACY_RETAIL_SUBCATEGORY } },
      )
      : Promise.resolve({ matchedCount: 0, modifiedCount: 0 }),
  ]);

  console.log(JSON.stringify({
    ok: true,
    retailSubcategory: LEGACY_RETAIL_SUBCATEGORY,
    users: { matched: users.matchedCount, modified: users.modifiedCount },
    businesses: { matched: businesses.matchedCount, modified: businesses.modifiedCount },
    settings: { matched: settings.matchedCount, modified: settings.modifiedCount },
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
} finally {
  await disconnectDatabase().catch(() => {});
  process.exit(process.exitCode || 0);
}
