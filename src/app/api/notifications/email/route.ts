/**
 * Email Notifications API
 * POST /api/notifications/email
 * 
 * Sends email notifications for heal completions and security alerts.
 * Uses nodemailer with configurable SMTP transport.
 */
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface EmailPayload {
  to: string;
  subject: string;
  type: 'heal_complete' | 'security_alert' | 'stale_docs' | 'custom';
  data?: Record<string, any>;
}

function buildEmailHtml(type: string, data: Record<string, any> = {}): string {
  const baseStyle = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e4e4e7; padding: 40px; }
    .container { max-width: 560px; margin: 0 auto; background: #111118; border: 1px solid #27272a; border-radius: 12px; padding: 32px; }
    .header { text-align: center; padding-bottom: 24px; border-bottom: 1px solid #27272a; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: 900; color: #a855f7; font-family: monospace; text-transform: uppercase; letter-spacing: 0.1em; }
    h1 { font-size: 18px; color: #fff; margin: 0 0 8px; }
    p { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 8px 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; font-family: monospace; }
    .badge-success { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
    .badge-warning { background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }
    .badge-critical { background: rgba(244,63,94,0.1); color: #f43f5e; border: 1px solid rgba(244,63,94,0.2); }
    .detail-card { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin: 12px 0; }
    .footer { text-align: center; padding-top: 24px; border-top: 1px solid #27272a; margin-top: 24px; font-size: 11px; color: #52525b; }
  `;

  if (type === 'heal_complete') {
    return `<html><head><style>${baseStyle}</style></head><body>
      <div class="container">
        <div class="header"><div class="logo">SYNKRON</div></div>
        <h1>Documentation Healed Successfully</h1>
        <span class="badge badge-success">HEAL COMPLETE</span>
        <div class="detail-card">
          <p><strong>File:</strong> ${data.filename || 'Unknown'}</p>
          <p><strong>Model:</strong> ${data.modelUsed || 'AI'}</p>
          <p><strong>Duration:</strong> ${data.durationMs || 0}ms</p>
          <p><strong>Trigger:</strong> ${data.triggerType || 'manual'}</p>
        </div>
        <p>Your documentation has been automatically reconciled with the latest code changes.</p>
        <div class="footer">SYNKRON Self-Healing Documentation Engine • Sonata Interactive</div>
      </div>
    </body></html>`;
  }

  if (type === 'security_alert') {
    return `<html><head><style>${baseStyle}</style></head><body>
      <div class="container">
        <div class="header"><div class="logo">SYNKRON</div></div>
        <h1>Security Scan Alert</h1>
        <span class="badge badge-critical">CRITICAL FINDINGS</span>
        <div class="detail-card">
          <p><strong>Critical Issues:</strong> ${data.criticalCount || 0}</p>
          <p><strong>High Issues:</strong> ${data.highCount || 0}</p>
          <p><strong>Scan Path:</strong> ${data.scanPath || 'src/'}</p>
        </div>
        <p>Your latest security scan found issues that require immediate attention.</p>
        <div class="footer">SYNKRON Self-Healing Documentation Engine • Sonata Interactive</div>
      </div>
    </body></html>`;
  }

  if (type === 'stale_docs') {
    return `<html><head><style>${baseStyle}</style></head><body>
      <div class="container">
        <div class="header"><div class="logo">SYNKRON</div></div>
        <h1>Stale Documentation Alert</h1>
        <span class="badge badge-warning">STALE DOCS DETECTED</span>
        <div class="detail-card">
          <p><strong>Stale Files:</strong> ${data.staleCount || 0}</p>
          <p><strong>Oldest:</strong> ${data.oldestFile || 'Unknown'}</p>
          <p><strong>Days Since Heal:</strong> ${data.daysSinceHeal || '?'}</p>
        </div>
        <p>Some documentation files haven't been healed recently and may be out of sync with the code.</p>
        <div class="footer">SYNKRON Self-Healing Documentation Engine • Sonata Interactive</div>
      </div>
    </body></html>`;
  }

  // Custom/default
  return `<html><head><style>${baseStyle}</style></head><body>
    <div class="container">
      <div class="header"><div class="logo">SYNKRON</div></div>
      <h1>${data.title || 'Notification'}</h1>
      <p>${data.body || 'You have a new notification from SYNKRON.'}</p>
      <div class="footer">SYNKRON Self-Healing Documentation Engine • Sonata Interactive</div>
    </div>
  </body></html>`;
}

export async function POST(req: NextRequest) {
  const body: EmailPayload = await req.json().catch(() => ({ to: '', subject: '', type: 'custom' as const }));

  if (!body.to || !body.subject) {
    return NextResponse.json({ success: false, error: 'Missing required fields: to, subject' }, { status: 400 });
  }

  // Check if SMTP is configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'SYNKRON <noreply@synkron.dev>';

  if (!smtpHost) {
    // Return success with a note that email wasn't actually sent
    return NextResponse.json({
      success: true,
      sent: false,
      note: 'SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.local to enable email notifications.',
      preview: {
        to: body.to,
        subject: body.subject,
        type: body.type,
      },
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || '587'),
      secure: smtpPort === '465',
      auth: { user: smtpUser, pass: smtpPass },
    });

    const html = buildEmailHtml(body.type, body.data);

    await transporter.sendMail({
      from: smtpFrom,
      to: body.to,
      subject: body.subject,
      html,
    });

    return NextResponse.json({ success: true, sent: true, to: body.to });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
