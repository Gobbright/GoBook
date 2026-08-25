import { WhatsAppTemplate } from '../../../models/WhatsAppTemplate.js';
import { httpError } from '../../../utils/httpError.js';

function templateStats(templates) {
  return {
    total: templates.length,
    approved: templates.filter((item) => item.status === 'Approved').length,
    pending: templates.filter((item) => item.status === 'Pending').length,
    rejected: templates.filter((item) => item.status === 'Rejected').length,
    disabled: templates.filter((item) => item.status === 'Disabled').length,
  };
}

export async function listTemplates(req, res, next) {
  try {
    const { search, status, category } = req.query;
    const filter = { userId: req.user.id };
    if (status && status !== 'All') filter.status = status;
    if (category && category !== 'All') filter.category = category;
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { body: new RegExp(search, 'i') },
      { category: new RegExp(search, 'i') },
    ];

    const templates = await WhatsAppTemplate.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ templates, stats: templateStats(templates) });
  } catch (err) {
    next(err);
  }
}

export async function createTemplate(req, res, next) {
  try {
    const template = await WhatsAppTemplate.create({ ...req.body, userId: req.user.id });
    res.status(201).json(template);
  } catch (err) {
    if (err?.code === 11000) return next(httpError(409, 'Template name already exists'));
    next(err);
  }
}

export async function updateTemplate(req, res, next) {
  try {
    const template = await WhatsAppTemplate.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { ...req.body, userId: req.user.id } },
      { new: true, runValidators: true },
    ).lean();
    if (!template) return next(httpError(404, 'Template not found'));
    res.json(template);
  } catch (err) {
    if (err?.code === 11000) return next(httpError(409, 'Template name already exists'));
    next(err);
  }
}

export async function duplicateTemplate(req, res, next) {
  try {
    const template = await WhatsAppTemplate.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!template) return next(httpError(404, 'Template not found'));
    const { _id, createdAt, updatedAt, ...copy } = template;
    const duplicate = await WhatsAppTemplate.create({
      ...copy,
      name: `${copy.name}_copy_${Date.now()}`,
      status: 'Pending',
      userId: req.user.id,
    });
    res.status(201).json(duplicate);
  } catch (err) {
    next(err);
  }
}

export async function deleteTemplate(req, res, next) {
  try {
    const template = await WhatsAppTemplate.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!template) return next(httpError(404, 'Template not found'));
    res.json({ message: 'Template deleted' });
  } catch (err) {
    next(err);
  }
}
