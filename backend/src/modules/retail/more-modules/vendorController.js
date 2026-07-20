import { Vendor } from '../../../models/Vendor.js';
import { httpError } from '../../../utils/httpError.js';
import { asText, enumValue, importSummary, parseExcelRows } from '../../../utils/excelImport.js';

const VENDOR_IMPORT_COLUMNS = {
  name: 'name',
  'vendor name': 'name',
  'supplier name': 'name',
  supplier: 'name',
  contact: 'contact',
  'contact person': 'contact',
  'contact name': 'contact',
  person: 'contact',
  phone: 'phone',
  mobile: 'phone',
  email: 'email',
  category: 'category',
  status: 'status',
  gstin: 'gstin',
  gst: 'gstin',
  address: 'address',
  'vendor address': 'address',
  'billing address': 'address',
  'street address': 'address',
};

// GET /api/more-modules/vendors?search=&category=
export async function listVendors(req, res, next) {
  try {
    const { search, category } = req.query;
    const filter = { userId: req.user.id };
    if (category && category !== 'All Categories') filter.category = category;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { contact: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }
    const vendors = await Vendor.find(filter).sort({ name: 1 }).lean();
    const total    = vendors.length;
    const active   = vendors.filter((v) => v.status === 'Active').length;
    const categories = [...new Set(vendors.map((v) => v.category).filter(Boolean))].sort();
    res.json({ vendors, stats: { total, active, inactive: total - active }, categories });
  } catch (err) {
    next(err);
  }
}

// POST /api/more-modules/vendors
export async function createVendor(req, res, next) {
  try {
    const { name, gstin, phone } = req.body;
    const userId = req.user.id;
    const dupKey = gstin ? { gstin } : phone ? { phone } : { name };
    const dupField = gstin ? 'GSTIN' : phone ? 'phone number' : 'name';
    const existing = await Vendor.findOne({ userId, ...dupKey });
    if (existing) return next(httpError(409, `A vendor with this ${dupField} already exists`));
    const vendor = await Vendor.create({ ...req.body, userId });
    res.status(201).json(vendor);
  } catch (err) {
    next(err);
  }
}

// POST /api/more-modules/vendors/import
export async function importVendors(req, res, next) {
  try {
    const userId = req.user.id;
    const rows = await parseExcelRows(req.file, VENDOR_IMPORT_COLUMNS, 'Vendor Name, Contact, Phone, Email, GSTIN');
    const summary = importSummary();

    for (const { rowNumber, record } of rows) {
      const name = asText(record.name);
      if (!name) {
        summary.skipped++;
        summary.errors.push(`Row ${rowNumber}: vendor name is required`);
        continue;
      }

      const data = {
        userId,
        name,
        contact: asText(record.contact),
        phone: asText(record.phone),
        email: asText(record.email).toLowerCase(),
        category: asText(record.category),
        status: enumValue(record.status, ['Active', 'Inactive'], 'Active'),
        gstin: asText(record.gstin).toUpperCase(),
        address: asText(record.address),
      };

      const matchBase = data.gstin ? { gstin: data.gstin } : data.phone ? { phone: data.phone } : { name: data.name };
      const existing = await Vendor.findOne({ userId, ...matchBase });
      if (existing) {
        await Vendor.findByIdAndUpdate(existing._id, { $set: data }, { runValidators: true });
        summary.updated++;
      } else {
        await Vendor.create(data);
        summary.imported++;
      }
    }

    res.json(summary);
  } catch (err) {
    next(err);
  }
}

// PUT /api/more-modules/vendors/:id
export async function updateVendor(req, res, next) {
  try {
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();
    if (!vendor) return next(httpError(404, 'Vendor not found'));
    res.json(vendor);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/more-modules/vendors/:id
export async function deleteVendor(req, res, next) {
  try {
    const vendor = await Vendor.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!vendor) return next(httpError(404, 'Vendor not found'));
    res.json({ message: 'Vendor deleted' });
  } catch (err) {
    next(err);
  }
}
