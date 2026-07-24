import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { BusinessSettings } from '../../models/BusinessSettings.js';
import { runAppointmentReminders } from '../../jobs/appointmentReminders.js';
import { httpError } from '../../utils/httpError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_DIR = path.join(__dirname, '../../../uploads/logos');
if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGO_DIR),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  },
});
export const logoUpload = multer({
  storage: logoStorage,
});

// GET /api/settings
export async function getSettings(req, res, next) {
  try {
    const userId = req.user.id;
    let settings = await BusinessSettings.findOne({ userId }).lean();
    if (!settings) {
      settings = await BusinessSettings.create({ userId });
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
    let settings = await BusinessSettings.findOne({ userId });
    if (!settings) {
      settings = await BusinessSettings.create({ userId, ...req.body });
    } else {
      Object.assign(settings, req.body);
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
    const userId = req.user.id;
    let settings = await BusinessSettings.findOne({ userId });
    if (!settings) settings = await BusinessSettings.create({ userId });
    if (settings.logoUrl) {
      const oldPath = path.join(__dirname, '../../../../', settings.logoUrl.replace(/^\//, ''));
      fs.unlink(oldPath, () => {});
    }
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    settings.logoUrl = logoUrl;
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
    if (settings?.logoUrl) {
      const filePath = path.join(__dirname, '../../../../', settings.logoUrl.replace(/^\//, ''));
      fs.unlink(filePath, () => {});
      settings.logoUrl = '';
      await settings.save();
    }
    res.json({ logoUrl: '' });
  } catch (err) {
    next(err);
  }
}
