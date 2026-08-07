import { connectDatabase } from '../src/services/database.js';
import { SubscriptionPlan } from '../src/models/SubscriptionPlan.js';
import { ensureDefaultSubscriptionPlans } from '../src/services/subscriptionPlans.js';
import { env } from '../src/config/env.js';

try {
  await connectDatabase();
  await ensureDefaultSubscriptionPlans();
  console.log(JSON.stringify({
    plans: await SubscriptionPlan.countDocuments(),
    razorpayConfigured: Boolean(env.razorpay.keyId && env.razorpay.keySecret),
    webhookConfigured: Boolean(env.razorpay.webhookSecret),
  }));
  process.exit(0);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
