import { WhatsAppChatbot } from '../../../models/WhatsAppChatbot.js';
import { httpError } from '../../../utils/httpError.js';

function statsFor(chatbots) {
  return {
    total: chatbots.length,
    active: chatbots.filter((item) => item.status === 'Active').length,
    inactive: chatbots.filter((item) => item.status === 'Inactive').length,
    draft: chatbots.filter((item) => item.status === 'Draft').length,
    sessions: chatbots.reduce((sum, item) => sum + Number(item.analytics?.sessions || 0), 0),
  };
}

function starterNodes(payload) {
  return [{
    nodeId: `start-${Date.now()}`,
    type: 'Start',
    title: 'Start',
    messageType: 'Text',
    message: payload.description || 'When a user starts a conversation',
    quickReplies: [],
    nextStep: '',
    x: 360,
    y: 32,
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
    quickReplies: Array.isArray(node.quickReplies) ? node.quickReplies.filter(Boolean) : [],
    nextStep: node.nextStep || '',
    x: Number(node.x || 0),
    y: Number(node.y || index * 120),
  }));
  return payload;
}

export async function listChatbots(req, res, next) {
  try {
    const { search, status } = req.query;
    const filter = { userId: req.user.id };
    if (status && status !== 'All') filter.status = status;
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { language: new RegExp(search, 'i') },
    ];
    const chatbots = await WhatsAppChatbot.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ chatbots, stats: statsFor(chatbots) });
  } catch (err) {
    next(err);
  }
}

export async function createChatbot(req, res, next) {
  try {
    const chatbot = await WhatsAppChatbot.create(normalizePayload(req.body, req.user.id));
    res.status(201).json(chatbot);
  } catch (err) {
    if (err?.code === 11000) return next(httpError(409, 'Bot name already exists'));
    next(err);
  }
}

export async function updateChatbot(req, res, next) {
  try {
    const chatbot = await WhatsAppChatbot.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: normalizePayload(req.body, req.user.id) },
      { new: true, runValidators: true },
    ).lean();
    if (!chatbot) return next(httpError(404, 'Bot not found'));
    res.json(chatbot);
  } catch (err) {
    if (err?.code === 11000) return next(httpError(409, 'Bot name already exists'));
    next(err);
  }
}

export async function duplicateChatbot(req, res, next) {
  try {
    const chatbot = await WhatsAppChatbot.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!chatbot) return next(httpError(404, 'Bot not found'));
    const { _id, createdAt, updatedAt, ...copy } = chatbot;
    const duplicate = await WhatsAppChatbot.create({
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

export async function deleteChatbot(req, res, next) {
  try {
    const chatbot = await WhatsAppChatbot.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!chatbot) return next(httpError(404, 'Bot not found'));
    res.json({ message: 'Bot deleted' });
  } catch (err) {
    next(err);
  }
}
