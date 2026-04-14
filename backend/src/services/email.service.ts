/**
 * Email Service — transactional emails via Resend
 * https://resend.com (free tier: 3,000 emails/month)
 *
 * Install: npm install resend
 * Env var: RESEND_API_KEY=re_...
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = 'AgentMarket <noreply@agentmarket.xyz>';
const APP_URL = process.env.FRONTEND_URL || 'https://agentmarket.xyz';

export class EmailService {

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const link = `${APP_URL}/verify-email?token=${token}`;
    await resend.emails.send({
      from:    FROM,
      to,
      subject: 'Verify your AgentMarket account',
      html: emailTemplate({
        title:    'Verify your email',
        body:     'Click the button below to verify your email address and activate your AgentMarket account.',
        ctaText:  'Verify Email',
        ctaHref:  link,
        footer:   'This link expires in 24 hours. If you did not create an account, you can safely ignore this email.',
      }),
    });
  }

  async sendWelcomeEmail(to: string, walletAddress?: string): Promise<void> {
    await resend.emails.send({
      from:    FROM,
      to,
      subject: 'Welcome to AgentMarket',
      html: emailTemplate({
        title:    'Welcome to AgentMarket',
        body:     `Your account is live. You can now deploy AI agents, earn USDC per call via x402, and track your earnings on the dashboard.${walletAddress ? `<br><br>Your wallet: <code style="background:#111;padding:2px 6px;border-radius:4px;font-size:12px">${walletAddress}</code>` : ''}`,
        ctaText:  'Deploy Your First Agent',
        ctaHref:  `${APP_URL}/deploy`,
        footer:   'AgentMarket runs on XLayer. Payments settle in USDC via the x402 protocol.',
      }),
    });
  }

  async sendAgentDeployedEmail(to: string, agentName: string, agentSlug: string, walletAddress: string): Promise<void> {
    await resend.emails.send({
      from:    FROM,
      to,
      subject: `Your agent "${agentName}" is live`,
      html: emailTemplate({
        title:    `"${agentName}" is live`,
        body:     `Your agent has been deployed and is now accepting calls on AgentMarket. Earnings go directly to your agent wallet on XLayer.<br><br>Agent wallet: <code style="background:#111;padding:2px 6px;border-radius:4px;font-size:12px">${walletAddress}</code>`,
        ctaText:  'View Agent Listing',
        ctaHref:  `${APP_URL}/marketplace/${agentSlug}`,
        footer:   'Save your agent wallet private key. AgentMarket does not store it.',
      }),
    });
  }

  async sendCallReceiptEmail(to: string, agentName: string, amount: string, txHash: string): Promise<void> {
    await resend.emails.send({
      from:    FROM,
      to,
      subject: `Payment received: ${amount} USDC from ${agentName}`,
      html: emailTemplate({
        title:    `${amount} USDC received`,
        body:     `Your agent <strong>${agentName}</strong> received a payment of <strong>${amount} USDC</strong> for a completed call. The transaction is recorded on XLayer.`,
        ctaText:  'View on XLayer Explorer',
        ctaHref:  `https://www.oklink.com/xlayer/tx/${txHash}`,
        footer:   'This is an automated receipt. View all earnings in your AgentMarket dashboard.',
      }),
    });
  }
}

function emailTemplate({ title, body, ctaText, ctaHref, footer }: {
  title:   string;
  body:    string;
  ctaText: string;
  ctaHref: string;
  footer:  string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <div style="margin-bottom:32px">
      <span style="font-size:18px;font-weight:900;letter-spacing:-.4px;color:#fff">
        Agent<span style="color:#7c5cfc">Market</span><span style="color:#00d4a0">.</span>
      </span>
    </div>
    <div style="background:#111;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px">
      <h1 style="font-size:24px;font-weight:900;color:#fff;margin:0 0 14px;letter-spacing:-1px">${title}</h1>
      <p style="font-size:14px;color:#888;line-height:1.75;margin:0 0 24px">${body}</p>
      <a href="${ctaHref}" style="display:inline-block;background:#7c5cfc;color:#fff;border-radius:999px;padding:12px 28px;font-size:14px;font-weight:700;text-decoration:none">
        ${ctaText}
      </a>
    </div>
    <p style="font-size:12px;color:#444;margin-top:24px;line-height:1.65">${footer}</p>
    <p style="font-size:11px;color:#333;margin-top:12px">AgentMarket · Built on XLayer · x402 Protocol</p>
  </div>
</body>
</html>`;
}

export const emailService = new EmailService();
