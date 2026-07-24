import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });
}

// Builds a nodemailer transport override so mail goes out through a business's
// own mailbox instead of the platform's shared SMTP account, when configured.
export function buildSmtpOverride(source, fallbackName) {
  if (!source?.emailSmtpHost || !source?.emailSmtpUser || !source?.emailSmtpPass) return undefined;
  return {
    host: source.emailSmtpHost,
    port: source.emailSmtpPort || 587,
    secure: !!source.emailSmtpSecure,
    user: source.emailSmtpUser,
    pass: source.emailSmtpPass,
    from: `"${source.businessName || fallbackName || 'Hospital'}" <${source.emailSmtpUser}>`,
  };
}

export async function sendMail({ to, subject, html, attachments = [], smtp }) {
  const transporter = smtp
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.pass },
      })
    : createTransporter();
  const from = smtp?.from || process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({ from, to, subject, html, attachments });
}
