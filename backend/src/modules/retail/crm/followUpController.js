import { FollowUp } from '../../../models/FollowUp.js';
import { httpError } from '../../../utils/httpError.js';

// GET /api/crm/follow-ups
export async function listFollowUps(req, res, next) {
  try {
    const followUps = await FollowUp.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ followUps });
  } catch (err) {
    next(err);
  }
}

// POST /api/crm/follow-ups
export async function createFollowUp(req, res, next) {
  try {
    const followUp = await FollowUp.create({ ...req.body, userId: req.user.id });
    res.status(201).json(followUp);
  } catch (err) {
    next(err);
  }
}

// PUT /api/crm/follow-ups/:id
export async function updateFollowUp(req, res, next) {
  try {
    const followUp = await FollowUp.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();
    if (!followUp) return next(httpError(404, 'Follow-up not found'));
    res.json(followUp);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/crm/follow-ups/:id
export async function deleteFollowUp(req, res, next) {
  try {
    const followUp = await FollowUp.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!followUp) return next(httpError(404, 'Follow-up not found'));
    res.json({ message: 'Follow-up deleted' });
  } catch (err) {
    next(err);
  }
}
