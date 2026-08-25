import { WhatsAppFlow } from '../../../models/WhatsAppFlow.js';
import { httpError } from '../../../utils/httpError.js';

function statsFor(flows) {
  return {
    total: flows.length,
    published: flows.filter((item) => item.status === 'Published').length,
    draft: flows.filter((item) => item.status === 'Draft').length,
    inactive: flows.filter((item) => item.status === 'Inactive').length,
  };
}

function starterNodes(payload) {
  return [{
    nodeId: `start-${Date.now()}`,
    type: 'Start',
    title: 'Start',
    messageType: 'Text',
    message: payload.description || 'Flow begins when the user clicks the button',
    variableName: '',
    buttons: [],
    nextStep: '',
    x: 320,
    y: 24,
  }];
}

function normalizePayload(body, userId) {
  const payload = { ...body, userId };
  if (!Array.isArray(payload.nodes) || !payload.nodes.length) payload.nodes = starterNodes(payload);
  payload.nodes = payload.nodes.map((node, index) => ({
    nodeId: node.nodeId || `node-${Date.now()}-${index}`,
    type: node.type || 'Message',
    title: node.title || node.type || 'Message',
    messageType: node.messageType || 'Text',
    message: node.message || '',
    variableName: node.variableName || '',
    buttons: Array.isArray(node.buttons) ? node.buttons.filter(Boolean) : [],
    nextStep: node.nextStep || '',
    x: Number(node.x || 0),
    y: Number(node.y || index * 130),
  }));
  return payload;
}

export async function listFlows(req, res, next) {
  try {
    const { search, category, status } = req.query;
    const filter = { userId: req.user.id };
    if (category && category !== 'All') filter.category = category;
    if (status && status !== 'All') filter.status = status;
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { category: new RegExp(search, 'i') },
    ];
    const flows = await WhatsAppFlow.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ flows, stats: statsFor(flows) });
  } catch (err) {
    next(err);
  }
}

export async function createFlow(req, res, next) {
  try {
    const flow = await WhatsAppFlow.create(normalizePayload(req.body, req.user.id));
    res.status(201).json(flow);
  } catch (err) {
    if (err?.code === 11000) return next(httpError(409, 'Flow name already exists'));
    next(err);
  }
}

export async function updateFlow(req, res, next) {
  try {
    const flow = await WhatsAppFlow.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: normalizePayload(req.body, req.user.id) },
      { new: true, runValidators: true },
    ).lean();
    if (!flow) return next(httpError(404, 'Flow not found'));
    res.json(flow);
  } catch (err) {
    if (err?.code === 11000) return next(httpError(409, 'Flow name already exists'));
    next(err);
  }
}

export async function duplicateFlow(req, res, next) {
  try {
    const flow = await WhatsAppFlow.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!flow) return next(httpError(404, 'Flow not found'));
    const { _id, createdAt, updatedAt, ...copy } = flow;
    const duplicate = await WhatsAppFlow.create({
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

export async function deleteFlow(req, res, next) {
  try {
    const flow = await WhatsAppFlow.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!flow) return next(httpError(404, 'Flow not found'));
    res.json({ message: 'Flow deleted' });
  } catch (err) {
    next(err);
  }
}
