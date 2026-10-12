import { EmailCampaign } from '../../../models/EmailCampaign.js';
import { BusinessSettings } from '../../../models/BusinessSettings.js';
import { httpError } from '../../../utils/httpError.js';
import { dispatchCampaign } from '../../../jobs/emailCampaigns.js';
import { buildSmtpOverride, sendMail, textToEmailHtml, verifySmtp } from '../../../utils/mailer.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseRecipients(text) {
  const emails = String(text || '')
    .split(/[\n,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(emails)].filter((e) => EMAIL_RE.test(e)).map((email) => ({ email }));
}

const CAMPAIGN_FIELDS = ['name', 'subject', 'body', 'campaignType', 'description', 'tags', 'audienceType', 'audienceName', 'fromName', 'fromEmail', 'previewText', 'openTracking', 'clickTracking', 'utmTracking'];

function campaignPayload(body = {}) {
  return CAMPAIGN_FIELDS.reduce((payload, key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) payload[key] = body[key];
    return payload;
  }, {});
}

// GET /api/more-modules/email-settings
export async function getEmailSettings(req, res, next) {
  try {
    const settings = await BusinessSettings.findOne({ userId: req.user.id }).select('+emailSmtpPass').lean();
    const defaultEmail = settings?.emailSmtpUser || settings?.businessEmail || req.user.email || '';
    res.json({
      configured: Boolean(settings?.emailSmtpHost && settings?.emailSmtpUser && settings?.emailSmtpPass && settings?.emailSmtpVerifiedAt),
      email: defaultEmail,
      host: settings?.emailSmtpHost || 'smtp.gmail.com',
      port: settings?.emailSmtpPort || 587,
      secure: Boolean(settings?.emailSmtpSecure),
      verifiedAt: settings?.emailSmtpVerifiedAt || null,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/more-modules/email-settings
export async function saveEmailSettings(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const appPassword = String(req.body.appPassword || '').replace(/\s/g, '');
    if (!EMAIL_RE.test(email)) return next(httpError(400, 'Enter a valid Gmail address.'));
    if (appPassword.length < 12) return next(httpError(400, 'Enter your 16-character Google app password.'));

    const smtp = { host: 'smtp.gmail.com', port: 587, secure: false, user: email, pass: appPassword };
    await verifySmtp(smtp);
    const settings = await BusinessSettings.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { emailSmtpHost: smtp.host, emailSmtpPort: smtp.port, emailSmtpSecure: smtp.secure, emailSmtpUser: email, emailSmtpPass: appPassword, emailSmtpVerifiedAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    res.json({ configured: true, email: settings.emailSmtpUser, verifiedAt: settings.emailSmtpVerifiedAt, message: 'Gmail connected and app password verified.' });
  } catch (err) {
    next(httpError(400, 'Could not verify Gmail. Check the selected email and Google app password.'));
  }
}

// POST /api/more-modules/email-settings/test
// Sends a real message from the verified Gmail address to itself (or an
// explicitly supplied valid address) so the business can confirm delivery.
export async function sendEmailSettingsTest(req, res, next) {
  try {
    const settings = await BusinessSettings.findOne({ userId: req.user.id }).select('+emailSmtpPass');
    if (!settings?.emailSmtpHost || !settings?.emailSmtpUser || !settings?.emailSmtpPass || !settings?.emailSmtpVerifiedAt) {
      return next(httpError(400, 'Verify your Gmail app password before sending a test email.'));
    }
    const to = String(req.body?.to || settings.emailSmtpUser).trim().toLowerCase();
    if (!EMAIL_RE.test(to)) return next(httpError(400, 'Enter a valid test recipient email address.'));
    await sendMail({
      to,
      subject: 'GoBook Email Marketing ? delivery test',
      html: '<p>Your verified Gmail account is ready to send GoBook email campaigns.</p>',
      smtp: buildSmtpOverride(settings, settings.businessName),
    });
    res.json({ message: `Test email sent from ${settings.emailSmtpUser} to ${to}.` });
  } catch (err) {
    next(httpError(400, 'Test email failed. Recheck the Gmail app password and try again.'));
  }
}

// POST /api/more-modules/email-campaigns/test
// Sends the campaign currently being composed to one manually-entered address
// without creating or sending the full campaign audience.
export async function sendCampaignTest(req, res, next) {
  try {
    const settings = await BusinessSettings.findOne({ userId: req.user.id }).select('+emailSmtpPass');
    if (!settings?.emailSmtpHost || !settings?.emailSmtpUser || !settings?.emailSmtpPass || !settings?.emailSmtpVerifiedAt) {
      return next(httpError(400, 'Verify your Gmail app password before sending a test email.'));
    }
    const to = String(req.body?.to || '').trim().toLowerCase();
    if (!EMAIL_RE.test(to)) return next(httpError(400, 'Enter a valid test recipient email address.'));
    const subject = String(req.body?.subject || 'GoBook campaign test').trim() || 'GoBook campaign test';
    const body = String(req.body?.body || 'This is a test email from GoBook Email Marketing.');
    await sendMail({
      to,
      subject: `[Test] ${subject}`,
      html: `<div style="font-family:Arial,sans-serif;color:#172033;line-height:1.6;"><p style="color:#2563eb;font-weight:700;">GoBook Email Marketing test</p>${textToEmailHtml(body)}</div>`,
      smtp: buildSmtpOverride(settings, settings.businessName),
    });
    res.json({ message: `Test email sent to ${to} from ${settings.emailSmtpUser}.` });
  } catch (err) {
    next(httpError(400, 'Test email failed. Check the recipient, Gmail app password, and internet connection.'));
  }
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
    const { recipientsText, scheduledAt } = req.body;
    const campaign = await EmailCampaign.create({
      userId: req.user.id,
      ...campaignPayload(req.body),
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
    const { recipientsText, scheduledAt } = req.body;
    const campaign = await EmailCampaign.findOne({ _id: req.params.id, userId: req.user.id });
    if (!campaign) return next(httpError(404, 'Campaign not found'));

    Object.assign(campaign, campaignPayload(req.body));
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
    if (!settings?.emailSmtpHost || !settings?.emailSmtpUser || !settings?.emailSmtpPass || !settings?.emailSmtpVerifiedAt) {
      return next(httpError(400, 'Verify the Gmail app password in Email Marketing Settings before sending campaigns.'));
    }
    campaign.fromEmail = settings.emailSmtpUser;
    campaign.status = 'Sending';
    await campaign.save();
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
