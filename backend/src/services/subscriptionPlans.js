import { SubscriptionPlan } from '../models/SubscriptionPlan.js';

export const PLAN_TIERS = ['basic', 'mid', 'advanced'];
const TIER_DETAILS = {
  basic: {
    name: 'Basic', sortOrder: 1,
    features: ['Billing and invoice management', 'Customer and vendor records', 'Inventory and stock tracking', 'GST-ready reports', 'Business dashboard', 'Email support'],
  },
  mid: {
    name: 'Mid', sortOrder: 2,
    features: ['Everything in Basic', 'Advanced accounting', 'CRM and follow-up tools', 'Employee and payroll management', 'Multiple branches', 'Data import and export', 'Automated reminders', 'Advanced business reports', 'Priority support'],
  },
  advanced: {
    name: 'Advanced', sortOrder: 3,
    features: ['Everything in Mid', 'Complete category modules', 'Advanced access controls', 'Audit logs and compliance tools', 'AI business assistant', 'Custom workflows', 'Unlimited branches', 'Data backup and recovery', 'Advanced analytics', 'Onboarding assistance', 'Dedicated support', 'Early access to new features'],
  },
};
const PRICE_GROUPS = [
  { categories: ['retail', 'automobile', 'ngo', 'finance'], amounts: [14999, 29999, 59999] },
  { categories: ['construction', 'manufacturing'], amounts: [19999, 39999, 79999] },
  { categories: ['hotel'], amounts: [24999, 44999, 89999] },
  { categories: ['school'], amounts: [24999, 49999, 99999] },
  { categories: ['hospital'], amounts: [29999, 59999, 119999] },
];
let initializationPromise;

function defaultAmount(category, tier) {
  const group = PRICE_GROUPS.find((item) => item.categories.includes(category)) || PRICE_GROUPS[0];
  return group.amounts[PLAN_TIERS.indexOf(tier)];
}

export function ensureDefaultSubscriptionPlans() {
  if (initializationPromise) return initializationPromise;
  const operations = PRICE_GROUPS.flatMap(({ categories }) => categories.flatMap((category) => PLAN_TIERS.map((tier) => ({
    updateOne: {
      filter: { category, tier },
      update: { $setOnInsert: { category, tier, ...TIER_DETAILS[tier], amount: defaultAmount(category, tier), currency: 'INR', billingPeriod: 'year', enabled: true } },
      upsert: true,
    },
  }))));
  initializationPromise = SubscriptionPlan.bulkWrite(operations, { ordered: false }).catch((error) => {
    initializationPromise = undefined;
    throw error;
  });
  return initializationPromise;
}

export async function getPlansForCategory(category, { includeDisabled = false } = {}) {
  await ensureDefaultSubscriptionPlans();
  const query = { category };
  if (!includeDisabled) query.enabled = true;
  return SubscriptionPlan.find(query).sort({ sortOrder: 1, amount: 1 }).lean();
}

export async function getActivePlan(category, tier) {
  await ensureDefaultSubscriptionPlans();
  return SubscriptionPlan.findOne({ category, tier, enabled: true }).lean();
}

export function planPublicView(plan) {
  return {
    id: plan._id, category: plan.category, tier: plan.tier, name: plan.name,
    amount: plan.amount, currency: plan.currency, billingPeriod: plan.billingPeriod,
    features: plan.features || [], enabled: Boolean(plan.enabled), sortOrder: plan.sortOrder,
  };
}
