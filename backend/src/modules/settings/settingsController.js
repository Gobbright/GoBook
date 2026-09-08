import multer from 'multer';
import { BusinessSettings } from '../../models/BusinessSettings.js';
import { AppUser } from '../../models/AppUser.js';
import { Business } from '../../models/Business.js';
import { RETAIL_SUBCATEGORIES } from '../../constants/categories.js';
import { runAppointmentReminders } from '../../jobs/appointmentReminders.js';
import { httpError } from '../../utils/httpError.js';
import { deleteStoredFile, hasExpectedFileSignature, storeBuffer } from '../../services/gridfsStorage.js';

const LEGACY_RETAIL_SUBCATEGORY = 'electronics-technology';

export const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    callback(allowed ? null : httpError(400, 'Only JPG, PNG, GIF, or WebP logos are allowed'), allowed);
  },
});

export const paymentQrUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    callback(allowed ? null : httpError(400, 'Only JPG, PNG, GIF, or WebP QR images are allowed'), allowed);
  },
});

// GET /api/settings
export async function getSettings(req, res, next) {
  try {
    const userId = req.user.id;
    let settings = await BusinessSettings.findOne({ userId }).lean();
    if (!settings) {
      settings = await BusinessSettings.create({ userId });
      settings = settings.toObject();
    }
    if (!settings.retailSubcategory) {
      const user = await AppUser.findById(userId, { category: 1, retailSubcategory: 1, businessId: 1 }).lean();
      const business = user?.businessId
        ? await Business.findById(user.businessId, { retailSubcategory: 1 }).lean()
        : null;
      const retailSubcategory = user?.category === 'retail'
        ? user?.retailSubcategory || business?.retailSubcategory || LEGACY_RETAIL_SUBCATEGORY
        : '';
      if (retailSubcategory) {
        await Promise.all([
          BusinessSettings.updateOne({ userId }, { $set: { retailSubcategory } }),
          AppUser.updateOne({ _id: userId }, { $set: { retailSubcategory } }),
          user?.businessId
            ? Business.updateOne({ _id: user.businessId }, { $set: { retailSubcategory } })
            : Promise.resolve(),
        ]);
        settings = { ...settings, retailSubcategory };
      }
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

// PUT /api/settings
export async function updateSettings(req, res, next) {
  try {
    const userId = req.user.id;
    const payload = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(payload, 'retailSubcategory')) {
      const retailSubcategory = String(payload.retailSubcategory || '').trim();
      const user = await AppUser.findById(userId, { category: 1, businessId: 1 }).lean();
      if (user?.category !== 'retail') {
        payload.retailSubcategory = '';
      } else {
        const normalizedRetailSubcategory = retailSubcategory || LEGACY_RETAIL_SUBCATEGORY;
        if (!RETAIL_SUBCATEGORIES.includes(normalizedRetailSubcategory)) {
          return next(httpError(400, 'Select a valid retail subcategory'));
        }
        payload.retailSubcategory = normalizedRetailSubcategory;
        await AppUser.updateOne({ _id: userId }, { $set: { retailSubcategory: normalizedRetailSubcategory } });
        if (user?.businessId) {
          await Business.updateOne({ _id: user.businessId }, { $set: { retailSubcategory: normalizedRetailSubcategory } });
        }
      }
    }
    let settings = await BusinessSettings.findOne({ userId });
    if (!settings) {
      settings = await BusinessSettings.create({ userId, ...payload });
    } else {
      Object.assign(settings, payload);
      await settings.save();
    }
    res.json(settings.toObject());
  } catch (err) {
    next(err);
  }
}

// POST /api/settings/test-email
// Immediately sends today's real appointment-reminder emails to every patient
// booked today, using this hospital's saved SMTP settings — an on-demand
// version of the 7 AM cron job, not a dummy self-test.
//
// TESTING MODE: resend:true re-sends to every appointment on every click, even
// ones already reminded, so the button is repeatable while testing deliverability.
// Before going to production, change this back to `resend: false` (or drop the
// option) so a click only sends to patients who haven't been reminded yet.
export async function sendTestEmail(req, res, next) {
  try {
    const userId = req.user.id;
    const settings = await BusinessSettings.findOne({ userId }).select('+emailSmtpPass');
    if (!settings?.emailSmtpHost || !settings?.emailSmtpUser || !settings?.emailSmtpPass) {
      return next(httpError(400, 'Save your SMTP settings first, then try again.'));
    }

    const result = await runAppointmentReminders({ force: true, onlyUserId: userId, resend: true });
    const summary = result.results?.[0] || { sent: 0, failed: 0, skippedNoEmail: 0 };

    if (summary.failed > 0 && summary.sent === 0) {
      return next(httpError(400, 'Failed to send — check your SMTP host, email and app password.'));
    }

    let message;
    if (summary.sent > 0) {
      message = `Sent to ${summary.sent} patient${summary.sent === 1 ? '' : 's'} with an appointment today.`;
    } else if (summary.alreadyReminded > 0) {
      message = `All ${summary.alreadyReminded} appointment${summary.alreadyReminded === 1 ? '' : 's'} for today already received a reminder — nothing new to send.`;
    } else if (summary.skippedNoEmail > 0) {
      message = `${summary.skippedNoEmail} appointment${summary.skippedNoEmail === 1 ? '' : 's'} today have no patient email on file, so nothing could be sent.`;
    } else {
      message = 'Connected successfully, but no appointments are scheduled for today.';
    }
    res.json({ message, ...summary });
  } catch (err) {
    next(httpError(400, err.message));
  }
}

// POST /api/settings/logo
export async function uploadLogo(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    if (!hasExpectedFileSignature(req.file.buffer, req.file.mimetype)) return next(httpError(400, 'Logo content does not match its declared image type'));
    const userId = req.user.id;
    let settings = await BusinessSettings.findOne({ userId });
    if (!settings) settings = await BusinessSettings.create({ userId });
    const stored = await storeBuffer({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      metadata: { kind: 'business-logo', userId, businessId: req.user.businessId },
    });
    if (settings.logoFileId) await deleteStoredFile(settings.logoFileId).catch(() => {});
    const logoUrl = `/api/files/logos/${stored.id}`;
    settings.logoUrl = logoUrl;
    settings.logoFileId = stored.id;
    await settings.save();
    res.json({ logoUrl });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/settings/logo
export async function removeLogo(req, res, next) {
  try {
    const userId = req.user.id;
    const settings = await BusinessSettings.findOne({ userId });
    if (settings?.logoUrl || settings?.logoFileId) {
      if (settings.logoFileId) await deleteStoredFile(settings.logoFileId).catch(() => {});
      settings.logoUrl = '';
      settings.logoFileId = undefined;
      await settings.save();
    }
    res.json({ logoUrl: '' });
  } catch (err) {
    next(err);
  }
}

// POST /api/settings/payment-qr
export async function uploadPaymentQr(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    if (!hasExpectedFileSignature(req.file.buffer, req.file.mimetype)) return next(httpError(400, 'QR image content does not match its declared image type'));
    const userId = req.user.id;
    let settings = await BusinessSettings.findOne({ userId });
    if (!settings) settings = await BusinessSettings.create({ userId });
    const stored = await storeBuffer({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      metadata: { kind: 'payment-qr', userId, businessId: req.user.businessId },
    });
    if (settings.paymentQrFileId) await deleteStoredFile(settings.paymentQrFileId).catch(() => {});
    const paymentQrUrl = `/api/files/payment-qrs/${stored.id}`;
    settings.paymentQrUrl = paymentQrUrl;
    settings.paymentQrFileId = stored.id;
    await settings.save();
    res.json({ paymentQrUrl });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/settings/payment-qr
export async function removePaymentQr(req, res, next) {
  try {
    const userId = req.user.id;
    const settings = await BusinessSettings.findOne({ userId });
    if (settings?.paymentQrUrl || settings?.paymentQrFileId) {
      if (settings.paymentQrFileId) await deleteStoredFile(settings.paymentQrFileId).catch(() => {});
      settings.paymentQrUrl = '';
      settings.paymentQrFileId = undefined;
      await settings.save();
    }
    res.json({ paymentQrUrl: '' });
  } catch (err) {
    next(err);
  }
}
