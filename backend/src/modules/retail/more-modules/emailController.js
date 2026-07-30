import { EmailCampaign } from '../../../models/EmailCampaign.js';
import { BusinessSettings } from '../../../models/BusinessSettings.js';
import { httpError } from '../../../utils/httpError.js';
import { dispatchCampaign } from '../../../jobs/emailCampaigns.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseRecipients(text) {
  const emails = String(text || '')
    .split(/[\n,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(emails)].filter((e) => EMAIL_RE.test(e)).map((email) => ({ email }));
}

// GET /api/more-modules/email-campaigns?search=&status=
export async function listCampaigns(req, res, next) {
  try {
    const userId = req.user.id;
    const { search, status } = req.query;
    const filter = { userId };
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
    const { name, subject, body, recipientsText, scheduledAt } = req.body;
    const campaign = await EmailCampaign.create({
      userId: req.user.id,
      name,
      subject,
      body,
      recipients: parseRecipients(recipientsText),
      scheduledAt: scheduledAt || null,
      status: scheduledAt ? 'Scheduled' : 'Draft',
    });
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
}

// PUT /api/more-modules/email-campaigns/:id
export async function updateCampaign(req, res, next) {
  try {
    const { name, subject, body, recipientsText, scheduledAt } = req.body;
    const campaign = await EmailCampaign.findOne({ _id: req.params.id, userId: req.user.id });
    if (!campaign) return next(httpError(404, 'Campaign not found'));

    campaign.name = name;
    campaign.subject = subject;
    campaign.body = body;
    campaign.recipients = mergeRecipients(campaign.recipients, parseRecipients(recipientsText));
    campaign.scheduledAt = scheduledAt || null;
    if (campaign.status !== 'Sent') {
      campaign.status = scheduledAt ? 'Scheduled' : 'Draft';
    }
    await campaign.save();
    res.json(campaign.toObject());
  } catch (err) {
    next(err);
  }
}

// Keeps existing send status/history for recipients that are still on the
// list, rather than resetting everyone back to Pending on every edit.
function mergeRecipients(existing, incoming) {
  const byEmail = new Map(existing.map((r) => [r.email, r]));
  return incoming.map(({ email }) => byEmail.get(email) || { email, status: 'Pending' });
}

// DELETE /api/more-modules/email-campaigns/:id
export async function deleteCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!campaign) return next(httpError(404, 'Campaign not found'));
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    next(err);
  }
}

// POST /api/more-modules/email-campaigns/:id/send
export async function sendCampaignNow(req, res, next) {
  try {
    const userId = req.user.id;
    const campaign = await EmailCampaign.findOne({ _id: req.params.id, userId });
    if (!campaign) return next(httpError(404, 'Campaign not found'));
    if (!campaign.recipients.length) return next(httpError(400, 'Add at least one recipient first'));

    const settings = await BusinessSettings.findOne({ userId }).select('+emailSmtpPass');
    const result = await dispatchCampaign(campaign, settings, settings?.businessName);

    let message;
    if (result.sent > 0) {
      message = `Sent to ${result.sent} of ${result.total} recipient(s).`;
    } else if (result.failed > 0) {
      message = `Failed to send to all ${result.failed} recipient(s) — check your Outgoing Email (SMTP) settings.`;
    } else {
      message = 'No new recipients to send to — everyone on the list was already sent this campaign.';
    }
    res.json({ message, ...result });
  } catch (err) {
    next(httpError(400, err.message));
  }
}
