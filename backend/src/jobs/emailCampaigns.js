import { AppUser } from '../models/AppUser.js';
import { BusinessSettings } from '../models/BusinessSettings.js';
import { EmailCampaign } from '../models/EmailCampaign.js';
import { buildBrandedEmail, buildSmtpOverride, escapeHtml, sendMail, textToEmailHtml } from '../utils/mailer.js';

function getCampaignEmailHtml({ subject, body, businessName }) {
  const safeBusinessName = businessName || 'GoBooks';
  const contentHtml = textToEmailHtml(body) || '<p style="margin:0 0 14px;">Thank you for choosing GoBooks.</p>';

  return buildBrandedEmail({
    title: subject || 'GoBooks Update',
    preheader: subject || `A new update from ${safeBusinessName}`,
    greeting: `Hello from ${safeBusinessName},`,
    bodyHtml: `
      <div style="margin:0;color:#334155;font-size:15px;line-height:1.7;">
        ${contentHtml}
      </div>
      <div style="margin:22px 0 0;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
        <p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">Sent by <strong style="color:#0f172a;">${escapeHtml(safeBusinessName)}</strong> using GoBooks email campaigns.</p>
      </div>
    `,
    footerText: 'You received this email because your address was included in a GoBooks campaign list.',
    badge: 'GoBooks verified mail',
  });
}

// Sends a campaign to every recipient not already marked Sent - safe to call
// again on a partially-failed campaign, or after adding new recipients later.
export async function dispatchCampaign(campaign, settings, businessName) {
  const smtp = buildSmtpOverride(settings, businessName);
  const senderName = settings?.businessName || businessName || 'GoBooks';
  let sent = 0;
  let failed = 0;

  for (const recipient of campaign.recipients) {
    if (recipient.status === 'Sent') continue;

    try {
      await sendMail({
        to: recipient.email,
        subject: campaign.subject || campaign.name,
        html: getCampaignEmailHtml({ subject: campaign.subject, body: campaign.body, businessName: senderName }),
        smtp,
      });
      recipient.status = 'Sent';
      recipient.sentAt = new Date();
      recipient.error = '';
      sent++;
    } catch (err) {
      recipient.status = 'Failed';
      recipient.error = err.message;
      failed++;
      console.error('[email-campaigns] failed to send for recipient', recipient.email, err.message);
    }
  }

  campaign.sent = campaign.recipients.filter((r) => r.status === 'Sent').length;
  campaign.bounced = campaign.recipients.filter((r) => r.status === 'Failed').length;
  campaign.status = 'Sent';
  campaign.sentOn = new Date().toISOString();
  await campaign.save();

  return { sent, failed, total: campaign.recipients.length };
}

export async function runScheduledCampaigns() {
  const due = await EmailCampaign.find({ status: 'Scheduled', scheduledAt: { $lte: new Date() } });

  for (const campaign of due) {
    try {
      const [user, settings] = await Promise.all([
        AppUser.findById(campaign.userId).lean(),
        BusinessSettings.findOne({ userId: campaign.userId }).select('+emailSmtpPass'),
      ]);
      await dispatchCampaign(campaign, settings, user?.businessName);
    } catch (err) {
      console.error('[email-campaigns] failed to dispatch', campaign._id.toString(), err.message);
    }
  }

  return { dispatched: due.length };
}
