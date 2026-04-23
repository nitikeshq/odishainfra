import { Resend } from 'resend';
declare const resend: Resend;
export declare function sendOtpEmail(to: string, code: string): Promise<boolean>;
export declare function sendNotificationEmail(to: string, subject: string, body: string): Promise<boolean>;
export declare function sendLeadAlertEmail(lead: {
    name: string;
    email?: string;
    phone?: string;
    message?: string;
    source: string;
}): Promise<boolean>;
export default resend;
//# sourceMappingURL=email.d.ts.map