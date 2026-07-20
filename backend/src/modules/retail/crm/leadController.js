import { Lead } from '../../../models/Lead.js';
import { httpError } from '../../../utils/httpError.js';
import { asText, enumValue, importSummary, parseExcelRows } from '../../../utils/excelImport.js';

const LEAD_IMPORT_COLUMNS = {
  name: 'name',
  'lead name': 'name',
  company: 'company',
  'company name': 'company',
  organization: 'company',
  firm: 'company',
  business: 'company',
  email: 'email',
  phone: 'phone',
  mobile: 'phone',
  source: 'source',
  'lead source': 'source',
  channel: 'source',
  status: 'status',
  owner: 'owner',
  'lead owner': 'owner',
  'assigned to': 'owner',
  'sales owner': 'owner',
};

// GET /api/crm/leads?search=
export async function listLeads(req, res, next) {
  try {
    const { search, status } = req.query;
    const filter = { userId: req.user.id };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { company: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }
    const leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ leads });
  } catch (err) {
    next(err);
  }
}

// POST /api/crm/leads
export async function createLead(req, res, next) {
  try {
    const { name, company, phone, email } = req.body;
    const userId = req.user.id;
    const dupKey = phone ? { phone } : email ? { email } : { name, company };
    const dupField = phone ? 'phone number' : email ? 'email' : 'name and company';
    const existing = await Lead.findOne({ userId, ...dupKey });
    if (existing) return next(httpError(409, `A lead with this ${dupField} already exists`));
    const lead = await Lead.create({ ...req.body, userId });
    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
}

// POST /api/crm/leads/import
export async function importLeads(req, res, next) {
  try {
    const userId = req.user.id;
    const rows = await parseExcelRows(req.file, LEAD_IMPORT_COLUMNS, 'Name, Company, Phone, Email, Source');
    const summary = importSummary();

    for (const { rowNumber, record } of rows) {
      const name = asText(record.name);
      if (!name) {
        summary.skipped++;
        summary.errors.push(`Row ${rowNumber}: lead name is required`);
        continue;
      }

      const data = {
        userId,
        name,
        company: asText(record.company),
        email: asText(record.email).toLowerCase(),
        phone: asText(record.phone),
        source: asText(record.source) || 'Website',
        status: enumValue(record.status, ['New', 'Contacted', 'In Progress', 'Qualified', 'Converted'], 'New'),
        owner: asText(record.owner),
      };

      const matchBase = data.phone ? { phone: data.phone } : data.email ? { email: data.email } : { name: data.name, company: data.company };
      const existing = await Lead.findOne({ userId, ...matchBase });
      if (existing) {
        await Lead.findByIdAndUpdate(existing._id, { $set: data }, { runValidators: true });
        summary.updated++;
      } else {
        await Lead.create(data);
        summary.imported++;
      }
    }

    res.json(summary);
  } catch (err) {
    next(err);
  }
}

// PUT /api/crm/leads/:id
export async function updateLead(req, res, next) {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();
    if (!lead) return next(httpError(404, 'Lead not found'));
    res.json(lead);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/crm/leads/:id
export async function deleteLead(req, res, next) {
  try {
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!lead) return next(httpError(404, 'Lead not found'));
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    next(err);
  }
}
