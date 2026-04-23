"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpEmail = sendOtpEmail;
exports.sendNotificationEmail = sendNotificationEmail;
exports.sendLeadAlertEmail = sendLeadAlertEmail;
const resend_1 = require("resend");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY || '');
const FROM_EMAIL = process.env.FROM_EMAIL || 'OdishaInfra <noreply@odishainfra.com>';
// ─── OTP EMAIL ──────────────────────────────────────────────────────────────
async function sendOtpEmail(to, code) {
    try {
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: `Your OdishaInfra verification code: ${code}`,
            html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #010409; color: #E6EDF3; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #FF8240; font-size: 24px; margin: 0;">OdishaInfra</h1>
            <p style="color: #8B949E; font-size: 13px; margin-top: 4px;">Premium Real Estate Discovery</p>
          </div>
          <div style="background: #0D1117; border: 1px solid #1E1E1E; border-radius: 12px; padding: 24px; text-align: center;">
            <p style="color: #8B949E; font-size: 14px; margin: 0 0 16px 0;">Your verification code is:</p>
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #FF8240; margin: 16px 0;">
              ${code}
            </div>
            <p style="color: #6E7681; font-size: 12px; margin: 16px 0 0 0;">
              This code expires in ${process.env.OTP_EXPIRY_MINUTES || '5'} minutes.<br/>
              If you didn't request this, please ignore this email.
            </p>
          </div>
          <p style="color: #6E7681; font-size: 11px; text-align: center; margin-top: 24px;">
            © ${new Date().getFullYear()} OdishaInfra. All rights reserved.
          </p>
        </div>
      `,
        });
        if (error) {
            console.error('Resend OTP email error:', error);
            return false;
        }
        return true;
    }
    catch (err) {
        console.error('Send OTP email failed:', err);
        return false;
    }
}
// ─── NOTIFICATION EMAILS ────────────────────────────────────────────────────
async function sendNotificationEmail(to, subject, body) {
    try {
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #010409; color: #E6EDF3; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #FF8240; font-size: 24px; margin: 0;">OdishaInfra</h1>
          </div>
          <div style="background: #0D1117; border: 1px solid #1E1E1E; border-radius: 12px; padding: 24px;">
            <p style="color: #E6EDF3; font-size: 14px; line-height: 1.6;">${body}</p>
          </div>
          <p style="color: #6E7681; font-size: 11px; text-align: center; margin-top: 24px;">
            © ${new Date().getFullYear()} OdishaInfra. All rights reserved.
          </p>
        </div>
      `,
        });
        if (error) {
            console.error('Resend notification email error:', error);
            return false;
        }
        return true;
    }
    catch (err) {
        console.error('Send notification email failed:', err);
        return false;
    }
}
// ─── WEBSITE LEAD ALERT (to admin) ─────────────────────────────────────────
async function sendLeadAlertEmail(lead) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@odishainfra.com';
    try {
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: adminEmail,
            subject: `New Lead: ${lead.name} via ${lead.source}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; padding: 24px;">
          <h2 style="color: #FF8240;">New Website Lead</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td>${lead.name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td>${lead.email || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Phone:</td><td>${lead.phone || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Source:</td><td>${lead.source}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Message:</td><td>${lead.message || 'N/A'}</td></tr>
          </table>
        </div>
      `,
        });
        if (error) {
            console.error('Resend lead alert error:', error);
            return false;
        }
        return true;
    }
    catch (err) {
        console.error('Send lead alert failed:', err);
        return false;
    }
}
exports.default = resend;
//# sourceMappingURL=email.js.map