import nodemailer from 'nodemailer';

function createTransporter() {
  const smtpUser = process.env.SMTP_USER || 'support.gobook@gmail.com';
  const smtpPass = process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export async function sendMail({ to, subject, html, attachments = [] }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || `GoBook Support <${process.env.SMTP_USER || 'support.gobook@gmail.com'}>`;
  await transporter.sendMail({ from, to, subject, html, attachments });
}