import mongoose from 'mongoose';
import { Business } from '../../models/Business.js';
import { AppUser } from '../../models/AppUser.js';
import { MetaConnection } from '../../models/MetaIntegration.js';
import { WhatsAppCampaign } from '../../models/WhatsAppCampaign.js';
import { WhatsAppMessageLog } from '../../models/WhatsAppMessageLog.js';
import { WhatsAppProviderProfile } from '../../models/WhatsAppProviderProfile.js';
import { WhatsAppTemplate } from '../../models/WhatsAppTemplate.js';
import { WhatsAppUsageRecord } from '../../models/WhatsAppUsageRecord.js';
import { httpError } from '../../utils/httpError.js';

const STATUS_VALUES = {
  onboardingStatus: ['Not Started', 'In Progress', 'Completed', 'Needs Attention'],
  metaVerificationStatus: ['Not Started', 'Pending', 'Verified', 'Rejected'],
  accountStatus: ['Active', 'Pending', 'Suspended', 'Disconnected'],
};
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

// Explicit DTOs: never spread provider credentials, Meta subjects or message bodies.
export function buildProviderRows(profiles, connections, businesses, now = new Date()) {
  const businessMap = new Map(businesses.map((item) => [String(item._id), item]));
  const profileMap = new Map(profiles.map((item) => [String(item.businessId), item]));
  const connectionMap = new Map(connections.map((item) => [String(item.businessId), item]));
  return [...new Set([...profileMap.keys(), ...connectionMap.keys()])].map((businessId) => {
    const profile = profileMap.get(businessId);
    const connection = connectionMap.get(businessId);
    const business = businessMap.get(businessId);
    const expired = [connection?.tokenExpiresAt, connection?.dataAccessExpiresAt].some((date) => date && new Date(date) <= now);
    const connectionStatus = !connection ? 'Not Connected' : connection.status === 'disconnected' ? 'Disconnected' : expired ? 'Expired' : 'Connected';
    return {
      id: profile ? String(profile._id) : null, businessId,
      customer: business?.name || 'Business unavailable', canManage: Boolean(business),
      onboardingStatus: profile?.onboardingStatus || 'Not Started',
      metaVerificationStatus: profile?.metaVerificationStatus || 'Not Started',
      accountStatus: profile?.accountStatus || 'Pending',
      connectionStatus,
      waba: { name: connection?.wabaName || profile?.waba?.name || '', wabaId: connection?.wabaId || profile?.waba?.wabaId || '', source: connection ? 'Meta' : 'Manual record' },
      phoneNumbers: connection ? [{
        id: connection.phoneNumberId, phoneNumber: connection.displayPhoneNumber,
        displayName: connection.verifiedName, verificationStatus: connection.phoneStatus || 'UNKNOWN',
      }] : (profile?.phoneNumbers || []).map((phone) => ({
        id: String(phone._id), phoneNumber: phone.phoneNumber, displayName: phone.displayName,
        verificationStatus: 'Not checked with Meta',
      })),
      apiStatus: connectionStatus === 'Connected' ? 'Authorized' : connectionStatus,
      webhookStatus: profile?.webhook?.url ? 'Configured (unverified)' : 'Not Configured',
      plan: { name: profile?.plan?.name || 'Not assigned', status: profile?.plan?.status || 'Not assigned', monthlyMessageLimit: number(profile?.plan?.monthlyMessageLimit) },
      updatedAt: profile?.updatedAt || null, connectedAt: connection?.connectedAt || null,
    };
  }).sort((a, b) => a.customer.localeCompare(b.customer) || a.businessId.localeCompare(b.businessId));
}

