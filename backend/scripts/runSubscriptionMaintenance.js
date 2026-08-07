import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../src/services/database.js';
import { runSubscriptionLifecycle } from '../src/jobs/subscriptionLifecycle.js';

try {
  await connectDatabase();
  const result = await runSubscriptionLifecycle();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
} finally {
  await new Promise((resolve) => setTimeout(resolve, 250));
  await disconnectDatabase().catch(() => {});
  process.exit(process.exitCode || 0);
}
