import cron from 'node-cron';

import { runAppointmentReminders } from './appointmentReminders.js';
import { runScheduledCampaigns } from './emailCampaigns.js';

export function startScheduledJobs() {
  cron.schedule('*/15 * * * *', () => {
    runAppointmentReminders().catch((err) => {
      console.error('[reminders] scheduled run failed:', err.message);
    });
  });

  cron.schedule('*/5 * * * *', () => {
    runScheduledCampaigns().catch((err) => {
      console.error('[email-campaigns] scheduled run failed:', err.message);
    });
  });
}