export async function getWhatsAppProviderAdminOverview(_req, res, next) {
  try {
    const [profiles, connections, businesses, users, campaigns, templates, usage, messageStatus, campaignCount, templateCount] = await Promise.all([
      WhatsAppProviderProfile.find({}).select('businessId onboardingStatus metaVerificationStatus accountStatus waba phoneNumbers plan webhook.url updatedAt').lean(),
      MetaConnection.find({}).select('businessId status wabaId wabaName phoneNumberId displayPhoneNumber verifiedName phoneStatus tokenExpiresAt dataAccessExpiresAt connectedAt').lean(),
      Business.find({}).select('name').lean(),
      AppUser.find({}).select('businessId').lean(),
      WhatsAppCampaign.find({}).select('name businessId userId status sent createdAt').sort({ createdAt: -1, _id: -1 }).limit(20).lean(),
      WhatsAppTemplate.find({}).select('name userId status updatedAt').sort({ updatedAt: -1, _id: -1 }).limit(20).lean(),
      WhatsAppUsageRecord.aggregate([{ $group: { _id: null, sent: { $sum: '$sent' }, delivered: { $sum: '$delivered' }, read: { $sum: '$read' }, failed: { $sum: '$failed' } } }]),
      WhatsAppMessageLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      WhatsAppCampaign.countDocuments({}), WhatsAppTemplate.countDocuments({}),
    ]);
    const rows = buildProviderRows(profiles, connections, businesses);
    const businessMap = new Map(businesses.map((item) => [String(item._id), item.name]));
    const userMap = new Map(users.map((item) => [String(item._id), item.businessId]));
    const summary = (item) => {
      const businessId = item.businessId || userMap.get(String(item.userId));
      return { _id: String(item._id), name: item.name, customer: businessMap.get(String(businessId)) || 'Business unavailable', status: item.status, sent: number(item.sent) };
    };
    res.json({
      profiles: rows, campaigns: campaigns.map(summary), templates: templates.map(summary),
      totals: Object.fromEntries(['sent', 'delivered', 'read', 'failed'].map((key) => [key, number(usage[0]?.[key])])),
      messageStatus: Object.fromEntries(messageStatus.map((item) => [item._id, number(item.count)])),
      stats: {
        customers: rows.length, active: rows.filter((item) => item.accountStatus === 'Active').length,
        pendingOnboarding: rows.filter((item) => item.onboardingStatus !== 'Completed').length,
        connected: rows.filter((item) => item.connectionStatus === 'Connected').length,
        campaigns: campaignCount, templates: templateCount,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) { next(error); }
}

export async function updateWhatsAppProviderStatus(req, res, next) {
  try {
    const body = req.body;
    if (!body || Array.isArray(body)) throw httpError(400, 'Invalid status update');
    const fields = Object.keys(body).filter((key) => key !== 'expectedUpdatedAt');
    if (!fields.length || fields.some((key) => !STATUS_VALUES[key]?.includes(body[key]))) throw httpError(400, 'Invalid provider status field or value');
    const id = req.params.businessId || req.params.id;
    if (!mongoose.isObjectIdOrHexString(id)) throw httpError(400, 'Invalid provider identifier');
    const existing = await WhatsAppProviderProfile.findOne(req.params.businessId ? { businessId: id } : { _id: id }).lean();
    if (!existing && !req.params.businessId) throw httpError(404, 'WhatsApp provider customer not found');
    const businessId = existing?.businessId || id;
    const business = await Business.findById(businessId).select('name').lean();
    if (!business) throw httpError(404, 'Business not found');
    if (req.params.businessId && !Object.hasOwn(body, 'expectedUpdatedAt')) throw httpError(400, 'Refresh the customer before saving');
    const expected = body.expectedUpdatedAt;
    if (Object.hasOwn(body, 'expectedUpdatedAt')) {
      if (expected !== null && (typeof expected !== 'string' || !Number.isFinite(Date.parse(expected)))) throw httpError(400, 'Invalid update version');
      if (existing ? !expected || new Date(existing.updatedAt).getTime() !== Date.parse(expected) : expected !== null) throw httpError(409, 'Customer changed. Refresh and try again.');
    }
    let ownerUserId;
    if (!existing) {
      // Allow creation only for a real Meta customer; no arbitrary business provisioning.
      const connection = await MetaConnection.findOne({ businessId }).select('ownerUserId').lean();
      if (!connection) throw httpError(404, 'WhatsApp provider customer not found');
      const owner = await AppUser.findOne({ _id: connection.ownerUserId, businessId, accountType: 'owner' }).select('_id').lean();
      if (!owner) throw httpError(409, 'Business owner must be assigned before provider setup');
      ownerUserId = owner._id;
    }
    const updateFields = Object.fromEntries(fields.map((key) => [key, body[key]]));
    let profile;
    if (existing) {
      const filter = { _id: existing._id, ...(Object.hasOwn(body, 'expectedUpdatedAt') ? { updatedAt: existing.updatedAt } : {}) };
      profile = await WhatsAppProviderProfile.findOneAndUpdate(filter, { $set: updateFields }, { new: true, runValidators: true }).lean();
    } else {
      profile = await WhatsAppProviderProfile.create({ businessId, ownerUserId, ...updateFields });
    }
    if (!profile) throw httpError(409, 'Customer changed. Refresh and try again.');
    res.json({ message: 'Provider status saved', businessId: String(businessId) });
  } catch (error) {
    if (error.code === 11000) return next(httpError(409, 'Customer changed. Refresh and try again.'));
    next(error);
  }
}
