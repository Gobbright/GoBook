import { DateTime } from 'luxon';

import { AppUser } from '../models/AppUser.js';
import { BusinessSettings } from '../models/BusinessSettings.js';
import { ModuleRecord } from '../models/ModuleRecord.js';
import { sendMail, buildSmtpOverride } from '../utils/mailer.js';

const DEFAULT_ZONE = 'Asia/Kolkata';
const TIMEZONE_LABEL_RE = /\(GMT\s*[+-]\d{2}:\d{2}\)\s*(.+)$/;
const SKIP_STATUSES = ['Cancelled', 'No Show'];

export function extractIanaZone(timezoneLabel) {
  const match = TIMEZONE_LABEL_RE.exec(timezoneLabel || '');
  const candidate = match ? match[1].trim() : '';
  if (candidate && DateTime.now().setZone(candidate).isValid) return candidate;
  return DEFAULT_ZONE;
}

function getAppointmentReminderHtml({ patientName, doctorName, departmentName, date, time, hospitalName }) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Appointment reminder</h2>
      <p style="margin: 0 0 12px;">Hi ${patientName || 'there'},</p>
      <p style="margin: 0 0 16px;">This is a reminder that you have an appointment today${hospitalName ? ` at ${hospitalName}` : ''}.</p>
      <p style="margin: 0 0 6px;"><strong>Date:</strong> ${date}</p>
      ${time ? `<p style="margin: 0 0 6px;"><strong>Time:</strong> ${time}</p>` : ''}
      ${doctorName ? `<p style="margin: 0 0 6px;"><strong>Doctor:</strong> ${doctorName}</p>` : ''}
      ${departmentName ? `<p style="margin: 0 0 6px;"><strong>Department:</strong> ${departmentName}</p>` : ''}
      <p style="margin: 16px 0 0; color: #536173;">If you need to reschedule, please contact the hospital directly.</p>
    </div>
  `;
}

async function remindHospital({ hospital, settings, force, now, resend }) {
  const ianaZone = extractIanaZone(settings?.timezone);
  const localNow = now ? now.setZone(ianaZone) : DateTime.now().setZone(ianaZone);
  const todayLocalISO = localNow.toISODate();

  if (!force) {
    if (localNow.hour !== 7) return { skipped: 'outside-window' };
    if (settings?.lastReminderRunDate === todayLocalISO) return { skipped: 'already-run' };
  }

  const todaysAppointments = await ModuleRecord.find({
    userId: hospital._id,
    moduleKey: 'hospital/appointments',
    'data.date': todayLocalISO,
    'data.status': { $nin: SKIP_STATUSES },
  }).lean();

  // resend=true re-sends to everyone regardless of reminderSentAt — testing-only,
  // used by the manual "Send Reminders Now" button. The real 7 AM cron never
  // passes this, so production sends stay idempotent (one reminder per day).
  const appointments = resend ? todaysAppointments : todaysAppointments.filter((r) => !r.data?.reminderSentAt);
  const alreadyReminded = resend ? 0 : todaysAppointments.length - appointments.length;

  let sent = 0;
  let failed = 0;
  let skippedNoEmail = 0;
  const smtp = buildSmtpOverride(settings, hospital.businessName);

  for (const record of appointments) {
    const data = record.data || {};
    if (!data.patientEmail) {
      skippedNoEmail++;
      continue;
    }

    try {
      await sendMail({
        to: data.patientEmail,
        subject: 'Appointment reminder for today',
        html: getAppointmentReminderHtml({
          patientName: data.patientName,
          doctorName: data.doctorName,
          departmentName: data.departmentName,
          date: data.date,
          time: data.time,
          hospitalName: settings?.businessName || hospital.businessName,
        }),
        smtp,
      });
      await ModuleRecord.updateOne(
        { _id: record._id },
        { $set: { 'data.reminderSentAt': new Date().toISOString() } },
      );
      sent++;
    } catch (err) {
      failed++;
      console.error('[reminders] failed to send for record', record._id.toString(), err.message);
    }
  }

  if (settings) {
    await BusinessSettings.updateOne(
      { _id: settings._id },
      { $set: { lastReminderRunDate: todayLocalISO } },
    );
  }

  return { sent, failed, skippedNoEmail, alreadyReminded, totalToday: todaysAppointments.length };
}

export async function runAppointmentReminders({ force = false, onlyUserId = null, resend = false } = {}) {
  const userFilter = { category: 'hospital' };
  if (onlyUserId) userFilter._id = onlyUserId;

  const hospitals = await AppUser.find(userFilter, { _id: 1, businessName: 1 }).lean();
  if (hospitals.length === 0) return { hospitals: 0 };

  const settingsByUserId = new Map(
    (await BusinessSettings.find({ userId: { $in: hospitals.map((h) => h._id) } }).select('+emailSmtpPass'))
      .map((s) => [s.userId.toString(), s]),
  );

  const now = DateTime.now();
  const results = [];

  for (const hospital of hospitals) {
    const settings = settingsByUserId.get(hospital._id.toString()) || null;
    try {
      const result = await remindHospital({ hospital, settings, force, now, resend });
      results.push({ hospitalId: hospital._id.toString(), ...result });
    } catch (err) {
      console.error('[reminders] batch failed for hospital', hospital._id.toString(), err.message);
      results.push({ hospitalId: hospital._id.toString(), error: err.message });
    }
  }

  return { hospitals: hospitals.length, results };
}
