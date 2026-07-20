import { Customer } from '../../../models/Customer.js';
import { httpError } from '../../../utils/httpError.js';
import { asText, enumValue, importSummary, parseExcelRows } from '../../../utils/excelImport.js';

const CUSTOMER_IMPORT_COLUMNS = {
  name: 'name',
  'customer name': 'name',
  company: 'name',
  'company name': 'name',
  gstin: 'gstin',
  gst: 'gstin',
  phone: 'phone',
  mobile: 'phone',
  email: 'email',
  address: 'address',
  'billing address': 'address',
  'street address': 'address',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  pin: 'pincode',
  'pin code': 'pincode',
  'postal code': 'pincode',
  'zip code': 'pincode',
  zip: 'pincode',
  status: 'status',
};

// GET /api/crm/customers?search=
export async function listCustomers(req, res, next) {
  try {
    const { search } = req.query;
    const filter = { userId: req.user.id };
    if (search) {
      filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }];
    }
    const customers = await Customer.find(filter).sort({ name: 1 }).lean();
    res.json({ customers });
  } catch (err) {
    next(err);
  }
}

// POST /api/crm/customers
export async function createCustomer(req, res, next) {
  try {
    const { name, gstin, phone, email } = req.body;
    const userId = req.user.id;
    const dupKey = gstin ? { gstin } : phone ? { phone } : email ? { email } : { name };
    const dupField = gstin ? 'GSTIN' : phone ? 'phone number' : email ? 'email' : 'name';
    const existing = await Customer.findOne({ userId, ...dupKey });
    if (existing) return next(httpError(409, `A customer with this ${dupField} already exists`));
    const customer = await Customer.create({ ...req.body, userId });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
}

// POST /api/crm/customers/import
export async function importCustomers(req, res, next) {
  try {
    const userId = req.user.id;
    const rows = await parseExcelRows(req.file, CUSTOMER_IMPORT_COLUMNS, 'Name, Phone, Email, GSTIN, Address');
    const summary = importSummary();

    for (const { rowNumber, record } of rows) {
      const name = asText(record.name);
      if (!name) {
        summary.skipped++;
        summary.errors.push(`Row ${rowNumber}: customer name is required`);
        continue;
      }

      const data = {
        userId,
        name,
        gstin: asText(record.gstin).toUpperCase(),
        phone: asText(record.phone),
        email: asText(record.email).toLowerCase(),
        address: asText(record.address),
        city: asText(record.city),
        state: asText(record.state),
        pincode: asText(record.pincode),
        status: enumValue(record.status, ['Active', 'Inactive'], 'Active'),
      };

      const match = { userId, ...(data.gstin
        ? { gstin: data.gstin }
        : data.phone
          ? { phone: data.phone }
          : data.email
            ? { email: data.email }
            : { name: data.name }) };

      const existing = await Customer.findOne(match);
      if (existing) {
        await Customer.findByIdAndUpdate(existing._id, { $set: data }, { runValidators: true });
        summary.updated++;
      } else {
        await Customer.create(data);
        summary.imported++;
      }
    }

    res.json(summary);
  } catch (err) {
    next(err);
  }
}

// PUT /api/crm/customers/:id
export async function updateCustomer(req, res, next) {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();
    if (!customer) return next(httpError(404, 'Customer not found'));
    res.json(customer);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/crm/customers/:id
export async function deleteCustomer(req, res, next) {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!customer) return next(httpError(404, 'Customer not found'));
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    next(err);
  }
}
