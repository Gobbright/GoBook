import { createHmac } from 'crypto';

import { env } from '../src/config/env.js';
import { CATEGORIES } from '../src/constants/categories.js';
import { connectDatabase } from '../src/services/database.js';
import { SubscriptionPlan } from '../src/models/SubscriptionPlan.js';
import { ensureDefaultSubscriptionPlans } from '../src/services/subscriptionPlans.js';
import { verifyCheckoutSignature, verifyWebhookSignature } from '../src/services/razorpay.js';

const EXPECTED = {
  retail: [14999, 29999, 59999],
  automobile: [14999, 29999, 59999],
  ngo: [14999, 29999, 59999],
  finance: [14999, 29999, 59999],
  construction: [19999, 39999, 79999],
  manufacturing: [19999, 39999, 79999],
  hotel: [24999, 44999, 89999],
  school: [24999, 49999, 99999],
  hospital: [29999, 59999, 119999],
};
const TIERS = ['basic', 'mid', 'advanced'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyCredentials() {
  assert(env.razorpay.keyId, 'RAZORPAY_KEY_ID is missing');
  assert(env.razorpay.keySecret, 'RAZORPAY_KEY_SECRET is missing');
  const authorization = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders?count=1', {
    headers: { Authorization: `Basic ${authorization}` },
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.description || `Razorpay authentication failed: ${response.status}`);
  let smokeOrder;
  if (process.argv.includes('--create-order')) {
    const receipt = `smoke_${Date.now()}`;
    const createResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${authorization}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100, currency: 'INR', receipt, notes: { purpose: 'GoBooks integration smoke test - do not pay' } }),
      signal: AbortSignal.timeout(15000),
    });
    const created = await createResponse.json().catch(() => ({}));
    assert(createResponse.ok && created.id && created.amount === 100 && created.status === 'created', created?.error?.description || 'Order creation check failed');
    smokeOrder = { id: created.id, amountPaise: created.amount, status: created.status };
  }
  return { mode: env.razorpay.keyId.startsWith('rzp_live_') ? 'live' : 'test', readableOrders: Array.isArray(body.items), smokeOrder };
}

async function verifyPlans() {
  await connectDatabase();
  await ensureDefaultSubscriptionPlans();
  const plans = await SubscriptionPlan.find({}).sort({ category: 1, sortOrder: 1 }).lean();
  assert(plans.length === CATEGORIES.length * TIERS.length, `Expected 27 plans, found ${plans.length}`);
  for (const [category, amounts] of Object.entries(EXPECTED)) {
    const rows = plans.filter((plan) => plan.category === category);
    assert(rows.length === 3, `${category} does not have 3 plans`);
    TIERS.forEach((tier, index) => {
      const plan = rows.find((row) => row.tier === tier);
      assert(plan && plan.amount === amounts[index], `${category}/${tier} price mismatch`);
      assert(plan.features.length >= 4, `${category}/${tier} needs at least 4 features`);
    });
  }
  return plans.length;
}

function verifyLocalSignatures() {
  const orderId = 'order_local_check';
  const paymentId = 'pay_local_check';
  const signature = createHmac('sha256', env.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  assert(verifyCheckoutSignature({ orderId, paymentId, signature }), 'Checkout HMAC verification failed');
  if (!env.razorpay.webhookSecret) return false;
  const rawBody = Buffer.from('{"event":"local.check"}');
  const webhookSignature = createHmac('sha256', env.razorpay.webhookSecret).update(rawBody).digest('hex');
  assert(verifyWebhookSignature(rawBody, webhookSignature), 'Webhook HMAC verification failed');
  return true;
}

async function verifyLocalApis() {
  const apiBase = `http://127.0.0.1:${env.port}/api`;
  const publicResponse = await fetch(`${apiBase}/subscriptions/plans?category=hospital`);
  const publicData = await publicResponse.json().catch(() => ({}));
  assert(publicResponse.ok && publicData.plans?.length === 3, 'Public plans API check failed');

  const loginResponse = await fetch(`${apiBase}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminId: env.adminLoginId, password: env.adminLoginPassword }),
  });
  const loginData = await loginResponse.json().catch(() => ({}));
  assert(loginResponse.ok && loginData.token, 'Admin login API check failed');
  const headers = { Authorization: `Bearer ${loginData.token}` };
  const [plansResponse, paymentsResponse] = await Promise.all([
    fetch(`${apiBase}/admin/subscription-plans`, { headers }),
    fetch(`${apiBase}/admin/subscription-payments?status=all`, { headers }),
  ]);
  const [plansData, paymentsData] = await Promise.all([
    plansResponse.json().catch(() => ({})),
    paymentsResponse.json().catch(() => ({})),
  ]);
  assert(plansResponse.ok && plansData.plans?.length === 27, 'Admin plans API check failed');
  assert(paymentsResponse.ok && Array.isArray(paymentsData.rows), 'Admin payments API check failed');
  return { adminPlans: plansData.plans.length, adminPayments: paymentsData.rows.length };
}

try {
  const credentials = await verifyCredentials();
  const planCount = await verifyPlans();
  const webhookSignatureVerified = verifyLocalSignatures();
  const localApis = await verifyLocalApis();
  console.log(JSON.stringify({
    ok: webhookSignatureVerified,
    razorpayCredentials: 'authenticated',
    mode: credentials.mode,
    ordersApiReadable: credentials.readableOrders,
    smokeOrder: credentials.smokeOrder || 'not-requested',
    checkoutSignatureVerified: true,
    webhookSecretConfigured: Boolean(env.razorpay.webhookSecret),
    webhookSignatureVerified,
    razorpayEnvNames: Object.keys(process.env).filter((key) => key.startsWith('RAZORPAY_')).sort(),
    planCount,
    publicPlansApi: 'ok',
    adminPlansApi: localApis.adminPlans,
    adminPaymentsApi: localApis.adminPayments,
  }));
  process.exit(webhookSignatureVerified ? 0 : 2);
} catch (error) {
  console.error(JSON.stringify({ ok: false, message: error.message }));
  process.exit(1);
}
