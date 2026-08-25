import { WhatsAppAutomation } from '../../../models/WhatsAppAutomation.js';
import { httpError } from '../../../utils/httpError.js';

function automationStats(automations) {
  return {
    total: automations.length,
    active: automations.filter((item) => item.status === 'Active').length,
    inactive: automations.filter((item) => item.status === 'Inactive').length,
    draft: automations.filter((item) => item.status === 'Draft').length,
  };
}

function defaultSteps(payload) {
  return [
    { type: 'Trigger', title: payload.trigger, description: payload.triggerGroup || '' },
    { type: 'Condition', title: 'Customer has WhatsApp', description: 'Check customer WhatsApp number' },
    { type: 'Action', title: payload.action || 'Send WhatsApp Message', description: payload.templateName || '' },
    { type: 'Exit', title: 'End this automation', description: 'Workflow completed' },
  ];
}

export async function listAutomations(req, res, next) {
  try {
    const { search, status, trigger } = req.query;
    const filter = { userId: req.user.id };
    if (status && status !== 'All') filter.status = status;
    if (trigger && trigger !== 'All') filter.trigger = trigger;
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { trigger: new RegExp(search, 'i') },
      { action: new RegExp(search, 'i') },
      { templateName: new RegExp(search, 'i') },
    ];
    const automations = await WhatsAppAutomation.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ automations, stats: automationStats(automations) });
  } catch (err) {
    next(err);
  }
}

export async function createAutomation(req, res, next) {
  try {
    const payload = { ...req.body, userId: req.user.id };
    if (!payload.steps?.length) payload.steps = defaultSteps(payload);
    const automation = await WhatsAppAutomation.create(payload);
    res.status(201).json(automation);
  } catch (err) {
    if (err?.code === 11000) return next(httpError(409, 'Automation name already exists'));
    next(err);
  }
}

export async function updateAutomation(req, res, next) {
  try {
    const automation = await WhatsAppAutomation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { ...req.body, userId: req.user.id } },
      { new: true, runValidators: true },
    ).lean();
    if (!automation) return next(httpError(404, 'Automation not found'));
    res.json(automation);
  } catch (err) {
    if (err?.code === 11000) return next(httpError(409, 'Automation name already exists'));
    next(err);
  }
}

export async function duplicateAutomation(req, res, next) {
  try {
    const automation = await WhatsAppAutomation.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!automation) return next(httpError(404, 'Automation not found'));
    const { _id, createdAt, updatedAt, ...copy } = automation;
    const duplicate = await WhatsAppAutomation.create({
      ...copy,
      name: `${copy.name}_copy_${Date.now()}`,
      status: 'Draft',
      userId: req.user.id,
    });
    res.status(201).json(duplicate);
  } catch (err) {
    next(err);
  }
}

export async function deleteAutomation(req, res, next) {
  try {
    const automation = await WhatsAppAutomation.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!automation) return next(httpError(404, 'Automation not found'));
    res.json({ message: 'Automation deleted' });
  } catch (err) {
    next(err);
  }
}
