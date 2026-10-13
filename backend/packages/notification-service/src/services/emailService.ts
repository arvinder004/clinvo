import { Resend } from 'resend';
import { env } from '../env.js';

let resendClient: Resend | null = null;
if (env.RESEND_API_KEY) {
  resendClient = new Resend(env.RESEND_API_KEY);
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (resendClient) {
    const { error } = await resendClient.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    if (error) {
      console.error('[emailService] Resend error:', error);
    }
  } else {
    // Dev fallback — log to console
    console.log('[emailService] DEV MODE — email not sent (no RESEND_API_KEY):');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  HTML length: ${html.length} chars`);
  }
}
