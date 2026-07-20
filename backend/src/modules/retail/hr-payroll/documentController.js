import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { HRDocument } from '../../../models/Document.js';
import { httpError } from '../../../utils/httpError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../../uploads/documents');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

function formatSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// GET /api/hr-payroll/documents/folder-counts
export async function getFolderCounts(req, res, next) {
  try {
    const userId = req.user.id;
    const total  = await HRDocument.countDocuments({ userId });
    const counts = await HRDocument.aggregate([
      { $match: { userId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const map = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    res.json({
      'Employee Documents': total,
      'ID Proof':           map['ID Proof']        ?? 0,
      'Address Proof':      map['Address Proof']   ?? 0,
      'Certificates':       map['Certificates']    ?? 0,
      'Contracts':          map['Contracts']       ?? 0,
      'Other Documents':    map['Other Documents'] ?? 0,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/hr-payroll/documents?search=&category=&empId=&page=&limit=
export async function listDocuments(req, res, next) {
  try {
    const { search, category, empId, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user.id };
    if (search)   filter.$or = [{ name: new RegExp(search, 'i') }, { employee: new RegExp(search, 'i') }];
    if (category && category !== 'Employee Documents') filter.category = category;
    if (empId)    filter.empId = empId;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      HRDocument.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      HRDocument.countDocuments(filter),
    ]);
    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// POST /api/hr-payroll/documents  (multipart/form-data)
export async function createDocument(req, res, next) {
  try {
    const { employee = '', empId = '', category = 'Other Documents', uploadedBy = 'Super Admin' } = req.body;
    const file = req.file;
    if (!file) return next(httpError(400, 'File is required'));

    const doc = await HRDocument.create({
      userId: req.user.id,
      name:       file.originalname,
      employee,
      empId,
      category,
      uploadedBy,
      uploadedOn: todayLabel(),
      size:       formatSize(file.size),
      filePath:   file.filename,
      mimeType:   file.mimetype,
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

// PUT /api/hr-payroll/documents/:id  (metadata only — no file re-upload)
export async function updateDocument(req, res, next) {
  try {
    const { name, employee, empId, category, uploadedBy } = req.body;
    const doc = await HRDocument.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { name, employee, empId, category, uploadedBy } },
      { new: true, runValidators: true },
    ).lean();
    if (!doc) return next(httpError(404, 'Document not found'));
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/hr-payroll/documents/:id
export async function deleteDocument(req, res, next) {
  try {
    const doc = await HRDocument.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!doc) return next(httpError(404, 'Document not found'));
    if (doc.filePath) {
      const full = path.join(UPLOAD_DIR, doc.filePath);
      fs.unlink(full, () => {});
    }
    res.json({ message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
}

// GET /api/hr-payroll/documents/:id/download
export async function downloadDocument(req, res, next) {
  try {
    const doc = await HRDocument.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!doc) return next(httpError(404, 'Document not found'));
    const full = path.join(UPLOAD_DIR, doc.filePath);
    if (!fs.existsSync(full)) return next(httpError(404, 'File not found on server'));
    res.download(full, doc.name);
  } catch (err) {
    next(err);
  }
}

// GET /api/hr-payroll/documents/:id/view
export async function viewDocument(req, res, next) {
  try {
    const doc = await HRDocument.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!doc) return next(httpError(404, 'Document not found'));
    const full = path.join(UPLOAD_DIR, doc.filePath);
    if (!fs.existsSync(full)) return next(httpError(404, 'File not found on server'));
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.name}"`);
    fs.createReadStream(full).pipe(res);
  } catch (err) {
    next(err);
  }
}
