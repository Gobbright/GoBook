import nodemailer from 'nodemailer';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const GOBOOK_LOGO_CID = 'gobook-logo-full@gobook';
const GOBOOK_LOGO_PATH = path.resolve(__dirname, '../../../frontend/public/gobook-logo-full.png');

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function textToEmailHtml(value) {
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 14px;">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function getLogoAttachment() {
  if (!existsSync(GOBOOK_LOGO_PATH)) return null;
  return {
    filename: 'gobook-logo-full.png',
    path: GOBOOK_LOGO_PATH,
    cid: GOBOOK_LOGO_CID,
    contentDisposition: 'inline',
  };
}

function mergeLogoAttachment(html, attachments) {
  if (!html?.includes(`cid:${GOBOOK_LOGO_CID}`)) return attachments;
  const hasLogo = attachments.some((attachment) => attachment.cid === GOBOOK_LOGO_CID);
  const logo = getLogoAttachment();
  if (hasLogo || !logo) return attachments;
  return [logo, ...attachments];
}

function plainLine(value) {
  return escapeHtml(value);
}

export function buildBrandedEmail({
  title,
  preheader,
  greeting,
  intro,
  bodyHtml = '',
  otp,
  notice,
  footerText = 'This message was sent securely by GoBooks.',
  badge = 'Trusted business suite',
}) {
  const safeTitle = plainLine(title || 'GoBooks');
  const safePreheader = plainLine(preheader || title || 'GoBooks notification');
  const greetingHtml = greeting
    ? `<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">${plainLine(greeting)}</p>`
    : '';
  const introHtml = intro
    ? `<p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.6;">${plainLine(intro)}</p>`
    : '';
  const otpHtml = otp
    ? `<div style="margin:22px 0 18px;padding:18px 22px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;text-align:center;">
        <div style="margin:0 0 8px;color:#2563eb;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">One-time password</div>
        <div style="color:#0f172a;font-size:34px;font-weight:800;letter-spacing:7px;line-height:1;">${plainLine(otp)}</div>
      </div>`
    : '';
  const noticeHtml = notice
    ? `<p style="margin:18px 0 0;padding:14px 16px;border-left:4px solid #0d9488;background:#f0fdfa;color:#31534f;font-size:13px;line-height:1.55;">${plainLine(notice)}</p>`
    : '';
  const safeFooter = plainLine(footerText);
  const safeBadge = plainLine(badge);

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,'Helvetica Neue',sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#eef2f7;">
    <tr>
      <td align="center" style="padding:34px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;border-collapse:collapse;">
          <tr>
            <td style="padding:0 4px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <img src="cid:${GOBOOK_LOGO_CID}" width="148" alt="GoBooks" style="display:block;width:148px;max-width:148px;height:auto;border:0;">
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;padding:7px 10px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;">${safeBadge}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="overflow:hidden;border-radius:16px;background:#ffffff;border:1px solid #dbeafe;box-shadow:0 14px 36px rgba(15,23,42,.08);">
              <div style="height:6px;background:#2563eb;"></div>
              <div style="padding:30px 30px 26px;">
                <h1 style="margin:0 0 16px;color:#0f172a;font-size:24px;line-height:1.25;font-weight:800;">${safeTitle}</h1>
                ${greetingHtml}
                ${introHtml}
                ${otpHtml}
                ${bodyHtml}
                ${noticeHtml}
              </div>
              <div style="padding:18px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">${safeFooter}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 12px 0;color:#94a3b8;font-size:12px;line-height:1.5;">
              GoBooks helps teams manage billing, accounting, CRM, inventory, payroll and GST in one place.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function createTransporter() {
  const smtpUser = process.env.SMTP_USER || 'support.gobook@gmail.com';
  const smtpPass = process.env.SMTP_PASS || '';

  const mailTimeout = Math.max(Number(process.env.SMTP_TIMEOUT_MS) || 20000, 5000);
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: mailTimeout,
    greetingTimeout: mailTimeout,
    socketTimeout: mailTimeout * 2,
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
    from: `"${source.businessName || fallbackName || 'GoBooks'}" <${source.emailSmtpUser}>`,
  };
}

export async function sendMail({ to, subject, html, attachments = [], smtp }) {
  const mailTimeout = Math.max(Number(process.env.SMTP_TIMEOUT_MS) || 20000, 5000);
  const transporter = smtp
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.pass },
        connectionTimeout: mailTimeout,
        greetingTimeout: mailTimeout,
        socketTimeout: mailTimeout * 2,
      })
    : createTransporter();
  const from = smtp?.from || process.env.SMTP_FROM
    || `GoBooks Support <${process.env.SMTP_USER || 'support.gobook@gmail.com'}>`;
  await transporter.sendMail({ from, to, subject, html, attachments: mergeLogoAttachment(html, attachments) });
}
