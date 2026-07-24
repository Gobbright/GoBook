import { AppUser } from '../models/AppUser.js';
import { BusinessSettings } from '../models/BusinessSettings.js';
import { EmailCampaign } from '../models/EmailCampaign.js';
import { sendMail, buildSmtpOverride } from '../utils/mailer.js';

function getCampaignEmailHtml({ subject, body }) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      ${subject ? `<h2 style="margin: 0 0 12px;">${subject}</h2>` : ''}
      <div style="margin: 0 0 16px; white-space: pre-wrap;">${body || ''}</div>
    </div>
  `;
}

// Sends a campaign to every recipient not already marked Sent — safe to call
// again on a partially-failed campaign, or after adding new recipients later.
export async function dispatchCampaign(campaign, settings, businessName) {
  const smtp = buildSmtpOverride(settings, businessName);
  let sent = 0;
  let failed = 0;

  for (const recipient of campaign.recipients) {
    if (recipient.status === 'Sent') continue;

    try {
      await sendMail({
        to: recipient.email,
        subject: campaign.subject || campaign.name,
        html: getCampaignEmailHtml({ subject: campaign.subject, body: campaign.body }),
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
