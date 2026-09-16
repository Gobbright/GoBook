import crypto from 'node:crypto';

import { AppUser } from '../../models/AppUser.js';
import { Business } from '../../models/Business.js';
import { WhatsAppCampaign } from '../../models/WhatsAppCampaign.js';
import { WhatsAppContactGroup } from '../../models/WhatsAppContactGroup.js';
import { WhatsAppMessageLog } from '../../models/WhatsAppMessageLog.js';
import { WhatsAppProviderProfile } from '../../models/WhatsAppProviderProfile.js';
import { WhatsAppTemplate } from '../../models/WhatsAppTemplate.js';
import { WhatsAppUsageRecord } from '../../models/WhatsAppUsageRecord.js';
import { httpError } from '../../utils/httpError.js';

async function actorScope(req) {
  const actor = await AppUser.findById(req.user.id).select('businessId isPlatformOwner').lean();
  if (!actor) throw httpError(401, 'User account not found');
  return { isProviderAdmin: Boolean(actor.isPlatformOwner), businessId: actor.businessId, actor };
}

function publicProfile(profile) {
  if (!profile) return null;
  const data = profile.toObject ? profile.toObject() : { ...profile };
  if (data.api) {
    delete data.api.accessToken;
    data.api.hasAccessToken = Boolean(profile.api?.accessToken || data.api.tokenLastFour);
  }
  if (data.webhook) delete data.webhook.verifyToken;
  return data;
}

async function profileFor(scope, create = false) {
  if (!scope.businessId) throw httpError(400, 'A business account is required for WhatsApp provider setup');
  let profile = await WhatsAppProviderProfile.findOne({ businessId: scope.businessId }).select('+api.accessToken +webhook.verifyToken');
  if (!profile && create) profile = await WhatsAppProviderProfile.create({ businessId: scope.businessId, ownerUserId: scope.actor._id });
  return profile;
}

export async function getProfile(req, res, next) {
  try {
    const scope = await actorScope(req);
    res.json({ profile: publicProfile(scope.businessId ? await profileFor(scope) : null), isProviderAdmin: scope.isProviderAdmin });
  } catch (error) { next(error); }
}

export async function saveProfile(req, res, next) {
  try {
    const scope = await actorScope(req);
    const profile = await profileFor(scope, true);
    const { onboardingStatus, metaVerificationStatus, accountStatus, settings, plan } = req.body;
    if (onboardingStatus) profile.onboardingStatus = onboardingStatus;
    if (metaVerificationStatus) profile.metaVerificationStatus = metaVerificationStatus;
    if (accountStatus) profile.accountStatus = accountStatus;
    if (settings && typeof settings === 'object') profile.settings = { ...profile.settings.toObject(), ...settings };
    if (plan && typeof plan === 'object') profile.plan = { ...profile.plan.toObject(), ...plan };
    await profile.save();
    res.json({ profile: publicProfile(profile) });
  } catch (error) { next(error); }
}

export async function connectAccount(req, res, next) {
  try {
    const scope = await actorScope(req);
    const { name, wabaId, businessManagerId } = req.body;
    if (!name || !wabaId) return next(httpError(400, 'WABA name and WhatsApp Business Account ID are required'));
    const profile = await profileFor(scope, true);
    profile.waba = { name, wabaId, businessManagerId: businessManagerId || '', status: 'Pending' };
    profile.onboardingStatus = profile.metaVerificationStatus === 'Verified' ? 'Completed' : 'In Progress';
    await profile.save();
    res.json({ profile: publicProfile(profile) });
  } catch (error) { next(error); }
}

export async function addNumber(req, res, next) {
  try {
    const scope = await actorScope(req);
    const { displayName, phoneNumber, phoneNumberId } = req.body;
    if (!displayName || !phoneNumber) return next(httpError(400, 'Display name and phone number are required'));
    const profile = await profileFor(scope, true);
    profile.phoneNumbers.push({ displayName, phoneNumber, phoneNumberId: phoneNumberId || '' });
    await profile.save();
    res.status(201).json({ profile: publicProfile(profile) });
  } catch (error) { next(error); }
}

