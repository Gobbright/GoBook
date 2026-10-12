import { AppUser } from '../models/AppUser.js';
import { repairTrialWindow } from '../services/trialWindow.js';
import { httpError } from '../utils/httpError.js';

export async function requireSubscriptionAccess(req, _res, next) {
  try {
    const actor = await AppUser.findById(req.user.id).select('accountType parentUserId isPlatformOwner subscriptionStatus subscriptionExpiresAt trialStartedAt trialClaimedAt trialEndsAt billingStatus status createdAt');
    if (!actor) return next(httpError(401, 'Account no longer exists'));
    if (actor.isPlatformOwner) return next();
    const owner = actor.accountType === 'member' && actor.parentUserId
      ? await AppUser.findById(actor.parentUserId).select('subscriptionStatus subscriptionExpiresAt trialStartedAt trialClaimedAt trialEndsAt billingStatus status createdAt') : actor;
    if (!owner) return next(httpError(403, 'Your account owner is unavailable'));
    const now = new Date();
    await repairTrialWindow(owner, now);
    if (owner.subscriptionStatus === 'trial' && owner.trialEndsAt && owner.trialEndsAt <= now) {
      await AppUser.updateOne({ _id: owner._id, subscriptionStatus: 'trial', trialEndsAt: { $lte: now } }, { $set: { subscriptionStatus: 'expired', billingStatus: 'TRIAL_EXPIRED' } });
      return next(httpError(402, 'Your free trial has expired. Choose a plan to continue.'));
    }
    if (owner.subscriptionStatus === 'active' && owner.subscriptionExpiresAt && owner.subscriptionExpiresAt <= now) {
      await AppUser.updateOne({ _id: owner._id, subscriptionStatus: 'active', subscriptionExpiresAt: { $lte: now } }, { $set: { subscriptionStatus: 'expired', billingStatus: 'SUBSCRIPTION_EXPIRED' } });
      return next(httpError(402, 'Your subscription has expired. Choose a plan to continue.'));
    }
    if (owner.subscriptionStatus === 'trial' || owner.subscriptionStatus === 'active') return next();
    return next(httpError(402, owner.billingStatus === 'PAYMENT_METHOD_VERIFICATION_PENDING' ? 'Verify a payment method before accessing application features.' : 'An active subscription is required to access application features.'));
  } catch (error) { next(error); }
}
