import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { BusinessSettings } from '../../models/BusinessSettings.js';

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
