import { BusinessSettings } from '../models/BusinessSettings.js';

// Used when no GSTIN has been configured yet in Business Settings
const FALLBACK_GSTIN = '27ZZZZZ9999A1Z5';

export async function getActiveGstin(userId) {
  const settings = userId
    ? await BusinessSettings.findOne({ userId }).lean()
    : await BusinessSettings.findOne().lean();
  return settings?.gstin || FALLBACK_GSTIN;
}
