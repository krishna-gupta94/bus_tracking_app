import nodemailer from 'nodemailer';
import { config } from '../config/env';

/** Lazy-created transporter — only initialised when first needed */
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465, // TLS on port 465, STARTTLS otherwise
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }
  return _transporter;
}

/** Shared base HTML wrapper */
function wrapHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f0f4f8; margin: 0; padding: 24px; }
    .card { background: #ffffff; border-radius: 12px; max-width: 560px;
            margin: 0 auto; padding: 36px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .logo { font-size: 24px; font-weight: 900; color: #0f172a; margin-bottom: 24px; }
    .logo span { color: #38bdf8; }
    h2 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
    p  { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 12px; }
    .badge { display:inline-block; padding: 4px 12px; border-radius: 9999px;
             font-size: 12px; font-weight: 700; margin-bottom: 20px; }
    .badge-green  { background:#dcfce7; color:#166534; }
    .badge-red    { background:#fee2e2; color:#991b1b; }
    .btn { display:inline-block; background:#38bdf8; color:#fff; padding:12px 28px;
           border-radius:8px; font-size:14px; font-weight:700; text-decoration:none;
           margin: 16px 0; }
    .info-row { background:#f8fafc; border-radius:8px; padding:12px 16px;
                margin-bottom:10px; font-size:13px; color:#334155; }
    .info-row strong { color:#0f172a; }
    .footer { font-size: 11px; color: #94a3b8; margin-top: 28px; text-align:center; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Smart<span>Bus</span></div>
    ${bodyHtml}
    <hr class="divider" />
    <div class="footer">SmartBus College Transit &amp; Safety Platform &bull; Do not reply to this email.</div>
  </div>
</body>
</html>`;
}

/**
 * Send password-setup / approval email.
 * The deep-link contains the RAW token — sent once in this email, never stored.
 */
export async function sendApprovalEmail(opts: {
  to: string;
  name: string;
  studentCode: string;
  setupLink: string; // full deep-link: smartbus://setup-password?token=RAW&requestId=ID
  expiryHours: number;
}): Promise<void> {
  if (!config.smtpUser) {
    console.warn('[EmailService] SMTP not configured — skipping approval email');
    return;
  }

  const html = wrapHtml('SmartBus Registration Approved', `
    <span class="badge badge-green">✓ Registration Approved</span>
    <h2>Congratulations, ${opts.name}!</h2>
    <p>Your SmartBus registration request has been reviewed and <strong>approved</strong> by the college administration.</p>
    <div class="info-row"><strong>Student ID:</strong> ${opts.studentCode}</div>
    <p>To activate your SmartBus account, please set your password by tapping the button below.
       This link expires in <strong>${opts.expiryHours} hours</strong>.</p>
    <a class="btn" href="${opts.setupLink}">Set My Password &rarr;</a>
    <p style="font-size:12px;color:#94a3b8;">
      If the button doesn't open the SmartBus app, copy and paste this link:<br/>
      <code style="word-break:break-all;">${opts.setupLink}</code>
    </p>
    <p>Once you set your password you can log in using your <strong>email address</strong> or
       <strong>Student ID (${opts.studentCode})</strong>.</p>
    <p style="color:#dc2626;font-size:12px;">⚠ Never share your password with anyone, including college staff.</p>
  `);

  await getTransporter().sendMail({
    from: config.smtpFrom || config.smtpUser,
    to: opts.to,
    subject: '✓ Your SmartBus Registration is Approved — Set Your Password',
    html,
  });
}

/**
 * Send rejection email with the reason.
 */
export async function sendRejectionEmail(opts: {
  to: string;
  name: string;
  studentCode: string;
  reason: string;
}): Promise<void> {
  if (!config.smtpUser) {
    console.warn('[EmailService] SMTP not configured — skipping rejection email');
    return;
  }

  const html = wrapHtml('SmartBus Registration Update', `
    <span class="badge badge-red">✗ Registration Not Approved</span>
    <h2>Hi ${opts.name},</h2>
    <p>We have reviewed your SmartBus registration request and unfortunately it could not be approved at this time.</p>
    <div class="info-row"><strong>Student ID:</strong> ${opts.studentCode}</div>
    <div class="info-row"><strong>Reason:</strong> ${opts.reason}</div>
    <p>If you believe this is an error, or if you have additional documents to provide, please contact the
       college Transport Administration office directly.</p>
    <p>You may submit a new registration request once the issue has been resolved.</p>
  `);

  await getTransporter().sendMail({
    from: config.smtpFrom || config.smtpUser,
    to: opts.to,
    subject: 'SmartBus Registration Update',
    html,
  });
}
