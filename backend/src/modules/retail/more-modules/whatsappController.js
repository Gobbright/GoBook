import { WhatsAppCampaign } from '../../../models/WhatsAppCampaign.js';
import { httpError } from '../../../utils/httpError.js';

// GET /api/more-modules/whatsapp-campaigns?search=&status=
export async function listCampaigns(req, res, next) {
  try {
    const { search, status } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (search) filter.name = new RegExp(search, 'i');

    const campaigns = await WhatsAppCampaign.find(filter).sort({ createdAt: -1 }).lean();

    const totalSent      = campaigns.reduce((a, c) => a + c.sent, 0);
    const totalDelivered = campaigns.reduce((a, c) => a + c.delivered, 0);
    const totalRead      = campaigns.reduce((a, c) => a + c.read, 0);
    const totalReplied   = campaigns.reduce((a, c) => a + c.replied, 0);
    const totalBounced   = totalSent - totalDelivered;

    res.json({
      campaigns,
      stats: { totalSent, totalDelivered, totalRead, totalReplied, totalBounced },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/more-modules/whatsapp-campaigns
export async function createCampaign(req, res, next) {
  try {
    const campaign = await WhatsAppCampaign.create(req.body);
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
}

// PUT /api/more-modules/whatsapp-campaigns/:id
export async function updateCampaign(req, res, next) {
  try {
    const campaign = await WhatsAppCampaign.findByIdAndUpdate(
      req.params.id, { $set: req.body }, { new: true, runValidators: true },
    ).lean();
    if (!campaign) return next(httpError(404, 'Campaign not found'));
    res.json(campaign);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/more-modules/whatsapp-campaigns/:id
export async function deleteCampaign(req, res, next) {
  try {
    const campaign = await WhatsAppCampaign.findByIdAndDelete(req.params.id).lean();
    if (!campaign) return next(httpError(404, 'Campaign not found'));
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    next(err);
  }
}
