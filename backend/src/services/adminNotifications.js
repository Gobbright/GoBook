import { AdminNotification } from '../models/AdminNotification.js';

export async function createAdminNotification({ dedupeKey, type, title, message, relatedUser = '', userId, businessId, paymentId, metadata = {} }) {
  if (!dedupeKey) return null;
  try {
    return await AdminNotification.findOneAndUpdate(
      { dedupeKey },
      { $setOnInsert: { dedupeKey, type, title, message, relatedUser, userId, businessId, paymentId, metadata, read: false, archived: false } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error?.code === 11000) return AdminNotification.findOne({ dedupeKey });
    throw error;
  }
}
