import { AppUser } from '../../../../models/AppUser.js';
import { Branch } from '../../../../models/Branch.js';
import { BusinessSettings } from '../../../../models/BusinessSettings.js';

async function ownerUserId(req) {
  if (!req.user.businessId) return req.user.id;
  const owner = await AppUser.findOne({ businessId: req.user.businessId, accountType: 'owner' }).select('_id').lean();
  return owner?._id || req.user.id;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function invoiceBranchKey(req, invoice) {
  const savedBranch = String(invoice?.branch || '').trim();
  if (savedBranch) return savedBranch;

  const requestBranch = String(req.user.branch || '').trim();
  const invoiceUserId = invoice?.userId ? String(invoice.userId) : '';
  if (requestBranch && (!invoiceUserId || invoiceUserId === String(req.user.id))) return requestBranch;

  if (!invoiceUserId) return requestBranch;
  const invoiceUser = await AppUser.findById(invoiceUserId).select('branch').lean();
  return String(invoiceUser?.branch || requestBranch || '').trim();
}

const BUSINESS_IDENTITY_FIELDS = [
  'businessName',
  'businessEmail',
  'phone',
  'address',
  'city',
  'state',
  'pincode',
  'gstin',
];

function overlayFilledFields(base = {}, override = {}, fields = BUSINESS_IDENTITY_FIELDS) {
  const merged = { ...base };
  for (const field of fields) {
    if (override[field] !== undefined && String(override[field] ?? '').trim() !== '') {
      merged[field] = override[field];
    }
  }
  return merged;
}

async function creatorSettings(invoice, ownerId) {
  const invoiceUserId = invoice?.userId ? String(invoice.userId) : '';
  if (!invoiceUserId || invoiceUserId === String(ownerId)) return null;
  return BusinessSettings.findOne({ userId: invoiceUserId }).lean();
}

export async function resolvedBusinessSettingsForInvoice(req, invoice) {
  const userId = await ownerUserId(req);
  const ownerSettings = await BusinessSettings.findOne({ userId }).lean() || {};
  const invoiceCreatorSettings = await creatorSettings(invoice, userId);
  const settings = invoiceCreatorSettings
    ? overlayFilledFields(ownerSettings, invoiceCreatorSettings)
    : ownerSettings;
  const snapshotBranch = String(invoice?.businessSettingsSnapshot?.branch || invoice?.businessSettingsSnapshot?.branchCode || '').trim();
  if (snapshotBranch && invoice?.businessSettingsSnapshot && Object.keys(invoice.businessSettingsSnapshot).length) {
    const snapshotSettings = { ...settings, ...invoice.businessSettingsSnapshot };
    return {
      settings: invoiceCreatorSettings
        ? overlayFilledFields(snapshotSettings, invoiceCreatorSettings)
        : snapshotSettings,
      branchKey: String(invoice?.businessSettingsSnapshot?.branch || invoice?.branch || '').trim(),
      fromSnapshot: true,
    };
  }
  const branchKey = await invoiceBranchKey(req, invoice);
  if (!branchKey) return { settings, branchKey: '', fromSnapshot: false };
  const exactBranch = new RegExp(`^${escapeRegex(branchKey)}$`, 'i');
  const branch = await Branch.findOne({
    userId,
    $or: [{ code: exactBranch }, { name: exactBranch }],
  }).lean();
  if (!branch) return { settings, branchKey, fromSnapshot: false };
  const branchSettings = {
    branch: branch.code || branch.name || branchKey,
    branchName: branch.name || '',
    branchCode: branch.code || '',
    businessEmail: branch.email,
    phone: branch.phone,
    address: branch.address,
    city: branch.city,
    state: branch.state,
    pincode: branch.pincode,
    gstin: branch.gstin,
  };
  return {
    branchKey: branch.code || branch.name || branchKey,
    fromSnapshot: false,
    settings: overlayFilledFields(
      { ...settings, branch: branch.code || branch.name || branchKey, branchName: branch.name || '', branchCode: branch.code || '' },
      branchSettings,
      ['businessEmail', 'phone', 'address', 'city', 'state', 'pincode', 'gstin'],
    ),
  };
}

export async function businessSettingsForInvoice(req, invoice) {
  const resolved = await resolvedBusinessSettingsForInvoice(req, invoice);
  return resolved.settings;
}

export async function withBusinessSettings(req, invoice) {
  if (!invoice) return invoice;
  const resolved = await resolvedBusinessSettingsForInvoice(req, invoice);
  return {
    ...invoice,
    branch: invoice.branch || resolved.branchKey || '',
    businessSettings: resolved.settings,
  };
}