export async function verifyNumber(_req, _res, next) {
  next(httpError(409, 'Verify your phone number through Meta Embedded Signup. Local edits cannot verify a number with Meta.'));
}

export async function rotateCredentials(_req, _res, next) {
  next(httpError(409, 'Meta credentials are managed on the server. Use Connect WhatsApp Business to renew authorization.'));
}

export async function saveWebhook(req, res, next) {
  try {
    const scope = await actorScope(req);
    const profile = await profileFor(scope, true);
    const { url, subscribedEvents = [] } = req.body;
    if (!url) return next(httpError(400, 'Webhook URL is required'));
    profile.webhook.url = url;
    profile.webhook.subscribedEvents = subscribedEvents;
    profile.webhook.verifyToken = crypto.randomBytes(16).toString('hex');
    profile.webhook.status = 'Verified';
    await profile.save();
    res.json({ verifyToken: profile.webhook.verifyToken, profile: publicProfile(profile) });
  } catch (error) { next(error); }
}

export async function getOverview(req, res, next) {
  try {
    const scope = await actorScope(req);
    const filter = scope.isProviderAdmin ? {} : { businessId: scope.businessId };
    const [profiles, groups, messages, usage, campaigns, templates] = await Promise.all([
      WhatsAppProviderProfile.find(filter).lean(),
      WhatsAppContactGroup.find(filter).sort({ updatedAt: -1 }).limit(20).lean(),
      WhatsAppMessageLog.find(filter).sort({ createdAt: -1 }).limit(25).lean(),
      WhatsAppUsageRecord.find(filter).sort({ date: -1 }).limit(31).lean(),
      scope.isProviderAdmin ? WhatsAppCampaign.find({}).sort({ createdAt: -1 }).limit(10).lean() : WhatsAppCampaign.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(10).lean(),
      scope.isProviderAdmin ? WhatsAppTemplate.find({}).sort({ updatedAt: -1 }).limit(10).lean() : WhatsAppTemplate.find({ userId: req.user.id }).sort({ updatedAt: -1 }).limit(10).lean(),
    ]);
    const totals = usage.reduce((sum, item) => ({ sent: sum.sent + item.sent, delivered: sum.delivered + item.delivered, read: sum.read + item.read, failed: sum.failed + item.failed, charge: sum.charge + item.charge }), { sent: 0, delivered: 0, read: 0, failed: 0, charge: 0 });
    res.json({ isProviderAdmin: scope.isProviderAdmin, profiles: profiles.map(publicProfile), groups, messages, campaigns, templates, usage, totals, customerStats: { total: profiles.length, active: profiles.filter((p) => p.accountStatus === 'Active').length, onboarding: profiles.filter((p) => p.onboardingStatus !== 'Completed').length } });
  } catch (error) { next(error); }
}

export async function listCustomers(req, res, next) {
  try {
    const scope = await actorScope(req);
    if (!scope.isProviderAdmin) return next(httpError(403, 'Provider administrator access is required'));
    const [businesses, profiles] = await Promise.all([Business.find({}).sort({ createdAt: -1 }).lean(), WhatsAppProviderProfile.find({}).lean()]);
    const byBusiness = new Map(profiles.map((profile) => [String(profile.businessId), publicProfile(profile)]));
    res.json({ customers: businesses.map((business) => ({ ...business, providerProfile: byBusiness.get(String(business._id)) || null })) });
  } catch (error) { next(error); }
}

export async function createGroup(req, res, next) {
  try {
    const scope = await actorScope(req);
    if (!scope.businessId) return next(httpError(400, 'A business account is required'));
    const group = await WhatsAppContactGroup.create({ businessId: scope.businessId, ...req.body });
    res.status(201).json(group);
  } catch (error) {
    if (error?.code === 11000) return next(httpError(409, 'A contact group with this name already exists'));
    next(error);
  }
}

export async function createMessage(req, res, next) {
  try {
    const scope = await actorScope(req);
    if (!scope.businessId) return next(httpError(400, 'A business account is required'));
    const message = await WhatsAppMessageLog.create({ ...req.body, businessId: scope.businessId, direction: 'Outbound', status: 'Queued' });
    res.status(201).json(message);
  } catch (error) { next(error); }
}
