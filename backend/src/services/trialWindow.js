export const TRIAL_DAYS = 15;

export function trialEndDate(start) {
  const end = new Date(start);
  end.setDate(end.getDate() + TRIAL_DAYS);
  return end;
}

export function expectedTrialEndsAt(user) {
  const start = user?.trialStartedAt || user?.subscriptionStartDate || user?.trialClaimedAt || user?.createdAt;
  return start ? trialEndDate(start) : null;
}

export async function repairTrialWindow(user, now = new Date()) {
  if (!user || user.isPlatformOwner) return false;
  if (
    user.subscriptionStatus === 'expired'
    && user.billingStatus === 'TRIAL_EXPIRED'
    && user.subscriptionExpiresAt
    && new Date(user.subscriptionExpiresAt).getTime() <= now.getTime()
  ) {
    return false;
  }

  const expectedEnd = expectedTrialEndsAt(user);
  if (!expectedEnd || expectedEnd.getTime() <= now.getTime()) return false;

  const storedEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const needsEndRepair = !storedEnd || storedEnd.getTime() < expectedEnd.getTime();
  const needsStatusRepair = user.subscriptionStatus === 'expired' && user.billingStatus === 'TRIAL_EXPIRED';
  if (!needsEndRepair && !needsStatusRepair) return false;

  user.subscriptionStatus = 'trial';
  user.billingStatus = 'TRIAL_ACTIVE';
  user.trialEndsAt = expectedEnd;
  if (!user.trialStartedAt) user.trialStartedAt = user.subscriptionStartDate || user.trialClaimedAt || user.createdAt || now;
  if (user.status === 'Expired') user.status = 'Active';
  await user.save();
  return true;
}
