import { EmailCampaign } from '../../../models/EmailCampaign.js';
import { httpError } from '../../../utils/httpError.js';

// GET /api/more-modules/email-campaigns?search=&status=
export async function listCampaigns(req, res, next) {
  try {
    const { search, status } = req.query;
    const filter = {};
    if (status && status !== 'All Status') filter.status = status;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
      ];
    }

    const campaigns = await EmailCampaign.find(filter).sort({ createdAt: -1 }).lean();

    const totalSent    = campaigns.reduce((a, c) => a + c.sent, 0);
    const totalOpened  = campaigns.reduce((a, c) => a + c.opened, 0);
    const totalClicked = campaigns.reduce((a, c) => a + c.clicked, 0);
    const totalBounced = campaigns.reduce((a, c) => a + c.bounced, 0);

    res.json({
      campaigns,
      stats: { totalSent, totalOpened, totalClicked, totalBounced },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/more-modules/email-campaigns
export async function createCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.create(req.body);
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
}

// PUT /api/more-modules/email-campaigns/:id
export async function updateCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findByIdAndUpdate(
      req.params.id, { $set: req.body }, { new: true, runValidators: true },
    ).lean();
    if (!campaign) return next(httpError(404, 'Campaign not found'));
    res.json(campaign);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/more-modules/email-campaigns/:id
export async function deleteCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findByIdAndDelete(req.params.id).lean();
    if (!campaign) return next(httpError(404, 'Campaign not found'));
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    next(err);
  }
}
